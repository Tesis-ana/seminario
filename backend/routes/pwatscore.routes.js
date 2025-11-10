
const express = require("express");
const router = express.Router();
const controlador = require("../controllers/pwatscore.controller.js");

// Rutas para pwatscore
router.get("/", controlador.listarPwatscores);
router.post("/", controlador.predecirPwatscore);
router.post("/buscar", controlador.buscarPwatscore);
router.put("/", controlador.actualizarPwatscore);
router.delete("/", controlador.eliminarPwatscore);

// Ejecutar el script de categorizador utilizando middleware

module.exports = router;
