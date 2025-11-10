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
    const contourRegex = /^\/segmentaciones\/\d+\/contorno$/;
    if (
        openPaths.includes(req.path) ||
        (req.method === 'GET' &&
            (imagenRegex.test(req.path) ||
                maskRegex.test(req.path) ||
                contourRegex.test(req.path)))
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

// Función para crear usuario admin por defecto si no existe
async function createDefaultAdmin() {
    try {
        const bcrypt = require('bcrypt');

        // Verificar si existe al menos un usuario con rol admin
        const adminCount = await db.User.count({
            where: { rol: 'admin' },
        });

        if (adminCount === 0) {
            console.log(
                '⚠️  No se encontró ningún administrador en la base de datos.'
            );
            console.log('📝 Creando usuario administrador por defecto...');

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash('1234', saltRounds);

            await db.User.create({
                rut: '11.111.111-1',
                nombre: 'Administrador',
                correo: 'admin@sistema.cl',
                contrasena_hash: hashedPassword,
                rol: 'admin',
            });

            console.log('✅ Usuario administrador creado exitosamente');
            console.log('   RUT: 11.111.111-1');
            console.log('   Contraseña: 1234');
        } else {
            console.log(
                '✅ Se encontraron',
                adminCount,
                'administrador(es) en la base de datos.'
            );
        }
    } catch (error) {
        console.error(
            '❌ Error al crear usuario administrador por defecto:',
            error.message
        );
    }
}

// Función para instalar dependencias de Python en el entorno virtual
async function installPythonDependencies() {
    const { spawn } = require('child_process');

    try {
        console.log('📦 Verificando dependencias de Python...');

        const envName = process.env.CATEGORIZADOR_CONDA_ENV || 'seminario';
        const condaCmd = process.env.CONDA_BIN || 'conda';
        const packages = ['tqdm', 'tensorflow', 'xgboost'];

        // Construir el comando para instalar paquetes
        const args = ['install', '-n', envName, '-y', '--quiet', ...packages];

        console.log(`🔧 Instalando dependencias en entorno '${envName}'...`);
        console.log(`   Paquetes: ${packages.join(', ')}`);

        return new Promise((resolve, reject) => {
            const process = spawn(condaCmd, args, {
                shell: true,
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            let stdout = '';
            let stderr = '';

            if (process.stdout) {
                process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
            }

            if (process.stderr) {
                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }

            process.on('error', (error) => {
                console.warn(
                    '⚠️  No se pudieron instalar las dependencias de Python:',
                    error.message
                );
                console.warn(
                    '   El sistema continuará, pero puede haber errores al usar el categorizador.'
                );
                resolve(); // No rechazar, solo advertir
            });

            process.on('close', (code) => {
                if (code === 0) {
                    console.log(
                        '✅ Dependencias de Python instaladas correctamente'
                    );
                    resolve();
                } else {
                    console.warn(
                        `⚠️  La instalación de dependencias falló con código ${code}`
                    );
                    if (stderr) {
                        console.warn('   Error:', stderr.trim());
                    }
                    console.warn(
                        '   El sistema continuará, pero puede haber errores al usar el categorizador.'
                    );
                    resolve(); // No rechazar, solo advertir
                }
            });
        });
    } catch (error) {
        console.warn(
            '⚠️  Error al instalar dependencias de Python:',
            error.message
        );
        console.warn(
            '   El sistema continuará, pero puede haber errores al usar el categorizador.'
        );
    }
}

// Iniciar conexión a la base de datos
connectToDatabase()
    .then(async () => {
        // Crear usuario admin por defecto si no existe
        await createDefaultAdmin();

        // Instalar dependencias de Python
        await installPythonDependencies();

        // Configurar rutas solo después de conectar a la base de datos
        app.get('/', (req, res) => {
            res.json({ message: 'Aplicación funcionando.' });
        });

        // Importación de Router principal
        require('./routes/main.routes')(app);

        const PORT = values.RUN_PORT || 5001;
        const HOST = values.RUN_HOST || '0.0.0.0'; // Escuchar en todas las interfaces
        const BACKEND_URL = values.BACKEND_URL || `http://localhost:${PORT}`;

        app.listen(PORT, HOST, () => {
            console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
            console.log(`🌐 Accesible desde: ${BACKEND_URL}`);
        });
    })
    .catch((error) => {
        console.error('❌ Error crítico inesperado:', error);
        process.exit(1);
    });
