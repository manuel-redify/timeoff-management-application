"use strict";

module.exports = function (sequelize, DataTypes) {
    var Project = sequelize.define("Project", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Project', // 'Project' or 'Staff Augmentation'
        },
    }, {
        classMethods: {
            associate: function (models) {
                Project.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
                Project.belongsToMany(models.User, {
                    as: 'users',
                    through: 'UserProject',
                    foreignKey: 'project_id',
                    otherKey: 'user_id',
                });
            }
        }
    });

    return Project;
};
