const db = require('./lib/model/db');

async function checkWatcherRules() {
    try {
        const rules = await db.WatcherRule.findAll({
            include: [
                { model: db.Role, as: 'role' },
                { model: db.Team, as: 'team' },
                { model: db.Project, as: 'project' },
            ]
        });

        console.log('Watcher Rules:');
        rules.forEach(rule => {
            console.log({
                id: rule.id,
                project_type: rule.project_type,
                contract_type: rule.contract_type,
                team_scope_required: rule.team_scope_required,
                role: rule.role ? rule.role.name : null,
                team: rule.team ? rule.team.name : null,
                project: rule.project ? rule.project.name : null,
            });
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkWatcherRules();
