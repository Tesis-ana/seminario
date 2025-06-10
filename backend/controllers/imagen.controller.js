const db = require("../models");
const Op = db.Sequelize.Op;

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

const crearImagen = async (req, res) => {
    try {
        const data = await db.Imagen.create(req.body);
        return res.status(201).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al crear imagen.",
            err,
        });
    }
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

module.exports = {
    listarImagens,
    crearImagen,
    buscarImagen,
    actualizarImagen,
    eliminarImagen
};
