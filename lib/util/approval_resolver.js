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

        // 2. Identify effective role
        const role = await user.promise_effective_role();
        if (!role) {
            console.warn(`User ${user.id} has no roles defined. Using default hierarchy.`);
            return this._fallbackToDepartmentBoss(leave, user);
        }

        const areas = await user.promise_areas();
        const projects = await user.getProjects();

        if (projects.length === 0) {
            return this._fallbackToDepartmentBoss(leave, user);
        }

        const allSteps = [];

        // 3. Resolve rules for each project
        for (const project of projects) {
            const rules = await this.db.ApprovalRule.findAll({
                where: {
                    companyId: user.companyId,
                    project_type: project.type,
                    subject_role_id: role.id
                }
            });

            let stepsForProject = 0;

            for (const rule of rules) {
                // Filter by area if required
                if (rule.subject_area_id && !areas.find(a => a.id === rule.subject_area_id)) {
                    continue;
                }

                // Identify candidate approvers
                const candidateApprovers = await this._findCandidateApprovers(rule, project, areas);

                for (const approver of candidateApprovers) {
                    allSteps.push({
                        leave_id: leave.id,
                        approver_id: approver.id,
                        project_id: project.id,
                        sequence_order: rule.sequence_order,
                        status: 1 // Pending
                    });
                    stepsForProject++;
                }
            }

            // Fallback to Department Manager if no approval steps were created for this project
            // This handles both cases:
            // 1. Rules exist but no approvers found (e.g., missing PM)
            // 2. No rules exist for this project type at all
            if (stepsForProject === 0) {
                const department = await user.getDepartment();
                if (department && department.bossId) {
                    allSteps.push({
                        leave_id: leave.id,
                        approver_id: department.bossId,
                        project_id: project.id,
                        status: 1
                    });
                }
            }
        }

        // 4. Persistence
        if (allSteps.length > 0) {
            return Promise.all(allSteps.map(step => this.db.ApprovalStep.create(step)));
        } else {
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

    async _findCandidateApprovers(rule, project, subjectAreas) {
        const approverRole = await rule.getApprover_role();

        // Find users with this role
        const usersInRole = await this.db.UserRoleArea.findAll({
            where: { role_id: approverRole.id },
            include: [{ model: this.db.User }]
        });

        let candidates = usersInRole.map(ura => ura.User);

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
            candidates = approversWithSameArea.map(ura => ura.User);
        }

        // Filter by project/team membership if required
        if (rule.team_scope_required) {
            const projectUsers = await project.getUsers();
            const projectUserIds = projectUsers.map(u => u.id);
            candidates = candidates.filter(c => projectUserIds.includes(c.id));
        }

        return _.uniq(candidates, c => c.id);
    }

    async _fallbackToDepartmentBoss(leave, user) {
        const department = await user.getDepartment();
        if (department && department.bossId) {
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
