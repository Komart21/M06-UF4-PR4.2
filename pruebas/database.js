const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('imagia3', '', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
});

module.exports = { sequelize };
