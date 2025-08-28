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

export interface Consulta {
  id: number
  paciente_id: number
  profesional_id: number
  fecha: string
  notas: string
}

const API_URL = 'http://192.168.1.91:5000'
// TODO: replace with secure token retrieval
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJydXQiOiIxMS4xMTEuMTExLTEiLCJyb2wiOiJkb2N0b3IiLCJpYXQiOjE3NTYyMzMxNDIsImV4cCI6MTc1NjMxOTU0Mn0.sV9CXqLmwnmzwiEA9h6n-r48UsSrig8W8CYVxDd6xuM'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || res.statusText)
  }
  return res.json() as Promise<T>
}

export async function getMyProfessional(): Promise<Profesional> {
  return request('/profesionales/me')
}

export async function getPatientsForProfessional(id: number): Promise<Paciente[]> {
  return request(`/pacientes/profesional/${id}`)
}

export async function searchPatientByRut(rut: string): Promise<Paciente> {
  return request('/pacientes/buscar-rut', {
    method: 'POST',
    body: JSON.stringify({ rut }),
  })
}

export async function registerAttention(
  paciente_id: number,
  profesional_id: number,
  notas: string
) {
  return request('/atenciones', {
    method: 'POST',
    body: JSON.stringify({ paciente_id, profesional_id, notas }),
  })
}

export async function getConsultationsForPatient(id: number): Promise<Consulta[]> {
  return request(`/pacientes/${id}/consultas`)
}

export async function getImagesForPatient(id: number): Promise<Imagen[]> {
  return request(`/imagenes/paciente/${id}`)
}

export async function uploadPatientImage(
  pacienteId: number,
  imageUri: string
): Promise<Imagen> {
  const formData = new FormData()
  formData.append('id', String(pacienteId))
  formData.append('imagen', {
    uri: imageUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as any)
  const res = await fetch(`${API_URL}/imagenes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    body: formData,
  })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || res.statusText)
  }
  return res.json()
}

export async function createManualSegmentation(
  imageId: number,
  maskUri: string
) {
  const formData = new FormData()
  formData.append('id', String(imageId))
  formData.append('imagen', {
    uri: maskUri,
    name: 'mask.jpg',
    type: 'image/jpeg',
  } as any)
  const res = await fetch(`${API_URL}/segmentaciones/manual`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    body: formData,
  })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || res.statusText)
  }
  return res.json()
}

export async function createAutomaticSegmentation(imageId: number) {
  return request('/segmentaciones/automatico', {
    method: 'POST',
    body: JSON.stringify({ id: imageId }),
  })
}

export async function calculatePwatscore(imageId: number) {
  return request('/pwatscore', {
    method: 'POST',
    body: JSON.stringify({ id: imageId }),
  })
}
