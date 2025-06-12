const sequelize = require("../config/database");
const Sequelize = require("sequelize");


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
