const db = require('../models');
const Op = db.Sequelize.Op;
const path = require('path');
const fs = require('fs');

const {
    uploadSingleImage: upload,
    uploadMultipleImages: uploadMultiple,
    IMGS_DIR,
    ensureDirExists,
    isJpegMime,
    respondMulterError,
} = require('./utils/fileUpload');

const listarImagens = async (req, res) => {
    try {
        const data = await db.Imagen.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al listar imagens.',
            err,
        });
    }
};

const listarImagenesPaciente = async (req, res) => {
    const { pacienteId } = req.params;
    try {
        const data = await db.Imagen.findAll({
            where: { paciente_id: pacienteId },
        });
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al listar imagens.',
            err,
        });
    }
};

const subirImagen = (req, res) => {
    console.log('Subir imagen called', req.body, req.file);
    upload(req, res, async function (err) {
        if (respondMulterError(err, res)) return;
        if (!req.file) {
            return res
                .status(400)
                .json({ message: 'No se ha subido ninguna imagen.' });
        }
        try {
            if (!isJpegMime(req.file.mimetype)) {
                return res
                    .status(400)
                    .json({ message: 'Solo se aceptan imágenes JPG.' });
            }
            // validar paciente
            if (!req.body.id) {
                return res
                    .status(400)
                    .json({ message: 'El id del paciente es requerido.' });
            }
            const paciente = await db.Paciente.findByPk(req.body.id);
            if (!paciente) {
                return res
                    .status(404)
                    .json({ message: 'El paciente no existe.' });
            }

            // El campo lado ahora es opcional para imágenes individuales
            // Se puede asignar en el momento de la subida o después desde pwatscore
            const lado = req.body.lado !== undefined ? req.body.lado : null;

            // Obtener información del profesional desde el token
            const userRut = req.user.rut; // El RUT viene del token JWT decodificado
            const userRole = req.user.rol;

            // Verificar que sea un profesional (doctor o enfermera)
            if (userRole !== 'doctor' && userRole !== 'enfermera') {
                return res.status(403).json({
                    message:
                        'Solo profesionales pueden subir imágenes de pacientes.',
                });
            }

            // Buscar el profesional por su RUT
            const profesional = await db.Profesional.findOne({
                where: { user_id: userRut },
            });
            if (!profesional) {
                return res.status(404).json({
                    message: 'Profesional no encontrado en el sistema.',
                });
            }

            // guardar en FS y en BBDD
            console.log('tamaño del archivo:', req.file.size);
            const filename = `${paciente.id}_${Date.now()}.jpg`;
            ensureDirExists(IMGS_DIR);
            const filePath = path.join(IMGS_DIR, filename);
            fs.writeFileSync(filePath, req.file.buffer);
            const imagen = await db.Imagen.create({
                nombre_archivo: filename,
                fecha_captura: new Date(),
                ruta_archivo: filePath,
                paciente_id: paciente.id,
                lado: lado, // Ahora puede ser null, false o true
            });

            // Crear automáticamente una atención para este profesional y paciente
            try {
                await db.Atencion.upsert({
                    paciente_id: paciente.id,
                    profesional_id: profesional.id,
                    fecha_atencion: new Date(),
                });
                console.log(
                    `Atención creada automáticamente: Profesional ${profesional.id} - Paciente ${paciente.id}`
                );
            } catch (atencionError) {
                console.error(
                    'Error al crear atención automática:',
                    atencionError
                );
                // No falla la operación si hay error en la atención, solo lo loggeamos
            }

            return res.status(201).json({
                message: 'Imagen creada correctamente y atención registrada.',
                imagen,
                atencion_creada: true,
            });
        } catch (error) {
            return res
                .status(500)
                .json({ message: 'Error al crear imagen.', error });
        }
    });
};

/**
 * Subir múltiples imágenes de un paciente
 * - El campo 'lado' es opcional (puede asignarse después)
 * - Cada imagen se guarda como una tupla individual
 * - Se crea/actualiza una única atención para el profesional y paciente
 */
const subirImagenesMultiples = (req, res) => {
    console.log('Subir imágenes múltiples called', req.body, req.files);
    uploadMultiple(req, res, async function (err) {
        if (respondMulterError(err, res)) return;

        if (!req.files || req.files.length === 0) {
            return res
                .status(400)
                .json({ message: 'No se han subido imágenes.' });
        }

        try {
            // Validar paciente
            if (!req.body.id) {
                return res
                    .status(400)
                    .json({ message: 'El id del paciente es requerido.' });
            }

            const paciente = await db.Paciente.findByPk(req.body.id);
            if (!paciente) {
                return res
                    .status(404)
                    .json({ message: 'El paciente no existe.' });
            }

            // Obtener información del profesional desde el token
            const userRut = req.user.rut;
            const userRole = req.user.rol;

            // Verificar que sea un profesional (doctor o enfermera)
            if (userRole !== 'doctor' && userRole !== 'enfermera') {
                return res.status(403).json({
                    message:
                        'Solo profesionales pueden subir imágenes de pacientes.',
                });
            }

            // Buscar el profesional por su RUT
            const profesional = await db.Profesional.findOne({
                where: { user_id: userRut },
            });
            if (!profesional) {
                return res.status(404).json({
                    message: 'Profesional no encontrado en el sistema.',
                });
            }

            // Validar que todas las imágenes sean JPEG
            for (const file of req.files) {
                if (!isJpegMime(file.mimetype)) {
                    return res.status(400).json({
                        message: `Todas las imágenes deben ser JPG. Archivo inválido: ${file.originalname}`,
                    });
                }
            }

            // Procesar y guardar cada imagen individualmente
            const imagenesCreadas = [];
            const errores = [];

            ensureDirExists(IMGS_DIR);

            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                try {
                    console.log(
                        `Procesando imagen ${i + 1}/${
                            req.files.length
                        }, tamaño: ${file.size}`
                    );

                    const filename = `${paciente.id}_${Date.now()}_${i}.jpg`;
                    const filePath = path.join(IMGS_DIR, filename);

                    // Guardar archivo en el sistema de archivos
                    fs.writeFileSync(filePath, file.buffer);

                    // Crear registro en la base de datos
                    // lado es opcional para múltiples imágenes (valor por defecto: false)
                    const imagen = await db.Imagen.create({
                        nombre_archivo: filename,
                        fecha_captura: new Date(),
                        ruta_archivo: filePath,
                        paciente_id: paciente.id,
                        lado: false, // Por defecto false, se puede actualizar después
                    });

                    imagenesCreadas.push({
                        id: imagen.id,
                        nombre_archivo: imagen.nombre_archivo,
                        fecha_captura: imagen.fecha_captura,
                    });
                } catch (error) {
                    console.error(`Error al procesar imagen ${i + 1}:`, error);
                    errores.push({
                        indice: i + 1,
                        archivo: file.originalname,
                        error: error.message,
                    });
                }
            }

            // Crear/actualizar una única atención para este profesional y paciente
            let atencionCreada = false;
            try {
                await db.Atencion.upsert({
                    paciente_id: paciente.id,
                    profesional_id: profesional.id,
                    fecha_atencion: new Date(),
                });
                atencionCreada = true;
                console.log(
                    `Atención creada/actualizada: Profesional ${profesional.id} - Paciente ${paciente.id}`
                );
            } catch (atencionError) {
                console.error(
                    'Error al crear atención automática:',
                    atencionError
                );
                // No falla la operación si hay error en la atención
            }

            // Preparar respuesta
            const mensaje =
                errores.length > 0
                    ? `${imagenesCreadas.length} imágenes subidas correctamente, ${errores.length} con errores.`
                    : `${imagenesCreadas.length} imágenes subidas correctamente.`;

            return res.status(201).json({
                message: mensaje,
                imagenes_creadas: imagenesCreadas.length,
                imagenes: imagenesCreadas,
                errores: errores.length > 0 ? errores : undefined,
                atencion_creada: atencionCreada,
                nota: 'Las imágenes se guardaron con lado=false por defecto. Puede actualizarse posteriormente.',
            });
        } catch (error) {
            console.error('Error al crear imágenes múltiples:', error);
            return res.status(500).json({
                message: 'Error al crear imágenes.',
                error: error.message,
            });
        }
    });
};

const buscarImagen = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.Imagen.findOne({ where: { id } });
        if (!data) {
            return res.status(404).json({ message: 'El imagen no existe.' });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al buscar imagen.',
            err,
        });
    }
};

const actualizarImagen = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.Imagen.update(resto, { where: { id } });
        if (actualizados === 0) {
            return res.status(404).json({
                message: 'El imagen no fue encontrado para actualizar.',
            });
        }
        return res
            .status(200)
            .json({ message: 'Imagen actualizado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al actualizar imagen.',
            err,
        });
    }
};

const actualizarImagenArchivo = (req, res) => {
    upload(req, res, async function (err) {
        if (respondMulterError(err, res)) return;
        if (!req.file) {
            return res
                .status(400)
                .json({ message: 'No se ha subido ninguna imagen.' });
        }
        try {
            const { id } = req.params;
            const imagen = await db.Imagen.findByPk(id);
            if (!imagen) {
                return res
                    .status(404)
                    .json({ message: 'Imagen no encontrada.' });
            }
            if (fs.existsSync(imagen.ruta_archivo)) {
                fs.unlinkSync(imagen.ruta_archivo);
            }
            if (!isJpegMime(req.file.mimetype)) {
                return res
                    .status(400)
                    .json({ message: 'Solo se aceptan imágenes JPG.' });
            }
            const filename = `${imagen.paciente_id}_${Date.now()}.jpg`;
            ensureDirExists(IMGS_DIR);
            const filePath = path.join(IMGS_DIR, filename);
            fs.writeFileSync(filePath, req.file.buffer);
            imagen.nombre_archivo = filename;
            imagen.ruta_archivo = filePath;
            imagen.fecha_captura = new Date();
            await imagen.save();
            return res
                .status(200)
                .json({ message: 'Imagen actualizada correctamente.', imagen });
        } catch (error) {
            return res
                .status(500)
                .json({ message: 'Error al actualizar imagen.', error });
        }
    });
};

const eliminarImagen = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.Imagen.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({
                message: 'El imagen no fue encontrado para eliminar.',
            });
        }
        return res
            .status(200)
            .json({ message: 'Imagen eliminado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al eliminar imagen.',
            err,
        });
    }
};

const descargarImagen = async (req, res) => {
    const { id } = req.params;
    try {
        const imagen = await db.Imagen.findByPk(id);
        if (!imagen) {
            return res.status(404).json({ message: 'Imagen no encontrada.' });
        }
        ensureDirExists(IMGS_DIR);
        const filePath = path.join(IMGS_DIR, imagen.nombre_archivo);
        return res.sendFile(filePath);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al obtener imagen.',
            err,
        });
    }
};

module.exports = {
    listarImagens,
    subirImagen,
    subirImagenesMultiples,
    buscarImagen,
    actualizarImagen,
    actualizarImagenArchivo,
    eliminarImagen,
    descargarImagen,
    listarImagenesPaciente,
};
