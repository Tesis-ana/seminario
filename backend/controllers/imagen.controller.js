const db = require("../models");
const Op = db.Sequelize.Op;

const listarImagens = async (req, res) => {
    try {
        const data = await db.Imagen.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al listar imagens.",
            err,
        });
    }
};

const subirImagen = async (req, res) => {
    try {
        const {id} = req.body;
        if (!req.file) {
            return res.status(400).json({ message: "No se ha subido ninguna imagen." });
        }
        if (!id) {
            return res.status(400).json({ message: "El id de imagen es requerido." });
        }
        const formatosPermitidos = ['image/jpg'];
        if (!formatosPermitidos.includes(req.file.mimetype)) {
            return res.status(400).json({
                message: "Formato de imagen no permitido. Solo se aceptan archivos JPG.",
            });
        }
        const paciente = await db.Paciente.findOne({ where: { id } });
        if (!paciente) {
            return res.status(404).json({ message: "El paciente no existe." });
        }
        const foto= req.file;
        const filename = `${paciente.id}_${Date.now()}.jpg`;

        const rutaimagen= path.join(__dirname, '/categorizador/predicts/imgs');
        if (!fs.existsSync(rutaimagen)) {
            fs.mkdirSync(rutaimagen, { recursive: true });
        }
        // Guardar el archivo en la ruta especificada
        fs.writeFileSync(path.join(rutaimagen, filename), foto.buffer);
        const rutaArchivo = path.join(rutaimagen, filename);
        const imagen = await db.Imagen.create({
            nombre_archivo: filename,
            fecha_captura: new Date(),
            ruta_archivo: rutaArchivo,
            paciente_id: id
        });
        return res.status(201).json({
            message: "Imagen creada correctamente.",
            imagen,
        });

    } catch (err) {
        return res.status(500).json({
            message: "Error al crear imagen.",
            err,
        });
    }
};

const buscarImagen = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.Imagen.findOne({ where: { id } });
        if (!data) {
            return res.status(404).json({ message: "El imagen no existe." });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al buscar imagen.",
            err,
        });
    }
};

const actualizarImagen = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.Imagen.update(resto, { where: { id } });
        if (actualizados === 0) {
            return res.status(404).json({ message: "El imagen no fue encontrado para actualizar." });
        }
        return res.status(200).json({ message: "Imagen actualizado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al actualizar imagen.",
            err,
        });
    }
};

const eliminarImagen = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.Imagen.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({ message: "El imagen no fue encontrado para eliminar." });
        }
        return res.status(200).json({ message: "Imagen eliminado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al eliminar imagen.",
            err,
        });
    }
};

module.exports = {
    listarImagens,
    subirImagen,
    buscarImagen,
    actualizarImagen,
    eliminarImagen
};
