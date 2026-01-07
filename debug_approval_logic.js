'use strict';

const Models = require('./lib/model/db');
const ApprovalResolver = require('./lib/util/approval_resolver');

async function debugApproval() {
    const user = await Models.User.findOne({
        where: { email: 'manuel.magnani+stark@redify.co' },
        include: [{ model: Models.Company, as: 'company' }]
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('--- User Info ---');
    console.log('ID:', user.id, 'Email:', user.email);
    console.log('DefaultRoleId:', user.DefaultRoleId);

    const projects = await user.getProjects();
    console.log('\n--- Projects Assigned ---');
    for (const project of projects) {
        const up = await Models.UserProject.findOne({
            where: { user_id: user.id, project_id: project.id }
        });
        console.log(`- Project ${project.id}: ${project.name} (${project.type}) | Role ID in Project: ${up.role_id}`);

        const activeRoles = await user.promise_all_active_roles(project);
        console.log('  Active Roles for this project:', activeRoles.map(r => `${r.name} (${r.id})`).join(', '));

        for (const role of activeRoles) {
            const rules = await Models.ApprovalRule.findAll({
                where: {
                    companyId: user.companyId,
                    project_type: project.type,
                    subject_role_id: role.id
                }
            });
            console.log(`  Rules for Role ${role.id}: ${rules.length}`);
            for (const rule of rules) {
                const approverRole = await rule.getApprover_role();
                console.log(`    Rule ID ${rule.id}: Sequence ${rule.sequence_order} | Approver Role: ${approverRole.name} (${approverRole.id})`);

                // Find candidates for this rule
                const usersInRole = await Models.UserRoleArea.findAll({
                    where: { role_id: approverRole.id },
                    include: [{ model: Models.User }]
                });
                const candidates = usersInRole.map(ura => ura.User).filter(u => u);
                console.log(`      Candidates in role ${approverRole.id}:`, candidates.map(c => `${c.email} (${c.id})`).join(', '));

                if (rule.team_scope_required) {
                    const projectUsers = await project.getUsers();
                    const projectUserIds = projectUsers.map(u => u.id);
                    const filtered = candidates.filter(c => projectUserIds.includes(c.id));
                    console.log(`      Filtered by Project Team scope:`, filtered.map(c => `${c.email} (${c.id})`).join(', '));
                }
            }
        }
    }

    const dept = await user.getDepartment();
    console.log('\n--- Department Info ---');
    console.log(`Name: ${dept.name}, Boss ID: ${dept.bossId}`);

    process.exit();
}

debugApproval().catch(err => {
    console.error(err);
    process.exit(1);
});
