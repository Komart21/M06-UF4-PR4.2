const { DataTypes } = require('sequelize');
const { sequelize } = require('./config/database');

//Usuarios
const Usuari = sequelize.define('Usuari', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  telefon: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  tableName: 'usuaris',
  freezeTableName: true,
  timestamps: false,
});

// Peticiones
const Peticio = sequelize.define('Peticio', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  prompt: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  imatges: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'peticions',
  freezeTableName: true,
  timestamps: false,
});

module.exports = { Usuari, Peticio };
