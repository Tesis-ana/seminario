const express = require('express');
const router = express.Router();
const controlador = require('../controllers/profesional.controller.js');

// Rutas para profesional
router.get('/', controlador.listarProfesionales);
router.post('/', controlador.crearProfesional);
router.post('/bulk', controlador.crearProfesionalesBulk);
router.post('/buscar', controlador.buscarProfesional);
router.post('/buscar-rut', controlador.buscarProfesionalRut);
router.get('/me', controlador.obtenerProfesionalActual);
router.get('/mis-pacientes', controlador.listarPacientesProfesional);
router.put('/', controlador.actualizarProfesional);
router.delete('/', controlador.eliminarProfesional);

module.exports = router;
