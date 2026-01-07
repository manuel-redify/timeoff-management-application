"use strict";

module.exports = function (sequelize, DataTypes) {
    var ApprovalStep = sequelize.define("ApprovalStep", {
        status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1, // 1: new/pending, 2: approved, 3: rejected
        },
        sequence_order: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        classMethods: {
            associate: function (models) {
                ApprovalStep.belongsTo(models.Leave, { as: 'leave', foreignKey: 'leave_id' });
                ApprovalStep.belongsTo(models.User, { as: 'approver', foreignKey: 'approver_id' });
                ApprovalStep.belongsTo(models.Project, { as: 'project', foreignKey: 'project_id' });
                ApprovalStep.belongsTo(models.Role, { as: 'role', foreignKey: 'role_id' });
            }
        }
    });

    return ApprovalStep;
};
