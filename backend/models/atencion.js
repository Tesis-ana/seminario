const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Atencion = sequelize.define('atencion', {
  paciente_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'paciente',
      key: 'id'
    }
  },
  profesional_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'profesional',
      key: 'id'
    }
  },
  fecha_atencion: { type: DataTypes.DATE }
});

module.exports = Atencion;
