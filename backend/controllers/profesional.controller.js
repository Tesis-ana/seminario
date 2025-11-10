const db = require('../models');
const Op = db.Sequelize.Op;

const listarProfesionales = async (req, res) => {
    try {
        const data = await db.Profesional.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al listar profesionales.',
            err,
        });
    }
};

const crearProfesional = async (req, res) => {
    try {
        const { especialidad, fecha_ingreso, user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ message: 'user_id es requerido.' });
        }
        if (!especialidad) {
            return res
                .status(400)
                .json({ message: 'especialidad es requerida.' });
        }

        const data = await db.Profesional.create({
            especialidad,
            fecha_ingreso: fecha_ingreso || new Date(),
            user_id,
        });

        return res.status(201).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al crear profesional.',
            err,
        });
    }
};

const crearProfesionalesBulk = async (req, res) => {
    const { profesionales } = req.body;
    if (!Array.isArray(profesionales)) {
        return res
            .status(400)
            .json({ message: 'Lista de profesionales requerida' });
    }
    try {
        for (const p of profesionales) {
            await db.Profesional.create(p);
        }
        return res.status(201).json({ message: 'Profesionales creados' });
    } catch (err) {
        return res
            .status(500)
            .json({ message: 'Error al crear profesionales', err });
    }
};

const buscarProfesional = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.Profesional.findOne({ where: { id } });
        if (!data) {
            return res
                .status(404)
                .json({ message: 'El profesional no existe.' });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al buscar profesional.',
            err,
        });
    }
};

const buscarProfesionalRut = async (req, res) => {
    const { rut } = req.body;
    if (!rut) {
        return res.status(400).json({ message: 'RUT requerido.' });
    }
    const limpio = rut.replace(/[.-]/g, '');
    try {
        const data = await db.Profesional.findOne({
            where: db.Sequelize.where(
                db.Sequelize.fn(
                    'REPLACE',
                    db.Sequelize.fn(
                        'REPLACE',
                        db.Sequelize.col('user_id'),
                        '.',
                        ''
                    ),
                    '-',
                    ''
                ),
                limpio
            ),
        });
        if (!data) {
            return res
                .status(404)
                .json({ message: 'El profesional no existe.' });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al buscar profesional.',
            err,
        });
    }
};

const obtenerProfesionalActual = async (req, res) => {
    const rut = req.user?.rut;
    if (!rut) {
        return res.status(400).json({ message: 'RUT no disponible.' });
    }
    try {
        const data = await db.Profesional.findOne({ where: { user_id: rut } });
        if (!data) {
            return res
                .status(404)
                .json({ message: 'El profesional no existe.' });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al buscar profesional.',
            err,
        });
    }
};

const actualizarProfesional = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.Profesional.update(resto, {
            where: { id },
        });
        if (actualizados === 0) {
            return res.status(404).json({
                message: 'El profesional no fue encontrado para actualizar.',
            });
        }
        return res
            .status(200)
            .json({ message: 'Profesional actualizado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al actualizar profesional.',
            err,
        });
    }
};

const eliminarProfesional = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.Profesional.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({
                message: 'El profesional no fue encontrado para eliminar.',
            });
        }
        return res
            .status(200)
            .json({ message: 'Profesional eliminado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al eliminar profesional.',
            err,
        });
    }
};

const listarPacientesProfesional = async (req, res) => {
    try {
        const userRut = req.user?.rut;
        if (!userRut) {
            return res
                .status(400)
                .json({ message: 'RUT no disponible en el token.' });
        }

        // Buscar el profesional por su RUT
        const profesional = await db.Profesional.findOne({
            where: { user_id: userRut },
        });
        if (!profesional) {
            return res
                .status(404)
                .json({ message: 'Profesional no encontrado.' });
        }

        // Buscar todos los pacientes que han sido atendidos por este profesional
        const pacientesAtendidos = await db.Atencion.findAll({
            where: { profesional_id: profesional.id },
            include: [
                {
                    model: db.Paciente,
                    as: 'paciente',
                    include: [
                        {
                            model: db.User,
                            as: 'user',
                            attributes: [
                                'rut',
                                'nombre',
                                'correo',
                                'sexo',
                                'fecha_nacimiento',
                                
                            ],
                        },
                    ],
                },
            ],
            order: [['fecha_atencion', 'DESC']],
        });

        // Formatear la respuesta para incluir información útil
        const pacientesFormateados = pacientesAtendidos.map((atencion) => ({
            atencion_id:
                atencion.id ||
                `${atencion.paciente_id}_${atencion.profesional_id}`,
            fecha_atencion: atencion.fecha_atencion,
            paciente: {
                id: atencion.paciente.id,
                estado:atencion.paciente.estado,
                rut: atencion.paciente.user.rut,
                nombre: atencion.paciente.user.nombre,
                correo: atencion.paciente.user.correo,
                sexo: atencion.paciente.user.sexo,
                fecha_nacimiento: atencion.paciente.user.fecha_nacimiento,
                estado_salud: atencion.paciente.estado_salud,
                fecha_registro: atencion.paciente.fecha_registro,
            },
        }));

        return res.status(200).json({
            profesional_id: profesional.id,
            total_pacientes: pacientesFormateados.length,
            pacientes: pacientesFormateados,
        });
    } catch (error) {
        console.error('Error al listar pacientes del profesional:', error);
        return res.status(500).json({
            message: 'Error al listar pacientes del profesional.',
            error: error.message,
        });
    }
};

module.exports = {
    listarProfesionales,
    crearProfesional,
    buscarProfesional,
    buscarProfesionalRut,
    obtenerProfesionalActual,
    actualizarProfesional,
    eliminarProfesional,
    crearProfesionalesBulk,
    listarPacientesProfesional,
};
