const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Segmentacion = sequelize.define('segmentacion', {
    metodo: { type: DataTypes.ENUM('manual', 'automatica') },
    ruta_mascara: { type: DataTypes.TEXT },
    fecha_creacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    imagen_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'imagen', // Nombre de la tabla referenciada
            key: 'id' // Clave primaria de la tabla referenciada
        },
        primaryKey: true // Definir como clave primaria
    }
});

module.exports = Segmentacion;
