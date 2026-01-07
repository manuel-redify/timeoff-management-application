'use strict';

const Models = require('./lib/model/db');

async function debugStark() {
    const user = await Models.User.findOne({ where: { email: 'manuel.magnani+stark@redify.co' } });
    const companyId = user.companyId;

    console.log(`User: ${user.email} (ID: ${user.id})`);
    console.log(`Global Role ID: ${user.DefaultRoleId}`);

    const projects = await user.getProjects();
    for (const p of projects) {
        console.log(`\nProject: ${p.name} (ID: ${p.id}, Type: ${p.type})`);
        const up = await Models.UserProject.findOne({ where: { user_id: user.id, project_id: p.id } });
        console.log(`- Project Role ID: ${up.role_id}`);

        const activeRoles = await user.promise_all_active_roles(p);
        console.log(`- Active Roles: ${activeRoles.map(r => `${r.name} (${r.id})`).join(', ')}`);

        for (const role of activeRoles) {
            const rules = await Models.ApprovalRule.findAll({
                where: { companyId, project_type: p.type, subject_role_id: role.id },
                include: [{ model: Models.Role, as: 'approver_role' }]
            });
            console.log(`  Rules for Role ${role.name} (${role.id}): ${rules.length}`);
            rules.forEach(r => {
                console.log(`    Rule ID ${r.id}: Seq ${r.sequence_order} | Approver Role: ${r.approver_role.name} (${r.approver_role.id})`);
            });
        }
    }

    process.exit();
}

debugStark().catch(err => {
    console.error(err);
    process.exit(1);
});
