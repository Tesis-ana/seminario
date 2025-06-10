
const db = require("../models");
const Op = db.Sequelize.Op;

const listarSegmentacions = async (req, res) => {
    try {
        const data = await db.Segmentacion.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al listar segmentacions.",
            err,
        });
    }
};

const crearSegmentacion = async (req, res) => {
    try {
        const data = await db.Segmentacion.create(req.body);
        return res.status(201).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al crear segmentacion.",
            err,
        });
    }
};

const buscarSegmentacion = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.Segmentacion.findOne({ where: { id } });
        if (!data) {
            return res.status(404).json({ message: "El segmentacion no existe." });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al buscar segmentacion.",
            err,
        });
    }
};

const actualizarSegmentacion = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.Segmentacion.update(resto, { where: { id } });
        if (actualizados === 0) {
            return res.status(404).json({ message: "El segmentacion no fue encontrado para actualizar." });
        }
        return res.status(200).json({ message: "Segmentacion actualizado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al actualizar segmentacion.",
            err,
        });
    }
};

const eliminarSegmentacion = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.Segmentacion.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({ message: "El segmentacion no fue encontrado para eliminar." });
        }
        return res.status(200).json({ message: "Segmentacion eliminado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al eliminar segmentacion.",
            err,
        });
    }
};

module.exports = {
    listarSegmentacions,
    crearSegmentacion,
    buscarSegmentacion,
    actualizarSegmentacion,
    eliminarSegmentacion
};
