const db = require('./lib/model/db');

async function checkUserProjects() {
    try {
        // Get Peter Parker's projects
        const userProjects = await db.sequelize.query(
            'SELECT up.user_id, up.project_id, p.name as project_name, p.type as project_type FROM UserProject up JOIN Projects p ON up.project_id = p.id WHERE up.user_id = 4',
            { type: db.sequelize.QueryTypes.SELECT }
        );

        console.log('Peter Parker Project Assignments:');
        console.log(JSON.stringify(userProjects, null, 2));

        // Get his latest leave request
        const leaves = await db.sequelize.query(
            'SELECT id, userId, status, createdAt FROM Leaves WHERE userId = 4 ORDER BY createdAt DESC LIMIT 1',
            { type: db.sequelize.QueryTypes.SELECT }
        );

        console.log('\nLatest Leave Request:');
        console.log(JSON.stringify(leaves, null, 2));

        if (leaves.length > 0) {
            // Get approval steps for this leave
            const approvalSteps = await db.sequelize.query(
                'SELECT as2.id, as2.leave_id, as2.approver_id, as2.project_id, as2.status, u.name, u.lastname FROM ApprovalSteps as2 LEFT JOIN Users u ON as2.approver_id = u.id WHERE as2.leave_id = ?',
                { replacements: [leaves[0].id], type: db.sequelize.QueryTypes.SELECT }
            );

            console.log('\nApproval Steps for Leave ID ' + leaves[0].id + ':');
            console.log(JSON.stringify(approvalSteps, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUserProjects();
