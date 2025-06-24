import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { apiFetch, BACKEND_URL } from '../../lib/api';

export default function ImagenDetalle() {
  const router = useRouter();
  const { id } = router.query;
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return;
    }
    if (!id) return;

    const fetchData = async () => {
      try {
        const imgRes = await apiFetch('/imagenes/buscar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const img = await imgRes.json();
        if (!imgRes.ok) throw new Error(img.message || 'Error');

        const [segRes, pwaRes] = await Promise.all([
          apiFetch('/segmentaciones'),
          apiFetch('/pwatscore')
        ]);
        const segs = await segRes.json();
        const pwas = await pwaRes.json();
        const seg = segs.find(s => s.imagen_id === img.id);
        const pwa = pwas.find(p => p.imagen_id === img.id);

        const pacRes = await apiFetch('/pacientes/buscar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: img.paciente_id })
        });
        const paciente = await pacRes.json();
        let prof = null;
        if (pacRes.ok && paciente.profesional_id) {
          const profRes = await apiFetch('/profesionales/buscar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: paciente.profesional_id })
          });
          const profesional = await profRes.json();
          if (profRes.ok) {
            const userRes = await apiFetch('/users/buscar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: profesional.user_id })
            });
            const user = await userRes.json();
            if (userRes.ok) {
              prof = {
                especialidad: profesional.especialidad,
                nombre: user.nombre,
                correo: user.correo
              };
            }
          }
        }

        setDatos({ img, seg, pwa, prof });
      } catch (err) {
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router, id]);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p style={{color:'red'}}>{error}</p>;
  if (!datos) return null;

  const { img, seg, pwa, prof } = datos;

  return (
    <div className="container">
      <h1>Detalle Imagen {img.id}</h1>
      <div style={{marginBottom:'1rem'}}>
        <img src={`${BACKEND_URL}/imagenes/${img.id}/archivo`} alt="img" width={256} height={256} />
        {seg ? (
          <img src={`${BACKEND_URL}/segmentaciones/${seg.id}/mask`} alt="mask" width={256} height={256} style={{marginLeft:'1rem'}} />
        ) : null}
      </div>
      {pwa && (
        <table>
          <thead>
            <tr>
              {Array.from({ length: 8 }, (_, i) => (
                <th key={i}>Categoria {i+1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {Array.from({ length: 8 }, (_, i) => (
                <td key={i}>{pwa[`cat${i+1}`] ?? ''}</td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
      <p>Fecha de captura: {new Date(img.fecha_captura).toLocaleDateString()}</p>
      {prof && (
        <div>
          <h2>Profesional</h2>
          <p>Especialidad: {prof.especialidad}</p>
          <p>Nombre: {prof.nombre}</p>
          <p>Correo: {prof.correo}</p>
        </div>
      )}
      <p>
        <button onClick={() => router.back()}>Volver</button>
      </p>
    </div>
  );
}
