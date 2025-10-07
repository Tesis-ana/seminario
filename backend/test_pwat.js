const db = require('./models');
const pwatController = require('./controllers/pwatscore.controller');

// Mock de request y response
const mockReq = {
    body: { id: 3 },
};

const mockRes = {
    status: (code) => ({
        json: (data) => {
            console.log(`Status: ${code}`);
            console.log('Response:', JSON.stringify(data, null, 2));
            process.exit(code === 201 ? 0 : 1);
        },
    }),
};

// Ejecutar la función
pwatController.predecirPwatscore(mockReq, mockRes).catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
