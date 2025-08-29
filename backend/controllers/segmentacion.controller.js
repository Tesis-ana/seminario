const db = require('../models');
const { spawn } = require('child_process');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storage = multer.memoryStorage();
// Limitar tamaño y tipo de archivo para subidas seguras
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const upload = multer({
    storage,
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: (req, file, cb) => {
        const ok = file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/pjpeg';
        return ok ? cb(null, true) : cb(new Error('INVALID_FILE_TYPE'));
    }
}).single('imagen');
const Op = db.Sequelize.Op;

// PATH seguro para procesos hijos: solo directorios estándar y no escribibles
const RESOLVED_SAFE_PATH = process.platform === 'win32'
  ? 'C\\Windows\\System32'
  : '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

const listarSegmentacions = async (req, res) => {
    try {
        const data = await db.Segmentacion.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al listar segmentacions.',
            err,
        });
    }
};

const crearSegmentacionManual = (req, res) => {
    upload(req, res, async function (err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ message: 'La imagen excede el tamaño máximo permitido (5MB).' });
            }
            if (err.message === 'INVALID_FILE_TYPE') {
                return res.status(400).json({ message: 'Solo se aceptan imágenes JPG.' });
            }
            return res.status(400).json({ message: 'Error al subir la imagen.' });
        }
        try {
            const { id } = req.body;
            if (!id) {
                return res
                    .status(400)
                    .json({ message: 'El id de imagen es requerido.' });
        }

        const segmentacionExistente = await db.Segmentacion.findOne({
            where: { imagen_id: id },
        });
        if (segmentacionExistente) {
            return res
                .status(400)
                .json({
                    message: 'Ya existe una segmentacion para esta imagen.',
                });
        }

        const imagen = await db.Imagen.findOne({ where: { id } });
        if (!imagen) {
            return res.status(404).json({ message: 'La imagen no existe.' });
        }

        const foto = req.file;
        const formatosPermitidos = ['image/jpeg', 'image/jpg'];

        if (!foto || !formatosPermitidos.includes(foto.mimetype)) {
            return res.status(400).json({
                message:
                    'Formato de imagen no permitido. Solo se aceptan archivos JPG.',
            });
        }
        let filename;

        filename = path.basename(
            imagen.nombre_archivo,
            path.extname(imagen.nombre_archivo)
        );

        const rutaSegmentacion = path.join(
            __dirname,
            '../../categorizador/predicts/masks'
        );
        if (!fs.existsSync(rutaSegmentacion)) {
            fs.mkdirSync(rutaSegmentacion, { recursive: true });
        }
        // Guardar el archivo en la ruta especificada
        fs.writeFileSync(
            path.join(rutaSegmentacion, `${filename}.jpg`),
            foto.buffer
        );
        const rutaArchivo = path.join(rutaSegmentacion, `${filename}.jpg`);

        const segmentacion = await db.Segmentacion.create({
            imagen_id: id,
            ruta_mascara: rutaArchivo,
            metodo: 'manual',
        });
        if (!segmentacion) {
            return res
                .status(500)
                .json({ message: 'Error al crear segmentacion.' });
        }
        await segmentacion.save();
        return res.status(201).json({
            message: 'Segmentacion creada correctamente.',
            segmentacionId: segmentacion.id,
        });
        } catch (err) {
            return res.status(500).json({
                message: 'Error al crear segmentacion.',
                err,
            });
        }
    });
};

const crearSegmentacionAutomatica = async (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res
            .status(400)
            .json({ message: 'El id de imagen es requerido.' });
    }

    // 1) Verificar que exista la imagen en BD
    const imagen = await db.Imagen.findByPk(id);
    if (!imagen) {
        return res.status(404).json({ message: 'La imagen no existe.' });
    }

    // 2) Preparar comando y args
    const scriptDir = path.join(__dirname, '../../categorizador');
    const cmd       = process.env.CONDA_BIN || 'conda';
    const args      = [
    'run', '-n', 'pyradiomics_env12',
    'python', path.join(scriptDir,'PWAT.py'),
    '--mode', 'predecir_mascara',
    '--image_path', imagen.nombre_archivo
    ];

    
    
    // 3) Función para ejecutar el child process como promesa
    const ejecutarScript = () =>
        new Promise((resolve, reject) => {
            const proc = spawn(cmd, args, { cwd: scriptDir, shell: false, env: { ...process.env, PATH: RESOLVED_SAFE_PATH } });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data;
            });
            proc.stderr.on('data', (data) => {
                stderr += data;
            });

            proc.on('error', (err) => {
                // Error al arrancar el proceso (p.ej. conda no en PATH)
                reject(new Error(`Fallo al lanzar el proceso: ${err.message}`));
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(
                        new Error(
                            `El script devolvió código ${code}: ${stderr}`
                        )
                    );
                }
            });
        });

    try {
        // 4) Ejecutar y esperar
        await ejecutarScript();

        // 5) Construir ruta de la máscara generada
        const baseName = path.basename(
            imagen.nombre_archivo,
            path.extname(imagen.nombre_archivo)
        );
        const rutaDirMascara = path.join(
            __dirname,
            '../../categorizador/predicts/masks'
        );
        const rutaMascaraArchivo = path.join(rutaDirMascara, `${baseName}.jpg`);

        // Asegurarnos de que existe el directorio
        if (!fs.existsSync(rutaDirMascara)) {
            fs.mkdirSync(rutaDirMascara, { recursive: true });
        }

        // **Opcional:** podrías comprobar aquí fs.existsSync(rutaMascaraArchivo)
        // y devolver 500 si no existe la máscara.

        // 6) Guardar en la BD
        const segmentacion = await db.Segmentacion.create({
            imagen_id: id,
            ruta_mascara: rutaMascaraArchivo,
            metodo: 'automatica',
        });

        return res.status(201).json({
            message: 'Segmentación automática creada correctamente.',
            segmentacionId: segmentacion.id,
        });
    } catch (err) {
        // Un único catch para errores de spawn o de BD
        console.error('Error en crearSegmentacionAutomatica:', err);
        return res.status(500).json({
            message: 'Error al crear segmentación automática.',
            error: err.message,
        });
    }
};
const editarSegmentacion = (req, res) => {
    upload(req, res, async function (err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ message: 'La imagen excede el tamaño máximo permitido (5MB).' });
            }
            if (err.message === 'INVALID_FILE_TYPE') {
                return res.status(400).json({ message: 'Solo se aceptan imágenes JPG.' });
            }
            return res.status(400).json({ message: 'Error al subir la imagen.' });
        }
        try {
            const { id } = req.body;
        if (!id) {
            return res
                .status(400)
                .json({ message: 'El id de segmentacion es requerido.' });
        }
        const segmentacion = await db.Segmentacion.findOne({ where: { id } });
        if (!segmentacion) {
            return res
                .status(404)
                .json({ message: 'La segmentacion no existe.' });
        }
        const foto = req.file;
        console.log("a");
        if (!foto) {
            return res.status(400).json({ message: 'La imagen es requerida.' });
        }
        console.log("a2");

        const formatosPermitidos = ['image/jpeg', 'image/jpg'];
        if (!formatosPermitidos.includes(foto.mimetype)) {
            return res.status(400).json({
                message:
                    'Formato de imagen no permitido. Solo se aceptan archivos JPG.',
            });
        }
        console.log("a3");

        let filename = path.basename(
            segmentacion.ruta_mascara,
            path.extname(segmentacion.ruta_mascara)
        );
        console.log("a4");

        const rutaSegmentacion = path.join(
            __dirname,
            '../../categorizador/predicts/masks'
        );
        if (!fs.existsSync(rutaSegmentacion)) {
            fs.mkdirSync(rutaSegmentacion, { recursive: true });
        }
        console.log("a5");

        const rutaArchivo = path.join(rutaSegmentacion, `${filename}.jpg`);

        // Actualizar la ruta de la máscara en la base de datos
        segmentacion.ruta_mascara = rutaArchivo;
        console.log("a6");

        await segmentacion.save();
        // Guardar el archivo en la ruta especificada
        const filePath = path.join(rutaSegmentacion, `${filename}.jpg`);
        fs.writeFileSync(filePath, foto.buffer);
        console.log("a7");

        return res.status(200).json({
            message: 'Segmentacion editada correctamente.',
            segmentacionId: segmentacion.id,
        });
        } catch (error) {
            return res.status(500).json({
                message: 'Error al editar segmentacion.',
                error,
            });
        }
    });
};

const descargarMascara = async (req, res) => {
    const { id } = req.params;
    try {
        const seg = await db.Segmentacion.findOne({ where: { imagen_id : id } });
        if (!seg) {
            return res.status(404).json({ message: 'Segmentación no encontrada.' });
        }
        return res.sendFile(path.resolve(seg.ruta_mascara));
    } catch (err) {
        return res.status(500).json({
            message: 'Error al obtener máscara.',
            err,
        });
    }
};

const buscarSegmentacion = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.Segmentacion.findOne({ where: { id } });
        if (!data) {
            return res
                .status(404)
                .json({ message: 'El segmentacion no existe.' });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al buscar segmentacion.',
            err,
        });
    }
};

const actualizarSegmentacion = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.Segmentacion.update(resto, {
            where: { id },
        });
        if (actualizados === 0) {
            return res
                .status(404)
                .json({
                    message:
                        'El segmentacion no fue encontrado para actualizar.',
                });
        }
        return res
            .status(200)
            .json({ message: 'Segmentacion actualizado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al actualizar segmentacion.',
            err,
        });
    }
};

const eliminarSegmentacion = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.Segmentacion.destroy({ where: { id } });
        if (eliminados === 0) {
            return res
                .status(404)
                .json({
                    message: 'El segmentacion no fue encontrado para eliminar.',
                });
        }
        return res
            .status(200)
            .json({ message: 'Segmentacion eliminado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al eliminar segmentacion.',
            err,
        });
    }
};

module.exports = {
    listarSegmentacions,
    crearSegmentacionManual,
    buscarSegmentacion,
    actualizarSegmentacion,
    eliminarSegmentacion,
    crearSegmentacionAutomatica,
    editarSegmentacion,
    descargarMascara
};
