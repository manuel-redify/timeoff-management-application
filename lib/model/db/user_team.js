"use strict";

module.exports = function (sequelize, DataTypes) {
    var UserTeam = sequelize.define("UserTeam", {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        team_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        }
    }, {
        freezeTableName: true,
        tableName: 'UserTeam',
        classMethods: {
            associate: function (models) {
                UserTeam.belongsTo(models.User, { foreignKey: 'user_id' });
                UserTeam.belongsTo(models.Team, { foreignKey: 'team_id' });
            }
        }
    });

    return UserTeam;
};
