import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [correo, setCorreo] = useState('');
  const [contra, setContra] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5000/users/login', {
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
      router.push('/consultas');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token) {
    return (
      <div>
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
    <div>
      <h1>Bienvenido</h1>
      <p>
        <a href="/consultas">Ir a consultas</a>
      </p>
    </div>
  );
}
