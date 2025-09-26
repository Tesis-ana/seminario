export const BACKEND_URL = 'http://201.187.233.130:5000';

export async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return fetch(`${BACKEND_URL}${path}`, { ...options, headers });
}
