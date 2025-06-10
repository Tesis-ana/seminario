const express = require('express');
const cors = require('cors');
const app = express();

// Configuración
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Parseo JSON

// Conexión a la base de datos
const sequelize = require('./config/database');

// Verificar sincronización de modelos si quieres (modo dev)
sequelize.sync()
    .then(() => {
        console.log('🗄️  Modelos sincronizados con la base de datos.');
    })
    .catch(err => {
        console.error('❌ Error al sincronizar modelos:', err);
    });

// Rutas principales
const mainRoutes = require('./routes/main.routes');
app.use('/api', mainRoutes);

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
