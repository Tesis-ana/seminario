import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import LogoutButton from '../components/LogoutButton';
import { CAT_INFO } from '../lib/categorias';

export default function Paciente() {
  const router = useRouter();
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [pacInfo, setPacInfo] = useState(null);

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
    const fetchData = async () => {
      try {
        const [userRes, pacRes] = await Promise.all([
          apiFetch('/users/me'),
          apiFetch('/pacientes/me')
        ]);
        if (userRes.ok) setUserInfo(await userRes.json());
        if (!pacRes.ok) throw new Error('Paciente no encontrado');
        const paciente = await pacRes.json();
        setPacInfo(paciente);
        const [imgRes, segRes, pwaRes] = await Promise.all([
          apiFetch(`/imagenes/paciente/${paciente.id}`),
          apiFetch('/segmentaciones'),
          apiFetch('/pwatscore')
        ]);
        const imgs = await imgRes.json();
        const segs = await segRes.json();
        const pwas = await pwaRes.json();
        const datos = imgs
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
      <h1>Mis Datos</h1>
      {userInfo && (
        <div>
          <p><strong>RUT:</strong> {userInfo.rut}</p>
          <p><strong>Nombre:</strong> {userInfo.nombre}</p>
          <p><strong>Correo:</strong> {userInfo.correo}</p>
        </div>
      )}
      {pacInfo && (
        <div>
          <p><strong>Sexo:</strong> {pacInfo.sexo}</p>
          <p><strong>Ingreso:</strong> {new Date(pacInfo.fecha_ingreso).toLocaleDateString()}</p>
          <p><strong>Comentarios:</strong> {pacInfo.comentarios}</p>
        </div>
      )}
      <h2 className="mt-1">Mis Imágenes</h2>
      <table className="mt-1">
        <thead>
          <tr>
            <th>Identificador</th>
            <th>PWATScore</th>
            <th>Imagen</th>
            <th>Mascara</th>
            {Array.from({ length: 8 }, (_, i) => (
              <th>{CAT_INFO[i+1]}</th>
            ))}
            <th>Fecha de captura</th>
          </tr>
        </thead>
        <tbody>
          {imagenes.map(({ img, seg, pwa }, index) => {
            const sum   = pwa
              ? Array.from({ length: 8 }, (_, i) => pwa[`cat${i + 1}`] ?? 0).reduce((a, b) => a + b, 0)
              : null;
            const color = sum !== null
              ? blendColors('#e6ffe6', '#ffe6e6', sum / 32)
              : 'transparent';

            const total = imagenes.length;       // número total de filas
            const contadorDesc = total - index;  // 1.ª fila ⇒ N, 2.ª ⇒ N-1, …

            return (
              <tr
                key={img.id}
                onClick={() => router.push(`/imagenes/${img.id}`)}
                style={{ cursor: 'pointer', backgroundColor: color }}
              >
                {/* Contador descendente */}
                <td>{contadorDesc}</td>

                {/* Resto de columnas */}
                <td>{sum !== null ? sum : ''}</td>
                <td>
                  <img
                    src={`${BACKEND_URL}/imagenes/${img.id}/archivo`}
                    alt="img"
                    width={64}
                    height={64}
                  />
                </td>
                <td>
                  {seg ? (
                    <img
                      src={`${BACKEND_URL}/segmentaciones/${img.id}/mask`}
                      alt="mask"
                      width={64}
                      height={64}
                    />
                  ) : null}
                </td>
                {Array.from({ length: 8 }, (_, i) => (
                  <td key={i}>{pwa ? pwa[`cat${i + 1}`] ?? '' : ''}</td>
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
