'use strict';

module.exports = {
    up: function (queryInterface, Sequelize) {
        return Promise.all([
            queryInterface.addColumn(
                'Users',
                'default_role_id',
                {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'Roles',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL',
                }
            ),
            queryInterface.addColumn(
                'UserProject',
                'role_id',
                {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'Roles',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL',
                }
            ),
            queryInterface.addColumn(
                'ApprovalSteps',
                'role_id',
                {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'Roles',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL',
                }
            ),
        ]);
    },

    down: function (queryInterface, Sequelize) {
        return Promise.all([
            queryInterface.removeColumn('Users', 'default_role_id'),
            queryInterface.removeColumn('UserProject', 'role_id'),
            queryInterface.removeColumn('ApprovalSteps', 'role_id'),
        ]);
    }
};
