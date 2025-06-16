import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Consultas() {
  const router = useRouter();
  const [datos, setDatos] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    const fetchData = async () => {
      try {
        const endpoints = ['pacientes', 'profesionales', 'imagenes', 'segmentaciones', 'pwatscore'];
        const results = {};
        for (const ep of endpoints) {
          const res = await fetch(`http://localhost:8080/${ep}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          results[ep] = await res.json();
        }
        setDatos(results);
      } catch (err) {
        setError('Error al obtener datos');
      }
    };
    fetchData();
  }, [router]);

  return (
    <div>
      <h1>Consultas del backend</h1>
      {error && <p style={{color:'red'}}>{error}</p>}
      <pre>{JSON.stringify(datos, null, 2)}</pre>
    </div>
  );
}
