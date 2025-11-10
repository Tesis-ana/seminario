/**
 * Utilidades para manejo de RUT chileno
 */

/**
 * Limpia el RUT removiendo puntos, guiones y espacios
 */
export function cleanRut(rut: string): string {
    return rut.replace(/[.-\s]/g, '').toUpperCase();
}

/**
 * Formatea el RUT con puntos y guión
 * Ejemplo: 12345678K -> 12.345.678-K
 */
export function formatRut(rut: string): string {
    const cleaned = cleanRut(rut);

    if (cleaned.length < 2) return cleaned;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);

    // Agregar puntos cada 3 dígitos desde la derecha
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formattedBody}-${dv}`;
}

/**
 * Calcula el dígito verificador de un RUT
 */
export function calculateDv(rutBody: string): string {
    let sum = 0;
    let multiplier = 2;

    // Recorrer desde el final hacia el inicio
    for (let i = rutBody.length - 1; i >= 0; i--) {
        sum += parseInt(rutBody[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const dv = 11 - remainder;

    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
}

/**
 * Valida si un RUT es correcto
 */
export function validateRut(rut: string): boolean {
    const cleaned = cleanRut(rut);

    // Debe tener entre 8 y 9 caracteres (7-8 dígitos + dígito verificador)
    if (cleaned.length < 8 || cleaned.length > 9) return false;

    // El último carácter debe ser dígito o K
    const lastChar = cleaned.slice(-1);
    if (!/[0-9K]/.test(lastChar)) return false;

    // Los caracteres anteriores deben ser todos dígitos
    const body = cleaned.slice(0, -1);
    if (!/^\d+$/.test(body)) return false;

    // Validar dígito verificador
    const calculatedDv = calculateDv(body);
    return calculatedDv === lastChar;
}

/**
 * Formatea un RUT mientras el usuario escribe, manteniendo solo caracteres válidos
 */
export function formatRutInput(input: string): string {
    // Mantener solo dígitos y K
    const cleaned = input.replace(/[^0-9K]/gi, '').toUpperCase();

    // Limitar a 9 caracteres máximo
    const limited = cleaned.slice(0, 9);

    // Formatear solo si hay al menos 2 caracteres
    if (limited.length >= 2) {
        return formatRut(limited);
    }

    return limited;
}
