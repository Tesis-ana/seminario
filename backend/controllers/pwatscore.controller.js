
const db = require("../models");
const Op = db.Sequelize.Op;
const path = require('path');
const childProcess = require('child_process');

let spawn = childProcess.spawn;
function __setSpawn(fn) {
  spawn = fn;
}


const listarPwatscores = async (req, res) => {
    try {
        const data = await db.PWATScore.findAll();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al listar pwatscores.",
            err,
        });
    }
};

const predecirPwatscore = async (req, res) => {
    try {
        const {id} = req.body;
        const imagen = await db.Imagen.findOne({ where: { id } });
        if (!imagen) {
            return res.status(404).json({ message: "La imagen no existe." });
        }
        const segmentacion = await db.Segmentacion.findOne({ where: { imagen_id: id } });
        if (!segmentacion) {
            return res.status(404).json({ message: "La segmentación no existe para esta imagen." });
        }

        const scriptPath = path.join(__dirname, '../../categorizador/PWAT.py');
        const cmd     = 'conda';
        const cmdArgs = [
        'run', '-n', 'pyradiomics_env12', 'python',
        scriptPath,
        '--mode', 'predecir',
        '--image_path', imagen.nombre_archivo,
        '--mask_path', path.basename(segmentacion.ruta_mascara)
        ];

        const child = spawn(cmd, cmdArgs);
        let output = '';
        let errorOutput = ''

        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', async (code) => {
            if (code !== 0) {
                return res.status(500).json({
                    message: "Error al ejecutar el script de predicción.",
                    error: errorOutput,
                });
            }
            const resultado = JSON.parse(output);

            const pwatscore = await db.PWATScore.create({
                evaluador:"experto",
                cat3: resultado.Cat3,
                cat4: resultado.Cat4,
                cat5: resultado.Cat5,
                cat6: resultado.Cat6,
                cat7: resultado.Cat7,
                cat8: resultado.Cat8,
                fecha_evaluacion: new Date(),
                observaciones: "Evaluación realizada automáticamente.",
                imagen_id: imagen.id,
                segmentacion_id: segmentacion.id,
            });
            if (!pwatscore) {
                return res.status(500).json({ message: "Error al crear pwatscore." });
            }
            return res.status(201).json({
                message: "Pwatscore creado correctamente.",
                pwatscoreId: pwatscore.id,
                categorias: {
                    cat3: pwatscore.cat3,
                    cat4: pwatscore.cat4,
                    cat5: pwatscore.cat5,
                    cat6: pwatscore.cat6,
                    cat7: pwatscore.cat7,
                    cat8: pwatscore.cat8,
                }
            });
        });

    } catch (err) {
        return res.status(500).json({
            message: "Error al crear pwatscore.",
            err,
        });
    }
};

const buscarPwatscore = async (req, res) => {
    const { id } = req.body;
    try {
        const data = await db.PWATScore.findOne({ where: { id } });
        if (!data) {
            return res.status(404).json({ message: "El pwatscore no existe." });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            message: "Error al buscar pwatscore.",
            err,
        });
    }
};

const actualizarPwatscore = async (req, res) => {
    const { id, ...resto } = req.body;
    try {
        const [actualizados] = await db.PWATScore.update(resto, { where: { id } });
        if (actualizados === 0) {
            return res.status(404).json({ message: "El pwatscore no fue encontrado para actualizar." });
        }
        return res.status(200).json({ message: "Pwatscore actualizado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al actualizar pwatscore.",
            err,
        });
    }
};

const eliminarPwatscore = async (req, res) => {
    const { id } = req.body;
    try {
        const eliminados = await db.PWATScore.destroy({ where: { id } });
        if (eliminados === 0) {
            return res.status(404).json({ message: "El pwatscore no fue encontrado para eliminar." });
        }
        return res.status(200).json({ message: "Pwatscore eliminado correctamente." });
    } catch (err) {
        return res.status(500).json({
            message: "Error al eliminar pwatscore.",
            err,
        });
    }
};

module.exports = {
    listarPwatscores,
    predecirPwatscore,
    buscarPwatscore,
    actualizarPwatscore,
    eliminarPwatscore,
  __setSpawn,
};
