const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Paciente = sequelize.define('paciente', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sexo: { type: DataTypes.ENUM('M', 'F', 'Otro') },
    fecha_ingreso: { type: DataTypes.DATEONLY },
    comentarios: { type: DataTypes.TEXT },
    user_id: { type: DataTypes.STRING(12), allowNull: false, unique: true, references: { model: 'user', key: 'rut' } }
});

module.exports = Paciente;
