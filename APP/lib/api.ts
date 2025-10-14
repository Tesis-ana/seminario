import * as FileSystem from 'expo-file-system';

export interface User {
    rut: string;
    nombre: string;
    correo: string;
    rol: string;
}

export interface Profesional {
    id: number;
    especialidad: string;
    user_id: number;
    fecha_ingreso: string;
}

export interface Paciente {
    id: number;
    fecha_ingreso: string;
    comentarios: string;
    user: User;
}

// Nueva estructura para la respuesta de mis pacientes
export interface PacienteDetalle {
    id: number;
    rut: string;
    nombre: string;
    correo: string;
    sexo: string | null;
    fecha_nacimiento: string | null;
    estado?: 'alta' | 'en_tratamiento' | 'interrumpido' | 'inactivo';
}

export interface AtencionPaciente {
    atencion_id: string;
    fecha_atencion: string;
    paciente: PacienteDetalle;
}

export interface MisPacientesResponse {
    profesional_id: number;
    total_pacientes: number;
    pacientes: AtencionPaciente[];
}

export interface Imagen {
    id: number;
    nombre_archivo: string;
    fecha_captura: string;
    paciente_id: number;
    lado?: boolean | null;
}

export interface Consulta {
    id: number;
    paciente_id: number;
    profesional_id: number;
    fecha: string;
    notas: string;
}

export interface SegmentacionResponse {
    message: string;
    segmentacionId: number;
}

export interface Segmentacion {
    id: number;
    imagen_id: number;
    mask_path: string;
    fecha_creacion: string;
}

export interface Pwatscore {
    id: number;
    imagen_id: number;
    cat1: number;
    cat2: number;
    cat3: number;
    cat4: number;
    cat5: number;
    cat6: number;
    cat7: number;
    cat8: number;
    evaluador?: string;
    observaciones?: string;
    fecha_evaluacion: string;
}

export interface PwatscoreResponse {
    message: string;
    pwatscoreId: number;
    categorias: {
        cat3: number;
        cat4: number;
        cat5: number;
        cat6: number;
        cat7: number;
        cat8: number;
    };
}

export interface PwatscoreUpdatePayload {
    id: number;
    cat1: number;
    cat2: number;
    cat3: number;
    cat4: number;
    cat5: number;
    cat6: number;
    cat7: number;
    cat8: number;
    evaluador?: string;
    observaciones?: string;
}

export const API_URL = 'https://m3.blocktype.cl';
export const BACKEND_URL = API_URL; // Alias para compatibilidad
const TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJydXQiOiIxMS4xMTEuMTExLTEiLCJyb2wiOiJkb2N0b3IiLCJpYXQiOjE3NjA0MjE4MjF9.OEMhR0W8QPudXh1bGmW3pDdOB8mMzSvCjivf5IvZ8sY';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TOKEN}`,
            ...(options.headers || {}),
        },
    });
    if (!res.ok) {
        const message = await res.text();
        throw new Error(message || res.statusText);
    }
    return res.json() as Promise<T>;
}

export async function getMyProfessional(): Promise<Profesional> {
    return request('/profesionales/me');
}

export async function getPatientsForProfessional(
    id: number
): Promise<MisPacientesResponse> {
    return request(`/profesionales/mis-pacientes`);
}

export async function searchPatientByRut(rut: string): Promise<Paciente> {
    return request('/pacientes/buscar-rut', {
        method: 'POST',
        body: JSON.stringify({ rut }),
    });
}

export async function registerAttention(
    paciente_id: number,
    profesional_id: number,
    notas: string
) {
    return request('/atenciones', {
        method: 'POST',
        body: JSON.stringify({ paciente_id, profesional_id, notas }),
    });
}

export async function getConsultationsForPatient(
    id: number
): Promise<Consulta[]> {
    return request(`/pacientes/${id}/consultas`);
}

export async function getImagesForPatient(id: number): Promise<Imagen[]> {
    return request(`/imagenes/paciente/${id}`);
}

export async function uploadPatientImage(
    pacienteId: number,
    imageUri: string
): Promise<Imagen> {
    const formData = new FormData();
    formData.append('id', String(pacienteId));

    // Extraer el nombre del archivo de la URI si es posible
    const filename = imageUri.split('/').pop() || 'photo.jpg';

    formData.append('imagen', {
        uri: imageUri,
        name: filename,
        type: 'image/jpeg',
    } as any);

    console.log('Uploading image with FormData:', {
        paciente_id: pacienteId,
        imageUri,
        filename,
    });

    const res = await fetch(`${API_URL}/imagenes`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            // No agregar Content-Type aquí, FormData lo maneja automáticamente
        },
        body: formData,
    });

    console.log('Upload response status:', res.status);

    if (!res.ok) {
        const message = await res.text();
        console.error('Upload failed with message:', message);
        throw new Error(message || res.statusText);
    }
    const json = await res.json();
    console.log('Upload response JSON:', json);
    return json.imagen as Imagen;
}

export async function createManualSegmentation(
    imageId: number,
    maskUri: string
): Promise<SegmentacionResponse> {
    const formData = new FormData();
    formData.append('id', String(imageId));
    formData.append('imagen', {
        uri: maskUri,
        name: 'mask.jpg',
        type: 'image/jpeg',
    } as any);
    const res = await fetch(`${API_URL}/segmentaciones/manual`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
        },
        body: formData,
    });
    if (!res.ok) {
        const message = await res.text();
        throw new Error(message || res.statusText);
    }
    return res.json();
}

export async function updateSegmentationMask(
    segmentationId: number,
    maskUri: string
): Promise<SegmentacionResponse> {
    const formData = new FormData();
    formData.append('imagen_id', String(segmentationId));
    formData.append('imagen', {
        uri: maskUri,
        name: 'mask.jpg',
        type: 'image/jpeg',
    } as any);
    const res = await fetch(`${API_URL}/segmentaciones/editar`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
        },
        body: formData,
    });
    if (!res.ok) {
        const message = await res.text();
        throw new Error(message || res.statusText);
    }
    return res.json();
}

export async function createAutomaticSegmentation(
    imageId: number
): Promise<SegmentacionResponse> {
    return request('/segmentaciones/automatico', {
        method: 'POST',
        body: JSON.stringify({ id: imageId }),
    });
}

export async function downloadSegmentationMask(
    imageId: number
): Promise<string> {
    const target = `${
        FileSystem.cacheDirectory
    }mask_${imageId}_${Date.now()}.jpg`;
    const result = await FileSystem.downloadAsync(
        `${API_URL}/segmentaciones/${imageId}/mask`,
        target,
        {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
            },
        }
    );

    if (result.status && result.status >= 400) {
        throw new Error('No se pudo descargar la mascara.');
    }

    return result.uri;
}

export async function calculatePwatscore(
    imageId: number
): Promise<PwatscoreResponse> {
    return request('/pwatscore', {
        method: 'POST',
        body: JSON.stringify({ id: imageId }),
    });
}

export async function updatePwatscore(payload: PwatscoreUpdatePayload) {
    return request('/pwatscore', {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function getSegmentationByImageId(
    imageId: number
): Promise<Segmentacion | null> {
    try {
        return await request<Segmentacion>(`/segmentaciones/imagen/${imageId}`);
    } catch {
        return null;
    }
}

export async function getPwatscoreByImageId(
    imageId: number
): Promise<Pwatscore | null> {
    try {
        return await request<Pwatscore>(`/pwatscore/buscar`, {
            method: 'POST',
            body: JSON.stringify({ id: imageId }),
        });
    } catch {
        return null;
    }
}

export async function updatePatient(
    patientId: number,
    data: { estado?: string; [key: string]: any }
): Promise<any> {
    return request(`/pacientes`, {
        method: 'PUT',
        body: JSON.stringify({ id: patientId, ...data }),
    });
}

export async function updateImage(
    imageId: number,
    data: { lado?: boolean | null; [key: string]: any }
): Promise<any> {
    return request(`/imagenes`, {
        method: 'PUT',
        body: JSON.stringify({ id: imageId, ...data }),
    });
}
