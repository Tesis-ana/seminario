// Utilidades para formatear RUT chileno
export function formatRUT(rut) {
    if (!rut) return '';

    // Remover caracteres no numéricos excepto K
    const cleanRUT = rut
        .toString()
        .replace(/[^0-9K]/gi, '')
        .toUpperCase();

    // Verificar longitud máxima
    if (cleanRUT.length > 12) {
        return cleanRUT.slice(0, 12);
    }

    // Si es muy corto, retornar sin formato
    if (cleanRUT.length < 2) return cleanRUT;

    // Separar número y dígito verificador
    const body = cleanRUT.slice(0, -1);
    const dv = cleanRUT.slice(-1);

    // Formatear con puntos y guión
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formattedBody}-${dv}`;
}

export function validateRUT(rut) {
    if (!rut) return false;

    // Limpiar RUT
    const cleanRUT = rut.replace(/[^0-9K]/gi, '');

    // Verificar longitud
    if (cleanRUT.length < 8 || cleanRUT.length > 12) return false;

    // Separar cuerpo y dígito verificador
    const body = cleanRUT.slice(0, -1);
    const dv = cleanRUT.slice(-1).toUpperCase();

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

export function cleanRUT(rut) {
    if (!rut) return '';
    return rut.replace(/[^0-9K]/gi, '').toUpperCase();
}

// Componente para input de RUT
export function RUTInput({ value, onChange, placeholder = 'RUT', ...props }) {
    const handleChange = (e) => {
        const inputValue = e.target.value;
        const formatted = formatRUT(inputValue);
        onChange(formatted);
    };

    const isValid = validateRUT(value);

    return (
        <div style={{ position: 'relative' }}>
            <input
                {...props}
                type='text'
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                maxLength={12}
                style={{
                    ...props.style,
                    borderColor: value && !isValid ? '#ef4444' : undefined,
                }}
            />
            {value && !isValid && (
                <small style={{ color: '#ef4444', fontSize: '12px' }}>
                    RUT inválido
                </small>
            )}
        </div>
    );
}
