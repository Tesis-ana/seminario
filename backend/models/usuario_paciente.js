const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UsuarioPaciente = sequelize.define('usuario_paciente', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    correo: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    contrasena_hash: { type: DataTypes.STRING(255), allowNull: false },
    fechaNacimiento: { type: DataTypes.DATE, allowNull: false },
    telefono: { type: DataTypes.STRING(15), allowNull: true },
    direccion: { type: DataTypes.STRING(255), allowNull: true },
    creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

module.exports = UsuarioPaciente;
