const db = require('../models');
const Op = db.Sequelize.Op;

const listarPacientes = async (req, res) => {
    try {
        // Incluir datos del usuario asociado (RUT y nombre)
        const data = await db.Paciente.findAll({
            include: [{ model: db.User, as: 'user' }],
        });
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al listar pacientes.',
            err,
        });
    }
};

const crearPaciente = async (req, res) => {
    try {
        const {
            sexo,
            comentarios = null,
            user_id,
            profesional_id = null,
        } = req.body;
        if (!sexo || !user_id) {
            return res.status(400).json({
                message: 'Los campos sexo y user_id son obligatorios.',
            });
        }
        const fecha_ingreso = new Date();
        const nuevoPaciente = await db.Paciente.create({
            sexo,
            fecha_ingreso,
            comentarios,
            user_id,
        });

        if (profesional_id) {
            await db.Atencion.create({
                paciente_id: nuevoPaciente.id,
                profesional_id,
                fecha_atencion: new Date(),
            });
        }

        return res.status(201).json({
            message: 'Paciente creado correctamente.',
            paciente: nuevoPaciente,
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al crear paciente.',
            err,
        });
    }
};

const buscarPaciente = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.Paciente.findOne({ where: { id } });
        if (!data) {
            return res.status(404).json({ message: 'El paciente no existe.' });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al buscar paciente.',
            err,
        });
    }
};

const buscarPacienteRut = async (req, res) => {
    const { rut } = req.body;
    if (!rut) {
        return res.status(400).json({ message: 'RUT requerido.' });
    }
    // Comparar por RUT formateado o "limpio" indistintamente
    const limpio = rut.replace(/[.-]/g, '');
    try {
        const paciente = await db.Paciente.findOne({
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
            include: [{ model: db.User, as: 'user' }],
        });
        if (!paciente) {
            return res.status(404).json({ message: 'El paciente no existe.' });
        }
        return res.status(200).json(paciente);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al buscar paciente.',
            err,
        });
    }
};

const listarPacientesProfesional = async (req, res) => {
    const { profesionalId } = req.params;
    try {
        const atenciones = await db.Atencion.findAll({
            where: { profesional_id: profesionalId },
            include: {
                model: db.Paciente,
                include: [{ model: db.User, as: 'user' }],
            },
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
            message: 'Error al listar pacientes.',
            err,
        });
    }
};

const actualizarPaciente = async (req, res) => {
    const { id, profesional_id = null, ...resto } = req.body;
    console.log('Actualizar paciente:', req.body);
    try {
        if (profesional_id) {
            await db.Atencion.create({
                paciente_id: id,
                profesional_id,
                fecha_atencion: new Date(),
            });
        }

        const [actualizados] = await db.Paciente.update(resto, {
            where: { id },
        });
        if (actualizados === 0) {
            return res.status(404).json({
                message: 'El paciente no fue encontrado para actualizar.',
            });
        }
        return res
            .status(200)
            .json({ message: 'Paciente actualizado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al actualizar paciente.',
            err,
        });
    }
};

const eliminarPaciente = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.Paciente.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({
                message: 'El paciente no fue encontrado para eliminar.',
            });
        }
        return res
            .status(200)
            .json({ message: 'Paciente eliminado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al eliminar paciente.',
            err,
        });
    }
};

const obtenerPacienteActual = async (req, res) => {
    const rut = req.user?.rut;
    if (!rut) {
        return res.status(400).json({ message: 'RUT no disponible.' });
    }
    try {
        // user_id referencia el RUT, por lo que podemos buscar directamente
        const paciente = await db.Paciente.findOne({
            where: { user_id: rut },
            include: [{ model: db.User, as: 'user' }],
        });
        if (!paciente) {
            return res.status(404).json({ message: 'El paciente no existe.' });
        }
        return res.status(200).json(paciente);
    } catch (err) {
        return res
            .status(500)
            .json({ message: 'Error al obtener paciente.', err });
    }
};

// Crear usuario (si no existe) y paciente en una sola operación
const bcrypt = require('bcrypt');
const { validateRUT, formatRUT } = require('../utils/rut');
const saltRounds = 10;

const agregarPacienteCompleto = async (req, res) => {
    try {
        const {
            rut,
            nombre,
            correo,
            contra, // opcional; si no se envía, se usa el RUT
            sexo,
            fecha_nacimiento, // opcional
            comentarios = null,
            profesional_id = null,
        } = req.body;

        if (!rut || !nombre || !correo || !sexo) {
            return res.status(400).json({
                message:
                    'Los campos rut, nombre, correo y sexo son obligatorios.',
            });
        }

        if (!validateRUT(rut)) {
            return res.status(400).json({ message: 'RUT inválido.' });
        }

        const rutFmt = formatRUT(rut);

        // Upsert de usuario por RUT
        let user = await db.User.findOne({ where: { rut: rutFmt } });
        let userCreado = false;
        if (!user) {
            const hashedPassword = await bcrypt.hash(
                contra || rutFmt,
                saltRounds
            );
            user = await db.User.create({
                rut: rutFmt,
                nombre,
                correo,
                rol: 'paciente',
                contrasena_hash: hashedPassword,
                sexo,
                fecha_nacimiento: fecha_nacimiento || null,
            });
            userCreado = true;
        } else {
            // Actualizar datos básicos si cambian
            await db.User.update(
                {
                    nombre,
                    correo,
                    sexo,
                    fecha_nacimiento: fecha_nacimiento || user.fecha_nacimiento,
                },
                { where: { rut: rutFmt } }
            );
        }

        // Upsert de paciente por user_id (RUT)
        let paciente = await db.Paciente.findOne({
            where: { user_id: rutFmt },
            include: [{ model: db.User, as: 'user' }],
        });
        let pacienteCreado = false;
        if (!paciente) {
            paciente = await db.Paciente.create({
                sexo,
                fecha_ingreso: new Date(),
                comentarios,
                user_id: rutFmt,
            });
            pacienteCreado = true;
        }

        // Registrar atención si se entrega profesional_id
        let atencionCreada = false;
        if (profesional_id) {
            await db.Atencion.create({
                paciente_id: paciente.id,
                profesional_id,
                fecha_atencion: new Date(),
            });
            atencionCreada = true;
        }

        return res.status(201).json({
            message: 'Paciente agregado correctamente.',
            user,
            paciente,
            created: {
                user: userCreado,
                paciente: pacienteCreado,
                atencion: atencionCreada,
            },
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al agregar paciente.',
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
            include: { model: db.Profesional, include: db.User },
        });
        if (!atencion) {
            return res
                .status(404)
                .json({ message: 'El paciente no posee atenciones.' });
        }
        return res.status(200).json(atencion.profesional);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al obtener profesional del paciente.',
            err,
        });
    }
};

const obtenerAtencionesPaciente = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            message: 'El parámetro id del paciente es obligatorio.',
        });
    }

    try {
        const atenciones = await db.Atencion.findAll({
            where: { paciente_id: id },
            order: [['fecha_atencion', 'DESC']],
            include: [
                { model: db.Paciente, include: db.User },
                { model: db.Profesional, include: db.User },
            ],
        });

        if (!atenciones || atenciones.length === 0) {
            return res.status(404).json({
                message: 'No se encontraron atenciones para este paciente.',
            });
        }

        return res.status(200).json(atenciones);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al obtener atenciones del paciente.',
            err,
        });
    }
};

const obtenerPacientePorId = async (req, res) => {
    const { id } = req.params;
    try {
        const paciente = await db.Paciente.findOne({
            where: { id },
            include: [{ model: db.User, as: 'user' }],
        });
        if (!paciente) {
            return res.status(404).json({ message: 'El paciente no existe.' });
        }
        return res.status(200).json(paciente);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al obtener paciente.',
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
    obtenerPacienteActual,
    obtenerProfesionalPaciente,
    obtenerAtencionesPaciente,
    obtenerPacientePorId,
    agregarPacienteCompleto,
};
