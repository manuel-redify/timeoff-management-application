'use strict';

const Models = require('./lib/model/db');

async function debugSteps() {
    const user = await Models.User.findOne({ where: { email: 'manuel.magnani+stark@redify.co' } });
    const leaves = await Models.Leave.findAll({
        where: { userId: user.id },
        order: [['id', 'DESC']],
        limit: 1
    });

    if (leaves.length === 0) {
        console.log('No leaves found');
        return;
    }

    const leave = leaves[0];
    console.log(`Leave ID: ${leave.id}, Status: ${leave.status}`);

    const steps = await Models.ApprovalStep.findAll({
        where: { leave_id: leave.id },
        include: [{ model: Models.User, as: 'approver' }, { model: Models.Project, as: 'project' }]
    });

    console.log('\n--- Approval Steps ---');
    steps.forEach(s => {
        console.log(JSON.stringify({
            id: s.id,
            approver: s.approver ? s.approver.email : 'N/A',
            sequence_order: s.sequence_order,
            project_id: s.project_id,
            project_name: s.project ? s.project.name : 'N/A',
            status: s.status
        }, null, 2));
    });

    process.exit();
}

debugSteps().catch(err => {
    console.error(err);
    process.exit(1);
});
