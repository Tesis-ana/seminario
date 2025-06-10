const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PWATScoreDetalle = sequelize.define('pwatscore_detalle', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    categoria: { type: DataTypes.TINYINT },
    puntaje_categoria: { type: DataTypes.TINYINT }
});

module.exports = PWATScoreDetalle;