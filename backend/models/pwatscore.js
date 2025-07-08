const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PWATScore = sequelize.define('pwatscore', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cat1: { type: DataTypes.INTEGER },
    cat2: { type: DataTypes.INTEGER },
    cat3: { type: DataTypes.INTEGER, allowNull: false },
    cat4: { type: DataTypes.INTEGER, allowNull: false },
    cat5: { type: DataTypes.INTEGER, allowNull: false },
    cat6: { type: DataTypes.INTEGER, allowNull: false },
    cat7: { type: DataTypes.INTEGER, allowNull: false },
    cat8: { type: DataTypes.INTEGER, allowNull: false },

    fecha_evaluacion: { type: DataTypes.DATE },
    observaciones: { type: DataTypes.TEXT },
    imagen_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'imagen', // Nombre de la tabla referenciada
            key: 'id' // Clave primaria de la tabla referenciada
        }
    }
});

module.exports = PWATScore;
