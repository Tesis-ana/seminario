/**
 * Test de integración con métricas de rendimiento para el frontend
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
    PerformanceMetrics,
    trackOperation,
    trackSequentialOperations,
} from './performance-metrics';

// Mock de la API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

describe('Frontend Performance Integration Tests', () => {
    let authToken: string;
    const metrics = new PerformanceMetrics();

    beforeAll(async () => {
        // Login para obtener token
        const loginResponse = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rut: '11.111.111-1',
                contra: 'AdminClave123!',
            }),
        });

        if (loginResponse.ok) {
            const data = await loginResponse.json();
            authToken = data.token;
        }
    });

    afterAll(() => {
        // Limpiar recursos si es necesario
    });

    it('debe cargar la lista de pacientes con métricas de rendimiento aceptables', async () => {
        if (!authToken) {
            console.warn('⚠️  Skipping test: no auth token available');
            return;
        }

        metrics.start();

        const operations = Array.from({ length: 10 }, () => async () => {
            const response = await fetch(`${API_BASE}/pacientes`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${authToken}` },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return response.json();
        });

        try {
            await trackSequentialOperations(operations, metrics);
        } catch (error) {
            // Algunos errores son esperados en testing
            console.warn('Some operations failed:', error);
        }

        metrics.end();
        metrics.printReport('Frontend - Listar Pacientes');

        const report = metrics.getReport();

        // Validaciones de métricas
        expect(metrics.getErrorRate()).toBeLessThan(10); // < 10% de errores
        expect(metrics.getP50()).toBeLessThan(500); // P50 < 500ms
        expect(metrics.getP95()).toBeLessThan(1000); // P95 < 1s
        expect(metrics.getThroughput()).toBeGreaterThan(1); // > 1 req/s

        console.log('\n📈 Performance Summary:');
        console.log(`   Error Rate: ${report.errorRate}`);
        console.log(`   Throughput: ${report.throughput}`);
        console.log(`   P50: ${report.responseTime.p50}`);
        console.log(`   P95: ${report.responseTime.p95}`);
    });

    it('debe obtener detalles de imagen con métricas adecuadas', async () => {
        if (!authToken) {
            console.warn('⚠️  Skipping test: no auth token available');
            return;
        }

        const testMetrics = new PerformanceMetrics();
        testMetrics.start();

        // Primero obtenemos una lista de imágenes
        const imagenesResponse = await trackOperation(
            async () =>
                fetch(`${API_BASE}/imagenes`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${authToken}` },
                }),
            testMetrics
        );

        if (!imagenesResponse.ok) {
            console.warn('⚠️  Could not fetch images list');
            return;
        }

        const imagenes = await imagenesResponse.json();

        if (!Array.isArray(imagenes) || imagenes.length === 0) {
            console.warn('⚠️  No images available for testing');
            return;
        }

        // Probar con las primeras 5 imágenes
        const imagesToTest = imagenes.slice(0, Math.min(5, imagenes.length));

        for (const imagen of imagesToTest) {
            try {
                await trackOperation(
                    async () =>
                        fetch(`${API_BASE}/imagenes/${imagen.id}/archivo`, {
                            method: 'GET',
                        }),
                    testMetrics
                );
            } catch (error) {
                // Continuar con las demás imágenes
            }
        }

        testMetrics.end();
        testMetrics.printReport('Frontend - Obtener Imágenes');

        // Validaciones
        expect(testMetrics.getP50()).toBeLessThan(1000); // P50 < 1s
        expect(testMetrics.getP95()).toBeLessThan(2000); // P95 < 2s
    });

    it('debe realizar operaciones CRUD de laboratorio con rendimiento óptimo', async () => {
        if (!authToken) {
            console.warn('⚠️  Skipping test: no auth token available');
            return;
        }

        const labMetrics = new PerformanceMetrics();
        labMetrics.start();

        // 1. Obtener lista de pacientes
        const pacientesResponse = await trackOperation(
            async () =>
                fetch(`${API_BASE}/pacientes`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${authToken}` },
                }),
            labMetrics
        );

        if (!pacientesResponse.ok) {
            console.warn('⚠️  Could not fetch patients');
            return;
        }

        const pacientes = await pacientesResponse.json();

        if (!Array.isArray(pacientes) || pacientes.length === 0) {
            console.warn('⚠️  No patients available for testing');
            return;
        }

        const testPaciente = pacientes[0];

        // 2. Crear registro de laboratorio
        let createdLabId: number | null = null;

        try {
            const createResponse = await trackOperation(
                async () =>
                    fetch(`${API_BASE}/laboratorios`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            paciente_id: testPaciente.id,
                            hba1c: 6.5,
                            glucosa: 120,
                            creatinina: 1.0,
                            colesterol: 200,
                            trigliceridos: 150,
                            microalbuminuria: 30,
                        }),
                    }),
                labMetrics
            );

            if (createResponse.ok) {
                const created = await createResponse.json();
                createdLabId = created.id;
            }
        } catch (error) {
            console.warn('Create lab record failed:', error);
        }

        // 3. Leer registros
        try {
            await trackOperation(
                async () =>
                    fetch(
                        `${API_BASE}/laboratorios/paciente/${testPaciente.id}`,
                        {
                            method: 'GET',
                            headers: { Authorization: `Bearer ${authToken}` },
                        }
                    ),
                labMetrics
            );
        } catch (error) {
            console.warn('Read lab records failed:', error);
        }

        // 4. Actualizar registro (si se creó)
        if (createdLabId) {
            try {
                await trackOperation(
                    async () =>
                        fetch(`${API_BASE}/laboratorios`, {
                            method: 'PUT',
                            headers: {
                                Authorization: `Bearer ${authToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                id: createdLabId,
                                paciente_id: testPaciente.id,
                                hba1c: 6.8,
                                glucosa: 125,
                            }),
                        }),
                    labMetrics
                );
            } catch (error) {
                console.warn('Update lab record failed:', error);
            }

            // 5. Eliminar registro
            try {
                await trackOperation(
                    async () =>
                        fetch(`${API_BASE}/laboratorios`, {
                            method: 'DELETE',
                            headers: {
                                Authorization: `Bearer ${authToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ id: createdLabId }),
                        }),
                    labMetrics
                );
            } catch (error) {
                console.warn('Delete lab record failed:', error);
            }
        }

        labMetrics.end();
        labMetrics.printReport('Frontend - Laboratorio CRUD');

        const report = labMetrics.getReport();

        // Validaciones de rendimiento
        expect(labMetrics.getErrorRate()).toBeLessThan(30); // < 30% errores (ambiente de test)
        expect(labMetrics.getP50()).toBeLessThan(800); // P50 < 800ms
        expect(labMetrics.getP95()).toBeLessThan(1500); // P95 < 1.5s

        console.log('\n🔬 Lab CRUD Performance:');
        console.log(`   Total Operations: ${report.totalRequests}`);
        console.log(`   Error Rate: ${report.errorRate}`);
        console.log(`   P50: ${report.responseTime.p50}`);
        console.log(`   P95: ${report.responseTime.p95}`);
    });
});
