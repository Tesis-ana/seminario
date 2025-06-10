
const express = require("express");
const router = express.Router();
const controlador = require("../controllers/imagen.controller.js");

// Rutas para imagen
router.get("/", controlador.listarImagens);
router.post("/", controlador.crearImagen);
router.post("/buscar", controlador.buscarImagen);
router.put("/", controlador.actualizarImagen);
router.delete("/", controlador.eliminarImagen);

module.exports = router;
