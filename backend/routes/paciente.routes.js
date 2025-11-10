const express = require('express');
const router = express.Router();
const controlador = require('../controllers/paciente.controller.js');

// Rutas para paciente
router.get('/', controlador.listarPacientes);
router.get('/:id', controlador.obtenerPacientePorId);
router.post('/', controlador.crearPaciente);
router.post('/buscar', controlador.buscarPaciente);
router.post('/buscar-rut', controlador.buscarPacienteRut);
router.get('/me', controlador.obtenerPacienteActual);
router.post('/agregar', controlador.agregarPacienteCompleto);
router.get(
    '/profesional/:profesionalId',
    controlador.listarPacientesProfesional
);
router.get('/:id/profesional', controlador.obtenerProfesionalPaciente);
router.put('/', controlador.actualizarPaciente);
router.delete('/', controlador.eliminarPaciente);
router.post('/atenciones', controlador.obtenerAtencionesPaciente);

module.exports = router;
