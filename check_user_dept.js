
const models = require('./lib/model/db');

models.User.findAll({
    include: [{ model: models.Department, as: 'department' }]
}).then(users => {
    const withDept = users.filter(u => u.DepartmentId !== null);
    console.log('Total Users:', users.length);
    console.log('Users with DepartmentId:', withDept.length);

    if (withDept.length > 0) {
        withDept.forEach(u => {
            console.log(`- User ${u.id} (${u.full_name()}): DeptId: ${u.DepartmentId}, DeptProperty: ${u.department ? u.department.name : 'MISSING'}`);
        });
    }
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
