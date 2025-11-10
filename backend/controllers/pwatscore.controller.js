const db = require('../models');
const Op = db.Sequelize.Op;
const path = require('path');
const childProcess = require('child_process');

// Usar spawn del módulo child_process por defecto; se puede sobreescribir en tests
let spawn = childProcess.spawn;
function __setSpawn(fn) {
    spawn = fn;
}

const listarPwatscores = async (req, res) => {
    try {
        const data = await db.PWATScore.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al listar pwatscores.',
            err,
        });
    }
};

const predecirPwatscore = async (req, res) => {
    try {
        const { id } = req.body;
        const imagen = await db.Imagen.findOne({ where: { id } });
        if (!imagen) {
            return res.status(404).json({ message: 'La imagen no existe.' });
        }
        const segmentacion = await db.Segmentacion.findOne({
            where: { imagen_id: id },
        });
        if (!segmentacion) {
            return res.status(404).json({
                message: 'La segmentación no existe para esta imagen.',
            });
        }

        const scriptPath = path.join(__dirname, '../../categorizador/PWAT.py');
        const baseArgs = [
            scriptPath,
            '--mode',
            'predecir',
            '--image_path',
            imagen.nombre_archivo,
            '--mask_path',
            path.basename(segmentacion.ruta_mascara),
        ];

        // Validar que los archivos de imagen y máscara existen y no están vacíos
        const fs = require('fs');
        const { IMGS_DIR, MASKS_DIR } = require('./utils/fileUpload');
        const imagenPathOnDisk = path.join(IMGS_DIR, imagen.nombre_archivo);
        const maskPathOnDisk = path.join(
            MASKS_DIR,
            path.basename(segmentacion.ruta_mascara)
        );

        try {
            if (!fs.existsSync(imagenPathOnDisk)) {
                return res.status(404).json({
                    message: 'Archivo de imagen no encontrado en el disco.',
                    path: imagenPathOnDisk,
                });
            }
            if (!fs.existsSync(maskPathOnDisk)) {
                return res.status(404).json({
                    message: 'Archivo de máscara no encontrado en el disco.',
                    path: maskPathOnDisk,
                });
            }
            const imgStat = fs.statSync(imagenPathOnDisk);
            const maskStat = fs.statSync(maskPathOnDisk);
            if (!imgStat.isFile() || imgStat.size === 0) {
                return res.status(400).json({
                    message:
                        'El archivo de imagen está vacío o no es un archivo regular.',
                    path: imagenPathOnDisk,
                });
            }
            if (!maskStat.isFile() || maskStat.size === 0) {
                return res.status(400).json({
                    message:
                        'El archivo de máscara está vacío o no es un archivo regular.',
                    path: maskPathOnDisk,
                });
            }

            // Validación robusta del contenido de la máscara usando sharp
            try {
                const sharp = require('sharp');
                const maskBuffer = fs.readFileSync(maskPathOnDisk);

                // Verificar que la imagen se puede leer y obtener metadatos
                const metadata = await sharp(maskBuffer).metadata();
                if (
                    !metadata.width ||
                    !metadata.height ||
                    metadata.width === 0 ||
                    metadata.height === 0
                ) {
                    return res.status(400).json({
                        message:
                            'La máscara no es una imagen válida o tiene dimensiones inválidas.',
                        path: maskPathOnDisk,
                    });
                }

                // Verificar el formato de la imagen
                if (
                    !['jpeg', 'jpg', 'png', 'tiff', 'webp'].includes(
                        metadata.format
                    )
                ) {
                    return res.status(400).json({
                        message: `Formato de máscara no soportado: ${metadata.format}. Use JPEG, PNG, TIFF o WebP.`,
                        path: maskPathOnDisk,
                    });
                }

                const maskStats = await sharp(maskBuffer)
                    .greyscale()
                    .raw()
                    .toBuffer({ resolveWithObject: true });

                // Verificar si la máscara tiene pixeles no-cero (contenido segmentado)
                const hasSegmentation = maskStats.data.some(
                    (pixel) => pixel > 0
                );
                if (!hasSegmentation) {
                    return res.status(400).json({
                        message:
                            'La máscara está vacía (no contiene regiones segmentadas). Por favor, proporcione una máscara válida con contenido segmentado.',
                        path: maskPathOnDisk,
                    });
                }

                console.log(
                    `Máscara validada: ${metadata.width}x${metadata.height}, formato: ${metadata.format}, canales: ${metadata.channels}`
                );

                // Normalizar la máscara para asegurar compatibilidad con OpenCV
                // Convertir a escala de grises de un solo canal y asegurar formato JPEG
                console.log(
                    `Normalizando máscara para compatibilidad con OpenCV...`
                );
                // Crear una imagen de un solo canal para compatibilidad con OpenCV
                // Convertir a escala de grises binaria (0 o 255) para máxima compatibilidad
                console.log(
                    'Convirtiendo a imagen de un solo canal binaria...'
                );
                const normalizedBuffer = await sharp(maskBuffer)
                    .greyscale() // Convertir a escala de grises
                    .normalise() // Normalizar valores al rango completo 0-255
                    .jpeg({ quality: 100, force: true }) // JPEG con máxima calidad
                    .toBuffer();

                // Crear un nombre temporal para la máscara normalizada
                const tempMaskPath = maskPathOnDisk.replace(
                    /\.[^.]+$/,
                    '_normalized.jpg' // Cambiar a .jpg
                );
                fs.writeFileSync(tempMaskPath, normalizedBuffer);

                // Verificar los metadatos de la imagen normalizada
                const metadata_normalized = await sharp(
                    normalizedBuffer
                ).metadata();
                console.log(
                    `Máscara normalizada: ${metadata_normalized.width}x${metadata_normalized.height}, canales: ${metadata_normalized.channels}, espacio: ${metadata_normalized.space}`
                );

                // Actualizar la ruta para usar la máscara normalizada
                baseArgs[baseArgs.length - 1] = path.basename(tempMaskPath);
                console.log(`Usando máscara normalizada: ${tempMaskPath}`);

                // Verificar que el archivo se creó correctamente
                if (!fs.existsSync(tempMaskPath)) {
                    return res.status(500).json({
                        message: 'Error al crear la máscara normalizada.',
                        path: tempMaskPath,
                    });
                }
                console.log(
                    `Máscara normalizada creada exitosamente. Tamaño: ${
                        fs.statSync(tempMaskPath).size
                    } bytes`
                );

                // Verificar que la máscara normalizada tenga contenido
                const normalizedStats = await sharp(normalizedBuffer)
                    .raw()
                    .toBuffer({ resolveWithObject: true });

                const hasSegmentationAfterNormalization =
                    normalizedStats.data.some((pixel) => pixel > 0);
                if (!hasSegmentationAfterNormalization) {
                    return res.status(400).json({
                        message:
                            'La máscara normalizada está vacía. Verifique que la máscara original tenga contenido visible.',
                        path: maskPathOnDisk,
                    });
                }
            } catch (sharpError) {
                console.error('Error validando máscara con sharp:', sharpError);
                return res.status(400).json({
                    message:
                        'Error al validar la máscara. El archivo puede estar corrupto o no ser una imagen válida.',
                    error: sharpError.message,
                    path: maskPathOnDisk,
                });
            }
        } catch (e) {
            console.error('Error comprobando archivos de imagen/mascara:', e);
            return res.status(500).json({
                message:
                    'Error comprobando existencia de archivos de imagen/mascara.',
                error: e.message,
            });
        }

        const envNameRaw = process.env.CATEGORIZADOR_CONDA_ENV;
        const envPrefix = process.env.CATEGORIZADOR_CONDA_PREFIX;
        const envName =
            envNameRaw && envNameRaw.trim().length > 0
                ? envNameRaw.trim()
                : 'radiomics';

        function buildCondaRunArgs() {
            if (envPrefix && envPrefix.trim().length > 0) {
                return ['run', '-p', envPrefix.trim(), 'python', ...baseArgs];
            }
            if (envName.includes('/') || envName.includes('\\')) {
                return ['run', '-p', envName, 'python', ...baseArgs];
            }
            return ['run', '-n', envName, 'python', ...baseArgs];
        }

        function resolveCondaCmd(input) {
            const isWin = process.platform === 'win32';
            const candidate = input || 'conda';
            try {
                if (candidate && require('fs').existsSync(candidate)) {
                    const stat = require('fs').lstatSync(candidate);
                    if (stat.isDirectory()) {
                        if (isWin) {
                            const bat = path.join(candidate, 'conda.bat');
                            const exe = path.join(candidate, 'conda.exe');
                            if (require('fs').existsSync(bat))
                                return { cmd: bat, shell: true };
                            if (require('fs').existsSync(exe))
                                return { cmd: exe, shell: false };
                            return {
                                cmd: path.join(candidate, 'conda'),
                                shell: true,
                            };
                        }
                        return {
                            cmd: path.join(candidate, 'conda'),
                            shell: false,
                        };
                    }
                    if (isWin && /\.bat$/i.test(candidate))
                        return { cmd: candidate, shell: true };
                    return { cmd: candidate, shell: false };
                }
            } catch (e) {
                // ignore
            }
            return { cmd: 'conda', shell: process.platform === 'win32' };
        }

        const forceConda =
            (process.env.CATEGORIZADOR_FORCE_CONDA ?? 'true').toLowerCase() !==
            'false';
        const commandSpecs = [];
        const seenSpecs = new Set();

        function pushCommandSpec(spec) {
            const key = `${spec.cmd}__${spec.args.join(' ')}`;
            if (seenSpecs.has(key)) return;
            commandSpecs.push(spec);
            seenSpecs.add(key);
        }

        const { cmd: condaCmd, shell: condaShell } = resolveCondaCmd(
            process.env.CONDA_BIN
        );
        pushCommandSpec({
            label: 'conda',
            cmd: condaCmd,
            args: buildCondaRunArgs(),
            envPath: process.env.PATH,
            shell: condaShell,
        });

        if (!forceConda) {
            const pythonOverride = process.env.CATEGORIZADOR_PYTHON;
            if (pythonOverride) {
                pushCommandSpec({
                    label: 'custom python',
                    cmd: pythonOverride,
                    args: baseArgs,
                    envPath: process.env.PATH,
                });
            }
            pushCommandSpec({
                label: 'system python',
                cmd: 'python',
                args: baseArgs,
                envPath: process.env.PATH,
            });
        }

        const runCommand = (spec) =>
            new Promise((resolve, reject) => {
                const pathEnv =
                    spec.envPath ??
                    (process.platform === 'win32'
                        ? process.env.PATH
                        : '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
                const proc = spawn(spec.cmd, spec.args, {
                    cwd: path.join(__dirname, '../../categorizador'),
                    shell: Boolean(spec.shell),
                    env: { ...process.env, PATH: pathEnv },
                });

                let stdout = '';
                let stderr = '';

                if (proc.stdout)
                    proc.stdout.on('data', (d) => {
                        stdout += d;
                    });
                if (proc.stderr)
                    proc.stderr.on('data', (d) => {
                        stderr += d;
                    });

                proc.on('error', (error) => {
                    const wrapped = new Error(
                        `Fallo al lanzar el proceso (${spec.cmd}): ${error.message}`
                    );
                    wrapped.code = error.code || error.errno;
                    wrapped.isSpawnError = true;
                    wrapped.originalError = error;
                    reject(wrapped);
                });

                proc.on('close', (code) => {
                    if (code === 0) return resolve(stdout);

                    // Manejar específicamente el error de máscara vacía
                    if (stderr.includes('No labels found in this mask')) {
                        const failure = new Error(
                            'La máscara no contiene regiones segmentadas válidas. Asegúrese de que la máscara tenga contenido y no esté completamente vacía.'
                        );
                        failure.code = code;
                        failure.stderr = stderr;
                        failure.isMaskError = true;
                        reject(failure);
                        return;
                    }

                    // Manejar error de OpenCV con máscara corrupta/inválida
                    if (
                        stderr.includes('cv2.error') &&
                        (stderr.includes('resize') ||
                            stderr.includes('func != 0'))
                    ) {
                        const failure = new Error(
                            'OpenCV no puede procesar la máscara. Esto puede deberse a un formato incompatible o imagen corrupta. La máscara ha sido normalizada automáticamente, pero el error persiste. Verifique que la máscara original sea válida.'
                        );
                        failure.code = code;
                        failure.stderr = stderr;
                        failure.isMaskError = true;
                        reject(failure);
                        return;
                    }

                    const failure = new Error(
                        `El script devolvio codigo ${code}: ${stderr}`
                    );
                    failure.code = code;
                    failure.stderr = stderr;
                    reject(failure);
                });
            });

        const ejecutarScript = async () => {
            let lastError = null;
            for (const spec of commandSpecs) {
                try {
                    const result = await runCommand(spec);
                    return result; // Retornar el stdout aquí
                } catch (error) {
                    lastError = error;
                    if (error.isSpawnError || error.code === 'ENOENT') {
                        console.warn(
                            `predecirPwatscore: comando ${spec.cmd} no disponible (${error.message}).`
                        );
                        continue;
                    }
                    throw error;
                }
            }
            throw (
                lastError ||
                new Error(
                    'No se pudo ejecutar PWAT.py con ninguna estrategia disponible.'
                )
            );
        };

        // Ejecutar
        const stdout = await ejecutarScript();

        // Extraer solo la línea que contiene el JSON válido
        let resultado;
        try {
            // Buscar la última línea que parece ser JSON válido
            const lines = stdout
                .trim()
                .split('\n')
                .filter((line) => line.trim());
            let jsonLine = null;

            // Buscar desde el final hacia atrás la primera línea que sea JSON válido
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (line.startsWith('{') && line.endsWith('}')) {
                    try {
                        JSON.parse(line);
                        jsonLine = line;
                        break;
                    } catch (e) {
                        // Esta línea no es JSON válido, continuar
                        continue;
                    }
                }
            }

            if (!jsonLine) {
                throw new Error('No se encontró JSON válido en la salida');
            }

            resultado = JSON.parse(jsonLine);
        } catch (e) {
            console.error('Error parseando salida del script:', e);
            console.error('Salida completa:', stdout);
            return res.status(500).json({
                message: 'Salida del script no JSON o vacía.',
                error: e.message,
                raw: stdout,
            });
        }

        const pwatscore = await db.PWATScore.create({
            evaluador: 'experto',
            cat3: resultado.Cat3,
            cat4: resultado.Cat4,
            cat5: resultado.Cat5,
            cat6: resultado.Cat6,
            cat7: resultado.Cat7,
            cat8: resultado.Cat8,
            fecha_evaluacion: new Date(),
            observaciones: 'Evaluación realizada automáticamente.',
            imagen_id: imagen.id,
        });
        if (!pwatscore) {
            return res
                .status(500)
                .json({ message: 'Error al crear pwatscore.' });
        }
        return res.status(201).json({
            message: 'Pwatscore creado correctamente.',
            pwatscoreId: pwatscore.id,
            categorias: {
                cat3: pwatscore.cat3,
                cat4: pwatscore.cat4,
                cat5: pwatscore.cat5,
                cat6: pwatscore.cat6,
                cat7: pwatscore.cat7,
                cat8: pwatscore.cat8,
            },
        });
    } catch (err) {
        console.error('Error en predecirPwatscore:', err);

        // Proporcionar mensajes de error más específicos
        if (err.isMaskError) {
            return res.status(400).json({
                message: 'Error con la máscara de segmentación.',
                error: err.message,
                suggestion:
                    'Verifique que la máscara tenga regiones segmentadas válidas (pixeles blancos/no-cero).',
            });
        }

        if (err.isSpawnError) {
            return res.status(500).json({
                message: 'Error al ejecutar el script de predicción.',
                error: err.message,
                suggestion:
                    'Verifique que el entorno Python esté configurado correctamente.',
            });
        }

        return res.status(500).json({
            message: 'Error al crear pwatscore.',
            error: err.message || err,
        });
    }
};

const buscarPwatscore = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.PWATScore.findOne({ where: { imagen_id:id } });
        if (!data) {
            return res.status(404).json({ message: 'El pwatscore no existe.' });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al buscar pwatscore.',
            err,
        });
    }
};

const actualizarPwatscore = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.PWATScore.update(resto, {
            where: { id },
        });
        if (actualizados === 0) {
            return res.status(404).json({
                message: 'El pwatscore no fue encontrado para actualizar.',
            });
        }
        return res
            .status(200)
            .json({ message: 'Pwatscore actualizado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al actualizar pwatscore.',
            err,
        });
    }
};

const eliminarPwatscore = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.PWATScore.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({
                message: 'El pwatscore no fue encontrado para eliminar.',
            });
        }
        return res
            .status(200)
            .json({ message: 'Pwatscore eliminado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al eliminar pwatscore.',
            err,
        });
    }
};

module.exports = {
    listarPwatscores,
    predecirPwatscore,
    buscarPwatscore,
    actualizarPwatscore,
    eliminarPwatscore,
    __setSpawn,
};
