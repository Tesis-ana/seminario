const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Profesional = sequelize.define('profesional', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  especialidad: { type: DataTypes.STRING(100) },
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true }
});

module.exports = Profesional;
