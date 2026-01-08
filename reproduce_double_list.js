'use strict';

const
    Models = require('./lib/model/db'),
    Promise = require('bluebird'),
    moment = require('moment'),
    _ = require('underscore');

async function reproduce() {
    console.log('Starting Double Listing Reproduction...');

    const prefix = 'repro_list_' + Date.now();
    const company = await Models.Company.create({ name: prefix + 'Co', country: 'GB', start_of_new_year: 1 });

    const requester = await Models.User.create({ email: prefix + '_req@test.com', password: 'p', name: 'Req', lastname: 'U', companyId: company.id });
    const approver = await Models.User.create({ email: prefix + '_app@test.com', password: 'p', name: 'App', lastname: 'U', companyId: company.id });

    const leaveType = await Models.LeaveType.create({ name: 'H', companyId: company.id });
    const leave = await Models.Leave.create({
        userId: requester.id, leaveTypeId: leaveType.id, status: 1, // New
        date_start: moment.utc().add(10, 'days').format('YYYY-MM-DD'),
        date_end: moment.utc().add(11, 'days').format('YYYY-MM-DD')
    });

    // Create TWO steps for the same approver
    // This simulates having multiple roles
    await Models.ApprovalStep.create({
        leave_id: leave.id, approver_id: approver.id, status: 1
    });

    await Models.ApprovalStep.create({
        leave_id: leave.id, approver_id: approver.id, status: 1
    });

    console.log(`Created 2 steps for user ${approver.email} on leave ${leave.id}`);

    // Call promise_leaves_to_be_processed
    const approverLoaded = await Models.User.findOne({
        where: { id: approver.id },
        include: [{ model: Models.Company, as: 'company' }]
    });

    console.log('Fetching leaves to be processed...');
    const leaves = await approverLoaded.promise_leaves_to_be_processed();

    console.log(`Found ${leaves.length} leaves to process.`);

    const matchingLeaves = leaves.filter(l => l.id === leave.id);
    console.log(`Found ${matchingLeaves.length} instances of the target leave.`);

    if (matchingLeaves.length > 1) {
        console.log('FAIL: Leave is listed multiple times.');
    } else {
        console.log('PASS: Leave is listed only once.');
    }

    process.exit(0);
}

reproduce().catch(err => {
    console.error(err);
    process.exit(1);
});
