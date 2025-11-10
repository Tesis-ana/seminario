// Test simple para verificar la funcionalidad de creación automática de atención
// Este test debe ejecutarse manualmente o como parte de las pruebas de integración

const request = require('supertest');
const app = require('../server');

describe('Funcionalidad de creación automática de atención', () => {
    let profesionalToken;
    let pacienteId;

    beforeAll(async () => {
        // Aquí deberías configurar un profesional y paciente de prueba
        // y obtener un token válido
        // Este es un ejemplo de la estructura del test
    });

    test('Debería crear automáticamente una atención cuando un profesional sube una imagen', async () => {
        // Simular subida de imagen
        const response = await request(app)
            .post('/imagenes')
            .set('Authorization', `Bearer ${profesionalToken}`)
            .field('id', pacienteId)
            .attach('imagen', Buffer.from('fake image data'), 'test.jpg')
            .expect(201);

        expect(response.body.message).toContain('atención registrada');
        expect(response.body.atencion_creada).toBe(true);
    });

    test('Debería poder listar pacientes atendidos por el profesional', async () => {
        const response = await request(app)
            .get('/profesionales/mis-pacientes')
            .set('Authorization', `Bearer ${profesionalToken}`)
            .expect(200);

        expect(response.body.pacientes).toBeDefined();
        expect(Array.isArray(response.body.pacientes)).toBe(true);
        expect(response.body.total_pacientes).toBeGreaterThan(0);
    });
});

console.log(
    'Test de funcionalidad creado. Para ejecutar las pruebas completas, usar los comandos de test del backend.'
);
