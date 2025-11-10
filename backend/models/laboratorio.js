const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Tabla: laboratorio
// Relación: laboratorio.belongsTo(paciente) vía paciente_id
// Campos solicitados: HbA1c, Glucosa, Creatinina, Colesterol, Triglicéridos, Microalbuminuria (flotantes)
const Laboratorio = sequelize.define(
    'laboratorio',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        paciente_id: { type: DataTypes.INTEGER, allowNull: false },
        hba1c: { type: DataTypes.FLOAT, allowNull: true, comment: 'HbA1c' },
        glucosa: { type: DataTypes.FLOAT, allowNull: true },
        creatinina: { type: DataTypes.FLOAT, allowNull: true },
        colesterol: { type: DataTypes.FLOAT, allowNull: true },
        trigliceridos: { type: DataTypes.FLOAT, allowNull: true },
        microalbuminuria: { type: DataTypes.FLOAT, allowNull: true },
    },
    {
        timestamps: false, // La tabla no tiene campos createdAt/updatedAt
    }
);

module.exports = Laboratorio;
