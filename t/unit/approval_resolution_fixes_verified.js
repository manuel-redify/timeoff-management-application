'use strict';

const
    Models = require('../../lib/model/db'),
    ApprovalResolver = require('../../lib/util/approval_resolver'),
    Promise = require('bluebird'),
    moment = require('moment');

async function testFixes() {
    console.log('Starting Approval Fixes Verification...');

    try {
        const company = await Models.Company.create({
            name: 'Fixes Test ' + Date.now(),
            country: 'GB',
            start_of_new_year: 1
        });

        const roleTL = await Models.Role.create({ name: 'Tech Lead', companyId: company.id });
        const rolePM = await Models.Role.create({ name: 'PM', companyId: company.id });
        const roleDev = await Models.Role.create({ name: 'Developer', companyId: company.id });

        // Approver 1 (doe) - Global PM
        const doe = await Models.User.create({
            email: 'doe@test' + Date.now() + '.com',
            password: 'password', name: 'John', lastname: 'Doe',
            companyId: company.id, start_date: moment.utc().format('YYYY-MM-DD'),
            DefaultRoleId: rolePM.id
        });
        await Models.UserRoleArea.create({ user_id: doe.id, role_id: rolePM.id });

        // Requester (stark) - Global TL
        const stark = await Models.User.create({
            email: 'stark@test' + Date.now() + '.com',
            password: 'password', name: 'Tony', lastname: 'Stark',
            companyId: company.id, start_date: moment.utc().format('YYYY-MM-DD'),
            DefaultRoleId: roleTL.id
        });
        await Models.UserRoleArea.create({ user_id: stark.id, role_id: roleTL.id });

        // Dept Boss (Admin)
        const admin = await Models.User.create({
            email: 'admin@test' + Date.now() + '.com',
            password: 'password', name: 'Admin', lastname: 'User',
            companyId: company.id, start_date: moment.utc().format('YYYY-MM-DD')
        });

        const dept = await Models.Department.create({
            name: 'Ops', companyId: company.id, bossId: admin.id
        });
        await stark.update({ DepartmentId: dept.id });

        // Project 3 Tech Lead (fury)
        const fury = await Models.User.create({
            email: 'fury@test' + Date.now() + '.com',
            password: 'password', name: 'Nick', lastname: 'Fury',
            companyId: company.id, start_date: moment.utc().format('YYYY-MM-DD'),
            DefaultRoleId: roleTL.id
        });
        await Models.UserRoleArea.create({ user_id: fury.id, role_id: roleTL.id });

        const proj1 = await Models.Project.create({ name: 'Project 1', companyId: company.id, type: 'Project' });
        const proj3 = await Models.Project.create({ name: 'Project 3', companyId: company.id, type: 'Project' });

        // Memberships
        await Models.UserProject.create({ user_id: stark.id, project_id: proj1.id });
        await Models.UserProject.create({ user_id: doe.id, project_id: proj3.id });
        await Models.UserProject.create({ user_id: fury.id, project_id: proj3.id });
        await Models.UserProject.create({ user_id: stark.id, project_id: proj3.id, role_id: roleDev.id });

        // Rules for Project 3
        await Models.ApprovalRule.create({
            companyId: company.id, project_type: 'Project',
            subject_role_id: roleDev.id, approver_role_id: roleTL.id,
            sequence_order: 1, team_scope_required: true
        });
        await Models.ApprovalRule.create({
            companyId: company.id, project_type: 'Project',
            subject_role_id: roleDev.id, approver_role_id: rolePM.id,
            sequence_order: 2, team_scope_required: true
        });

        // Leave Request
        const leaveType = await Models.LeaveType.create({ name: 'Holiday', companyId: company.id, auto_approve: false });
        const leave = await Models.Leave.create({
            userId: stark.id, leaveTypeId: leaveType.id, status: 1,
            date_start: moment.utc().add(1, 'day').format('YYYY-MM-DD'),
            date_end: moment.utc().add(1, 'day').format('YYYY-MM-DD')
        });

        const resolver = new ApprovalResolver(Models);
        const steps = await resolver.resolveApprovers(leave);

        console.log(`Generated ${steps.length} approval steps.`);
        steps.forEach(s => console.log(`Step: Approver ${s.approver_id}, Project ${s.project_id}, Role ${s.role_id}`));

        const stepP1 = steps.find(s => s.project_id === proj1.id);
        const stepsP3 = steps.filter(s => s.project_id === proj3.id);

        if (stepP1 && stepP1.approver_id === admin.id) {
            console.log('SUCCESS: Project 1 correctly fell back to Department Boss.');
        } else {
            console.error('FAILURE: Project 1 fallback failed.');
        }

        if (stepsP3.length === 2 && stepsP3.find(s => s.approver_id === fury.id) && stepsP3.find(s => s.approver_id === doe.id)) {
            console.log('SUCCESS: Project 3 resolved correctly to TL and PM.');
        } else {
            console.error('FAILURE: Project 3 resolution incorrect.');
        }

        if (!steps.find(s => s.approver_id === stark.id)) {
            console.log('SUCCESS: No self-approval detected.');
        } else {
            console.error('FAILURE: Self-approval detected!');
        }

        // Double check last resort fallback
        await Models.ApprovalRule.destroy({ where: { companyId: company.id } });
        await Models.ApprovalStep.destroy({ where: { leave_id: leave.id } });
        const fallbackSteps = await resolver.resolveApprovers(leave);
        if (fallbackSteps.length === 2 && fallbackSteps.every(s => s.approver_id === admin.id)) {
            console.log('SUCCESS: Last resort fallback works for multiple projects.');
        } else {
            console.error(`FAILURE: Last resort fallback failed. Got ${fallbackSteps.length} steps.`);
        }

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit();
    }
}

testFixes();
