const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PWATScore = sequelize.define('pwatscore', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    evaluador: { type: DataTypes.ENUM('modelo', 'experto') },
    categoria3: { type: DataTypes.TINYINT },
    categoria4: { type: DataTypes.TINYINT },
    categoria5: { type: DataTypes.TINYINT },
    categoria6: { type: DataTypes.TINYINT },
    categoria7: { type: DataTypes.TINYINT },
    categoria8: { type: DataTypes.TINYINT },
    fecha_evaluacion: { type: DataTypes.DATE },
    observaciones: { type: DataTypes.TEXT }
});

module.exports = PWATScore;
