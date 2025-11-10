import { apiFetch } from './api';

/**
 * Detecta automáticamente si son 1 o múltiples imágenes y usa el endpoint correcto
 * @param {FileList|File[]} files - Archivos de imagen
 * @param {number} pacienteId - ID del paciente
 * @param {boolean|null} lado - Lado del pie (true=derecho, false=izquierdo, null=sin especificar)
 * @returns {Promise<{success: boolean, data: any, error?: string}>}
 */
export async function subirImagenes(files, pacienteId, lado = null) {
    // Convertir FileList a Array si es necesario
    const filesArray = Array.isArray(files) ? files : Array.from(files);

    if (filesArray.length === 0) {
        return {
            success: false,
            error: 'No se han seleccionado imágenes',
        };
    }

    // Validar que todas sean imágenes
    for (const file of filesArray) {
        if (!file.type.includes('image')) {
            return {
                success: false,
                error: `El archivo "${file.name}" no es una imagen`,
            };
        }
    }

    const formData = new FormData();
    formData.append('id', pacienteId.toString());

    // Si lado es null o hay múltiples archivos, usar endpoint múltiple
    // Si lado está definido y es solo 1 archivo, usar endpoint individual
    const usarEndpointMultiple = lado === null || filesArray.length > 1;

    if (!usarEndpointMultiple) {
        // UNA IMAGEN CON LADO ESPECIFICADO: Usar endpoint /imagenes
        formData.append('lado', lado.toString());
        formData.append('imagen', filesArray[0]);

        try {
            const response = await apiFetch('/imagenes', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                return {
                    success: true,
                    data: {
                        tipo: 'single',
                        imagen: data.imagen,
                        atencion_creada: data.atencion_creada,
                        message: data.message,
                    },
                };
            } else {
                return {
                    success: false,
                    error: data.message || 'Error al subir imagen',
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Error de conexión',
            };
        }
    } else {
        // MÚLTIPLES IMÁGENES O SIN LADO: Usar endpoint /imagenes/multiples
        filesArray.forEach((file) => {
            formData.append('imagenes', file);
        });

        try {
            const response = await apiFetch('/imagenes/multiples', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                return {
                    success: true,
                    data: {
                        tipo: 'multiple',
                        imagenes_creadas: data.imagenes_creadas,
                        imagenes: data.imagenes,
                        errores: data.errores,
                        atencion_creada: data.atencion_creada,
                        message: data.message,
                        nota: data.nota,
                    },
                };
            } else {
                return {
                    success: false,
                    error: data.message || 'Error al subir imágenes',
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Error de conexión',
            };
        }
    }
}

/**
 * Actualiza el lado de una imagen existente
 * @param {number} imagenId - ID de la imagen
 * @param {boolean} lado - Lado del pie (true=derecho, false=izquierdo)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function actualizarLadoImagen(imagenId, lado) {
    try {
        const response = await apiFetch('/imagenes', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: imagenId,
                lado: lado,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            return { success: true };
        } else {
            return {
                success: false,
                error: data.message || 'Error al actualizar lado',
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message || 'Error de conexión',
        };
    }
}

/**
 * Valida que las imágenes cumplan con los requisitos
 * @param {FileList|File[]} files - Archivos a validar
 * @returns {{valid: boolean, error?: string}}
 */
export function validarImagenes(files) {
    const filesArray = Array.isArray(files) ? files : Array.from(files);

    if (filesArray.length === 0) {
        return { valid: false, error: 'No se han seleccionado imágenes' };
    }

    if (filesArray.length > 10) {
        return { valid: false, error: 'Máximo 10 imágenes permitidas' };
    }

    for (const file of filesArray) {
        // Validar tipo
        if (
            !file.type.includes('image/jpeg') &&
            !file.type.includes('image/jpg')
        ) {
            return {
                valid: false,
                error: `Solo se aceptan imágenes JPG. "${file.name}" no es válido`,
            };
        }

        // Validar tamaño (200MB)
        const maxSize = 200 * 1024 * 1024;
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `La imagen "${file.name}" excede el tamaño máximo (200MB)`,
            };
        }
    }

    return { valid: true };
}
