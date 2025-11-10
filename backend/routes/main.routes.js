const express = require('express');
const router = express.Router();

const usersRoutes = require('./user.routes.js');
const pacientesRoutes = require('./paciente.routes.js');
const profesionalesRoutes = require('./profesional.routes.js');
const imagenesRoutes = require('./imagen.routes.js');
const segmentacionesRoutes = require('./segmentacion.routes.js');
const pwatscoreRoutes = require('./pwatscore.routes.js');
const atencionesRoutes = require('./atencion.routes.js');
const investigadorRoutes = require('./investigador.routes.js');
const categorizadorRoutes = require('./categorizador.routes.js');
const laboratorioRoutes = require('./laboratorio.routes.js');

module.exports = (app) => {
    // Configurar las rutas principales
    app.use('/users', usersRoutes);
    app.use('/pacientes', pacientesRoutes);
    app.use('/profesionales', profesionalesRoutes);
    app.use('/imagenes', imagenesRoutes);
    app.use('/segmentaciones', segmentacionesRoutes);
    app.use('/pwatscore', pwatscoreRoutes);
    app.use('/atenciones', atencionesRoutes);
    app.use('/investigador', investigadorRoutes);
    app.use('/categorizador', categorizadorRoutes);
    app.use('/laboratorios', laboratorioRoutes);
    app.use('/', (req, res) => {
        res.status(200).json({ message: 'API principal activa' });
    });
};
