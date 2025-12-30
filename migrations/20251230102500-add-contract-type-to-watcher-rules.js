'use strict';

module.exports = {
    up: function (queryInterface, Sequelize) {
        return queryInterface.addColumn(
            'WatcherRules',
            'contract_type',
            {
                type: Sequelize.STRING,
                allowNull: true,
            }
        );
    },

    down: function (queryInterface, Sequelize) {
        return queryInterface.removeColumn('WatcherRules', 'contract_type');
    }
};
