"use strict";

module.exports = function (sequelize, DataTypes) {
    var Team = sequelize.define("Team", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {
        classMethods: {
            associate: function (models) {
                Team.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
                Team.belongsToMany(models.User, {
                    as: 'users',
                    through: 'UserTeam',
                    foreignKey: 'team_id',
                    otherKey: 'user_id',
                });
            }
        }
    });

    return Team;
};
