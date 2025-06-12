const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('user', {
  rut: { type: DataTypes.STRING(12),  primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  correo: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  contrasena_hash: { type: DataTypes.STRING(255), allowNull: false },
  rol: { type: DataTypes.ENUM('doctor', 'enfermera', 'admin','paciente','investigador'), allowNull: false },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  fecha_nacimiento: { type: DataTypes.DATEONLY }
});

module.exports = User; // NO exportes como función
  