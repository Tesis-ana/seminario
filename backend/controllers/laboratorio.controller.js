const db = require('../models');

// Listar todos los registros de laboratorio
const listarLaboratorios = async (req, res) => {
    try {
        const data = await db.Laboratorio.findAll({
            include: [
                {
                    model: db.Paciente,
                    as: 'paciente',
                    include: [{ model: db.User, as: 'user' }],
                },
            ],
            order: [['id', 'DESC']],
        });
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al listar registros de laboratorio.',
            err,
        });
    }
};

// Obtener laboratorios de un paciente específico
const obtenerLaboratoriosPorPaciente = async (req, res) => {
    const { pacienteId } = req.params;
    try {
        const data = await db.Laboratorio.findAll({
            where: { paciente_id: pacienteId },
            order: [['id', 'DESC']],
        });
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al obtener laboratorios del paciente.',
            err,
        });
    }
};

// Obtener un registro de laboratorio por ID
const obtenerLaboratorioPorId = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await db.Laboratorio.findOne({
            where: { id },
            include: [
                {
                    model: db.Paciente,
                    as: 'paciente',
                    include: [{ model: db.User, as: 'user' }],
                },
            ],
        });
        if (!data) {
            return res.status(404).json({
                message: 'Registro de laboratorio no encontrado.',
            });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al obtener registro de laboratorio.',
            err,
        });
    }
};

// Crear un nuevo registro de laboratorio
const crearLaboratorio = async (req, res) => {
    try {
        const {
            paciente_id,
            hba1c = null,
            glucosa = null,
            creatinina = null,
            colesterol = null,
            trigliceridos = null,
            microalbuminuria = null,
        } = req.body;

        if (!paciente_id) {
            return res.status(400).json({
                message: 'El campo paciente_id es obligatorio.',
            });
        }

        // Verificar que el paciente existe
        const paciente = await db.Paciente.findByPk(paciente_id);
        if (!paciente) {
            return res.status(404).json({
                message: 'El paciente no existe.',
            });
        }

        const nuevoLaboratorio = await db.Laboratorio.create({
            paciente_id,
            hba1c,
            glucosa,
            creatinina,
            colesterol,
            trigliceridos,
            microalbuminuria,
        });

        return res.status(201).json({
            message: 'Registro de laboratorio creado correctamente.',
            laboratorio: nuevoLaboratorio,
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al crear registro de laboratorio.',
            err,
        });
    }
};

// Actualizar un registro de laboratorio
const actualizarLaboratorio = async (req, res) => {
    const { id, ...datos } = req.body;

    if (!id) {
        return res.status(400).json({
            message: 'El campo id es obligatorio.',
        });
    }

    try {
        // Verificar que el registro existe primero
        const laboratorioExistente = await db.Laboratorio.findByPk(id);
        if (!laboratorioExistente) {
            return res.status(404).json({
                message:
                    'Registro de laboratorio no encontrado para actualizar.',
            });
        }

        // Filtrar solo los campos que tienen valores definidos (no null ni undefined)
        const datosParaActualizar = {};
        Object.keys(datos).forEach((key) => {
            if (datos[key] !== null && datos[key] !== undefined) {
                datosParaActualizar[key] = datos[key];
            } else {
                // Si se envía explícitamente null, también lo actualizamos
                datosParaActualizar[key] = null;
            }
        });

        const [actualizados] = await db.Laboratorio.update(
            datosParaActualizar,
            {
                where: { id },
            }
        );

        const laboratorioActualizado = await db.Laboratorio.findByPk(id);

        return res.status(200).json({
            message: 'Registro de laboratorio actualizado correctamente.',
            laboratorio: laboratorioActualizado,
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al actualizar registro de laboratorio.',
            err,
        });
    }
};

// Eliminar un registro de laboratorio
const eliminarLaboratorio = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({
            message: 'El campo id es obligatorio.',
        });
    }

    try {
        const eliminados = await db.Laboratorio.destroy({ where: { id } });

        if (eliminados === 0) {
            return res.status(404).json({
                message: 'Registro de laboratorio no encontrado para eliminar.',
            });
        }

        return res.status(200).json({
            message: 'Registro de laboratorio eliminado correctamente.',
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al eliminar registro de laboratorio.',
            err,
        });
    }
};

module.exports = {
    listarLaboratorios,
    obtenerLaboratoriosPorPaciente,
    obtenerLaboratorioPorId,
    crearLaboratorio,
    actualizarLaboratorio,
    eliminarLaboratorio,
};
