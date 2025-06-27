import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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

  const cargarMetrics = () => {
    setMetrics({ precision: 0.97, recall: 0.92 });
    setMsg('');
  };

  const reentrenar = () => {
    setMsg('Proceso de reentrenamiento simulado');
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
