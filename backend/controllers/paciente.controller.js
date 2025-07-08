
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
            user_id
        });

        if (profesional_id) {
            await db.Atencion.create({
                paciente_id: nuevoPaciente.id,
                profesional_id,
                fecha_atencion: new Date()
            });
        }

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

const buscarPacienteRut = async (req, res) => {
    const { rut } = req.body;
    try {
        const data = await db.Paciente.findOne({
            where: { user_id: rut },
            include: db.User
        });
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

const listarPacientesProfesional = async (req, res) => {
    const { profesionalId } = req.params;
    try {
        const atenciones = await db.Atencion.findAll({
            where: { profesional_id: profesionalId },
            include: { model: db.Paciente, include: db.User }
        });
        const pacientes = [];
        const seen = new Set();
        for (const at of atenciones) {
            if (at.paciente && !seen.has(at.paciente.id)) {
                pacientes.push(at.paciente);
                seen.add(at.paciente.id);
            }
        }
        return res.status(200).json(pacientes);
    } catch (err) {
        return res.status(500).json({
            message: "Error al listar pacientes.",
            err,
        });
    }
};

const actualizarPaciente = async (req, res) => {
    const { id, profesional_id = null, ...resto } = req.body;
    try {
        if (profesional_id) {
            await db.Atencion.create({
                paciente_id: id,
                profesional_id,
                fecha_atencion: new Date()
            });
        }

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

const obtenerProfesionalPaciente = async (req, res) => {
    const { id } = req.params;
    try {
        const atencion = await db.Atencion.findOne({
            where: { paciente_id: id },
            order: [['fecha_atencion', 'DESC']],
            include: { model: db.Profesional, include: db.User }
        });
        if (!atencion) {
            return res.status(404).json({ message: 'El paciente no posee atenciones.' });
        }
        return res.status(200).json(atencion.profesional);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al obtener profesional del paciente.',
            err,
        });
    }
};

module.exports = {
    listarPacientes,
    crearPaciente,
    buscarPaciente,
    buscarPacienteRut,
    listarPacientesProfesional,
    actualizarPaciente,
    eliminarPaciente,
    obtenerProfesionalPaciente
};
