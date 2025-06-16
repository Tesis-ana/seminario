import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { BACKEND_URL } from '../../lib/api';

export default function ConsultaTipo() {
  const router = useRouter();
  const { tipo } = router.query;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return;
    }
    if (!tipo) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/${tipo}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('Error al obtener datos');
      }
    };
    fetchData();
  }, [router, tipo]);

  if (error) return <p style={{color:'red'}}>{error}</p>;
  if (!data) return <p>Cargando...</p>;

  return (
    <div>
      <h1>{tipo}</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
