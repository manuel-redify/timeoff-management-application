"use strict";

module.exports = function (sequelize, DataTypes) {
    var WatcherRule = sequelize.define("WatcherRule", {
        request_type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'LEAVE',
        },
        project_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        team_scope_required: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        contract_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    }, {
        classMethods: {
            associate: function (models) {
                WatcherRule.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
                WatcherRule.belongsTo(models.Role, { as: 'role', foreignKey: 'role_id' });
                WatcherRule.belongsTo(models.Team, { as: 'team', foreignKey: 'team_id' });
                WatcherRule.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
            }
        }
    });

    return WatcherRule;
};
