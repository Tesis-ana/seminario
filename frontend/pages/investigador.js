import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import LogoutButton from '../components/LogoutButton';

export default function Investigador() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) router.replace('/');
    else setToken(t);
  }, [router]);

  if (!token) return null;

  const cargarMetrics = async () => {
    try {
      const res = await apiFetch('/pwatscore');
      const json = await res.json();
      if (res.ok) setMetrics(json);
      else setMsg('Error al obtener métricas');
    } catch (e) {
      setMsg('Error al obtener métricas');
    }
  };

  const reentrenar = async () => {
    try {
      await apiFetch('/segmentaciones/train');
      setMsg('Proceso de reentrenamiento iniciado');
    } catch (e) {
      setMsg('Error al reentrenar');
    }
  };

  return (
    <div className="container">
      <h1>Panel Investigador</h1>
      <button onClick={cargarMetrics}>Ver métricas</button>
      <button onClick={reentrenar} style={{marginLeft:'0.5rem'}}>Reentrenar</button>
      {msg && <p>{msg}</p>}
      {metrics && (<pre>{JSON.stringify(metrics, null, 2)}</pre>)}
      <LogoutButton />
    </div>
  );
}
