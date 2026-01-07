"use strict";

module.exports = function (sequelize, DataTypes) {
    var UserProject = sequelize.define("UserProject", {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        project_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        freezeTableName: true,
        tableName: 'UserProject',
        classMethods: {
            associate: function (models) {
                UserProject.belongsTo(models.User, { foreignKey: 'user_id' });
                UserProject.belongsTo(models.Project, { foreignKey: 'project_id' });
                UserProject.belongsTo(models.Role, { as: 'role', foreignKey: 'role_id' });
            }
        }
    });

    return UserProject;
};
