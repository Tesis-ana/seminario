import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import LogoutButton from '../components/LogoutButton';

export default function Paciente() {
  const router = useRouter();
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const blendColors = (c1, c2, ratio) => {
    const hex = (c) => c.replace('#', '');
    const r1 = parseInt(hex(c1).substring(0, 2), 16);
    const g1 = parseInt(hex(c1).substring(2, 4), 16);
    const b1 = parseInt(hex(c1).substring(4, 6), 16);
    const r2 = parseInt(hex(c2).substring(0, 2), 16);
    const g2 = parseInt(hex(c2).substring(2, 4), 16);
    const b2 = parseInt(hex(c2).substring(4, 6), 16);
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  };

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
          })
          .sort((a, b) => new Date(b.img.fecha_captura) - new Date(a.img.fecha_captura));
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
            <th>Identificador</th>
            <th>Imagen</th>
            <th>Mascara</th>
            {Array.from({ length: 8 }, (_, i) => (
              <th key={i}>Categoria {i+1}</th>
            ))}
            <th>Fecha de captura</th>
          </tr>
        </thead>
        <tbody>
          {imagenes.map(({ img, seg, pwa }) => {
            const sum = pwa ? Array.from({ length: 8 }, (_, i) => pwa[`cat${i+1}`] ?? 0).reduce((a, b) => a + b, 0) : null;
            const color = sum !== null ? blendColors('#e6ffe6', '#ffe6e6', sum / 32) : 'transparent';
            return (
            <tr key={img.id} onClick={() => router.push(`/imagenes/${img.id}`)} style={{cursor:'pointer', backgroundColor: color}}>
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
            );
          })}
        </tbody>
      </table>
      <LogoutButton />
    </div>
  );
}
