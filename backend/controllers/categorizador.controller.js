const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const modelsDir = path.join(__dirname, '..', '..', 'categorizador', 'modelos');
const script = path.join(__dirname, '..', '..', 'categorizador', 'eval_metrics.py');

function checkRole(req, res) {
  if (req.user?.rol !== 'investigador' && req.user?.rol !== 'admin') {
    res.status(403).json({ message: 'Acceso denegado' });
    return false;
  }
  return true;
}

function evaluate(req, res) {
  if (!checkRole(req, res)) return;
  try {
    if (!fs.existsSync(modelsDir)) {
      return res.status(404).json({ message: 'Carpeta de modelos no encontrada' });
    }
    const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.pkl') || f.endsWith('.joblib'));
    const results = {};
    for (const file of files) {
      const proc = spawnSync('python3', [script, path.join(modelsDir, file)], { encoding: 'utf8' });
      if (proc.error) {
        results[file] = { error: proc.error.message };
        continue;
      }
      try {
        results[file] = JSON.parse(proc.stdout.trim());
      } catch (e) {
        results[file] = { error: 'Sin resultados' };
      }
    }
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ message: 'Error al evaluar modelos', err });
  }
}

module.exports = { evaluate };
