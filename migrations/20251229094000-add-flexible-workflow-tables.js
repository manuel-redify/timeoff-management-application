
'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.createTable('Roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      priority_weight: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      companyId: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    .then(() => queryInterface.createTable('Areas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      companyId: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    }))
    .then(() => queryInterface.createTable('Teams', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      companyId: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    }))
    .then(() => queryInterface.createTable('Projects', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.STRING, allowNull: false }, // 'Project' or 'Staff Augmentation'
      companyId: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    }))
    .then(() => queryInterface.createTable('UserRoleArea', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      role_id: { type: Sequelize.INTEGER, allowNull: false },
      area_id: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    }))
    .then(() => queryInterface.createTable('UserTeam', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      team_id: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    }))
    .then(() => queryInterface.createTable('UserProject', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      project_id: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    }))
    .then(() => queryInterface.createTable('ApprovalRules', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      request_type: { type: Sequelize.STRING, allowNull: false },
      project_type: { type: Sequelize.STRING, allowNull: false },
      subject_role_id: { type: Sequelize.INTEGER, allowNull: false },
      subject_area_id: { type: Sequelize.INTEGER, allowNull: true },
      approver_role_id: { type: Sequelize.INTEGER, allowNull: false },
      approver_area_constraint: { type: Sequelize.STRING, allowNull: true }, // 'SAME_AS_SUBJECT' or NULL
      team_scope_required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      sequence_order: { type: Sequelize.INTEGER, allowNull: true },
      companyId: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    }))
    .then(() => queryInterface.createTable('WatcherRules', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      request_type: { type: Sequelize.STRING, allowNull: false },
      project_type: { type: Sequelize.STRING, allowNull: false },
      role_id: { type: Sequelize.INTEGER, allowNull: true },
      team_id: { type: Sequelize.INTEGER, allowNull: true },
      project_id: { type: Sequelize.INTEGER, allowNull: true },
      companyId: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    }))
    .then(() => queryInterface.createTable('ApprovalSteps', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      leave_id: { type: Sequelize.INTEGER, allowNull: false },
      approver_id: { type: Sequelize.INTEGER, allowNull: false },
      status: { type: Sequelize.INTEGER, allowNull: false }, // Use same status codes as Leave (1: new, 2: approved, 3: rejected)
      sequence_order: { type: Sequelize.INTEGER, allowNull: true },
      project_id: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    }))
    .then(() => queryInterface.addColumn('Users', 'contract_type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Employee'
    }));
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Users', 'contract_type')
      .then(() => queryInterface.dropTable('ApprovalSteps'))
      .then(() => queryInterface.dropTable('WatcherRules'))
      .then(() => queryInterface.dropTable('ApprovalRules'))
      .then(() => queryInterface.dropTable('UserProject'))
      .then(() => queryInterface.dropTable('UserTeam'))
      .then(() => queryInterface.dropTable('UserRoleArea'))
      .then(() => queryInterface.dropTable('Projects'))
      .then(() => queryInterface.dropTable('Teams'))
      .then(() => queryInterface.dropTable('Areas'))
      .then(() => queryInterface.dropTable('Roles'));
  }
};
