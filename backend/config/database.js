const { Sequelize } = require('sequelize');
const values = require('./const');
// Variables de conexión (puedes usar dotenv si prefieres)


const sequelize = new Sequelize(values.DB_NAME, values.DB_USER, values.DB_PASSWORD, {
    host: values.DB_HOST,
    port: values.DB_PORT,
    dialect: 'mysql',
    logging: false, // true para debug
    define: {
        timestamps: false, // desactiva createdAt/updatedAt automáticos
        freezeTableName: true // evita pluralización automática
    },
    pool: {
        max: values.DB_POOL_MAX,
        min: values.DB_POOL_MIN,
        acquire: values.DB_POOL_ACQUIRE,
        idle: values.DB_POOL_IDLE
    }
});

// Verifica conexión
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a la base de datos establecida correctamente.');
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error);
    }
})();

module.exports = sequelize;
