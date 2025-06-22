
const express = require("express");
const router = express.Router();
const controlador = require("../controllers/segmentacion.controller.js");

// Rutas para segmentacion
router.get("/", controlador.listarSegmentacions);
router.post("/manual", controlador.crearSegmentacionManual);
router.post("/buscar", controlador.buscarSegmentacion);
router.put("/", controlador.actualizarSegmentacion);
router.delete("/", controlador.eliminarSegmentacion);
router.post("/automatico",controlador.crearSegmentacionAutomatica)

module.exports = router;
