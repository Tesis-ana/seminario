
const express = require("express");
const router = express.Router();
const controlador = require("../controllers/pwatscore.controller.js");
const pythonMiddleware = require("../middleware/pythonMiddleware.js");

// Rutas para pwatscore
router.get("/", controlador.listarPwatscores);
router.post("/", controlador.crearPwatscore);
router.post("/buscar", controlador.buscarPwatscore);
router.put("/", controlador.actualizarPwatscore);
router.delete("/", controlador.eliminarPwatscore);

// Ejecutar el script de categorizador utilizando middleware
router.get("/run-python", pythonMiddleware, (req, res) => {
    if (req.pythonError) {
        return res.status(500).json({ error: req.pythonError });
    }
    res.json({ output: req.pythonOutput });
});

module.exports = router;
