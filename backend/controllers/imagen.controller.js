const db = require("../models");
const Op = db.Sequelize.Op;
const multer = require('multer');
const path  = require('path');
const fs    = require('fs');
const storage = multer.memoryStorage();
const upload  = multer({ storage }).single('imagen');

const listarImagens = async (req, res) => {
    try {
        const data = await db.Imagen.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al listar imagens.",
            err,
        });
    }
};

const listarImagenesPaciente = async (req, res) => {
    const { pacienteId } = req.params;
    try {
        const data = await db.Imagen.findAll({ where: { paciente_id: pacienteId } });
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al listar imagens.',
            err,
        });
    }
};

const subirImagen = (req, res) => {
    upload(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ message: 'Error al subir la imagen.' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha subido ninguna imagen.' });
        }
        try {
            if (!req.file.mimetype.startsWith('image/jpeg')) {
                return res.status(400).json({ message: 'Solo se aceptan imágenes JPG.' });
            }
            // validar paciente
            if (!req.body.id) {
                return res.status(400).json({ message: 'El id del paciente es requerido.' });
            }
            const paciente = await db.Paciente.findByPk(req.body.id);
            if (!paciente) {
                return res.status(404).json({ message: 'El paciente no existe.' });
            }
            // guardar en FS y en BBDD
            const filename    = `${paciente.id}_${Date.now()}.jpg`;
            const imgDir      = path.join(__dirname, '../../categorizador/predicts/imgs');
            if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
            const filePath    = path.join(imgDir, filename);
            fs.writeFileSync(filePath, req.file.buffer);
            const imagen = await db.Imagen.create({
                nombre_archivo: filename,
                fecha_captura:  new Date(),
                ruta_archivo:   filePath,
                paciente_id:    paciente.id
            });
            return res.status(201).json({ message: 'Imagen creada correctamente.', imagen });
        } catch (error) {
            return res.status(500).json({ message: 'Error al crear imagen.', error });
        }
    });
};

const buscarImagen = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.Imagen.findOne({ where: { id } });
        if (!data) {
            return res.status(404).json({ message: "El imagen no existe." });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al buscar imagen.",
            err,
        });
    }
};

const actualizarImagen = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.Imagen.update(resto, { where: { id } });
        if (actualizados === 0) {
            return res.status(404).json({ message: "El imagen no fue encontrado para actualizar." });
        }
        return res.status(200).json({ message: "Imagen actualizado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al actualizar imagen.",
            err,
        });
    }
};

const actualizarImagenArchivo = (req, res) => {
    upload(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ message: 'Error al subir la imagen.' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha subido ninguna imagen.' });
        }
        try {
            const { id } = req.params;
            const imagen = await db.Imagen.findByPk(id);
            if (!imagen) {
                return res.status(404).json({ message: 'Imagen no encontrada.' });
            }
            if (fs.existsSync(imagen.ruta_archivo)) {
                fs.unlinkSync(imagen.ruta_archivo);
            }
            if (!req.file.mimetype.startsWith('image/jpeg')) {
                return res.status(400).json({ message: 'Solo se aceptan imágenes JPG.' });
            }
            const filename = `${imagen.paciente_id}_${Date.now()}.jpg`;
            const imgDir = path.join(__dirname, '../../categorizador/predicts/imgs');
            if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
            const filePath = path.join(imgDir, filename);
            fs.writeFileSync(filePath, req.file.buffer);
            imagen.nombre_archivo = filename;
            imagen.ruta_archivo = filePath;
            imagen.fecha_captura = new Date();
            await imagen.save();
            return res.status(200).json({ message: 'Imagen actualizada correctamente.', imagen });
        } catch (error) {
            return res.status(500).json({ message: 'Error al actualizar imagen.', error });
        }
    });
};

const eliminarImagen = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.Imagen.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({ message: "El imagen no fue encontrado para eliminar." });
        }
        return res.status(200).json({ message: "Imagen eliminado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al eliminar imagen.",
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
        const imgDir      = path.join(__dirname, '../../categorizador/predicts/imgs');
        const filePath    = path.join(imgDir, imagen.nombre_archivo);
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
    buscarImagen,
    actualizarImagen,
    actualizarImagenArchivo,
    eliminarImagen,
    descargarImagen,
    listarImagenesPaciente
};
