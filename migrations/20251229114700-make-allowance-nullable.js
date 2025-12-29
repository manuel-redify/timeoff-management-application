'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.changeColumn('Departments', 'allowance', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.changeColumn('Departments', 'allowance', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 20,
        });
    }
};
