import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';

export default function Paciente() {
  const router = useRouter();
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return;
    }
    const payload = JSON.parse(atob(token.split('.')[1]));
    const rut = payload.rut;

    const fetchData = async () => {
      try {
        const pacRes = await apiFetch('/pacientes');
        const pacientes = await pacRes.json();
        const paciente = pacientes.find(p => p.user_id === rut);
        if (!paciente) {
          setError('Paciente no encontrado');
          setLoading(false);
          return;
        }
        const [imgRes, segRes, pwaRes] = await Promise.all([
          apiFetch('/imagenes'),
          apiFetch('/segmentaciones'),
          apiFetch('/pwatscore')
        ]);
        const imgs = await imgRes.json();
        const segs = await segRes.json();
        const pwas = await pwaRes.json();
        const datos = imgs
          .filter(img => img.paciente_id === paciente.id)
          .map(img => {
            const seg = segs.find(s => s.imagen_id === img.id);
            const pwa = pwas.find(p => p.imagen_id === img.id);
            return { img, seg, pwa };
          });
        setImagenes(datos);
      } catch (err) {
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p style={{color:'red'}}>{error}</p>;

  return (
    <div className="container">
      <h1>Mis Imágenes</h1>
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>imagen</th>
            <th>mascara</th>
            {Array.from({ length: 8 }, (_, i) => (
              <th key={i}>Categoria{i+1}</th>
            ))}
            <th>fecha de captura</th>
          </tr>
        </thead>
        <tbody>
          {imagenes.map(({ img, seg, pwa }) => (
            <tr key={img.id} onClick={() => router.push(`/imagenes/${img.id}`)} style={{cursor:'pointer'}}>
              <td>{img.id}</td>
              <td>
                <img src={`${BACKEND_URL}/imagenes/${img.id}/archivo`} alt="img" width={64} height={64} />
              </td>
              <td>
                {seg ? (
                  <img src={`${BACKEND_URL}/segmentaciones/${seg.id}/mask`} alt="mask" width={64} height={64} />
                ) : null}
              </td>
              {Array.from({ length: 8 }, (_, i) => (
                <td key={i}>{pwa ? pwa[`cat${i+1}`] ?? '' : ''}</td>
              ))}
              <td>{new Date(img.fecha_captura).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
