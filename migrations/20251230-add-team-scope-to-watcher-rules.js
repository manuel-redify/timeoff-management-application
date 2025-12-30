'use strict';

module.exports = {
    up: function (queryInterface, Sequelize) {
        return queryInterface.addColumn(
            'WatcherRules',
            'team_scope_required',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            }
        );
    },

    down: function (queryInterface, Sequelize) {
        return queryInterface.removeColumn('WatcherRules', 'team_scope_required');
    }
};
