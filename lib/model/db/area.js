"use strict";

module.exports = function (sequelize, DataTypes) {
    var Area = sequelize.define("Area", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {
        classMethods: {
            associate: function (models) {
                Area.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
            }
        }
    });

    return Area;
};
