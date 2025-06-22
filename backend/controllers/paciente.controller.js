
const db = require("../models");
const Op = db.Sequelize.Op;

const listarPacientes = async (req, res) => {
    try {
        const data = await db.Paciente.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al listar pacientes.",
            err,
        });
    }
};

const crearPaciente = async (req, res) => {
    try {
        const { sexo , comentarios = null, user_id , profesional_id = null } = req.body;
        const fecha_ingreso = new Date();
        const nuevoPaciente = await db.Paciente.create({
            sexo,
            fecha_ingreso,
            comentarios,
            user_id,
            profesional_id
        });
        return res.status(201).json({
            message: "Paciente creado correctamente.",
            paciente: nuevoPaciente,
        });


    } catch (err) {
        return res.status(500).json({
            message: "Error al crear paciente.",
            err,
        });
    }
};

const buscarPaciente = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.Paciente.findOne({ where: { id } });
        if (!data) {
            return res.status(404).json({ message: "El paciente no existe." });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al buscar paciente.",
            err,
        });
    }
};

const actualizarPaciente = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.Paciente.update(resto, { where: { id } });
        if (actualizados === 0) {
            return res.status(404).json({ message: "El paciente no fue encontrado para actualizar." });
        }
        return res.status(200).json({ message: "Paciente actualizado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al actualizar paciente.",
            err,
        });
    }
};

const eliminarPaciente = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.Paciente.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({ message: "El paciente no fue encontrado para eliminar." });
        }
        return res.status(200).json({ message: "Paciente eliminado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al eliminar paciente.",
            err,
        });
    }
};

module.exports = {
    listarPacientes,
    crearPaciente,
    buscarPaciente,
    actualizarPaciente,
    eliminarPaciente
};
