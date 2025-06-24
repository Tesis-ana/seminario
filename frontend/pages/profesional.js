import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import LogoutButton from '../components/LogoutButton';
import { CAT_INFO } from '../lib/categorias';

export default function ProfesionalPacientes() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [ultimas, setUltimas] = useState({});

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
    async function load() {
      try {
        const resProf = await apiFetch('/profesionales/me');
        const prof = await resProf.json();
        if (!resProf.ok) throw new Error(prof.message || 'Error');
        const resPacs = await apiFetch(`/pacientes/profesional/${prof.id}`);
        const pacs = await resPacs.json();
        setPacientes(pacs);
        const fechas = {};
        await Promise.all(
          pacs.map(async (pa) => {
            try {
              const r = await apiFetch(`/imagenes/paciente/${pa.id}`);
              const imgs = await r.json();
              if (Array.isArray(imgs) && imgs.length > 0) {
                const ult = imgs.sort((a,b) => new Date(b.fecha_captura) - new Date(a.fecha_captura))[0];
                fechas[pa.id] = ult.fecha_captura;
              }
            } catch(e) {
              fechas[pa.id] = null;
            }
          })
        );
        setUltimas(fechas);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [router]);

  const seleccionar = async (p) => {
    setSeleccionado(p);
    try {
      const [imgRes, segRes, pwaRes] = await Promise.all([
        apiFetch(`/imagenes/paciente/${p.id}`),
        apiFetch('/segmentaciones'),
        apiFetch('/pwatscore')
      ]);
      const imgs = await imgRes.json();
      const segs = await segRes.json();
      const pwas = await pwaRes.json();
      const data = imgs
        .map(img => {
          const seg = segs.find(s => s.imagen_id === img.id);
          const pwa = pwas.find(ps => ps.imagen_id === img.id);
          return { img, seg, pwa };
        })
        .sort((a,b) => new Date(b.img.fecha_captura) - new Date(a.img.fecha_captura));
      setImagenes(data);
      if (imgs.length > 0) {
        setUltimas({ ...ultimas, [p.id]: data[0].img.fecha_captura });
      }
    } catch (err) {
      console.error(err);
      setImagenes([]);
    }
  };

  const subirImagen = async (e) => {
    const file = e.target.files[0];
    if (!file || !seleccionado) return;
    const formData = new FormData();
    formData.append('id', seleccionado.id);
    formData.append('imagen', file);
    const res = await apiFetch('/imagenes', { method: 'POST', body: formData });
    const json = await res.json();
    if (res.ok) {
      setImagenes([
        { img: json.imagen, seg: null, pwa: null },
        ...imagenes,
      ]);
      setUltimas({ ...ultimas, [seleccionado.id]: json.imagen.fecha_captura });
      router.push(`/pwatscore?id=${json.imagen.id}`);
    }
  };

  const reemplazarImagen = async (imgId, file) => {
    const formData = new FormData();
    formData.append('imagen', file);
    const res = await apiFetch(`/imagenes/${imgId}/archivo`, { method: 'PUT', body: formData });
    const json = await res.json();
    if (res.ok) {
      setImagenes(
        imagenes.map(item => item.img.id === imgId ? { ...item, img: json.imagen } : item)
      );
      const item = imagenes.find(i => i.img.id === imgId);
      if (item) {
        const pid = item.img.paciente_id;
        const prev = ultimas[pid];
        if (!prev || new Date(json.imagen.fecha_captura) > new Date(prev)) {
          setUltimas({ ...ultimas, [pid]: json.imagen.fecha_captura });
        }
      }
    }
  };

  const filtrados = pacientes.filter(p =>
    p.user && p.user.rut.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="container">
      <h1>Mis Pacientes</h1>
      <div className="mt-1">
        <input type="text" placeholder="Buscar por RUT" value={filtro} onChange={e => setFiltro(e.target.value)} />
      </div>
      <table className="mt-1">
        <thead>
          <tr>
            <th>RUT</th>
            <th>Nombre</th>
            <th>Última Control Fotografico</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map(p => (
            <tr key={p.id} onClick={() => seleccionar(p)} style={{cursor:'pointer'}}>
              <td>{p.user?.rut}</td>
              <td>{p.user?.nombre}</td>
              <td>{ultimas[p.id] ? new Date(ultimas[p.id]).toLocaleDateString() : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {seleccionado && (
        <div className="mt-1">
          <h2>Paciente: {seleccionado.user?.nombre}</h2>
          <p><strong>RUT:</strong> {seleccionado.user?.rut}</p>
          <p><strong>Sexo:</strong> {seleccionado.sexo}</p>
          <p><strong>Ingreso:</strong> {seleccionado.fecha_ingreso}</p>
          <p><strong>Comentarios:</strong> {seleccionado.comentarios}</p>

          <div className="mt-1">
            <input type="file" onChange={subirImagen} />
          </div>
          <table className="mt-1">
            <thead>
              <tr>
                <th>Identificador</th>
                <th>Imagen</th>
                <th>Mascara</th>
                {Array.from({ length: 8 }, (_, i) => (
                  <th key={i} title={CAT_INFO[i+1]}>Categoria {i+1}</th>
                ))}
                <th>Fecha de captura</th>
                <th>Reemplazar</th>
              </tr>
            </thead>
            <tbody>
              {imagenes.map(({ img, seg, pwa }) => {
                const sum = pwa ? Array.from({ length: 8 }, (_, i) => pwa[`cat${i+1}`] ?? 0).reduce((a,b) => a + b, 0) : null;
                const color = sum !== null ? blendColors('#e6ffe6', '#ffe6e6', sum / 32) : 'transparent';
                return (
                  <tr
                    key={img.id}
                    style={{ backgroundColor: color }}
                    onClick={() => router.push(`/pwatscore?id=${img.id}`)}
                  >
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
                    <td>
                      <input type="file" onChange={e => reemplazarImagen(img.id, e.target.files[0])} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <LogoutButton />
    </div>
  );
}
