const db = require('./lib/model/db');

async function checkLatestLeave() {
    try {
        // Get Peter Parker's latest leave request
        const leaves = await db.sequelize.query(
            'SELECT id, userId, status, createdAt FROM Leaves WHERE userId = 4 ORDER BY createdAt DESC LIMIT 1',
            { type: db.sequelize.QueryTypes.SELECT }
        );

        console.log('Latest Leave Request:');
        console.log(JSON.stringify(leaves, null, 2));

        if (leaves.length > 0) {
            // Get approval steps for this leave
            const approvalSteps = await db.sequelize.query(
                'SELECT as2.id, as2.leave_id, as2.approver_id, as2.project_id, as2.status, as2.sequence_order, u.name, u.lastname, p.name as project_name FROM ApprovalSteps as2 LEFT JOIN Users u ON as2.approver_id = u.id LEFT JOIN Projects p ON as2.project_id = p.id WHERE as2.leave_id = ? ORDER BY as2.project_id, as2.sequence_order',
                { replacements: [leaves[0].id], type: db.sequelize.QueryTypes.SELECT }
            );

            console.log('\nApproval Steps for Leave ID ' + leaves[0].id + ':');
            console.log(JSON.stringify(approvalSteps, null, 2));

            // Check if we have steps for both projects
            const project1Steps = approvalSteps.filter(s => s.project_id === 1);
            const project2Steps = approvalSteps.filter(s => s.project_id === 2);

            console.log('\nProject 1 steps:', project1Steps.length);
            console.log('Project 2 steps:', project2Steps.length);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkLatestLeave();
