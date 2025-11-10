const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Paciente = sequelize.define('paciente', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fecha_ingreso: { type: DataTypes.DATEONLY },
    comentarios: { type: DataTypes.TEXT },
    estado: {
        type: DataTypes.ENUM(
            'alta',
            'en_tratamiento',
            'interrumpido',
            'inactivo'
        ),
        allowNull: false,
        defaultValue: 'en_tratamiento',
        comment:
            'Estado del paciente: alta (dado de alta), en_tratamiento (en tratamiento activo), interrumpido (tratamiento interrumpido), inactivo (paciente inactivo)',
    },
    user_id: {
        type: DataTypes.STRING(12),
        allowNull: false,
        unique: true,
        references: { model: 'user', key: 'rut' },
    },
});

module.exports = Paciente;
