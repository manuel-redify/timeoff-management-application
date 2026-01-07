"use strict";

const
    _ = require('underscore'),
    Promise = require('bluebird');

class ApprovalResolver {
    constructor(db) {
        this.db = db;
    }

    /**
     * Resolves and creates approval steps for a given leave request.
     * @param {Object} leave - The Leave model instance.
     */
    async resolveApprovers(leave) {
        // 1. Check if leave is already approved (auto-approved)
        // If it is, no approval steps are needed.
        if (leave.status === this.db.Leave.status_approved()) {
            return [];
        }

        const user = await leave.getUser({
            include: [{ model: this.db.Company, as: 'company' }]
        });

        const areas = await user.promise_areas();
        const projects = await user.getProjects();

        // If user has no projects, fallback to legacy department boss hierarchy
        if (projects.length === 0) {
            return this._fallbackToDepartmentBoss(leave, user);
        }

        const allStepsAttributes = [];

        // 2. Resolve rules for each project context
        for (const project of projects) {
            // Identify all applicable roles for this user in the current project context
            // This returns [DefaultRole, ProjectRole] (deduplicated)
            const activeRoles = await user.promise_all_active_roles(project);

            let stepsForProject = 0;

            for (const role of activeRoles) {
                const rules = await this.db.ApprovalRule.findAll({
                    where: {
                        companyId: user.companyId,
                        project_type: project.type,
                        subject_role_id: role.id
                    }
                });

                for (const rule of rules) {
                    // Filter by area context if the rule specifies one
                    if (rule.subject_area_id && !areas.find(a => a.id === rule.subject_area_id)) {
                        continue;
                    }

                    // Identify candidate approvers based on the rule and project context
                    // Pass current user ID to avoid self-approvals
                    const candidateApprovers = await this._findCandidateApprovers(rule, project, areas, user.id);

                    for (const approver of candidateApprovers) {
                        allStepsAttributes.push({
                            leave_id: leave.id,
                            approver_id: approver.id,
                            project_id: project.id,
                            role_id: role.id, // Track which role triggered this approval step
                            sequence_order: rule.sequence_order,
                            status: 1 // Pending
                        });
                        stepsForProject++;
                    }
                }
            }

            // 3. Fallback to Department Manager per project
            // If NO approval rules were satisfied for ANY of the user's roles in this project
            if (stepsForProject === 0) {
                const department = await user.getDepartment();
                if (department && department.bossId && department.bossId !== user.id) {
                    allStepsAttributes.push({
                        leave_id: leave.id,
                        approver_id: department.bossId,
                        project_id: project.id,
                        status: 1
                    });
                }
            }
        }

        // 4. Persistence & De-duplication
        // We ensure we don't create identical steps (same approver for same role/project/leave)
        const uniqueSteps = _.uniq(allStepsAttributes, s =>
            `${s.leave_id}-${s.approver_id}-${s.project_id}-${s.role_id || 'null'}`
        );

        if (uniqueSteps.length > 0) {
            return Promise.all(uniqueSteps.map(step => this.db.ApprovalStep.create(step)));
        } else {
            // Last resort: if no projects or fallback failed above (should be rare)
            return this._fallbackToDepartmentBoss(leave, user);
        }
    }

    /**
     * Identifies watchers for the leave request.
     */
    async resolveWatchers(leave) {
        // Ensure we have a fresh user with necessary associations
        const user = await this.db.User.findOne({
            where: { id: leave.userId },
            include: [
                { model: this.db.Project, as: 'projects' },
                { model: this.db.Team, as: 'teams' }
            ]
        });

        if (!user) {
            return [];
        }

        const watcherRules = await this.db.WatcherRule.findAll({
            where: {
                companyId: user.companyId,
                request_type: 'LEAVE'
            }
        });

        const watcherIds = new Set();
        const projects = user.projects;
        const teams = user.teams;

        for (const rule of watcherRules) {
            // 1. Check if contract type matches (if specified)
            if (rule.contract_type && rule.contract_type !== user.contract_type) {
                continue;
            }

            // 2. Determine if the rule applies based on subject scope
            // If no project/team/role/type scope is defined, it's a global/contract-only rule
            let applies = true;

            if (rule.project_id || rule.team_id || rule.project_type) {
                applies = false;

                if (rule.project_id && projects.find(p => p.id === rule.project_id)) {
                    applies = true;
                } else if (rule.team_id && teams.find(t => t.id === rule.team_id)) {
                    applies = true;
                } else if (rule.project_type && projects.find(p => p.type === rule.project_type)) {
                    applies = true;
                }
            }

            if (applies) {
                await this._addUsersByRule(rule, watcherIds, { projects, teams });
            }
        }

        const watchers = await this.db.User.findAll({
            where: { id: Array.from(watcherIds) }
        });

        return watchers;
    }

    async _addUsersByRule(rule, watcherIds, context = {}) {
        // Find users with the specified role
        if (rule.role_id) {
            const users = await this.db.UserRoleArea.findAll({
                where: { role_id: rule.role_id },
                include: [{ model: this.db.User }]
            });

            let candidates = users.map(ura => ura.User).filter(u => u);

            // Filter by team/project membership if required
            if (rule.team_scope_required && context.projects) {
                const projectUserIds = new Set();
                for (const project of context.projects) {
                    const projectUsers = await project.getUsers();
                    projectUsers.forEach(u => projectUserIds.add(u.id));
                }
                candidates = candidates.filter(c => projectUserIds.has(c.id));
            }

            candidates.forEach(user => watcherIds.add(user.id));
        }
        // If the rule is linked to a project/team, maybe all members or specific tagged users?
        // PRD says: "Watchers can be defined via Rules (role/team/project-based) or Direct assignment"
        // We'll focus on the Role-based watchers for this rule.
    }

    async _findCandidateApprovers(rule, project, subjectAreas, requesterId) {
        const approverRole = await rule.getApprover_role();

        // Find users with this role
        const usersInRole = await this.db.UserRoleArea.findAll({
            where: { role_id: approverRole.id },
            include: [{ model: this.db.User }]
        });

        let candidates = usersInRole.map(ura => ura.User).filter(u => u);

        // Filter by Area if SAME_AS_SUBJECT
        if (rule.approver_area_constraint === 'SAME_AS_SUBJECT') {
            const subjectAreaIds = subjectAreas.map(a => a.id);
            const approversWithSameArea = await this.db.UserRoleArea.findAll({
                where: {
                    role_id: approverRole.id,
                    area_id: { $in: subjectAreaIds }
                },
                include: [{ model: this.db.User }]
            });
            candidates = approversWithSameArea.map(ura => ura.User).filter(u => u);
        }

        // Filter by project/team membership if required
        if (rule.team_scope_required) {
            const projectUsers = await project.getUsers();
            const projectUserIds = projectUsers.map(u => u.id);
            candidates = candidates.filter(c => projectUserIds.includes(c.id));
        }

        // CRITICAL: Filter out the requester from candidate approvers to prevent self-approval
        if (requesterId) {
            candidates = candidates.filter(c => c.id !== requesterId);
        }

        return _.uniq(candidates, c => c.id);
    }

    async _fallbackToDepartmentBoss(leave, user) {
        const department = await user.getDepartment();
        if (department && department.bossId && department.bossId !== user.id) {
            return [await this.db.ApprovalStep.create({
                leave_id: leave.id,
                approver_id: department.bossId,
                status: 1
            })];
        }
        return [];
    }
}

module.exports = ApprovalResolver;
