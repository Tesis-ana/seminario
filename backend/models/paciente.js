const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Paciente = sequelize.define('paciente', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    rut: { type: DataTypes.STRING(12), unique: true, allowNull: false },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    fecha_nacimiento: { type: DataTypes.DATEONLY },
    sexo: { type: DataTypes.ENUM('M', 'F', 'Otro') },
    fecha_ingreso: { type: DataTypes.DATEONLY },
    comentarios: { type: DataTypes.TEXT },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    profesional_id: { type: DataTypes.INTEGER, allowNull: false }
});

module.exports = Paciente;
