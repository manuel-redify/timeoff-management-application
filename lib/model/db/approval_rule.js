"use strict";

module.exports = function (sequelize, DataTypes) {
    var ApprovalRule = sequelize.define("ApprovalRule", {
        request_type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'LEAVE',
        },
        project_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        approver_area_constraint: {
            type: DataTypes.STRING,
            allowNull: true, // 'SAME_AS_SUBJECT' or NULL
        },
        team_scope_required: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        sequence_order: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        classMethods: {
            associate: function (models) {
                ApprovalRule.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
                ApprovalRule.belongsTo(models.Role, { as: 'subject_role', foreignKey: 'subject_role_id' });
                ApprovalRule.belongsTo(models.Area, { as: 'subject_area', foreignKey: 'subject_area_id' });
                ApprovalRule.belongsTo(models.Role, { as: 'approver_role', foreignKey: 'approver_role_id' });
            }
        }
    });

    return ApprovalRule;
};
