'use strict';

const Models = require('./lib/model/db');

async function debugAll() {
    console.log('--- START DIAGNOSTIC ---');

    // 1. All Projects
    const projects = await Models.Project.findAll();
    console.log('\n--- Projects ---');
    projects.forEach(p => console.log(`ID: ${p.id}, Name: ${p.name}, Type: ${p.type}`));

    // 2. All Roles
    const roles = await Models.Role.findAll();
    console.log('\n--- Roles ---');
    roles.forEach(r => console.log(`ID: ${r.id}, Name: ${r.name}`));

    // 3. User Info
    const user = await Models.User.findOne({ where: { email: 'manuel.magnani+stark@redify.co' } });
    if (user) {
        console.log('\n--- User stark (ID: 3) ---');
        console.log('DefaultRoleId:', user.DefaultRoleId);
        const up = await Models.UserProject.findAll({ where: { user_id: user.id } });
        up.forEach(entry => console.log(`UserProject matched: Project ${entry.project_id}, Role ${entry.role_id}`));
    }

    // 4. All Rules
    const rules = await Models.ApprovalRule.findAll({
        include: [
            { model: Models.Role, as: 'subject_role' },
            { model: Models.Role, as: 'approver_role' }
        ]
    });
    console.log('\n--- Approval Rules ---');
    rules.forEach(r => {
        console.log(`ID: ${r.id} | Project Type: ${r.project_type} | Subject: ${r.subject_role ? r.subject_role.name : 'ALL'} (${r.subject_role_id}) | Approver: ${r.approver_role ? r.approver_role.name : 'N/A'} (${r.approver_role_id}) | Seq: ${r.sequence_order} | Team Scope: ${r.team_scope_required}`);
    });

    // 5. Project Memberships for Project 1 and 3
    for (const pid of [1, 3]) {
        console.log(`\n--- Members of Project ${pid} ---`);
        const members = await Models.UserProject.findAll({
            where: { project_id: pid },
            include: [{ model: Models.User }]
        });
        for (const m of members) {
            console.log(`- User: ${m.User.email} (ID: ${m.User.id}) | Role ID in Project: ${m.role_id}`);
            const globalRole = await m.User.getDefault_role();
            console.log(`  Global Role: ${globalRole ? globalRole.name : 'N/A'}`);
        }
    }

    console.log('\n--- END DIAGNOSTIC ---');
    process.exit();
}

debugAll().catch(err => {
    console.error(err);
    process.exit(1);
});
