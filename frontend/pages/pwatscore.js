import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';

export default function Pwatscore() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [imagenId, setImagenId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) {
      router.replace('/');
    } else {
      setToken(stored);
    }
  }, [router]);

  const handlePredict = async (e) => {
    e.preventDefault();
    setError('');
    setData(null);
    try {
      const res = await apiFetch('/pwatscore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: imagenId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setData({ id: json.pwatscoreId, ...json.categorias });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async () => {
    if (!data) return;
    try {
      const res = await apiFetch('/pwatscore', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      alert('Categorías actualizadas');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token) return null;

  return (
    <div>
      <h1>Calcular PWATScore</h1>
      <form onSubmit={handlePredict}>
        <input
          type="text"
          placeholder="ID de imagen"
          value={imagenId}
          onChange={e => setImagenId(e.target.value)}
        />
        <button type="submit">Calcular</button>
      </form>
      {error && <p style={{color:'red'}}>{error}</p>}
      {data && (
        <div>
          <h2>Categorías</h2>
          {[3,4,5,6,7,8].map(n => (
            <div key={n}>
              <label>{`Cat${n}: `}</label>
              <input
                type="number"
                value={data[`cat${n}`]}
                onChange={e => setData({ ...data, [`cat${n}`]: e.target.value })}
              />
            </div>
          ))}
          <button onClick={handleUpdate}>Guardar</button>
        </div>
      )}
    </div>
  );
}
