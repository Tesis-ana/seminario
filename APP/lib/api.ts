const API_URL = 'https://api.ejemplo.cl'
const TOKEN = 'REPLACE_WITH_TOKEN'

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${TOKEN}`,
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'API request failed')
  }
  return res.json()
}

export interface User {
  rut: string
  nombre: string
  correo: string
  rol: string
}

export interface Profesional {
  id: number
  especialidad: string
  user_id: number
  fecha_ingreso: string
}

export interface Paciente {
  id: number
  fecha_ingreso: string
  comentarios: string
  user: User
}

export interface Imagen {
  id: number
  nombre_archivo: string
  fecha_captura: string
  paciente_id: number
}

export async function getMyProfessional(): Promise<Profesional> {
  return apiFetch('/profesionales/me')
}

export async function getPatientsForProfessional(id: number): Promise<Paciente[]> {
  return apiFetch(`/pacientes/profesional/${id}`)
}

export async function searchPatientByRut(rut: string): Promise<Paciente> {
  return apiFetch('/pacientes/buscar-rut', {
    method: 'POST',
    body: JSON.stringify({ rut }),
  })
}

export async function registerAttention(
  paciente_id: number,
  profesional_id: number
) {
  return apiFetch('/atenciones', {
    method: 'POST',
    body: JSON.stringify({ paciente_id, profesional_id }),
  })
}

export async function getImagesForPatient(id: number): Promise<Imagen[]> {
  return apiFetch(`/imagenes/paciente/${id}`)
}

export async function uploadPatientImage(
  pacienteId: number,
  imageUri: string
): Promise<Imagen> {
  const form = new FormData()
  form.append('id', String(pacienteId))
  form.append('imagen', {
    uri: imageUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as any)

  const res = await fetch(`${API_URL}/imagenes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Image upload failed')
  }
  return res.json()
}

export async function createManualSegmentation(
  imageId: number,
  maskUri: string
) {
  const form = new FormData()
  form.append('id', String(imageId))
  form.append('imagen', {
    uri: maskUri,
    name: 'mask.png',
    type: 'image/png',
  } as any)

  const res = await fetch(`${API_URL}/segmentaciones/manual`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Segmentation failed')
  }
  return res.json()
}

export async function createAutomaticSegmentation(imageId: number) {
  return apiFetch('/segmentaciones/automatico', {
    method: 'POST',
    body: JSON.stringify({ id: imageId }),
  })
}

export async function calculatePwatscore(imageId: number) {
  return apiFetch('/pwatscore', {
    method: 'POST',
    body: JSON.stringify({ id: imageId }),
  })
}
