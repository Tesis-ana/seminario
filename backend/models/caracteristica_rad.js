const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CaracteristicaRad = sequelize.define('caracteristica_rad', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre_caracteristica: { type: DataTypes.STRING(100), allowNull: false },
    valor: { type: DataTypes.FLOAT }
});

module.exports = CaracteristicaRad;
