import './env';
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from 'bun:test';
import bcrypt from 'bcrypt';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
    ensureDirExists,
    IMGS_DIR,
    MASKS_DIR,
} from '../../controllers/utils/fileUpload';
import type { SystemTestContext } from './test-server';
import { createSystemTestContext } from './test-server';
import { PerformanceMetrics, trackOperation } from '../performance-metrics';

const SAMPLE_IMAGE_BASE64 =
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxAQEBQWFBYWGBwZGhwcHB0lJCAmKCUoMCsyMjI6QF5KWlpjYmNraWl6d3d+goOEhoh+WlpaP/2wBDAcHBwoJCQ0KCQ0PEBESFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDAREAAhEBAxEB/8QAHQAAAQQDAQEAAAAAAAAAAAAAAgMEBQYHAQgBCf/EADcQAAIBAgQEBAYDAQkBAAAAAAECBAADIRExBRJBUWEGEyJxFDKBkaGxwfAHI0LR8SQzUoKisdL/xAAZAQADAQEBAAAAAAAAAAAAAAABAgMABAX/xAAgEQADAQEAAgIDAQAAAAAAAAAAAQIDESEEEjFRE1Fh/9oADAMBAAIRAxEAPwD6iIiICIiAiIgIiICIiAiIgIiICIiAiIgIiIJ//Z';
const SAMPLE_MASK_BASE64 =
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwkHBgoICAoKCw0PDw0NDREWFhURFhUaHBcgJCAmJjQmKy8xMjU+QEBCQkVEQ0lPTE1SUltYWVlaY2NjcXFx/2wBDAQsLCw4NDxERERcaFBYaKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKP/AABEIAAEAAgMBEQACEQEDEQH/xAAbAAACAgMBAAAAAAAAAAAAAAAEBQMGAAECB//EADsQAAIBAgMFBQYFAwUAAAAAAAECAwQRABIhMQVBUQYTImFxgZGh8BQyQrHRFCNSwdHS4RUkYoKi8f/EABkBAQEBAQEBAAAAAAAAAAAAAAABAgMEBf/EAB4RAQEBAQEBAQEBAQAAAAAAAAABEQIhAzFBElFh/9oADAMBAAIRAxEAPwD9bEREBERAREQBERAREQBERAREQBERAREQHmQoUyndV5ZgFNbiNa2YthIJCgwGLR2A9R9SubLfppt27406cCwvxdmcWWR7cwixhGQcjI9PXNKtZbc3HnKiO28Y1wV1jk1E1Un0MlcFW3v7PbY0r6K7v0v4qHGagk2eEhgPP50/FU8Nq7FZbiHn1iF7NvZXZT3lUMsTuQv8AiB5HcHiK9tuLgh0O9evYg29yMiswc4YkE4GfyHWlO9G2Nl0ndC90pUnbZ6iRsgZjw8ycoQIClIyePX0pVrd+WW7HZwZdgdY3rKJZZlDLHcVy2VI4BPOgPFH/2Q==';
const SAMPLE_IMAGE_BYTES = Buffer.from(SAMPLE_IMAGE_BASE64, 'base64');
const SAMPLE_MASK_BYTES = Buffer.from(SAMPLE_MASK_BASE64, 'base64');

const UPLOADER = {
    rut: '22.222.222-2',
    password: 'Imagen#123',
};

const PATIENT_USER = {
    rut: '33.333.333-3',
};

let context: SystemTestContext;
let authToken: string;
let pacienteId: number;

function createImageForm(id: number): FormData {
    const form = new FormData();
    form.set('id', String(id));
    form.append(
        'imagen',
        new Blob([SAMPLE_IMAGE_BYTES], { type: 'image/jpeg' }),
        'imagen.jpg'
    );
    return form;
}

function createMaskForm(imagenId: number): FormData {
    const form = new FormData();
    form.set('id', String(imagenId));
    form.append(
        'imagen',
        new Blob([SAMPLE_MASK_BYTES], { type: 'image/jpeg' }),
        'mask.jpg'
    );
    return form;
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}

async function cleanupUploads(dir: string) {
    try {
        const entries = await fs.readdir(dir);
        await Promise.all(
            entries.map((entry) =>
                fs.rm(path.join(dir, entry), { force: true, recursive: true })
            )
        );
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
        }
    }
}

describe('Imagen + Segmentacion manual system flow', () => {
    beforeAll(async () => {
        context = await createSystemTestContext();
    });

    afterAll(async () => {
        await context.close();
    });

    beforeEach(async () => {
        await context.resetDatabase();

        const hashed = await bcrypt.hash(UPLOADER.password, 10);
        const uploader = await context.db.User.create({
            rut: UPLOADER.rut,
            nombre: 'Uploader Autorizado',
            correo: 'uploader@example.com',
            rol: 'admin',
            contrasena_hash: hashed,
        });

        const patientUser = await context.db.User.create({
            rut: PATIENT_USER.rut,
            nombre: 'Paciente Existente',
            correo: 'paciente@example.com',
            rol: 'paciente',
            contrasena_hash: hashed,
        });

        const paciente = await context.db.Paciente.create({
            user_id: patientUser.rut,
            comentarios: 'Paciente para pruebas',
            fecha_ingreso: new Date(),
            sexo: 'F',
        } as any);
        pacienteId = paciente.id;

        const loginResponse = await context.fetch('/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rut: uploader.rut,
                contra: UPLOADER.password,
            }),
        });
        expect(loginResponse.status).toBe(200);
        const loginBody = await loginResponse.json();
        authToken = loginBody.token;

        ensureDirExists(IMGS_DIR);
        ensureDirExists(MASKS_DIR);
    });

    afterEach(async () => {
        await cleanupUploads(IMGS_DIR);
        await cleanupUploads(MASKS_DIR);
        await context.resetDatabase();
    });

    it('permite subir imagen, recuperar archivos y gestionar segmentacion manual', async () => {
        const metrics = new PerformanceMetrics();
        metrics.start();

        const uploadResponse = await trackOperation(
            () =>
                context.fetch('/imagenes', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${authToken}` },
                    body: createImageForm(pacienteId),
                }),
            metrics
        );

        expect(uploadResponse.status).toBe(201);
        const uploadBody = await uploadResponse.json();
        expect(uploadBody?.imagen?.id).toBeGreaterThan(0);

        const imagenId: number = uploadBody.imagen.id;
        const nombreArchivo: string = uploadBody.imagen.nombre_archivo;
        const imagenPath = path.join(IMGS_DIR, nombreArchivo);

        expect(await fileExists(imagenPath)).toBe(true);

        const imagenRow = await context.db.Imagen.findByPk(imagenId);
        expect(imagenRow).not.toBeNull();
        expect(imagenRow?.ruta_archivo).toBe(imagenPath);

        const downloadResponse = await trackOperation(
            () => context.fetch(`/imagenes/${imagenId}/archivo`),
            metrics
        );
        expect(downloadResponse.status).toBe(200);
        expect(
            (downloadResponse.headers.get('Content-Type') ?? '').toLowerCase()
        ).toContain('image/jpeg');
        const downloadBytes = Buffer.from(await downloadResponse.arrayBuffer());
        expect(downloadBytes.byteLength).toBeGreaterThan(0);

        const manualResponse = await trackOperation(
            () =>
                context.fetch('/segmentaciones/manual', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${authToken}` },
                    body: createMaskForm(imagenId),
                }),
            metrics
        );
        expect(manualResponse.status).toBe(201);
        const manualBody = await manualResponse.json();
        expect(String(manualBody.message)).toContain('Segmentacion');

        const baseName = path.parse(nombreArchivo).name;
        const maskPath = path.join(MASKS_DIR, `${baseName}.jpg`);
        expect(await fileExists(maskPath)).toBe(true);

        const segmentacion = await context.db.Segmentacion.findOne({
            where: { imagen_id: imagenId },
        });
        expect(segmentacion).not.toBeNull();
        expect(segmentacion?.metodo).toBe('manual');
        expect(segmentacion?.ruta_mascara).toBe(maskPath);

        const maskDownload = await trackOperation(
            () => context.fetch(`/segmentaciones/${imagenId}/mask`),
            metrics
        );
        expect(maskDownload.status).toBe(200);
        expect(
            (maskDownload.headers.get('Content-Type') ?? '').toLowerCase()
        ).toContain('image/jpeg');
        const maskBytes = Buffer.from(await maskDownload.arrayBuffer());
        expect(maskBytes.byteLength).toBeGreaterThan(0);

        const duplicateResponse = await trackOperation(
            () =>
                context.fetch('/segmentaciones/manual', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${authToken}` },
                    body: createMaskForm(imagenId),
                }),
            metrics
        );
        expect(duplicateResponse.status).toBe(400);
        const duplicateBody = await duplicateResponse.json();
        expect(String(duplicateBody.message)).toMatch(/ya existe/i);

        metrics.end();
        metrics.printReport('Imaging Flow Test');

        // Assertions sobre las métricas
        expect(metrics.getErrorRate()).toBeLessThan(20); // Menos de 20% de errores (permitir algún error esperado)
        expect(metrics.getP95()).toBeLessThan(3000); // P95 < 3s
        expect(metrics.getThroughput()).toBeGreaterThan(0);
    });
});
