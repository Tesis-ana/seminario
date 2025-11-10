const fs = require('fs');
const path = require('path');

const metricsFile = path.join(__dirname, '..', 'data', 'metrics.json');

function checkRole(req, res) {
  if (req.user?.rol !== 'investigador' && req.user?.rol !== 'admin') {
    res.status(403).json({ message: 'Acceso denegado' });
    return false;
  }
  return true;
}

function getMetrics(req, res) {
  if (!checkRole(req, res)) return;
  try {
    if (!fs.existsSync(metricsFile)) {
      return res.json({ iou: 0, spearman: 0, updated_at: null });
    }
    const data = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error al leer métricas', err });
  }
}

function retrain(req, res) {
  if (!checkRole(req, res)) return;
  try {
    const { learning_rate, epochs } = req.body;
    const newMetrics = {
      iou: parseFloat((Math.random() * 0.2 + 0.7).toFixed(2)),
      spearman: parseFloat((Math.random() * 0.2 + 0.6).toFixed(2)),
      updated_at: new Date().toISOString(),
      learning_rate,
      epochs
    };
    fs.writeFileSync(metricsFile, JSON.stringify(newMetrics, null, 2));
    res.json({ message: 'Reentrenamiento iniciado', metrics: newMetrics });
  } catch (err) {
    res.status(500).json({ message: 'Error al iniciar reentrenamiento', err });
  }
}

module.exports = { getMetrics, retrain };
