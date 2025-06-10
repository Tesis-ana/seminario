
const values = require("../config/const.js");
const Sequelize = require("sequelize");
require('dotenv').config();

// Configuración de Sequelize con opciones de reconexión
const sequelize = new Sequelize(values.DB_NAME, values.DB_USER, values.DB_PASSWORD, {
  host: values.DB_HOST,
  dialect: values.DB_DIALECT,
  pool: {
    max: values.DB_POOL_MAX,
    min: values.DB_POOL_MIN,
    acquire: values.DB_POOL_ACQUIRE,
    idle: values.DB_POOL_IDLE
  },
  retry: {
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /ESOCKETTIMEDOUT/,
      /EHOSTUNREACH/,
      /EPIPE/,
      /EAI_AGAIN/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/
    ],
    max: Infinity,
    backoffBase: 5000,
    backoffExponent: 1.5
  }
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Importación de modelos
db.User = require("./user.js");
db.Paciente = require("./paciente.js");
db.UsuarioPaciente = require("./usuario_paciente.js");
db.Imagen = require("./imagen.js");
db.Segmentacion = require("./segmentacion.js");
db.CaracteristicaRad = require("./caracteristica_rad.js");
db.PWATScore = require("./pwatscore.js");
db.PWATScoreDetalle = require("./pwatscore_detalle.js");

// Relaciones

db.User.belongsToMany(db.Paciente, {
  through: db.UsuarioPaciente,
  foreignKey: 'user_id'
});
db.Paciente.belongsToMany(db.User, {
  through: db.UsuarioPaciente,
  foreignKey: 'paciente_id'
});

db.Paciente.hasMany(db.Imagen, { foreignKey: 'paciente_id' });
db.Imagen.belongsTo(db.Paciente, { foreignKey: 'paciente_id' });

db.Imagen.hasMany(db.Segmentacion, { foreignKey: 'imagen_id' });
db.Segmentacion.belongsTo(db.Imagen, { foreignKey: 'imagen_id' });

db.Segmentacion.hasMany(db.CaracteristicaRad, { foreignKey: 'segmentacion_id' });
db.CaracteristicaRad.belongsTo(db.Segmentacion, { foreignKey: 'segmentacion_id' });

db.Imagen.hasMany(db.PWATScore, { foreignKey: 'imagen_id' });
db.PWATScore.belongsTo(db.Imagen, { foreignKey: 'imagen_id' });

db.PWATScore.hasMany(db.PWATScoreDetalle, { foreignKey: 'pwatscore_id' });
db.PWATScoreDetalle.belongsTo(db.PWATScore, { foreignKey: 'pwatscore_id' });

module.exports = db;
