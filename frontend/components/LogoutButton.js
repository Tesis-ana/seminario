import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    try {
      await apiFetch('/users/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      console.error('Error logging out', err);
    } finally {
      localStorage.removeItem('token');
      router.push('/');
    }
  };

  return (
    <button onClick={handleLogout}>Cerrar sesión</button>
  );
}
