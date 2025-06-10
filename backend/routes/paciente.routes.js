
const express = require("express");
const router = express.Router();
const controlador = require("../controllers/paciente.controller.js");

// Rutas para paciente
router.get("/", controlador.listarPacientes);
router.post("/", controlador.crearPaciente);
router.post("/buscar", controlador.buscarPaciente);
router.put("/", controlador.actualizarPaciente);
router.delete("/", controlador.eliminarPaciente);

module.exports = router;
