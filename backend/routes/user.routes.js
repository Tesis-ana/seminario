
const express = require("express");
const router = express.Router();
const controlador = require("../controllers/user.controller.js");

// Rutas para user
router.get("/", controlador.listarUsers);
router.post("/crear", controlador.crearUser);
router.post("/bulk", controlador.crearUsersBulk);
router.post("/buscar", controlador.buscarUser);
router.put("/", controlador.actualizarUser);
router.delete("/", controlador.eliminarUser);
router.post("/login", controlador.login);

module.exports = router;
