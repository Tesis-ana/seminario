// Usar variable de entorno o fallback al dominio de producción
export const BACKEND_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export async function apiFetch(path, options = {}) {
    const headers = options.headers || {};
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    // Construir URL completa
    const baseUrl = BACKEND_URL.endsWith('/')
        ? BACKEND_URL.slice(0, -1)
        : BACKEND_URL;
    const url = path.startsWith('/')
        ? `${baseUrl}${path}`
        : `${baseUrl}/${path}`;

    console.log('API Request URL:', url); // Para debugging
    return fetch(url, { ...options, headers });
}
