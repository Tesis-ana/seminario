
const express = require("express");
const router = express.Router();
const controlador = require("../controllers/pwatscore.controller.js");

// Rutas para pwatscore
router.get("/", controlador.listarPwatscores);
router.post("/", controlador.crearPwatscore);
router.post("/buscar", controlador.buscarPwatscore);
router.put("/", controlador.actualizarPwatscore);
router.delete("/", controlador.eliminarPwatscore);

module.exports = router;
