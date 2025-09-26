
const db = require("../models");
const getBcrypt = () => require('bcrypt');
const Op = db.Sequelize.Op;
const tokenfunc= require("../middleware/token.middleware.js");

const listarUsers = async (req, res) => {
    try {
        const data = await db.User.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al listar users.",
            err,
        });
    }
};

const saltRounds = 10;

const crearUser = async (req, res) => {
    try {
        const { nombre,correo,contra,rol,rut} = req.body;
        console.log(req.body);
        const bcrypt = getBcrypt();
        const hashedPassword = await bcrypt.hash(contra, saltRounds);
        const data = await db.User.create({ rut,nombre ,correo ,rol, contrasena_hash: hashedPassword });
        return res.status(201).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al crear user.",
            err,
        });
    }
};

const crearUsersBulk = async (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) {
        return res.status(400).json({ message: 'Lista de usuarios requerida' });
    }
    try {
        const bcrypt = getBcrypt();
        for (const u of users) {
            const hashedPassword = await bcrypt.hash(u.contra || '1234', saltRounds);
            await db.User.create({
                rut: u.rut,
                nombre: u.nombre,
                correo: u.correo,
                rol: u.rol,
                contrasena_hash: hashedPassword
            });
        }
        return res.status(201).json({ message: 'Usuarios creados' });
    } catch (err) {
        return res.status(500).json({ message: 'Error al crear usuarios', err });
    }
};



const buscarUser = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.User.findOne({ where: { rut:id } });
        if (!data) {
            return res.status(404).json({ message: "El user no existe." });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al buscar user.",
            err,
        });
    }
};

const actualizarUser = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.User.update(resto, { where: { id } });
        if (actualizados === 0) {
            return res.status(404).json({ message: "El user no fue encontrado para actualizar." });
        }
        return res.status(200).json({ message: "User actualizado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al actualizar user.",
            err,
        });
    }
};

const eliminarUser = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.User.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({ message: "El user no fue encontrado para eliminar." });
        }
        return res.status(200).json({ message: "User eliminado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al eliminar user.",
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
        return res.status(500).json({ message: 'Error al obtener usuario.', err });
    }
};

const login = async (req, res) => {
    const { rut, contra } = req.body;
    console.log(rut,contra)
    try {
        const bcrypt = getBcrypt();
        const user = await db.User.findOne({ where: { rut } });
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        const isPasswordValid = await bcrypt.compare(contra, user.contrasena_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Contraseña incorrecta." });
        }

        const token = await tokenfunc.generarToken(user);
        return res.status(200).json({
            message: "Inicio de sesión exitoso.",
            token:token
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error al iniciar sesión.",
            err,
        });
    }
};

const logout = async (req, res) => {
    const { token } = req.body;
    try {
        const response = await tokenfunc.blacklist(token);
        return res.status(200).json({
            message: "Sesión cerrada exitosamente.",
            response
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error al cerrar sesión.",
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
    logout
};
