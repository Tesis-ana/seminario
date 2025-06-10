const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Segmentacion = sequelize.define('segmentacion', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    metodo: { type: DataTypes.ENUM('manual', 'automatica') },
    ruta_mascara: { type: DataTypes.TEXT },
    fecha_creacion: { type: DataTypes.DATE }
});

module.exports = Segmentacion;
