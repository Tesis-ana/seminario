
const express = require("express");
const router = express.Router();
const controlador = require("../controllers/segmentacion.controller.js");

// Rutas para segmentacion
router.get("/", controlador.listarSegmentacions);
router.post("/", controlador.crearSegmentacion);
router.post("/buscar", controlador.buscarSegmentacion);
router.put("/", controlador.actualizarSegmentacion);
router.delete("/", controlador.eliminarSegmentacion);

module.exports = router;
