const db = require('../models');
const getBcrypt = () => require('bcrypt');
const Op = db.Sequelize.Op;
const tokenfunc = require('../middleware/token.middleware.js');
const { validateRUT, formatRUT, cleanRUT } = require('../utils/rut');

const listarUsers = async (req, res) => {
    try {
        const data = await db.User.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al listar users.',
            err,
        });
    }
};

const saltRounds = 10;

const crearUser = async (req, res) => {
    try {
        const { nombre, correo, contra, rol, rut } = req.body;

        // Validar RUT
        if (!validateRUT(rut)) {
            return res.status(400).json({
                message:
                    'RUT inválido. Formato esperado: 12.345.678-9 (máximo 12 caracteres)',
            });
        }

        console.log(req.body);
        const bcrypt = getBcrypt();
        const hashedPassword = await bcrypt.hash(contra, saltRounds);

        // Formatear RUT antes de guardar
        const formattedRUT = formatRUT(rut);

        const data = await db.User.create({
            rut: formattedRUT,
            nombre,
            correo,
            rol,
            contrasena_hash: hashedPassword,
        });
        return res.status(201).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al crear user.',
            err,
        });
    }
};

const crearUsersBulk = async (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) {
        return res.status(400).json({ message: 'Lista de usuarios requerida' });
    }

    // Validar RUTs antes de procesar
    const invalidRUTs = [];
    for (let i = 0; i < users.length; i++) {
        if (users[i].rut && !validateRUT(users[i].rut)) {
            invalidRUTs.push({ index: i + 1, rut: users[i].rut });
        }
    }

    if (invalidRUTs.length > 0) {
        return res.status(400).json({
            message: 'RUTs inválidos encontrados',
            invalidRUTs,
        });
    }

    try {
        const bcrypt = getBcrypt();
        for (const u of users) {
            const hashedPassword = await bcrypt.hash(
                u.contra || '1234',
                saltRounds
            );
            await db.User.create({
                rut: formatRUT(u.rut), // Formatear RUT
                nombre: u.nombre,
                correo: u.correo,
                rol: u.rol,
                contrasena_hash: hashedPassword,
            });
        }
        return res.status(201).json({ message: 'Usuarios creados' });
    } catch (err) {
        return res
            .status(500)
            .json({ message: 'Error al crear usuarios', err });
    }
};

const buscarUser = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.User.findOne({ where: { rut: id } });
        if (!data) {
            return res.status(404).json({ message: 'El user no existe.' });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: 'Error al buscar user.',
            err,
        });
    }
};

const actualizarUser = async (req, res) => {
    const { id, ...resto } = req.body;

    // Validar RUT si está presente
    if (resto.rut && !validateRUT(resto.rut)) {
        return res.status(400).json({
            message:
                'RUT inválido. Formato esperado: 12.345.678-9 (máximo 12 caracteres)',
        });
    }

    // Formatear RUT si está presente
    if (resto.rut) {
        resto.rut = formatRUT(resto.rut);
    }

    try {
        const [actualizados] = await db.User.update(resto, { where: { id } });
        if (actualizados === 0) {
            return res
                .status(404)
                .json({
                    message: 'El user no fue encontrado para actualizar.',
                });
        }
        return res
            .status(200)
            .json({ message: 'User actualizado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al actualizar user.',
            err,
        });
    }
};

const eliminarUser = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.User.destroy({ where: { id } });
        if (eliminados === 0) {
            return res
                .status(404)
                .json({ message: 'El user no fue encontrado para eliminar.' });
        }
        return res
            .status(200)
            .json({ message: 'User eliminado correctamente.' });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al eliminar user.',
            err,
        });
    }
};

const obtenerUserActual = async (req, res) => {
    const rut = req.user?.rut;
    if (!rut) {
        return res.status(400).json({ message: 'RUT no disponible.' });
    }
    try {
        const data = await db.User.findOne({ where: { rut } });
        if (!data) {
            return res.status(404).json({ message: 'El usuario no existe.' });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res
            .status(500)
            .json({ message: 'Error al obtener usuario.', err });
    }
};

const login = async (req, res) => {
    const { rut, contra } = req.body;
    console.log(rut, contra);
    try {
        const bcrypt = getBcrypt();
        const user = await db.User.findOne({ where: { rut } });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const isPasswordValid = await bcrypt.compare(
            contra,
            user.contrasena_hash
        );
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Contraseña incorrecta.' });
        }

        const token = await tokenfunc.generarToken(user);
        return res.status(200).json({
            message: 'Inicio de sesión exitoso.',
            token: token,
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al iniciar sesión.',
            err,
        });
    }
};

const logout = async (req, res) => {
    const { token } = req.body;
    try {
        const response = await tokenfunc.blacklist(token);
        return res.status(200).json({
            message: 'Sesión cerrada exitosamente.',
            response,
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Error al cerrar sesión.',
            err,
        });
    }
};

module.exports = {
    listarUsers,
    crearUser,
    buscarUser,
    actualizarUser,
    eliminarUser,
    crearUsersBulk,
    obtenerUserActual,
    login,
    logout,
};
