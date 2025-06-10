const express = require('express');
const router = express.Router();

const usersRoutes = require('./user.routes.js');
const pacientesRoutes = require('./paciente.routes.js');
const imagenesRoutes = require('./imagen.routes.js');
const segmentacionesRoutes = require('./segmentacion.routes.js');
const pwatscoreRoutes = require('./pwatscore.routes.js');

module.exports = app => {
    // Configurar las rutas principales
    app.use('/users', usersRoutes);
    app.use('/pacientes', pacientesRoutes);
    app.use('/imagenes', imagenesRoutes);
    app.use('/segmentaciones', segmentacionesRoutes);
    app.use('/pwatscore', pwatscoreRoutes);
    app.use('/', (req, res) => {
        res.status(200).json({ message: 'API principal activa' });
    });
}



// // // Importar routers específicos
// router.use('/users', require('./user.routes.js'));
// router.use('/pacientes', require('./paciente.routes.js'));
// router.use('/imagenes', require('./imagen.routes.js'));
// router.use('/segmentaciones', require('./segmentacion.routes.js'));
// router.use('/pwatscore', require('./pwatscore.routes.js'));

// module.exports = router;
