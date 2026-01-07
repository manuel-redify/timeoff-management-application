'use strict';

const Models = require('./lib/model/db');

async function debugKurosaki() {
    const user = await Models.User.findOne({
        where: { email: 'manuel.magnani+kurosaki@redify.co' },
        include: [{ model: Models.Company, as: 'company' }]
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`User: ${user.email} (ID: ${user.id})`);
    console.log(`DefaultRoleId: ${user.DefaultRoleId}`);

    const uras = await Models.UserRoleArea.findAll({
        where: { user_id: user.id },
        include: [{ model: Models.Role }]
    });

    console.log('\n--- UserRoleArea Assignments ---');
    uras.forEach(ura => {
        console.log(`Role: ${ura.Role ? ura.Role.name : 'N/A'} (ID: ${ura.role_id})`);
    });

    process.exit();
}

debugKurosaki().catch(err => {
    console.error(err);
    process.exit(1);
});
