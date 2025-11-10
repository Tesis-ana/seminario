// Usar variable de entorno o fallback al dominio de producción
export const BACKEND_URL =
    process.env.NEXT_PUBLIC_API_URL || 'https://m3.blocktype.cl:5001';

export async function apiFetch(path, options = {}) {
    const headers = options.headers || {};
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    // Construir URL completa, evitando doble /api si ya está en BACKEND_URL
    const baseUrl = BACKEND_URL.endsWith('') ? BACKEND_URL : `${BACKEND_URL}`;
    const url = path.startsWith('/')
        ? `${baseUrl}${path}`
        : `${baseUrl}/${path}`;
    return fetch(url, { ...options, headers });
}
