const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PWATScore = sequelize.define('pwatscore', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    evaluador: { type: DataTypes.ENUM('modelo', 'experto') },
    puntaje_total: { type: DataTypes.TINYINT },
    fecha_evaluacion: { type: DataTypes.DATE },
    observaciones: { type: DataTypes.TEXT }
});

module.exports = PWATScore;
