
'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const ApprovalResolver = require('../../../../lib/util/approval_resolver');
const Promise = require('bluebird');

describe('ApprovalResolver (Multi-Project Bug Reproduction)', function () {
    let db, resolver;

    beforeEach(function () {
        db = {
            Company: { name: 'Company' },
            ApprovalRule: { findAll: sinon.stub() },
            ApprovalStep: { create: sinon.stub().returns(Promise.resolve({})) },
            UserRoleArea: { findAll: sinon.stub() },
        };
        resolver = new ApprovalResolver(db);
    });

    it('should fallback to department boss for Project B if no PM is found, even if Project A has approvers', function (done) {
        // Setup User
        const user = {
            id: 1,
            companyId: 1,
            contract_type: 'Permanent',
            promise_effective_role: () => Promise.resolve({ id: 10, name: 'Developer' }),
            promise_areas: () => Promise.resolve([]),
            getProjects: () => Promise.resolve([
                { id: 100, name: 'Project A', type: 'Project', getUsers: () => Promise.resolve([]) },
                { id: 200, name: 'Project B', type: 'Staff Augmentation', getUsers: () => Promise.resolve([]) }
            ]),
            getCompany: () => Promise.resolve({}),
            getUser: () => Promise.resolve(user), // recursive for leave.getUser
            getDepartment: () => Promise.resolve({ bossId: 999 })
        };

        const leave = {
            id: 500,
            getUser: () => Promise.resolve(user)
        };

        // Setup Rules
        // Rule for Project (A): Approver is PM
        const ruleProject = {
            id: 1000,
            project_type: 'Project',
            subject_role_id: 10,
            getApprover_role: () => Promise.resolve({ id: 20, name: 'PM' }),
            approver_area_constraint: null,
            team_scope_required: false,
            sequence_order: 1
        };

        // Rule for Staff Augmentation (B): Approver is PM
        const ruleStaffAug = {
            id: 2000,
            project_type: 'Staff Augmentation',
            subject_role_id: 10,
            getApprover_role: () => Promise.resolve({ id: 20, name: 'PM' }),
            approver_area_constraint: null,
            team_scope_required: false,
            sequence_order: 1
        };

        db.ApprovalRule.findAll.callsFake((args) => {
            if (args.where.project_type === 'Project') return Promise.resolve([ruleProject]);
            if (args.where.project_type === 'Staff Augmentation') return Promise.resolve([ruleStaffAug]);
            return Promise.resolve([]);
        });

        // Setup Approvers
        // For PM role (id 20), we only find someone for Project A context? 
        // Actually the resolver logic uses _findCandidateApprovers. 
        // Let's mock UserRoleArea to return a PM for Project A's context (if we used scopes)
        // But here the rule is global for company? 
        // Wait, the user said: "Project 1... with a defined Tech Lead and PM... Project 2 ... no PM defined"

        // This implies generally PMs are defined per project (maybe via Team? or just implied).
        // If the rule has `team_scope_required: true`, then it checks if candidates are in the project.

        ruleProject.team_scope_required = true;
        ruleStaffAug.team_scope_required = true;

        const pmUser = { id: 50, name: 'Project A PM' };

        // When looking for PMs, we find 'pmUser'. 
        // But 'pmUser' is only in Project A.

        db.UserRoleArea.findAll.returns(Promise.resolve([{ User: pmUser }]));

        // Mock getProjects for User (already done above)
        // Mock getUsers for Project A to include pmUser
        const projectA = user.getProjects().value()[0]; // Hacky, but in test we can do better
        // We'll stub the getUsers calls on the project objects returned by user.getProjects

        // We need to ensure the mocks return what we want dynamically
        const projectA_obj = { id: 100, name: 'Project A', type: 'Project', getUsers: () => Promise.resolve([pmUser]) };
        const projectB_obj = { id: 200, name: 'Project B', type: 'Staff Augmentation', getUsers: () => Promise.resolve([]) }; // No PM in Project B

        user.getProjects = () => Promise.resolve([projectA_obj, projectB_obj]);

        resolver.resolveApprovers(leave).then(() => {
            // We expect ApprovalStep.create to be called.
            // 1. For Project A PM (id 50)
            // 2. For Dept Boss (id 999) because Project B missing PM

            const createCalls = db.ApprovalStep.create.getCalls();
            const approverIds = createCalls.map(c => c.args[0].approver_id);

            expect(approverIds).to.include(50, 'Project A PM should be an approver');
            expect(approverIds).to.include(999, 'Department Boss should be an approver (fallback for Project B)');

            done();
        }).catch(done);
    });
});
