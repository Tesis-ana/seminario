const express = require('express');
const router = express.Router();
const controlador = require('../controllers/laboratorio.controller.js');

// Rutas para laboratorio
router.get('/', controlador.listarLaboratorios);
router.get('/:id', controlador.obtenerLaboratorioPorId);
router.get('/paciente/:pacienteId', controlador.obtenerLaboratoriosPorPaciente);
router.post('/', controlador.crearLaboratorio);
router.put('/', controlador.actualizarLaboratorio);
router.delete('/', controlador.eliminarLaboratorio);

module.exports = router;
