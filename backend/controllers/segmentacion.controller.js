
const db = require("../models");
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const Op = db.Sequelize.Op;

const listarSegmentacions = async (req, res) => {
    try {
        const data = await db.Segmentacion.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al listar segmentacions.",
            err,
        });
    }
};

const crearSegmentacionManual = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ message: "El id de imagen es requerido." });
        }

        const segmentacionExistente = await db.Segmentacion.findOne({ where: { imagen_id: id } });
        if (segmentacionExistente) {
            return res.status(400).json({ message: "Ya existe una segmentacion para esta imagen." });
        }

        const imagen = await db.Imagen.findOne({ where: { id } });
        if (!imagen) {
            return res.status(404).json({ message: "La imagen no existe." });
        }

        const foto = req.file;
        const formatosPermitidos = ['image/jpg'];

        if (!foto || !formatosPermitidos.includes(foto.mimetype)) {
            return res.status(400).json({
                message: "Formato de imagen no permitido. Solo se aceptan archivos JPG.",
            });
        }
        let filename;

        filename = path.basename(imagen.nombre_archivo, path.extname(imagen.nombre_archivo));
        
        const rutaSegmentacion = path.join(__dirname, '../../categorizador/predicts/masks');
        if (!fs.existsSync(rutaSegmentacion)) {
            fs.mkdirSync(rutaSegmentacion, { recursive: true });
        }   
        // Guardar el archivo en la ruta especificada
        fs.writeFileSync(path.join(rutaSegmentacion, `${filename}.jpg`), foto.buffer);
        const rutaArchivo = path.join(rutaSegmentacion, `${filename}.jpg`);

        const segmentacion = await db.Segmentacion.create({
            imagen_id: id,
            ruta_mascara: rutaArchivo,
            metodo: 'manual',
        });
        if (!segmentacion) {
            return res.status(500).json({ message: "Error al crear segmentacion." });
        }
        await segmentacion.save();
        res.statys(201).json({
            message: "Segmentacion creada correctamente.",
            segmentacionId: segmentacion.id,
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error al crear segmentacion.",
            err,
        });
    }
};

const crearSegmentacionAutomatica = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ message: "El id de imagen es requerido." });
        }
        const imagen = await db.Imagen.findOne({ where: { id } });
        if (!imagen) {
            return res.status(404).json({ message: "La imagen no existe." });
        }
        const scriptPath = path.join(__dirname, '../../categorizador/PWAT.py');
        const args=[scriptPath, "--mode", "predecir_mascara", "--image_path",imagen.ruta_archivo]
        
        const process = spawn('conda run -n pyradiomics_env12 python', args);
        let output = '';
        let errorOutput = '';
        process.stdout.on('data', (data) => {
            output += data.toString();
        });
        process.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        process.on('close', async (code) => {
            if (code !== 0) {
                return res.status(500).json({
                    message: "Error al ejecutar el script de segmentacion.",
                    error: errorOutput,
                });
            }
            const filename = path.basename(imagen.nombre_archivo, path.extname(imagen.nombre_archivo));
            const rutaSegmentacion = path.join(__dirname, '../../categorizador/predicts/masks');
            const rutaArchivo = path.join(rutaSegmentacion, `${filename}.jpg`);

            if (!fs.existsSync(rutaSegmentacion)) {
                fs.mkdirSync(rutaSegmentacion, { recursive: true });
            }
            // Guardar el archivo en la ruta especificada
            const segmentacion = await db.Segmentacion.create({
                imagen_id: id,
                ruta_mascara: rutaArchivo,
                metodo: 'automatica',
            });
            if (!segmentacion) {
                return res.status(500).json({ message: "Error al crear segmentacion." });
            }
            await segmentacion.save();
            return res.status(201).json({
                message: "Segmentacion automatica creada correctamente.",
                segmentacionId: segmentacion.id,
            });
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error al crear segmentacion automatica.",
            error,
        });
    }

};

const editarSegmentacion = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ message: "El id de segmentacion es requerido." });
        }
        const segmentacion = await db.Segmentacion.findOne({ where: { id } });
        if (!segmentacion) {
            return res.status(404).json({ message: "La segmentacion no existe." });
        }
        const foto = req.file;
        const formatosPermitidos = ['image/jpg'];
        if (!foto || !formatosPermitidos.includes(foto.mimetype)) {
            return res.status(400).json({
                message: "Formato de imagen no permitido. Solo se aceptan archivos JPG.",
            });
        }
        let filename = path.basename(segmentacion.ruta_mascara, path.extname(segmentacion.ruta_mascara));
        const rutaSegmentacion = path.join(__dirname, '../../categorizador/predicts/masks');
        if (!fs.existsSync(rutaSegmentacion)) {
            fs.mkdirSync(rutaSegmentacion, { recursive: true });
        }
        const rutaArchivo = path.join(rutaSegmentacion, `${filename}.jpg`);

        // Actualizar la ruta de la máscara en la base de datos
        segmentacion.ruta_mascara = rutaArchivo;
        await segmentacion.save();
        // Guardar el archivo en la ruta especificada
        const filePath = path.join(rutaSegmentacion, `${filename}.jpg`);
        fs.writeFileSync(filePath, foto.buffer);
        return res.status(200).json({
            message: "Segmentacion editada correctamente.",
            segmentacionId: segmentacion.id,
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error al editar segmentacion.",
            error,
        });
    }
}

const buscarSegmentacion = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.Segmentacion.findOne({ where: { id } });
        if (!data) {
            return res.status(404).json({ message: "El segmentacion no existe." });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al buscar segmentacion.",
            err,
        });
    }
};

const actualizarSegmentacion = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.Segmentacion.update(resto, { where: { id } });
        if (actualizados === 0) {
            return res.status(404).json({ message: "El segmentacion no fue encontrado para actualizar." });
        }
        return res.status(200).json({ message: "Segmentacion actualizado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al actualizar segmentacion.",
            err,
        });
    }
};

const eliminarSegmentacion = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.Segmentacion.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({ message: "El segmentacion no fue encontrado para eliminar." });
        }
        return res.status(200).json({ message: "Segmentacion eliminado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al eliminar segmentacion.",
            err,
        });
    }
};

module.exports = {
    listarSegmentacions,
    crearSegmentacionManual,
    buscarSegmentacion,
    actualizarSegmentacion,
    eliminarSegmentacion,
    crearSegmentacionAutomatica
};
