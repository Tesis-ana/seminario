const sequelize = require("../config/database");
const Sequelize = require("sequelize");


const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Importación de modelos
db.User = require("./user.js");
db.Paciente = require("./paciente.js");
db.Profesional = require("./profesional.js");
db.Imagen = require("./imagen.js");
db.Segmentacion = require("./segmentacion.js");
db.PWATScore = require("./pwatscore.js");
db.Atencion = require("./atencion.js");

// Relaciones

db.User.hasOne(db.Paciente, { foreignKey: 'user_id' });
db.Paciente.belongsTo(db.User, { foreignKey: 'user_id' });

db.User.hasOne(db.Profesional, { foreignKey: 'user_id' });
db.Profesional.belongsTo(db.User, { foreignKey: 'user_id' });

db.Profesional.hasMany(db.Paciente, { foreignKey: 'profesional_id' });
db.Paciente.belongsTo(db.Profesional, { foreignKey: 'profesional_id' });

db.Paciente.hasMany(db.Imagen, { foreignKey: 'paciente_id' });
db.Imagen.belongsTo(db.Paciente, { foreignKey: 'paciente_id' });

db.Imagen.hasMany(db.Segmentacion, { foreignKey: 'imagen_id' });
db.Segmentacion.belongsTo(db.Imagen, { foreignKey: 'imagen_id' });

db.Imagen.hasMany(db.PWATScore, { foreignKey: 'imagen_id' });
db.PWATScore.belongsTo(db.Imagen, { foreignKey: 'imagen_id' });

db.Segmentacion.hasMany(db.PWATScore, { foreignKey: 'segmentacion_id' });
db.PWATScore.belongsTo(db.Segmentacion, { foreignKey: 'segmentacion_id' });

db.Paciente.hasMany(db.Atencion, { foreignKey: 'paciente_id' });
db.Atencion.belongsTo(db.Paciente, { foreignKey: 'paciente_id' });

db.Profesional.hasMany(db.Atencion, { foreignKey: 'profesional_id' });
db.Atencion.belongsTo(db.Profesional, { foreignKey: 'profesional_id' });

module.exports = db;
