const db = require("../models");
const Op = db.Sequelize.Op;

const listarProfesionales = async (req, res) => {
    try {
        const data = await db.Profesional.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al listar profesionales.",
            err,
        });
    }
};

const crearProfesional = async (req, res) => {
    try {
        const data = await db.Profesional.create(req.body);
        return res.status(201).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al crear profesional.",
            err,
        });
    }
};

const buscarProfesional = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.Profesional.findOne({ where: { id } });
        if (!data) {
            return res.status(404).json({ message: "El profesional no existe." });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al buscar profesional.",
            err,
        });
    }
};

const buscarProfesionalRut = async (req, res) => {
    const { rut } = req.body;
    try {
        const data = await db.Profesional.findOne({ where: { user_id: rut } });
        if (!data) {
            return res.status(404).json({ message: "El profesional no existe." });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al buscar profesional.",
            err,
        });
    }
};

const actualizarProfesional = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.Profesional.update(resto, { where: { id } });
        if (actualizados === 0) {
            return res.status(404).json({ message: "El profesional no fue encontrado para actualizar." });
        }
        return res.status(200).json({ message: "Profesional actualizado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al actualizar profesional.",
            err,
        });
    }
};

const eliminarProfesional = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.Profesional.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({ message: "El profesional no fue encontrado para eliminar." });
        }
        return res.status(200).json({ message: "Profesional eliminado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al eliminar profesional.",
            err,
        });
    }
};

module.exports = {
    listarProfesionales,
    crearProfesional,
    buscarProfesional,
    buscarProfesionalRut,
    actualizarProfesional,
    eliminarProfesional
};
