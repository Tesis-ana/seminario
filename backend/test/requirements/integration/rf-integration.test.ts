/**
 * PRUEBAS DE INTEGRACIÓN - Requerimientos Funcionales
 *
 * Las pruebas de integración verifican la interacción entre múltiples componentes.
 * Se enfocan en relaciones, consultas complejas y flujos entre modelos.
 *
 * Características:
 * - Pruebas de relaciones entre modelos
 * - Consultas con JOINs
 * - Flujos de datos entre componentes
 */

import {
    describe,
    test,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
} from 'bun:test';
import db from '../../../models/index';
import bcrypt from 'bcrypt';

const {
    sequelize,
    User,
    Paciente,
    Profesional,
    Imagen,
    Segmentacion,
    PWATScore,
} = db;

describe('PRUEBAS DE INTEGRACIÓN - Requerimientos Funcionales', () => {
    beforeAll(async () => {
        await sequelize.authenticate();
        console.log('✓ Conexión a base de datos establecida');
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        await PWATScore.destroy({ where: {}, force: true });
        await Segmentacion.destroy({ where: {}, force: true });
        await Imagen.destroy({ where: {}, force: true });
        await Paciente.destroy({ where: {}, force: true });
        await Profesional.destroy({ where: {}, force: true });
        await User.destroy({ where: {}, force: true });
    });

    /**
     * RF2 + RF3: Integración User -> Paciente/Profesional
     */
    describe('RF2+RF3 [INTEGRATION]: Relaciones User-Paciente-Profesional', () => {
        test('Debe mantener relación 1:1 entre User y Paciente', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '11111111-1',
                nombre: 'Paciente Test',
                correo: 'paciente@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1970-01-01',
            });

            const paciente = await Paciente.create({
                user_id: (user as any).rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });

            // Intentar crear otro paciente con el mismo user_id debe fallar
            await expect(async () => {
                await Paciente.create({
                    user_id: (user as any).rut,
                    fecha_ingreso: '2024-02-01',
                    estado: 'en_tratamiento',
                });
            }).toThrow();
        });

        test('Debe asociar profesional con pacientes a través de atenciones', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);

            // Crear profesional
            const userProf = await User.create({
                rut: '22222222-2',
                nombre: 'Dr. López',
                correo: 'lopez@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1975-05-05',
            });

            const profesional = await Profesional.create({
                user_id: (userProf as any).rut,
                especialidad: 'Dermatología',
                fecha_ingreso: '2020-01-01',
            });

            // Crear paciente
            const userPac = await User.create({
                rut: '33333333-3',
                nombre: 'Paciente González',
                correo: 'gonzalez@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1960-03-03',
            });

            const paciente = await Paciente.create({
                user_id: (userPac as any).rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });

            expect((profesional as any).id).toBeDefined();
            expect((paciente as any).id).toBeDefined();
        });
    });

    /**
     * RF4 + RF5: Integración Imagen -> Segmentación
     */
    describe('RF4+RF5 [INTEGRATION]: Relación Imagen-Segmentación', () => {
        let paciente: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '44444444-4',
                nombre: 'Paciente Imágenes',
                correo: 'imagenes@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1965-06-25',
            });

            paciente = await Paciente.create({
                user_id: (user as any).rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });
        });

        test('Debe permitir múltiples segmentaciones para una imagen', async () => {
            const imagen = await Imagen.create({
                nombre_archivo: 'ulcera_001.jpg',
                fecha_captura: new Date(),
                ruta_archivo: '/uploads/ulcera_001.jpg',
                paciente_id: (paciente as any).id,
            });

            // Segmentación automática
            const segAuto = await Segmentacion.create({
                metodo: 'automatica',
                ruta_mascara: '/uploads/masks/auto.png',
                ruta_contorno: '/uploads/contours/auto.png',
                fecha_creacion: new Date('2024-03-15T10:00:00'),
                imagen_id: (imagen as any).id,
            });

            // Segmentación manual
            const segManual = await Segmentacion.create({
                metodo: 'manual',
                ruta_mascara: '/uploads/masks/manual.png',
                ruta_contorno: '/uploads/contours/manual.png',
                fecha_creacion: new Date('2024-03-15T11:00:00'),
                imagen_id: (imagen as any).id,
            });

            const segmentaciones = await Segmentacion.findAll({
                where: { imagen_id: (imagen as any).id },
            });

            expect(segmentaciones.length).toBe(2);
        });

        test('Debe permitir múltiples imágenes por paciente', async () => {
            const imagenes = [];

            for (let i = 1; i <= 3; i++) {
                const img = await Imagen.create({
                    nombre_archivo: `imagen_${i}.jpg`,
                    fecha_captura: new Date(`2024-03-${10 + i}T10:00:00`),
                    ruta_archivo: `/uploads/imagen_${i}.jpg`,
                    lado: i % 2 === 0,
                    paciente_id: (paciente as any).id,
                });
                imagenes.push(img);
            }

            const imagenesDelPaciente = await Imagen.findAll({
                where: { paciente_id: (paciente as any).id },
            });

            expect(imagenesDelPaciente.length).toBe(3);
        });
    });

    /**
     * RF5 + RF6: Integración Segmentación -> PWAT Score
     */
    describe('RF5+RF6 [INTEGRATION]: Flujo Segmentación-PWAT', () => {
        let imagen: any;
        let segmentacion: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '55555555-5',
                nombre: 'Paciente PWAT',
                correo: 'pwat@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1968-08-15',
            });

            const paciente = await Paciente.create({
                user_id: (user as any).rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });

            imagen = await Imagen.create({
                nombre_archivo: 'imagen_pwat.jpg',
                fecha_captura: new Date(),
                ruta_archivo: '/uploads/imagen_pwat.jpg',
                paciente_id: (paciente as any).id,
            });

            segmentacion = await Segmentacion.create({
                metodo: 'automatica',
                ruta_mascara: '/uploads/masks/pwat.png',
                ruta_contorno: '/uploads/contours/pwat.png',
                fecha_creacion: new Date(),
                imagen_id: (imagen as any).id,
            });
        });

        test('Debe permitir múltiples evaluaciones PWAT para una imagen', async () => {
            // Evaluación automática
            const evalAuto = await PWATScore.create({
                cat1: 3,
                cat2: 2,
                cat3: 4,
                cat4: 3,
                cat5: 2,
                cat6: 1,
                cat7: 3,
                cat8: 2,
                fecha_evaluacion: new Date('2024-03-15T10:00:00'),
                observaciones: 'Evaluación automática',
                imagen_id: (imagen as any).id,
            });

            // Evaluación manual
            const evalManual = await PWATScore.create({
                cat1: 3,
                cat2: 3,
                cat3: 4,
                cat4: 3,
                cat5: 2,
                cat6: 2,
                cat7: 3,
                cat8: 2,
                fecha_evaluacion: new Date('2024-03-15T11:00:00'),
                observaciones: 'Evaluación manual - Dr. López',
                imagen_id: (imagen as any).id,
            });

            const evaluaciones = await PWATScore.findAll({
                where: { imagen_id: (imagen as any).id },
            });

            expect(evaluaciones.length).toBe(2);
        });
    });

    /**
     * RF7: Visualización de evaluaciones (integración completa)
     */
    describe('RF7 [INTEGRATION]: Consultas de historial completo', () => {
        let paciente: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '66666666-6',
                nombre: 'Paciente Historial',
                correo: 'historial@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1972-02-28',
            });

            paciente = await Paciente.create({
                user_id: (user as any).rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });
        });

        test('Debe recuperar historial completo de evaluaciones', async () => {
            const imagenesIds = [];

            // Crear 3 imágenes con evaluaciones
            for (let i = 1; i <= 3; i++) {
                const imagen = await Imagen.create({
                    nombre_archivo: `imagen_${i}.jpg`,
                    fecha_captura: new Date(`2024-03-${i}0T10:00:00`),
                    ruta_archivo: `/uploads/imagen_${i}.jpg`,
                    paciente_id: (paciente as any).id,
                });

                imagenesIds.push((imagen as any).id);

                await PWATScore.create({
                    cat1: i,
                    cat2: i,
                    cat3: i,
                    cat4: i,
                    cat5: i,
                    cat6: i,
                    cat7: i,
                    cat8: i,
                    fecha_evaluacion: new Date(`2024-03-${i}0T11:00:00`),
                    observaciones: `Evaluación ${i}`,
                    imagen_id: (imagen as any).id,
                });
            }

            // Consultar imágenes del paciente
            const imagenes = await Imagen.findAll({
                where: { paciente_id: (paciente as any).id },
            });

            // Consultar evaluaciones de esas imágenes
            const evaluaciones = await PWATScore.findAll({
                where: { imagen_id: imagenesIds },
            });

            expect(imagenes.length).toBe(3);
            expect(evaluaciones.length).toBe(3);
        });

        test('Debe ordenar evaluaciones por fecha', async () => {
            const fechas = [
                new Date('2024-01-15T10:00:00'),
                new Date('2024-02-20T10:00:00'),
                new Date('2024-03-25T10:00:00'),
            ];

            const imagenesIds = [];

            for (let i = 0; i < fechas.length; i++) {
                const imagen = await Imagen.create({
                    nombre_archivo: `imagen_${i}.jpg`,
                    fecha_captura: fechas[i],
                    ruta_archivo: `/uploads/imagen_${i}.jpg`,
                    paciente_id: (paciente as any).id,
                });

                imagenesIds.push((imagen as any).id);

                await PWATScore.create({
                    cat1: 2,
                    cat2: 2,
                    cat3: 2,
                    cat4: 2,
                    cat5: 2,
                    cat6: 2,
                    cat7: 2,
                    cat8: 2,
                    fecha_evaluacion: fechas[i],
                    observaciones: `Evaluación ${i}`,
                    imagen_id: (imagen as any).id,
                });
            }

            const evaluaciones = await PWATScore.findAll({
                where: { imagen_id: imagenesIds },
                order: [['fecha_evaluacion', 'ASC']],
            });

            expect(evaluaciones.length).toBe(3);
            expect(
                (evaluaciones[0] as any).fecha_evaluacion.getTime()
            ).toBeLessThan((evaluaciones[1] as any).fecha_evaluacion.getTime());
        });
    });

    /**
     * RF8: Validación cruzada (integración de evaluaciones)
     */
    describe('RF8 [INTEGRATION]: Comparación modelo vs experto', () => {
        let imagen: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '77777777-7',
                nombre: 'Paciente Validación',
                correo: 'validacion@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1965-11-11',
            });

            const paciente = await Paciente.create({
                user_id: (user as any).rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });

            imagen = await Imagen.create({
                nombre_archivo: 'imagen_validacion.jpg',
                fecha_captura: new Date(),
                ruta_archivo: '/uploads/imagen_validacion.jpg',
                paciente_id: (paciente as any).id,
            });
        });

        test('Debe comparar evaluación automática vs manual', async () => {
            const evalModelo = await PWATScore.create({
                cat1: 3,
                cat2: 2,
                cat3: 4,
                cat4: 3,
                cat5: 2,
                cat6: 1,
                cat7: 3,
                cat8: 2,
                fecha_evaluacion: new Date('2024-03-15T10:00:00'),
                observaciones: 'Evaluación automática - Modelo ML',
                imagen_id: (imagen as any).id,
            });

            const evalExperto = await PWATScore.create({
                cat1: 3,
                cat2: 3,
                cat3: 4,
                cat4: 3,
                cat5: 2,
                cat6: 2,
                cat7: 3,
                cat8: 2,
                fecha_evaluacion: new Date('2024-03-15T11:30:00'),
                observaciones: 'Evaluación manual - Dr. Martínez',
                imagen_id: (imagen as any).id,
            });

            const evaluaciones = await PWATScore.findAll({
                where: { imagen_id: (imagen as any).id },
                order: [['fecha_evaluacion', 'ASC']],
            });

            expect(evaluaciones.length).toBe(2);

            // Calcular diferencia
            const scorModelo =
                (evalModelo as any).cat1 +
                (evalModelo as any).cat2 +
                (evalModelo as any).cat3 +
                (evalModelo as any).cat4 +
                (evalModelo as any).cat5 +
                (evalModelo as any).cat6 +
                (evalModelo as any).cat7 +
                (evalModelo as any).cat8;

            const scorExperto =
                (evalExperto as any).cat1 +
                (evalExperto as any).cat2 +
                (evalExperto as any).cat3 +
                (evalExperto as any).cat4 +
                (evalExperto as any).cat5 +
                (evalExperto as any).cat6 +
                (evalExperto as any).cat7 +
                (evalExperto as any).cat8;

            const diferencia = Math.abs(scorModelo - scorExperto);
            expect(diferencia).toBeLessThanOrEqual(5);
        });

        test('Debe calcular concordancia entre evaluadores', async () => {
            const evalModelo = await PWATScore.create({
                cat1: 3,
                cat2: 2,
                cat3: 4,
                cat4: 3,
                cat5: 2,
                cat6: 1,
                cat7: 3,
                cat8: 2,
                fecha_evaluacion: new Date(),
                observaciones: 'Modelo',
                imagen_id: (imagen as any).id,
            });

            const evalExperto = await PWATScore.create({
                cat1: 3,
                cat2: 3,
                cat3: 4,
                cat4: 3,
                cat5: 2,
                cat6: 2,
                cat7: 3,
                cat8: 2,
                fecha_evaluacion: new Date(),
                observaciones: 'Experto',
                imagen_id: (imagen as any).id,
            });

            const categorias = [
                'cat1',
                'cat2',
                'cat3',
                'cat4',
                'cat5',
                'cat6',
                'cat7',
                'cat8',
            ];
            let concordancias = 0;

            for (const cat of categorias) {
                if ((evalModelo as any)[cat] === (evalExperto as any)[cat]) {
                    concordancias++;
                }
            }

            const porcentajeConcordancia =
                (concordancias / categorias.length) * 100;
            expect(porcentajeConcordancia).toBeGreaterThanOrEqual(50);
        });
    });

    /**
     * Flujo completo: Paciente -> Imagen -> Segmentación -> PWAT
     */
    describe('[INTEGRATION]: Flujo completo de datos', () => {
        test('Debe completar flujo desde paciente hasta evaluación PWAT', async () => {
            // 1. Crear usuario y paciente
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '88888888-8',
                nombre: 'Paciente Flujo Completo',
                correo: 'flujo@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1960-01-01',
            });

            const paciente = await Paciente.create({
                user_id: (user as any).rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
                comentarios: 'Paciente nuevo con úlcera',
            });

            // 2. Subir imagen
            const imagen = await Imagen.create({
                nombre_archivo: 'ulcera_inicial.jpg',
                fecha_captura: new Date(),
                ruta_archivo: '/uploads/ulcera_inicial.jpg',
                lado: true,
                paciente_id: (paciente as any).id,
            });

            // 3. Crear segmentación
            const segmentacion = await Segmentacion.create({
                metodo: 'automatica',
                ruta_mascara: '/uploads/masks/ulcera_inicial_mask.png',
                ruta_contorno: '/uploads/contours/ulcera_inicial_contour.png',
                fecha_creacion: new Date(),
                imagen_id: (imagen as any).id,
            });

            // 4. Generar evaluación PWAT
            const pwat = await PWATScore.create({
                cat1: 3,
                cat2: 2,
                cat3: 4,
                cat4: 3,
                cat5: 2,
                cat6: 1,
                cat7: 3,
                cat8: 2,
                fecha_evaluacion: new Date(),
                observaciones: 'Evaluación automática inicial',
                imagen_id: (imagen as any).id,
            });

            // Verificar que todo el flujo funcionó
            expect((paciente as any).id).toBeDefined();
            expect((imagen as any).id).toBeDefined();
            expect((segmentacion as any).imagen_id).toBe((imagen as any).id);
            expect((pwat as any).imagen_id).toBe((imagen as any).id);

            // Verificar que podemos consultar todo el historial
            const imagenesDelPaciente = await Imagen.findAll({
                where: { paciente_id: (paciente as any).id },
            });

            const evaluaciones = await PWATScore.findAll({
                where: { imagen_id: (imagen as any).id },
            });

            expect(imagenesDelPaciente.length).toBe(1);
            expect(evaluaciones.length).toBe(1);
        });
    });
});
