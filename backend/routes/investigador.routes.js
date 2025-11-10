const express = require('express');
const router = express.Router();
const controlador = require('../controllers/investigador.controller.js');

router.get('/metrics', controlador.getMetrics);
router.post('/retrain', controlador.retrain);

module.exports = router;
