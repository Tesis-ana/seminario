const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Atencion = sequelize.define('atencion', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  paciente_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'paciente',
      key: 'id'
    }
  },
  profesional_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'profesional',
      key: 'id'
    }
  },
  fecha_atencion: { type: DataTypes.DATE }
});

module.exports = Atencion;
