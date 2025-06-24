import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import LogoutButton from '../components/LogoutButton';

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [correo, setCorreo] = useState('');
  const [contra, setContra] = useState('');
  const [error, setError] = useState('');



  const redirectByRole = (tok) => {
    try {
      const payload = JSON.parse(atob(tok.split('.')[1]));
      const rol = payload.rol;
      if (rol === 'doctor' || rol === 'enfermera') {
        router.push('/profesional');
      } else if (rol === 'paciente') {
        router.push('/paciente');
      } else {
        router.push('/consultas');
      }
    } catch (e) {
      console.error('Error decoding token', e);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      redirectByRole(stored);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiFetch('/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contra })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error');
      }
      localStorage.setItem('token', data.token);
      setToken(data.token);
      redirectByRole(data.token);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token) {
    return (
      <div className="container">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Correo:</label>
            <input value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
          <div>
            <label>Contraseña:</label>
            <input type="password" value={contra} onChange={(e) => setContra(e.target.value)} />
          </div>
          <button type="submit">Ingresar</button>
        </form>
        {error && <p style={{color:'red'}}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Bienvenido</h1>
      <p>
        <a href="/consultas">Ir a consultas</a>
      </p>
      <p>
        <a href="/pwatscore">Calcular PWATScore</a>
      </p>
      <p>
        <a href="/paciente">Mis Imágenes</a>
      </p>
      <LogoutButton />
    </div>
  );
}
