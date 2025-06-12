const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Imagen = sequelize.define('imagen', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre_archivo: { type: DataTypes.STRING(255) },
    fecha_captura: { type: DataTypes.DATE, primaryKey: true },
    resolucion: { type: DataTypes.STRING(20) },
    ruta_archivo: { type: DataTypes.TEXT }
});

module.exports = Imagen;
