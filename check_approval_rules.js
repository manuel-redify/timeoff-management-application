const db = require('./lib/model/db');

async function checkApprovalRules() {
    try {
        // Get all approval rules
        const rules = await db.sequelize.query(
            'SELECT ar.id, ar.project_type, ar.subject_role_id, ar.approver_role_id, ar.approver_area_constraint, ar.team_scope_required, ar.sequence_order, sr.name as subject_role, apr.name as approver_role FROM ApprovalRules ar LEFT JOIN Roles sr ON ar.subject_role_id = sr.id LEFT JOIN Roles apr ON ar.approver_role_id = apr.id ORDER BY ar.project_type, ar.sequence_order',
            { type: db.sequelize.QueryTypes.SELECT }
        );

        console.log('Approval Rules:');
        console.log(JSON.stringify(rules, null, 2));

        // Get Peter Parker's role
        const userRoles = await db.sequelize.query(
            'SELECT ura.user_id, ura.role_id, ura.area_id, r.name as role_name, a.name as area_name FROM UserRoleAreas ura LEFT JOIN Roles r ON ura.role_id = r.id LEFT JOIN Areas a ON ura.area_id = a.id WHERE ura.user_id = 4',
            { type: db.sequelize.QueryTypes.SELECT }
        );

        console.log('\nPeter Parker Roles:');
        console.log(JSON.stringify(userRoles, null, 2));

        // Get all roles
        const allRoles = await db.sequelize.query(
            'SELECT id, name, priority_weight FROM Roles',
            { type: db.sequelize.QueryTypes.SELECT }
        );

        console.log('\nAll Roles:');
        console.log(JSON.stringify(allRoles, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkApprovalRules();
