"use strict";

module.exports = function (sequelize, DataTypes) {
    var Role = sequelize.define("Role", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        priority_weight: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    }, {
        classMethods: {
            associate: function (models) {
                Role.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
                Role.belongsToMany(models.User, {
                    as: 'users',
                    through: 'UserRoleArea',
                    foreignKey: 'role_id',
                    otherKey: 'user_id',
                });
            }
        }
    });

    return Role;
};
