"use strict";

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Users', 'country', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    .then(() => queryInterface.addColumn('BankHolidays', 'country', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'UK',
    }));
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Users', 'country')
      .then(() => queryInterface.removeColumn('BankHolidays', 'country'));
  }
};
