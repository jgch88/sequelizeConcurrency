'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("Count", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      value: {
        type: Sequelize.BIGINT
      },
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("Count");
  }
};
