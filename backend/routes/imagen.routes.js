
const express = require("express");
const router = express.Router();
const controlador = require("../controllers/imagen.controller.js");

// Rutas para imagen
router.get("/", controlador.listarImagens);
router.post("/", controlador.subirImagen);
router.post("/buscar", controlador.buscarImagen);
router.put("/", controlador.actualizarImagen);
router.put("/:id/archivo", controlador.actualizarImagenArchivo);
router.delete("/", controlador.eliminarImagen);
router.get('/paciente/:pacienteId', controlador.listarImagenesPaciente);
router.get('/:id/archivo', controlador.descargarImagen);

module.exports = router;
