// Utilidades para RUT chileno en el backend

/**
 * Limpia un RUT removiendo puntos y guiones
 * @param {string} rut - RUT a limpiar
 * @returns {string} RUT limpio
 */
function cleanRUT(rut) {
    if (!rut) return '';
    return rut
        .toString()
        .replace(/[^0-9K]/gi, '')
        .toUpperCase();
}

/**
 * Formatea un RUT con puntos y guión
 * @param {string} rut - RUT a formatear
 * @returns {string} RUT formateado
 */
function formatRUT(rut) {
    if (!rut) return '';

    const cleanRut = cleanRUT(rut);

    // Verificar longitud máxima
    if (cleanRut.length > 12) {
        return formatRUT(cleanRut.slice(0, 12));
    }

    // Si es muy corto, retornar sin formato
    if (cleanRut.length < 2) return cleanRut;

    // Separar número y dígito verificador
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1);

    // Formatear con puntos y guión
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formattedBody}-${dv}`;
}

/**
 * Valida si un RUT chileno es válido
 * @param {string} rut - RUT a validar
 * @returns {boolean} true si es válido
 */
function validateRUT(rut) {
    if (!rut) return false;

    // Limpiar RUT
    const cleanRut = cleanRUT(rut);

    // Verificar longitud
    if (cleanRut.length < 8 || cleanRut.length > 12) return false;

    // Separar cuerpo y dígito verificador
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();

    // Calcular dígito verificador
    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedDV = 11 - (sum % 11);
    const calculatedDV =
        expectedDV === 11
            ? '0'
            : expectedDV === 10
            ? 'K'
            : expectedDV.toString();

    return dv === calculatedDV;
}

/**
 * Middleware para validar RUT en requests
 * @param {string} fieldName - Nombre del campo que contiene el RUT
 */
function validateRUTMiddleware(fieldName = 'rut') {
    return (req, res, next) => {
        const rut = req.body[fieldName];
        if (rut && !validateRUT(rut)) {
            return res.status(400).json({
                message: `RUT inválido en campo ${fieldName}. Formato esperado: 12.345.678-9`,
                field: fieldName,
            });
        }

        // Formatear y limpiar el RUT antes de continuar
        if (rut) {
            req.body[fieldName] = formatRUT(rut);
            // También crear una versión limpia para búsquedas en BD
            req.body[`${fieldName}_clean`] = cleanRUT(rut);
        }

        next();
    };
}

module.exports = {
    cleanRUT,
    formatRUT,
    validateRUT,
    validateRUTMiddleware,
};
