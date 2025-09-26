const db = require('../models');
const childProcess = require('child_process');

let spawn = childProcess.spawn;
function __setSpawn(fn) {
  spawn = fn;
}
const path = require('path');
const fs = require('fs');

const {
  uploadSingleImage: upload,
  MASKS_DIR,
  ensureDirExists,
  isJpegMime,
  respondMulterError,
} = require('./utils/fileUpload');

const Op = db.Sequelize.Op;

// PATH seguro para procesos hijos: solo directorios estándar y no escribibles
const RESOLVED_SAFE_PATH = process.platform === 'win32'
  ? 'C\\Windows\\System32'
  : '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

const listarSegmentacions = async (req, res) => {
  try {
    const data = await db.Segmentacion.findAll();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      message: 'Error al listar segmentacions.',
      err,
    });
  }
};

const crearSegmentacionManual = (req, res) => {
  upload(req, res, async function (err) {
    if (respondMulterError(err, res)) return;
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ message: 'El id de imagen es requerido.' });
      }

      const segmentacionExistente = await db.Segmentacion.findOne({
        where: { imagen_id: id },
      });
      if (segmentacionExistente) {
        return res.status(400).json({ message: 'Ya existe una segmentacion para esta imagen.' });
      }

      const imagen = await db.Imagen.findOne({ where: { id } });
      if (!imagen) {
        return res.status(404).json({ message: 'La imagen no existe.' });
      }

      const foto = req.file;
      if (!foto || !isJpegMime(foto.mimetype)) {
        return res.status(400).json({
          message: 'Formato de imagen no permitido. Solo se aceptan archivos JPG.',
        });
      }

      const filename = path.basename(
        imagen.nombre_archivo,
        path.extname(imagen.nombre_archivo)
      );

      ensureDirExists(MASKS_DIR);
      // Guardar el archivo en la ruta especificada
      fs.writeFileSync(path.join(MASKS_DIR, `${filename}.jpg`), foto.buffer);
      const rutaArchivo = path.join(MASKS_DIR, `${filename}.jpg`);

      const segmentacion = await db.Segmentacion.create({
        imagen_id: id,
        ruta_mascara: rutaArchivo,
        metodo: 'manual',
      });
      if (!segmentacion) {
        return res.status(500).json({ message: 'Error al crear segmentacion.' });
      }
      await segmentacion.save();
      return res.status(201).json({
        message: 'Segmentacion automatica creada correctamente.',
        segmentacionId: segmentacion.id,
      });
    } catch (err) {
      return res.status(500).json({
        message: 'Error al crear segmentacion.',
        err,
      });
    }
  });
};

const crearSegmentacionAutomatica = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ message: 'El id de imagen es requerido.' });
  }

  // 1) Verificar que exista la imagen en BD
  const imagen = await db.Imagen.findByPk(id);
  if (!imagen) {
    return res.status(404).json({ message: 'La imagen no existe.' });
  }

  // 2) Estrategias para ejecutar PWAT.py sin depender solo de conda
  const scriptDir = path.join(__dirname, '../../categorizador');
  const scriptPath = path.join(scriptDir, 'PWAT.py');
  const baseArgs = [
    '--mode', 'predecir_mascara',
    '--image_path', imagen.nombre_archivo,
  ];

  const envName = process.env.CATEGORIZADOR_CONDA_ENV || 'pyradiomics';
  const forceConda = (process.env.CATEGORIZADOR_FORCE_CONDA ?? 'true').toLowerCase() !== 'false';
  const commandSpecs = [];
  const seenSpecs = new Set();

  function pushCommandSpec(spec) {
    const key = `${spec.cmd}__${spec.args.join(' ')}`;
    if (seenSpecs.has(key)) return;
    commandSpecs.push(spec);
    seenSpecs.add(key);
  }

  const condaExecutable = process.env.CONDA_BIN || 'conda';
  pushCommandSpec({
    label: 'conda',
    cmd: condaExecutable,
    args: ['run', '-n', envName, 'python', scriptPath, ...baseArgs],
    envPath: process.env.PATH,
  });

  if (!forceConda) {
    const pythonOverride = process.env.CATEGORIZADOR_PYTHON;
    if (pythonOverride) {
      pushCommandSpec({
        label: 'custom python',
        cmd: pythonOverride,
        args: [scriptPath, ...baseArgs],
        envPath: process.env.PATH,
      });
    }

    pushCommandSpec({
      label: 'system python',
      cmd: 'python',
      args: [scriptPath, ...baseArgs],
      envPath: process.env.PATH,
    });
  }

  const runCommand = (spec) =>
    new Promise((resolve, reject) => {
      const pathEnv = spec.envPath ?? RESOLVED_SAFE_PATH;
      const proc = spawn(spec.cmd, spec.args, {
        cwd: scriptDir,
        shell: false,
        env: { ...process.env, PATH: pathEnv },
      });

      let stdout = '';
      let stderr = '';

      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          stdout += data;
        });
      }

      if (proc.stderr) {
        proc.stderr.on('data', (data) => {
          stderr += data;
        });
      }

      proc.on('error', (error) => {
        const wrapped = new Error(`Fallo al lanzar el proceso (${spec.cmd}): ${error.message}`);
        wrapped.code = error.code || error.errno;
        wrapped.isSpawnError = true;
        wrapped.originalError = error;
        reject(wrapped);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          const failure = new Error(`El script devolvio codigo ${code}: ${stderr}`);
          failure.code = code;
          failure.stderr = stderr;
          reject(failure);
        }
      });
    });

  const ejecutarScript = async () => {
    let lastError = null;
    for (const spec of commandSpecs) {
      try {
        await runCommand(spec);
        return;
      } catch (error) {
        lastError = error;
        if (error.isSpawnError || error.code === 'ENOENT') {
          console.warn(`crearSegmentacionAutomatica: comando ${spec.cmd} no disponible (${error.message}).`);
          continue;
        }
        throw error;
      }
    }
    throw lastError || new Error('No se pudo ejecutar PWAT.py con ninguna estrategia disponible.');
  };

  try {
    // 4) Ejecutar y esperar
    await ejecutarScript();

    // 5) Construir ruta de la máscara generada
    const baseName = path.basename(
      imagen.nombre_archivo,
      path.extname(imagen.nombre_archivo)
    );

    ensureDirExists(MASKS_DIR);
    const rutaMascaraArchivo = path.join(MASKS_DIR, `${baseName}.jpg`);

    // 6) Guardar en la BD
    const segmentacion = await db.Segmentacion.create({
      imagen_id: id,
      ruta_mascara: rutaMascaraArchivo,
      metodo: 'automatica',
    });

    return res.status(201).json({
      message: 'Segmentacion automatica creada correctamente.',
      segmentacionId: segmentacion.id,
    });
  } catch (err) {
    // Un único catch para errores de spawn o de BD
    console.error('Error en crearSegmentacionAutomatica:', err);
    return res.status(500).json({
      message: 'Error al crear segmentacion automatica.',
      error: err.message,
    });
  }
};

const editarSegmentacion = (req, res) => {
  upload(req, res, async function (err) {
    if (respondMulterError(err, res)) return;
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ message: 'El id de segmentacion es requerido.' });
      }
      const segmentacion = await db.Segmentacion.findOne({ where: { id } });
      if (!segmentacion) {
        return res.status(404).json({ message: 'La segmentacion no existe.' });
      }
      const foto = req.file;
      console.log('a');
      if (!foto) {
        return res.status(400).json({ message: 'La imagen es requerida.' });
      }
      console.log('a2');

      if (!isJpegMime(foto.mimetype)) {
        return res.status(400).json({
          message: 'Formato de imagen no permitido. Solo se aceptan archivos JPG.',
        });
      }
      console.log('a3');

      const imagen = await db.Imagen.findOne({ where: { id: segmentacion.imagen_id } });
      const filename = path.basename(
        imagen.nombre_archivo,
        path.extname(imagen.nombre_archivo)
      );
      console.log('a4');

      ensureDirExists(MASKS_DIR);
      console.log('a5');

      const rutaArchivo = path.join(MASKS_DIR, `${filename}.jpg`);

      // Actualizar la ruta de la máscara en la base de datos
      segmentacion.ruta_mascara = rutaArchivo;
      console.log('a6');

      await segmentacion.save();
      // Guardar el archivo en la ruta especificada
      const filePath = path.join(MASKS_DIR, `${filename}.jpg`);
      fs.writeFileSync(filePath, foto.buffer);
      console.log('a7');

      return res.status(200).json({
        message: 'Segmentacion editada correctamente.',
        segmentacionId: segmentacion.id,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Error al editar segmentacion.',
        error,
      });
    }
  });
};

const descargarMascara = async (req, res) => {
  const { id } = req.params;
  try {
    const seg = await db.Segmentacion.findOne({ where: { imagen_id: id } });
    if (!seg) {
      return res.status(404).json({ message: 'Segmentacion no encontrada.' });
    }
    return res.sendFile(path.resolve(seg.ruta_mascara));
  } catch (err) {
    return res.status(500).json({
      message: 'Error al obtener mascara.',
      err,
    });
  }
};

const buscarSegmentacion = async (req, res) => {
  const { id } = req.body;
  try {
    const data = await db.Segmentacion.findOne({ where: { id } });
    if (!data) {
      return res.status(404).json({ message: 'El segmentacion no existe.' });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      message: 'Error al buscar segmentacion.',
      err,
    });
  }
};

const actualizarSegmentacion = async (req, res) => {
  const { id, ...resto } = req.body;
  try {
    const [actualizados] = await db.Segmentacion.update(resto, {
      where: { id },
    });
    if (actualizados === 0) {
      return res.status(404).json({
        message: 'El segmentacion no fue encontrado para actualizar.',
      });
    }
    return res.status(200).json({ message: 'Segmentacion actualizado correctamente.' });
  } catch (err) {
    return res.status(500).json({
      message: 'Error al actualizar segmentacion.',
      err,
    });
  }
};

const eliminarSegmentacion = async (req, res) => {
  const { id } = req.body;
  try {
    const eliminados = await db.Segmentacion.destroy({ where: { id } });
    if (eliminados === 0) {
      return res.status(404).json({
        message: 'El segmentacion no fue encontrado para eliminar.',
      });
    }
    return res.status(200).json({ message: 'Segmentacion eliminado correctamente.' });
  } catch (err) {
    return res.status(500).json({
      message: 'Error al eliminar segmentacion.',
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
  crearSegmentacionAutomatica,
  editarSegmentacion,
  descargarMascara,
  __setSpawn,
};

