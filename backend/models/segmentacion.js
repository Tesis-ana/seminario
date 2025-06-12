const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Segmentacion = sequelize.define('segmentacion', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    metodo: { type: DataTypes.ENUM('manual', 'automatica') },
    ruta_mascara: { type: DataTypes.TEXT },
    fecha_creacion: { type: DataTypes.DATE },
    imagen_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'imagen', // Nombre de la tabla referenciada
            key: 'id' // Clave primaria de la tabla referenciada
        }
    }
});

module.exports = Segmentacion;
