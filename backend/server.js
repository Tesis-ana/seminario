const express = require('express');
const cors = require('cors');
const app = express();
const db = require('./models/index.js');
const values = require('./config/const.js');
const verifyToken = require('./middleware/auth.middleware.js');

// Configurar CORS para permitir el frontend
app.use(
    cors({
        origin: [
            'http://localhost:3000',
            'http://localhost:5002',
            'http://localhost:8081',
            'http://m4.blocktype.cl:5002',
            'https://m4.blocktype.cl',
            'https://m4.blocktype.cl:5002',
            'https://m3.blocktype.cl:5001',
            'https://android.blocktype.cl',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Verificar token en todas las rutas excepto login, crear usuario y raiz
app.use((req, res, next) => {
    const openPaths = ['/', '/users/login', '/users/crear'];
    const imagenRegex = /^\/imagenes\/\d+\/archivo$/;
    const maskRegex = /^\/segmentaciones\/\d+\/mask$/;
    if (
        openPaths.includes(req.path) ||
        (req.method === 'GET' &&
            (imagenRegex.test(req.path) || maskRegex.test(req.path)))
    ) {
        return next();
    }
    return verifyToken(req, res, next);
});

// Función para conectar a la base de datos con reintentos infinitos
async function connectToDatabase() {
    let attempt = 0;

    while (true) {
        attempt++;
        try {
            await db.sequelize.authenticate();

            // Sincronizar modelos después de conectar
            await db.sequelize.sync({ alter: true });
            console.log('🗄️ Actualización de base de datos lista.');
            return;
        } catch (error) {
            console.error(
                `❌ Error al conectar a la base de datos (Intento ${attempt}):`,
                error.message,
                error
            );
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
}

// Iniciar conexión a la base de datos
connectToDatabase()
    .then(() => {
        // Configurar rutas solo después de conectar a la base de datos
        app.get('/', (req, res) => {
            res.json({ message: 'Aplicación funcionando.' });
        });

        // Importación de Router principal
        require('./routes/main.routes')(app);

        const PORT = values.RUN_PORT || 5001;
        const HOST = values.RUN_HOST || '0.0.0.0'; // Escuchar en todas las interfaces

        app.listen(PORT, HOST, () => {
            console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
            console.log(`🌐 Accesible desde: http://m3.blocktype.cl:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ Error crítico inesperado:', error);
        process.exit(1);
    });
