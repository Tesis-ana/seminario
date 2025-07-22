const express = require('express');
const router = express.Router();
const controller = require('../controllers/categorizador.controller.js');

router.get('/metrics', controller.evaluate);

module.exports = router;
