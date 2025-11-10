/**
 * Suite de Pruebas de Requerimientos Funcionales
 *
 * Este archivo contiene todas las pruebas para validar los requerimientos funcionales
 * del sistema de gestión de heridas ulcerosas.
 *
 * Requerimientos cubiertos: RF1 a RF9
 */

import {
    describe,
    test,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
} from 'bun:test';
import db from '../../models/index';
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

describe('Requerimientos Funcionales - Suite Completa', () => {
    beforeAll(async () => {
        // Conectar a la base de datos de prueba
        await sequelize.authenticate();
        console.log('✓ Conexión a base de datos establecida');
    });

    afterAll(async () => {
        // Cerrar conexión
        await sequelize.close();
    });

    beforeEach(async () => {
        // Limpiar datos de prueba antes de cada test
        await PWATScore.destroy({ where: {}, force: true });
        await Segmentacion.destroy({ where: {}, force: true });
        await Imagen.destroy({ where: {}, force: true });
        await Paciente.destroy({ where: {}, force: true });
        await Profesional.destroy({ where: {}, force: true });
        await User.destroy({ where: {}, force: true });
    });

    /**
     * RF1: Registro de usuario
     * El sistema debe permitir registrar nuevos usuarios en la tabla user,
     * incluyendo su RUT, nombre, correo, contraseña, rol y fecha de nacimiento.
     */
    describe('RF1: Registro de usuario', () => {
        test('Debe permitir registrar un usuario con todos los campos requeridos', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);

            const newUser = await User.create({
                rut: '12345678-9',
                nombre: 'Juan Pérez',
                correo: 'juan.perez@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1985-05-15',
                sexo: 'M',
            });

            expect(newUser).toBeDefined();
            expect(newUser.rut).toBe('12345678-9');
            expect(newUser.nombre).toBe('Juan Pérez');
            expect(newUser.correo).toBe('juan.perez@hospital.cl');
            expect(newUser.rol).toBe('doctor');
            expect(newUser.fecha_nacimiento).toBe('1985-05-15');
            expect(newUser.sexo).toBe('M');
        });

        test('Debe permitir registrar usuarios con diferentes roles', async () => {
            const roles = [
                'doctor',
                'enfermera',
                'admin',
                'paciente',
                'investigador',
            ];
            const passwordHash = await bcrypt.hash('password123', 10);

            for (let i = 0; i < roles.length; i++) {
                const user = await User.create({
                    rut: `1234567${i}-${i}`,
                    nombre: `Usuario ${roles[i]}`,
                    correo: `${roles[i]}@hospital.cl`,
                    contrasena_hash: passwordHash,
                    rol: roles[i] as any,
                    fecha_nacimiento: '1990-01-01',
                });

                expect(user.rol).toBe(roles[i]);
            }

            const allUsers = await User.findAll();
            expect(allUsers.length).toBe(5);
        });

        test('Debe validar que el RUT sea único', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);

            await User.create({
                rut: '11111111-1',
                nombre: 'Usuario Uno',
                correo: 'usuario1@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1990-01-01',
            });

            // Intentar crear otro usuario con el mismo RUT debe fallar
            await expect(async () => {
                await User.create({
                    rut: '11111111-1',
                    nombre: 'Usuario Dos',
                    correo: 'usuario2@hospital.cl',
                    contrasena_hash: passwordHash,
                    rol: 'enfermera',
                    fecha_nacimiento: '1991-01-01',
                });
            }).toThrow();
        });

        test('Debe almacenar la contraseña como hash', async () => {
            const plainPassword = 'password123';
            const passwordHash = await bcrypt.hash(plainPassword, 10);

            const user = await User.create({
                rut: '22222222-2',
                nombre: 'Usuario Seguro',
                correo: 'seguro@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1990-01-01',
            });

            // La contraseña almacenada no debe ser igual al texto plano
            expect(user.contrasena_hash).not.toBe(plainPassword);

            // Pero debe poder verificarse con bcrypt
            const isValid = await bcrypt.compare(
                plainPassword,
                user.contrasena_hash
            );
            expect(isValid).toBe(true);
        });
    });

    /**
     * RF2: Gestión de pacientes
     * El sistema debe permitir al personal clínico registrar y actualizar información
     * de pacientes en la tabla paciente, asociando cada paciente a un usuario
     * y a un profesional responsable.
     */
    describe('RF2: Gestión de pacientes', () => {
        let userPaciente: any;
        let profesional: any;

        beforeEach(async () => {
            // Crear usuario paciente
            const passwordHash = await bcrypt.hash('password123', 10);
            userPaciente = await User.create({
                rut: '33333333-3',
                nombre: 'María González',
                correo: 'maria.gonzalez@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1960-03-20',
                sexo: 'F',
            });

            // Crear profesional
            const userProfesional = await User.create({
                rut: '44444444-4',
                nombre: 'Dr. Carlos López',
                correo: 'carlos.lopez@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1975-08-10',
            });

            profesional = await Profesional.create({
                user_id: userProfesional.rut,
                especialidad: 'Dermatología',
                fecha_ingreso: '2020-01-15',
            });
        });

        test('Debe permitir registrar un paciente asociado a un usuario', async () => {
            const paciente = await Paciente.create({
                user_id: userPaciente.rut,
                fecha_ingreso: '2024-01-10',
                estado: 'en_tratamiento',
                comentarios: 'Paciente con úlcera en pie derecho',
            });

            expect(paciente).toBeDefined();
            expect(paciente.user_id).toBe(userPaciente.rut);
            expect(paciente.estado).toBe('en_tratamiento');
            expect(paciente.comentarios).toContain('úlcera en pie derecho');
        });

        test('Debe permitir actualizar el estado de un paciente', async () => {
            const paciente = await Paciente.create({
                user_id: userPaciente.rut,
                fecha_ingreso: '2024-01-10',
                estado: 'en_tratamiento',
                comentarios: 'Tratamiento inicial',
            });

            // Actualizar estado
            await paciente.update({
                estado: 'alta',
                comentarios: 'Paciente dado de alta - herida sanada',
            });

            const pacienteActualizado = await Paciente.findByPk(paciente.id);
            expect(pacienteActualizado?.estado).toBe('alta');
            expect(pacienteActualizado?.comentarios).toContain('alta');
        });

        test('Debe soportar todos los estados válidos de paciente', async () => {
            const estados = [
                'alta',
                'en_tratamiento',
                'interrumpido',
                'inactivo',
            ];

            for (let i = 0; i < estados.length; i++) {
                const passwordHash = await bcrypt.hash('password123', 10);
                const user = await User.create({
                    rut: `5555555${i}-${i}`,
                    nombre: `Paciente ${i}`,
                    correo: `paciente${i}@email.cl`,
                    contrasena_hash: passwordHash,
                    rol: 'paciente',
                    fecha_nacimiento: '1970-01-01',
                });

                const paciente = await Paciente.create({
                    user_id: user.rut,
                    fecha_ingreso: '2024-01-10',
                    estado: estados[i] as any,
                });

                expect(paciente.estado).toBe(estados[i]);
            }
        });

        test('Debe mantener la relación uno a uno entre User y Paciente', async () => {
            const paciente1 = await Paciente.create({
                user_id: userPaciente.rut,
                fecha_ingreso: '2024-01-10',
                estado: 'en_tratamiento',
            });

            // Intentar crear otro paciente con el mismo user_id debe fallar
            await expect(async () => {
                await Paciente.create({
                    user_id: userPaciente.rut,
                    fecha_ingreso: '2024-02-10',
                    estado: 'en_tratamiento',
                });
            }).toThrow();
        });
    });

    /**
     * RF3: Registro de profesionales
     * El sistema debe permitir registrar y administrar profesionales clínicos
     * en la tabla profesional, vinculando cada uno a un usuario registrado.
     */
    describe('RF3: Registro de profesionales', () => {
        test('Debe permitir registrar un profesional vinculado a un usuario', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const userDoctor = await User.create({
                rut: '66666666-6',
                nombre: 'Dra. Ana Martínez',
                correo: 'ana.martinez@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1980-04-15',
            });

            const profesional = await Profesional.create({
                user_id: userDoctor.rut,
                especialidad: 'Cirugía Vascular',
                fecha_ingreso: '2019-03-01',
            });

            expect(profesional).toBeDefined();
            expect(profesional.user_id).toBe(userDoctor.rut);
            expect(profesional.especialidad).toBe('Cirugía Vascular');
            expect(profesional.fecha_ingreso).toBe('2019-03-01');
        });

        test('Debe permitir registrar profesionales con diferentes especialidades', async () => {
            const especialidades = [
                'Dermatología',
                'Enfermería',
                'Cirugía',
                'Medicina Interna',
                'Infectología',
            ];

            const passwordHash = await bcrypt.hash('password123', 10);

            for (let i = 0; i < especialidades.length; i++) {
                const user = await User.create({
                    rut: `7777777${i}-${i}`,
                    nombre: `Profesional ${i}`,
                    correo: `prof${i}@hospital.cl`,
                    contrasena_hash: passwordHash,
                    rol: i % 2 === 0 ? 'doctor' : 'enfermera',
                    fecha_nacimiento: '1985-01-01',
                });

                const prof = await Profesional.create({
                    user_id: user.rut,
                    especialidad: especialidades[i],
                    fecha_ingreso: '2020-01-01',
                });

                expect(prof.especialidad).toBe(especialidades[i]);
            }

            const allProfesionales = await Profesional.findAll();
            expect(allProfesionales.length).toBe(5);
        });

        test('Debe actualizar información del profesional', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '88888888-8',
                nombre: 'Dr. Pedro Soto',
                correo: 'pedro.soto@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1978-11-20',
            });

            const profesional = await Profesional.create({
                user_id: user.rut,
                especialidad: 'Medicina General',
                fecha_ingreso: '2018-01-01',
            });

            // Actualizar especialidad
            await profesional.update({
                especialidad: 'Medicina General - Especialista en Heridas',
            });

            const profActualizado = await Profesional.findByPk(profesional.id);
            expect(profActualizado?.especialidad).toContain(
                'Especialista en Heridas'
            );
        });
    });

    /**
     * RF4: Carga de imágenes clínicas
     * El sistema debe permitir subir imágenes de heridas ulcerosas, guardando su nombre,
     * fecha de captura, ruta de almacenamiento y asociación con el paciente correspondiente.
     */
    describe('RF4: Carga de imágenes clínicas', () => {
        let paciente: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '99999999-9',
                nombre: 'Paciente Prueba',
                correo: 'paciente@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1965-06-25',
            });

            paciente = await Paciente.create({
                user_id: user.rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });
        });

        test('Debe permitir cargar una imagen asociada a un paciente', async () => {
            const imagen = await Imagen.create({
                nombre_archivo: 'ulcera_pie_derecho_001.jpg',
                fecha_captura: new Date('2024-03-15T10:30:00'),
                ruta_archivo:
                    '/uploads/pacientes/99999999-9/ulcera_pie_derecho_001.jpg',
                lado: true, // true = derecho
                paciente_id: paciente.id,
            });

            expect(imagen).toBeDefined();
            expect(imagen.nombre_archivo).toBe('ulcera_pie_derecho_001.jpg');
            expect(imagen.paciente_id).toBe(paciente.id);
            expect(imagen.lado).toBe(true);
            expect(imagen.ruta_archivo).toContain('/uploads/');
        });

        test('Debe permitir cargar múltiples imágenes para un mismo paciente', async () => {
            const imagenes = [];

            for (let i = 1; i <= 3; i++) {
                const img = await Imagen.create({
                    nombre_archivo: `imagen_${i}.jpg`,
                    fecha_captura: new Date(`2024-03-${10 + i}T10:00:00`),
                    ruta_archivo: `/uploads/pacientes/${paciente.id}/imagen_${i}.jpg`,
                    lado: i % 2 === 0,
                    paciente_id: paciente.id,
                });
                imagenes.push(img);
            }

            expect(imagenes.length).toBe(3);

            const imagenesDelPaciente = await Imagen.findAll({
                where: { paciente_id: paciente.id },
            });
            expect(imagenesDelPaciente.length).toBe(3);
        });

        test('Debe almacenar correctamente la fecha de captura', async () => {
            const fechaCaptura = new Date('2024-06-20T14:45:30');

            const imagen = await Imagen.create({
                nombre_archivo: 'imagen_timestamped.jpg',
                fecha_captura: fechaCaptura,
                ruta_archivo: '/uploads/imagen_timestamped.jpg',
                paciente_id: paciente.id,
            });

            const imagenRecuperada = await Imagen.findOne({
                where: {
                    id: imagen.id,
                    fecha_captura: fechaCaptura,
                },
            });

            expect(imagenRecuperada).toBeDefined();
            expect(imagenRecuperada?.fecha_captura.getTime()).toBe(
                fechaCaptura.getTime()
            );
        });

        test('Debe permitir imagen con lado opcional (null)', async () => {
            const imagen = await Imagen.create({
                nombre_archivo: 'imagen_sin_lado.jpg',
                fecha_captura: new Date(),
                ruta_archivo: '/uploads/imagen_sin_lado.jpg',
                lado: null,
                paciente_id: paciente.id,
            });

            expect(imagen.lado).toBeNull();
        });
    });

    /**
     * RF5: Segmentación de imágenes
     * El sistema debe permitir registrar los resultados de segmentación de una imagen,
     * especificando el método usado (manual o automática), la ruta de la máscara
     * y la fecha de creación.
     */
    describe('RF5: Segmentación de imágenes', () => {
        let imagen: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '10101010-1',
                nombre: 'Paciente Segmentación',
                correo: 'seg@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1970-05-10',
            });

            const paciente = await Paciente.create({
                user_id: user.rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });

            imagen = await Imagen.create({
                nombre_archivo: 'imagen_para_segmentar.jpg',
                fecha_captura: new Date(),
                ruta_archivo: '/uploads/imagen_para_segmentar.jpg',
                paciente_id: paciente.id,
            });
        });

        test('Debe permitir registrar una segmentación automática', async () => {
            const segmentacion = await Segmentacion.create({
                metodo: 'automatica',
                ruta_mascara: '/uploads/masks/mascara_auto_001.png',
                ruta_contorno: '/uploads/contours/contorno_auto_001.png',
                fecha_creacion: new Date(),
                imagen_id: imagen.id,
            });

            expect(segmentacion).toBeDefined();
            expect(segmentacion.metodo).toBe('automatica');
            expect(segmentacion.ruta_mascara).toContain('mascara_auto');
            expect(segmentacion.ruta_contorno).toContain('contorno_auto');
            expect(segmentacion.imagen_id).toBe(imagen.id);
        });

        test('Debe permitir registrar una segmentación manual', async () => {
            const segmentacion = await Segmentacion.create({
                metodo: 'manual',
                ruta_mascara: '/uploads/masks/mascara_manual_001.png',
                ruta_contorno: '/uploads/contours/contorno_manual_001.png',
                fecha_creacion: new Date(),
                imagen_id: imagen.id,
            });

            expect(segmentacion.metodo).toBe('manual');
            expect(segmentacion.ruta_mascara).toContain('mascara_manual');
        });

        test('Debe validar que el método sea manual o automática', async () => {
            // Intentar crear con método inválido debe fallar
            await expect(async () => {
                await Segmentacion.create({
                    metodo: 'invalido' as any,
                    ruta_mascara: '/uploads/masks/mascara.png',
                    fecha_creacion: new Date(),
                    imagen_id: imagen.id,
                });
            }).toThrow();
        });

        test('Debe almacenar correctamente múltiples segmentaciones para una imagen', async () => {
            // Segmentación automática
            const seg1 = await Segmentacion.create({
                metodo: 'automatica',
                ruta_mascara: '/uploads/masks/mascara_auto.png',
                ruta_contorno: '/uploads/contours/contorno_auto.png',
                fecha_creacion: new Date('2024-03-15T10:00:00'),
                imagen_id: imagen.id,
            });

            // Segmentación manual (posterior)
            const seg2 = await Segmentacion.create({
                metodo: 'manual',
                ruta_mascara: '/uploads/masks/mascara_manual.png',
                ruta_contorno: '/uploads/contours/contorno_manual.png',
                fecha_creacion: new Date('2024-03-15T11:00:00'),
                imagen_id: imagen.id,
            });

            const segmentaciones = await Segmentacion.findAll({
                where: { imagen_id: imagen.id },
            });

            expect(segmentaciones.length).toBe(2);
            expect(segmentaciones.some((s) => s.metodo === 'automatica')).toBe(
                true
            );
            expect(segmentaciones.some((s) => s.metodo === 'manual')).toBe(
                true
            );
        });
    });

    /**
     * RF6: Evaluación del estadio de la herida
     * El sistema debe permitir registrar el puntaje PWAT calculado por modelo
     * o experto humano, vinculando los resultados con una imagen
     * y su segmentación correspondiente.
     */
    describe('RF6: Evaluación del estadio de la herida (PWAT Score)', () => {
        let imagen: any;
        let segmentacion: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '11111111-2',
                nombre: 'Paciente PWAT',
                correo: 'pwat@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1968-08-15',
            });

            const paciente = await Paciente.create({
                user_id: user.rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });

            imagen = await Imagen.create({
                nombre_archivo: 'imagen_pwat.jpg',
                fecha_captura: new Date(),
                ruta_archivo: '/uploads/imagen_pwat.jpg',
                paciente_id: paciente.id,
            });

            segmentacion = await Segmentacion.create({
                metodo: 'automatica',
                ruta_mascara: '/uploads/masks/mascara_pwat.png',
                ruta_contorno: '/uploads/contours/contorno_pwat.png',
                fecha_creacion: new Date(),
                imagen_id: imagen.id,
            });
        });

        test('Debe permitir registrar un PWAT Score completo', async () => {
            const pwatScore = await PWATScore.create({
                cat1: 3,
                cat2: 2,
                cat3: 4,
                cat4: 3,
                cat5: 2,
                cat6: 1,
                cat7: 3,
                cat8: 2,
                fecha_evaluacion: new Date(),
                observaciones: 'Evaluación inicial - herida moderada',
                imagen_id: imagen.id,
            });

            expect(pwatScore).toBeDefined();
            expect(pwatScore.cat1).toBe(3);
            expect(pwatScore.cat2).toBe(2);
            expect(pwatScore.cat3).toBe(4);
            expect(pwatScore.imagen_id).toBe(imagen.id);

            // Calcular puntaje total
            const totalScore =
                pwatScore.cat1 +
                pwatScore.cat2 +
                pwatScore.cat3 +
                pwatScore.cat4 +
                pwatScore.cat5 +
                pwatScore.cat6 +
                pwatScore.cat7 +
                pwatScore.cat8;
            expect(totalScore).toBe(20);
        });

        test('Debe permitir registrar evaluaciones automáticas (sin observaciones)', async () => {
            const pwatScore = await PWATScore.create({
                cat1: 2,
                cat2: 1,
                cat3: 3,
                cat4: 2,
                cat5: 1,
                cat6: 2,
                cat7: 2,
                cat8: 1,
                fecha_evaluacion: new Date(),
                observaciones: 'Evaluación automática por modelo ML',
                imagen_id: imagen.id,
            });

            expect(pwatScore.observaciones).toContain('automática');
        });

        test('Debe permitir múltiples evaluaciones para la misma imagen', async () => {
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
                imagen_id: imagen.id,
            });

            // Evaluación manual por experto
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
                imagen_id: imagen.id,
            });

            const evaluaciones = await PWATScore.findAll({
                where: { imagen_id: imagen.id },
            });

            expect(evaluaciones.length).toBe(2);
        });

        test('Debe validar que las categorías obligatorias estén presentes', async () => {
            // Intentar crear sin cat3 (obligatoria) debe fallar
            await expect(async () => {
                await PWATScore.create({
                    cat1: 3,
                    cat2: 2,
                    // cat3 faltante (obligatoria)
                    cat4: 3,
                    cat5: 2,
                    cat6: 1,
                    cat7: 3,
                    cat8: 2,
                    imagen_id: imagen.id,
                });
            }).toThrow();
        });
    });

    /**
     * RF7: Visualización de evaluaciones
     * El sistema debe permitir consultar el historial de evaluaciones PWAT
     * asociadas a un paciente.
     */
    describe('RF7: Visualización de evaluaciones', () => {
        let paciente: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '12121212-3',
                nombre: 'Paciente Historial',
                correo: 'historial@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1972-02-28',
            });

            paciente = await Paciente.create({
                user_id: user.rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });
        });

        test('Debe recuperar historial completo de evaluaciones de un paciente', async () => {
            // Crear 3 imágenes con evaluaciones
            const imagenesIds = [];
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

            // Consultar todas las imágenes del paciente
            const imagenes = await Imagen.findAll({
                where: { paciente_id: (paciente as any).id },
            });

            expect(imagenes.length).toBe(3);

            // Consultar evaluaciones de esas imágenes
            const evaluaciones = await PWATScore.findAll({
                where: { imagen_id: imagenesIds },
            });

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

            // Consultar evaluaciones ordenadas por fecha
            const evaluaciones = await PWATScore.findAll({
                where: { imagen_id: imagenesIds },
                order: [['fecha_evaluacion', 'ASC']],
            });

            expect(evaluaciones.length).toBe(3);
            expect(
                (evaluaciones[0] as any).fecha_evaluacion.getTime()
            ).toBeLessThan((evaluaciones[1] as any).fecha_evaluacion.getTime());
            expect(
                (evaluaciones[1] as any).fecha_evaluacion.getTime()
            ).toBeLessThan((evaluaciones[2] as any).fecha_evaluacion.getTime());
        });
    });

    /**
     * RF8: Validación cruzada de evaluaciones
     * El sistema debe permitir comparar las evaluaciones realizadas por el modelo
     * con aquellas realizadas por expertos clínicos sobre la misma imagen.
     */
    describe('RF8: Validación cruzada de evaluaciones', () => {
        let imagen: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '13131313-4',
                nombre: 'Paciente Validación',
                correo: 'validacion@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1965-11-11',
            });

            const paciente = await Paciente.create({
                user_id: user.rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });

            imagen = await Imagen.create({
                nombre_archivo: 'imagen_validacion.jpg',
                fecha_captura: new Date(),
                ruta_archivo: '/uploads/imagen_validacion.jpg',
                paciente_id: paciente.id,
            });
        });

        test('Debe permitir comparar evaluación automática vs manual', async () => {
            // Evaluación automática (modelo)
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
                imagen_id: imagen.id,
            });

            // Evaluación manual (experto)
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
                imagen_id: imagen.id,
            });

            // Recuperar ambas evaluaciones
            const evaluaciones = await PWATScore.findAll({
                where: { imagen_id: imagen.id },
                order: [['fecha_evaluacion', 'ASC']],
            });

            expect(evaluaciones.length).toBe(2);

            // Comparar resultados
            const scorModelo =
                evalModelo.cat1 +
                evalModelo.cat2 +
                evalModelo.cat3 +
                evalModelo.cat4 +
                evalModelo.cat5 +
                evalModelo.cat6 +
                evalModelo.cat7 +
                evalModelo.cat8;

            const scorExperto =
                evalExperto.cat1 +
                evalExperto.cat2 +
                evalExperto.cat3 +
                evalExperto.cat4 +
                evalExperto.cat5 +
                evalExperto.cat6 +
                evalExperto.cat7 +
                evalExperto.cat8;

            const diferencia = Math.abs(scorModelo - scorExperto);

            expect(diferencia).toBeLessThanOrEqual(5); // Diferencia aceptable
        });

        test('Debe calcular métricas de concordancia entre evaluadores', async () => {
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
                imagen_id: imagen.id,
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
                imagen_id: imagen.id,
            });

            // Calcular concordancia por categoría
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
                if (evalModelo[cat] === evalExperto[cat]) {
                    concordancias++;
                }
            }

            const porcentajeConcordancia =
                (concordancias / categorias.length) * 100;
            expect(porcentajeConcordancia).toBeGreaterThanOrEqual(50);
        });
    });

    /**
     * RF9: Gestión de acceso por rol
     * El sistema debe restringir el acceso a funcionalidades según el rol del usuario.
     */
    describe('RF9: Gestión de acceso por rol', () => {
        test('Debe diferenciar usuarios por rol', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);

            const doctor = await User.create({
                rut: '14141414-5',
                nombre: 'Dr. García',
                correo: 'garcia@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1975-05-05',
            });

            const enfermera = await User.create({
                rut: '15151515-6',
                nombre: 'Enf. Rodríguez',
                correo: 'rodriguez@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'enfermera',
                fecha_nacimiento: '1982-07-07',
            });

            const paciente = await User.create({
                rut: '16161616-7',
                nombre: 'Paciente Pérez',
                correo: 'perez@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1960-09-09',
            });

            expect(doctor.rol).toBe('doctor');
            expect(enfermera.rol).toBe('enfermera');
            expect(paciente.rol).toBe('paciente');
        });

        test('Debe permitir verificar permisos basados en rol', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);

            const admin = await User.create({
                rut: '17171717-8',
                nombre: 'Admin Sistema',
                correo: 'admin@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'admin',
                fecha_nacimiento: '1980-01-01',
            });

            const investigador = await User.create({
                rut: '18181818-9',
                nombre: 'Investigador López',
                correo: 'investigador@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'investigador',
                fecha_nacimiento: '1985-02-02',
            });

            // Función de ejemplo para verificar permisos
            const puedeIngresarEvaluaciones = (rol: string) => {
                return ['doctor', 'enfermera'].includes(rol);
            };

            const puedeAccederDatosAnonimizados = (rol: string) => {
                return ['investigador', 'admin'].includes(rol);
            };

            expect(puedeIngresarEvaluaciones(admin.rol)).toBe(false);
            expect(puedeIngresarEvaluaciones('doctor')).toBe(true);
            expect(puedeIngresarEvaluaciones('enfermera')).toBe(true);
            expect(puedeAccederDatosAnonimizados(investigador.rol)).toBe(true);
        });

        test('Debe validar roles válidos al crear usuario', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);

            // Rol válido
            const userValido = await User.create({
                rut: '19191919-0',
                nombre: 'Usuario Válido',
                correo: 'valido@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'enfermera',
                fecha_nacimiento: '1990-03-03',
            });

            expect(userValido.rol).toBe('enfermera');

            // Rol inválido debe fallar
            await expect(async () => {
                await User.create({
                    rut: '20202020-1',
                    nombre: 'Usuario Inválido',
                    correo: 'invalido@hospital.cl',
                    contrasena_hash: passwordHash,
                    rol: 'rol_inexistente' as any,
                    fecha_nacimiento: '1990-03-03',
                });
            }).toThrow();
        });
    });
});
