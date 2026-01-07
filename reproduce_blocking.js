'use strict';

const
    Models = require('./lib/model/db'),
    Promise = require('bluebird'),
    moment = require('moment');

async function reproduce() {
    console.log('Starting Reproduction...');

    // Setup fresh environment
    const company = await Models.Company.create({ name: 'Repro Co', country: 'GB', start_of_new_year: 1 });
    const roleTL = await Models.Role.create({ name: 'Tech Lead', companyId: company.id });

    const requester = await Models.User.create({ email: 'req@repro.com', password: 'p', name: 'R', lastname: 'R', companyId: company.id });
    const deptBoss = await Models.User.create({ email: 'boss@repro.com', password: 'p', name: 'B', lastname: 'B', companyId: company.id });
    const pmUser = await Models.User.create({ email: 'pm@repro.com', password: 'p', name: 'PM', lastname: 'PM', companyId: company.id });
    const tlUser = await Models.User.create({ email: 'tl@repro.com', password: 'p', name: 'TL', lastname: 'TL', companyId: company.id });

    const proj1 = await Models.Project.create({ name: 'P1', companyId: company.id });
    const proj3 = await Models.Project.create({ name: 'P3', companyId: company.id });

    const leaveType = await Models.LeaveType.create({ name: 'H', companyId: company.id });
    const leave = await Models.Leave.create({
        userId: requester.id, leaveTypeId: leaveType.id, status: 1,
        date_start: moment.utc().add(1, 'day').format('YYYY-MM-DD'),
        date_end: moment.utc().add(1, 'day').format('YYYY-MM-DD')
    });

    // Create Steps Manually to Simulate the State
    // Project 1: Dept Boss (Seq Null) - PENDING
    await Models.ApprovalStep.create({
        leave_id: leave.id, approver_id: deptBoss.id, project_id: proj1.id,
        status: 1, sequence_order: null // simulating fallback
    });

    // Project 3: TL (Seq 1) - APPROVED
    await Models.ApprovalStep.create({
        leave_id: leave.id, approver_id: tlUser.id, project_id: proj3.id,
        status: 2, sequence_order: 1
    });

    // Project 3: PM (Seq 2) - PENDING
    await Models.ApprovalStep.create({
        leave_id: leave.id, approver_id: pmUser.id, project_id: proj3.id,
        status: 1, sequence_order: 2
    });

    // Now, check if PM can see the leave
    const actionableLeaves = await pmUser.promise_leaves_to_be_processed();
    const found = actionableLeaves.find(l => l.id === leave.id);

    if (found) {
        console.log('PM CAN see the leave. Not blocked.');
    } else {
        console.log('PM CANNOT see the leave. BLOCKED by Project 1!');
    }

    process.exit();
}

reproduce().catch(err => {
    console.error(err);
    process.exit(1);
});
