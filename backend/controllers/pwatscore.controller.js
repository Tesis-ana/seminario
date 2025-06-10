
const db = require("../models");
const Op = db.Sequelize.Op;

const listarPwatscores = async (req, res) => {
    try {
        const data = await db.Pwatscore.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al listar pwatscores.",
            err,
        });
    }
};

const crearPwatscore = async (req, res) => {
    try {
        const data = await db.Pwatscore.create(req.body);
        return res.status(201).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al crear pwatscore.",
            err,
        });
    }
};

const buscarPwatscore = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.Pwatscore.findOne({ where: { id } });
        if (!data) {
            return res.status(404).json({ message: "El pwatscore no existe." });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al buscar pwatscore.",
            err,
        });
    }
};

const actualizarPwatscore = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.Pwatscore.update(resto, { where: { id } });
        if (actualizados === 0) {
            return res.status(404).json({ message: "El pwatscore no fue encontrado para actualizar." });
        }
        return res.status(200).json({ message: "Pwatscore actualizado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al actualizar pwatscore.",
            err,
        });
    }
};

const eliminarPwatscore = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.Pwatscore.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({ message: "El pwatscore no fue encontrado para eliminar." });
        }
        return res.status(200).json({ message: "Pwatscore eliminado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al eliminar pwatscore.",
            err,
        });
    }
};

module.exports = {
    listarPwatscores,
    crearPwatscore,
    buscarPwatscore,
    actualizarPwatscore,
    eliminarPwatscore
};
