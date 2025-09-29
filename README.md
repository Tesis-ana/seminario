# Seminario – Guía para pruebas de sistema

Esta guía resume los requisitos técnicos y operativos que debes preparar antes de ejecutar pruebas de sistema sobre la plataforma. Incluye la arquitectura, dependencias, variables de entorno, datos iniciales y consideraciones clave para validar los recorridos end-to-end descritos en la planificación de pruebas.

## Arquitectura y componentes
- **Backend Express/Sequelize.** Expone servicios REST para usuarios, pacientes, profesionales, imágenes, segmentaciones, puntajes PWAT, atenciones, investigación y categorizador. Todas las rutas pasan por un middleware JWT salvo `/` y `POST /users/login`, además de las descargas públicas de imágenes y máscaras.【F:backend/server.js†L1-L51】【F:backend/routes/main.routes.js†L1-L27】
- **Frontend Next.js 14.** Consume el backend mediante `apiFetch`, que agrega automáticamente el encabezado `Authorization` con el token almacenado en el navegador.【F:frontend/package.json†L1-L13】【F:frontend/lib/api.js†L1-L12】
- **Scripts científicos (Python).** Las segmentaciones automáticas y el cálculo PWAT ejecutan `categorizador/PWAT.py` mediante `conda run`, por lo que se requiere un entorno científico disponible en el host de pruebas.【F:backend/controllers/segmentacion.controller.js†L69-L178】【F:backend/controllers/pwatscore.controller.js†L24-L75】

## Requisitos de software
Instala y verifica las siguientes herramientas en el entorno donde levantarás las pruebas de sistema:

| Componente | Versión sugerida | Uso |
|------------|-----------------|-----|
| Node.js | >= 18 LTS | Ejecutar el backend Express (`npm run dev`/`node server.js`).【F:backend/package.json†L1-L23】 |
| npm | >= 9 | Gestión de dependencias del backend y frontend. |
| Bun | >= 1.1 | Ejecutar las suites de pruebas unitarias existentes (`bun test`).【F:backend/package.json†L5-L9】【F:frontend/package.json†L5-L12】 |
| MySQL/MariaDB | 8.x / 10.x | Motor relacional para Sequelize.【F:backend/config/database.js†L1-L26】 |
| Conda + Python 3.10 | Entorno `pyradiomics_env12` (o equivalente) con dependencias de `PWAT.py`.【F:backend/controllers/pwatscore.controller.js†L33-L53】 |

> **Tip:** `crearSegmentacionAutomatica` soporta sobrescribir el entorno por medio de `CATEGORIZADOR_CONDA_ENV`, `CATEGORIZADOR_CONDA_PREFIX`, `CONDA_BIN` y `CATEGORIZADOR_PYTHON`. Úsalas si tu layout de Conda difiere del esperado.【F:backend/controllers/segmentacion.controller.js†L84-L158】

## Variables de entorno obligatorias
Declara un archivo `.env` en `backend/` (o variables del sistema) con los valores que requiere `config/const.js`:

| Variable | Descripción |
|----------|-------------|
| `RUN_PORT` | Puerto HTTP del backend (por defecto 5000).【F:backend/config/const.js†L3-L24】 |
| `NODE_ENV` | Entorno de ejecución (`development`, `test`, `production`).【F:backend/config/const.js†L3-L24】 |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Credenciales de la base de datos MySQL utilizada por Sequelize.【F:backend/config/const.js†L6-L13】【F:backend/config/database.js†L4-L20】 |
| `DB_DIALECT` | Debe ser `mysql`/`mariadb` para alinear con el driver configurado.【F:backend/config/const.js†L6-L13】 |
| `DB_POOL_MAX`, `DB_POOL_MIN`, `DB_POOL_ACQUIRE`, `DB_POOL_IDLE` | Tamaños y tiempos del pool de conexiones (usa enteros).【F:backend/config/const.js†L6-L24】 |
| `JWT_SECRET` | Clave para firmar y validar tokens JWT.【F:backend/config/const.js†L16-L24】【F:backend/middleware/token.middleware.js†L1-L44】 |
| `MAIL_USER`, `PASS_USER`, `MAIL_PORT` | Credenciales SMTP (reservadas para futuras integraciones).【F:backend/config/const.js†L16-L24】 |
| `CATEGORIZADOR_CONDA_ENV`, `CATEGORIZADOR_CONDA_PREFIX`, `CONDA_BIN`, `CATEGORIZADOR_FORCE_CONDA`, `CATEGORIZADOR_PYTHON` | Opcionales para ajustar la invocación del script científico.【F:backend/controllers/segmentacion.controller.js†L84-L158】 |

Si tu servidor de base de datos escucha en un puerto distinto a 3306, agrega `DB_PORT` al `.env`; Sequelize lo lee desde `database.js`.

## Base de datos y datos iniciales
1. Crea la base de datos vacía con las credenciales anteriores.
2. Arranca el backend una vez para que ejecute `sequelize.authenticate()` y `sequelize.sync({ alter: true })`, generando/actualizando la estructura.【F:backend/server.js†L25-L47】
3. Registra un usuario inicial (por ejemplo, administrador) mediante `POST /users/crear`; las contraseñas se almacenan con `bcrypt` (`contra` → `contrasena_hash`).【F:backend/controllers/user.controller.js†L17-L70】
4. Crea registros asociados de pacientes/profesionales según los flujos que vayas a validar; las relaciones se describen en `models/index.js` y se crean automáticamente en la sincronización.【F:backend/models/index.js†L1-L40】

## Preparación del sistema de archivos
- Las imágenes y máscaras se guardan en `backend/categorizador/predicts/{imgs,masks}`. Crea ambas carpetas con permisos de lectura/escritura para el proceso del backend.【F:backend/controllers/utils/fileUpload.js†L1-L45】【F:backend/controllers/imagen.controller.js†L34-L73】
- El tamaño máximo aceptado está definido por `MAX_IMAGE_SIZE`; actualmente limita a ~200 MB aunque el mensaje de error menciona 5 MB. Ajusta tus pruebas considerando ambos comportamientos (positivo y validación de error).【F:backend/controllers/utils/fileUpload.js†L6-L43】
- El workspace de investigación lee y persiste métricas en `backend/data/metrics.json`, por lo que el usuario del proceso debe poder escribir en ese archivo.【F:backend/data/metrics.json†L1-L5】【F:backend/controllers/investigador.controller.js†L1-L41】

## Servicios externos y scripts
- `POST /segmentaciones/automatico` busca `PWAT.py` dentro del directorio `categorizador/` y genera un archivo `.jpg` por imagen. Valida que la ruta `ruta_mascara` apunte a un archivo existente tras la ejecución.【F:backend/controllers/segmentacion.controller.js†L104-L178】
- `POST /pwatscore` lanza el mismo script con modo `predecir`, tomando la imagen y máscara asociadas. El entorno debe incluir todas las dependencias de radiomics y devolver un JSON serializable.【F:backend/controllers/pwatscore.controller.js†L24-L75】

## Ejecución local recomendada
1. **Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Usa `npm start` en producción; ambos comandos ejecutan `server.js` tras cargar las variables de entorno.【F:backend/package.json†L5-L21】
2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Asegúrate de apuntar `BACKEND_URL` al servidor local (por ejemplo, `http://localhost:5000`) antes de las pruebas end-to-end.【F:frontend/lib/api.js†L1-L12】

## Consideraciones de autenticación y rutas
- El middleware JWT protege todas las rutas salvo `/`, `POST /users/login`, y las descargas `GET /imagenes/:id/archivo` y `GET /segmentaciones/:id/mask`. Incluye el encabezado `Authorization: Bearer <token>` en tus herramientas de prueba para el resto de endpoints.【F:backend/server.js†L9-L24】【F:backend/middleware/auth.middleware.js†L1-L21】
- Los tokens expiran a las 24 h (excepto el usuario maestro con RUT `11.111.111-1`) y pueden invalidarse llamando a `POST /users/logout`, aunque la ruta aún no está registrada en `user.routes.js`; planifica un caso negativo que evidencie la ausencia de ese endpoint.【F:backend/middleware/token.middleware.js†L5-L53】【F:backend/controllers/user.controller.js†L94-L131】【F:backend/routes/user.routes.js†L1-L15】

## Checklist previa a las pruebas de sistema
- [ ] Variables de entorno cargadas y base de datos accesible.
- [ ] Entorno Conda funcional y rutas de `PWAT.py` verificadas.
- [ ] Directorios de imágenes/máscaras creados con permisos correctos.
- [ ] Usuario(s) inicial(es) registrados y credenciales documentadas.
- [ ] Frontend configurado para apuntar al backend bajo prueba.
- [ ] Archivo `metrics.json` con permisos de escritura para las pruebas de investigación.

Con estos preparativos cubiertos podrás ejecutar los escenarios end-to-end (login, paneles, cargas de imagen, segmentación, PWAT, investigación, etc.) con confianza en que los componentes técnicos están listos para las pruebas de sistema.
