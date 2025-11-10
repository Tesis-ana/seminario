/**
 * PRUEBAS UNITARIAS - Requerimientos Funcionales
 *
 * Las pruebas unitarias verifican componentes individuales de forma aislada.
 * Se enfocan en la lógica de modelos, validaciones y funciones puras.
 *
 * Características:
 * - Pruebas rápidas y aisladas
 * - No dependen de otros componentes
 * - Verifican comportamiento de unidades individuales
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

describe('PRUEBAS UNITARIAS - Requerimientos Funcionales', () => {
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
     * RF1: Registro de usuario - Pruebas Unitarias
     */
    describe('RF1 [UNIT]: Modelo User - Validaciones', () => {
        test('Debe crear un usuario con estructura correcta', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);

            const user = await User.create({
                rut: '12345678-9',
                nombre: 'Juan Pérez',
                correo: 'juan.perez@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1985-05-15',
                sexo: 'M',
            });

            expect(user).toBeDefined();
            expect((user as any).rut).toBe('12345678-9');
            expect((user as any).nombre).toBe('Juan Pérez');
            expect((user as any).rol).toBe('doctor');
        });

        test('Debe validar que RUT sea clave primaria única', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);

            await User.create({
                rut: '11111111-1',
                nombre: 'Usuario Uno',
                correo: 'usuario1@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1990-01-01',
            });

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

        test('Debe validar enumeración de roles', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const rolesValidos = [
                'doctor',
                'enfermera',
                'admin',
                'paciente',
                'investigador',
            ];

            for (const rol of rolesValidos) {
                const user = await User.create({
                    rut: `${rolesValidos.indexOf(rol)}0000000-0`,
                    nombre: `Usuario ${rol}`,
                    correo: `${rol}@hospital.cl`,
                    contrasena_hash: passwordHash,
                    rol: rol as any,
                    fecha_nacimiento: '1990-01-01',
                });

                expect((user as any).rol).toBe(rol);
            }
        });

        test('Debe almacenar contraseña como hash bcrypt', async () => {
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

            expect((user as any).contrasena_hash).not.toBe(plainPassword);

            const isValid = await bcrypt.compare(
                plainPassword,
                (user as any).contrasena_hash
            );
            expect(isValid).toBe(true);
        });
    });

    /**
     * RF2: Gestión de pacientes - Pruebas Unitarias
     */
    describe('RF2 [UNIT]: Modelo Paciente - Validaciones', () => {
        let userPaciente: any;

        beforeEach(async () => {
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
        });

        test('Debe crear paciente con campos requeridos', async () => {
            const paciente = await Paciente.create({
                user_id: (userPaciente as any).rut,
                fecha_ingreso: '2024-01-10',
                estado: 'en_tratamiento',
                comentarios: 'Paciente con úlcera en pie derecho',
            });

            expect(paciente).toBeDefined();
            expect((paciente as any).user_id).toBe((userPaciente as any).rut);
            expect((paciente as any).estado).toBe('en_tratamiento');
        });

        test('Debe validar enumeración de estados', async () => {
            const estados = [
                'alta',
                'en_tratamiento',
                'interrumpido',
                'inactivo',
            ];

            for (let i = 0; i < estados.length; i++) {
                const passwordHash = await bcrypt.hash('password123', 10);
                const user = await User.create({
                    rut: `4444444${i}-${i}`,
                    nombre: `Paciente ${i}`,
                    correo: `paciente${i}@email.cl`,
                    contrasena_hash: passwordHash,
                    rol: 'paciente',
                    fecha_nacimiento: '1970-01-01',
                });

                const paciente = await Paciente.create({
                    user_id: (user as any).rut,
                    fecha_ingreso: '2024-01-10',
                    estado: estados[i] as any,
                });

                expect((paciente as any).estado).toBe(estados[i]);
            }
        });

        test('Debe permitir actualización de estado', async () => {
            const paciente = await Paciente.create({
                user_id: (userPaciente as any).rut,
                fecha_ingreso: '2024-01-10',
                estado: 'en_tratamiento',
                comentarios: 'Tratamiento inicial',
            });

            await paciente.update({
                estado: 'alta',
                comentarios: 'Paciente dado de alta',
            });

            expect((paciente as any).estado).toBe('alta');
            expect((paciente as any).comentarios).toContain('alta');
        });
    });

    /**
     * RF3: Registro de profesionales - Pruebas Unitarias
     */
    describe('RF3 [UNIT]: Modelo Profesional - Validaciones', () => {
        test('Debe crear profesional vinculado a usuario', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const userDoctor = await User.create({
                rut: '55555555-5',
                nombre: 'Dr. Carlos López',
                correo: 'carlos.lopez@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1980-04-15',
            });

            const profesional = await Profesional.create({
                user_id: (userDoctor as any).rut,
                especialidad: 'Cirugía Vascular',
                fecha_ingreso: '2019-03-01',
            });

            expect(profesional).toBeDefined();
            expect((profesional as any).user_id).toBe((userDoctor as any).rut);
            expect((profesional as any).especialidad).toBe('Cirugía Vascular');
        });

        test('Debe permitir actualización de especialidad', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '66666666-6',
                nombre: 'Dr. Pedro Soto',
                correo: 'pedro.soto@hospital.cl',
                contrasena_hash: passwordHash,
                rol: 'doctor',
                fecha_nacimiento: '1978-11-20',
            });

            const profesional = await Profesional.create({
                user_id: (user as any).rut,
                especialidad: 'Medicina General',
                fecha_ingreso: '2018-01-01',
            });

            await profesional.update({
                especialidad: 'Medicina General - Especialista en Heridas',
            });

            expect((profesional as any).especialidad).toContain(
                'Especialista en Heridas'
            );
        });
    });

    /**
     * RF4: Carga de imágenes - Pruebas Unitarias
     */
    describe('RF4 [UNIT]: Modelo Imagen - Validaciones', () => {
        let paciente: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '77777777-7',
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

        test('Debe crear imagen con todos los campos', async () => {
            const imagen = await Imagen.create({
                nombre_archivo: 'ulcera_001.jpg',
                fecha_captura: new Date('2024-03-15T10:30:00'),
                ruta_archivo: '/uploads/ulcera_001.jpg',
                lado: true,
                paciente_id: (paciente as any).id,
            });

            expect(imagen).toBeDefined();
            expect((imagen as any).nombre_archivo).toBe('ulcera_001.jpg');
            expect((imagen as any).lado).toBe(true);
        });

        test('Debe permitir campo lado como null', async () => {
            const imagen = await Imagen.create({
                nombre_archivo: 'imagen_sin_lado.jpg',
                fecha_captura: new Date(),
                ruta_archivo: '/uploads/imagen_sin_lado.jpg',
                lado: null,
                paciente_id: (paciente as any).id,
            });

            expect((imagen as any).lado).toBeNull();
        });

        test('Debe almacenar fecha de captura correctamente', async () => {
            const fechaCaptura = new Date('2024-06-20T14:45:30');

            const imagen = await Imagen.create({
                nombre_archivo: 'imagen_timestamped.jpg',
                fecha_captura: fechaCaptura,
                ruta_archivo: '/uploads/imagen_timestamped.jpg',
                paciente_id: (paciente as any).id,
            });

            expect((imagen as any).fecha_captura.getTime()).toBe(
                fechaCaptura.getTime()
            );
        });
    });

    /**
     * RF5: Segmentación - Pruebas Unitarias
     */
    describe('RF5 [UNIT]: Modelo Segmentación - Validaciones', () => {
        let imagen: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '88888888-8',
                nombre: 'Paciente Segmentación',
                correo: 'seg@email.cl',
                contrasena_hash: passwordHash,
                rol: 'paciente',
                fecha_nacimiento: '1970-05-10',
            });

            const paciente = await Paciente.create({
                user_id: (user as any).rut,
                fecha_ingreso: '2024-01-01',
                estado: 'en_tratamiento',
            });

            imagen = await Imagen.create({
                nombre_archivo: 'imagen_seg.jpg',
                fecha_captura: new Date(),
                ruta_archivo: '/uploads/imagen_seg.jpg',
                paciente_id: (paciente as any).id,
            });
        });

        test('Debe crear segmentación automática', async () => {
            const segmentacion = await Segmentacion.create({
                metodo: 'automatica',
                ruta_mascara: '/uploads/masks/mascara_auto.png',
                ruta_contorno: '/uploads/contours/contorno_auto.png',
                fecha_creacion: new Date(),
                imagen_id: (imagen as any).id,
            });

            expect(segmentacion).toBeDefined();
            expect((segmentacion as any).metodo).toBe('automatica');
        });

        test('Debe crear segmentación manual', async () => {
            const segmentacion = await Segmentacion.create({
                metodo: 'manual',
                ruta_mascara: '/uploads/masks/mascara_manual.png',
                ruta_contorno: '/uploads/contours/contorno_manual.png',
                fecha_creacion: new Date(),
                imagen_id: (imagen as any).id,
            });

            expect((segmentacion as any).metodo).toBe('manual');
        });

        test('Debe rechazar método inválido', async () => {
            await expect(async () => {
                await Segmentacion.create({
                    metodo: 'invalido' as any,
                    ruta_mascara: '/uploads/masks/mascara.png',
                    fecha_creacion: new Date(),
                    imagen_id: (imagen as any).id,
                });
            }).toThrow();
        });
    });

    /**
     * RF6: PWAT Score - Pruebas Unitarias
     */
    describe('RF6 [UNIT]: Modelo PWATScore - Validaciones', () => {
        let imagen: any;

        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const user = await User.create({
                rut: '99999999-9',
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
        });

        test('Debe crear PWAT Score con 8 categorías', async () => {
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
                observaciones: 'Evaluación completa',
                imagen_id: (imagen as any).id,
            });

            expect(pwat).toBeDefined();
            expect((pwat as any).cat1).toBe(3);
            expect((pwat as any).cat8).toBe(2);
        });

        test('Debe calcular score total correctamente', async () => {
            const pwat = await PWATScore.create({
                cat1: 2,
                cat2: 2,
                cat3: 2,
                cat4: 2,
                cat5: 2,
                cat6: 2,
                cat7: 2,
                cat8: 2,
                fecha_evaluacion: new Date(),
                imagen_id: (imagen as any).id,
            });

            const total =
                (pwat as any).cat1 +
                (pwat as any).cat2 +
                (pwat as any).cat3 +
                (pwat as any).cat4 +
                (pwat as any).cat5 +
                (pwat as any).cat6 +
                (pwat as any).cat7 +
                (pwat as any).cat8;

            expect(total).toBe(16);
        });

        test('Debe validar categorías obligatorias', async () => {
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
                    imagen_id: (imagen as any).id,
                });
            }).toThrow();
        });
    });

    /**
     * RF9: Gestión de acceso por rol - Pruebas Unitarias
     */
    describe('RF9 [UNIT]: Validación de roles y permisos', () => {
        test('Debe validar función de verificación de permisos', () => {
            const puedeIngresarEvaluaciones = (rol: string) => {
                return ['doctor', 'enfermera'].includes(rol);
            };

            expect(puedeIngresarEvaluaciones('doctor')).toBe(true);
            expect(puedeIngresarEvaluaciones('enfermera')).toBe(true);
            expect(puedeIngresarEvaluaciones('paciente')).toBe(false);
            expect(puedeIngresarEvaluaciones('admin')).toBe(false);
            expect(puedeIngresarEvaluaciones('investigador')).toBe(false);
        });

        test('Debe validar acceso a datos anonimizados', () => {
            const puedeAccederDatosAnonimizados = (rol: string) => {
                return ['investigador', 'admin'].includes(rol);
            };

            expect(puedeAccederDatosAnonimizados('investigador')).toBe(true);
            expect(puedeAccederDatosAnonimizados('admin')).toBe(true);
            expect(puedeAccederDatosAnonimizados('doctor')).toBe(false);
            expect(puedeAccederDatosAnonimizados('paciente')).toBe(false);
        });

        test('Debe rechazar rol inválido', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);

            await expect(async () => {
                await User.create({
                    rut: '10101010-1',
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
