
const db = require("../models");
const bcrypt = require('bcrypt');
const Op = db.Sequelize.Op;

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
        const { nombre,correo,contra,rol} = req.body;
        console.log(req.body);
        const hashedPassword = await bcrypt.hash(contra, saltRounds);
        const data = await db.User.create({ nombre ,correo ,rol, contrasena_hash: hashedPassword });
        return res.status(201).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al crear user.",
            err,
        });
    }
};

const buscarUser = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.User.findOne({ where: { id } });
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

module.exports = {
    listarUsers,
    crearUser,
    buscarUser,
    actualizarUser,
    eliminarUser
};
