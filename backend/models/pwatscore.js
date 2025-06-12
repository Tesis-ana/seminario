const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PWATScore = sequelize.define('pwatscore', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    evaluador: { type: DataTypes.ENUM('modelo', 'experto') },
    categorias: { type: DataTypes.JSON, allowNull: false },
    fecha_evaluacion: { type: DataTypes.DATE },
    observaciones: { type: DataTypes.TEXT },
    imagen_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'imagen', // Nombre de la tabla referenciada
            key: 'id' // Clave primaria de la tabla referenciada
        }
    },
    segmentacion_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'segmentacion', // Nombre de la tabla referenciada
            key: 'id' // Clave primaria de la tabla referenciada
        }
    },
});

module.exports = PWATScore;
