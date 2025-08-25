// Mock API for professional workflows

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

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

const professional: Profesional = {
  id: 1,
  especialidad: 'Dermatología',
  user_id: 1,
  fecha_ingreso: '2024-01-01',
}

const patients: Paciente[] = [
  {
    id: 1,
    fecha_ingreso: '2024-05-10',
    comentarios: '',
    user: {
      rut: '11111111-1',
      nombre: 'Juan Pérez',
      correo: 'juan@example.com',
      rol: 'paciente',
    },
  },
  {
    id: 2,
    fecha_ingreso: '2024-05-15',
    comentarios: '',
    user: {
      rut: '22222222-2',
      nombre: 'María González',
      correo: 'maria@example.com',
      rol: 'paciente',
    },
  },
]

let images: Imagen[] = []
let imageSeq = 1
let segmentSeq = 1
let pwatSeq = 1

export async function getMyProfessional(): Promise<Profesional> {
  await delay()
  return professional
}

export async function getPatientsForProfessional(_id: number): Promise<Paciente[]> {
  await delay()
  return patients
}

export async function searchPatientByRut(rut: string): Promise<Paciente> {
  await delay()
  const found = patients.find((p) => p.user.rut === rut)
  if (!found) {
    throw new Error('Paciente no encontrado')
  }
  return found
}

export async function registerAttention(
  _paciente_id: number,
  _profesional_id: number
) {
  await delay()
  return { message: 'Atención registrada' }
}

export async function getImagesForPatient(id: number): Promise<Imagen[]> {
  await delay()
  return images.filter((img) => img.paciente_id === id)
}

export async function uploadPatientImage(
  pacienteId: number,
  _imageUri: string
): Promise<Imagen> {
  await delay()
  const img: Imagen = {
    id: imageSeq++,
    nombre_archivo: `img_${Date.now()}.jpg`,
    fecha_captura: new Date().toISOString().split('T')[0],
    paciente_id: pacienteId,
  }
  images.push(img)
  return img
}

export async function createManualSegmentation(
  _imageId: number,
  _maskUri: string
) {
  await delay()
  return { message: 'Segmentación creada', segmentacionId: segmentSeq++ }
}

export async function createAutomaticSegmentation(_imageId: number) {
  await delay()
  return { message: 'Segmentación generada', segmentacionId: segmentSeq++ }
}

export async function calculatePwatscore(_imageId: number) {
  await delay()
  return {
    message: 'PWATScore generado',
    pwatscoreId: pwatSeq++,
    categorias: {
      cat3: 1,
      cat4: 2,
      cat5: 3,
      cat6: 4,
      cat7: 5,
      cat8: 6,
    },
  }
}

