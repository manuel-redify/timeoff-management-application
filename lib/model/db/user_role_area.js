"use strict";

module.exports = function (sequelize, DataTypes) {
    var UserRoleArea = sequelize.define("UserRoleArea", {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        area_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        }
    }, {
        freezeTableName: true,
        tableName: 'UserRoleArea',
        classMethods: {
            associate: function (models) {
                UserRoleArea.belongsTo(models.User, { foreignKey: 'user_id' });
                UserRoleArea.belongsTo(models.Role, { foreignKey: 'role_id' });
                UserRoleArea.belongsTo(models.Area, { as: 'Area', foreignKey: 'area_id' });
            }
        }
    });

    return UserRoleArea;
};
