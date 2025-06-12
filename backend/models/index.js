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
db.PWATScore = require("./pwatscore.js");

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



db.Imagen.hasMany(db.PWATScore, { foreignKey: 'imagen_id' });
db.PWATScore.belongsTo(db.Imagen, { foreignKey: 'imagen_id' });

module.exports = db;
