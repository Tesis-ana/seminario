const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Imagen = sequelize.define('imagen', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre_archivo: { type: DataTypes.STRING(255) },
    fecha_captura: { type: DataTypes.DATE, primaryKey: true },
    ruta_archivo: { type: DataTypes.TEXT },
    paciente_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'paciente', // Nombre de la tabla referenciada
            key: 'id' // Clave primaria de la tabla referenciada
        }
    }
});

module.exports = Imagen