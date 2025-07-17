const express = require('express');
const router = express.Router();
const controlador = require('../controllers/atencion.controller.js');

router.post('/', controlador.crearAtencion);

module.exports = router;
