import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import LogoutButton from '../components/LogoutButton';
import { CAT_INFO } from '../lib/categorias';

export default function Usuario() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

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
    if (!token) { router.replace('/'); return; }
    const payload = JSON.parse(atob(token.split('.')[1]));
    const rut = payload.rut;

    const fetchData = async () => {
      try {
        const uRes = await apiFetch('/users/buscar', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: rut })
        });
        const u = await uRes.json();
        if (uRes.ok) setUser(u);

        const pRes = await apiFetch('/pacientes/buscar-rut', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ rut })
        });
        const pac = await pRes.json();
        if (pRes.ok) {
          const [imgRes, segRes, pwaRes] = await Promise.all([
            apiFetch('/imagenes'),
            apiFetch('/segmentaciones'),
            apiFetch('/pwatscore')
          ]);
          const imgs = await imgRes.json();
          const segs = await segRes.json();
          const pwas = await pwaRes.json();
          const datos = imgs.filter(i=>i.paciente_id===pac.id).map(img=>({
            img,
            seg: segs.find(s=>s.imagen_id===img.id),
            pwa: pwas.find(p=>p.imagen_id===img.id)
          })).sort((a,b)=>new Date(b.img.fecha_captura)-new Date(a.img.fecha_captura));
          setImagenes(datos);
        }
      } catch(e) {
        setMsg('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  if (loading) return <p>Cargando...</p>;

  const guardar = async () => {
    try {
      const res = await apiFetch('/users', {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id: user.rut, nombre: user.nombre, correo: user.correo })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setMsg('Datos actualizados');
    } catch(e) {
      setMsg('Error al actualizar');
    }
  };

  return (
    <div className="container">
      <h1>Mi Perfil</h1>
      {user && (
        <div className="mt-1">
          <label>Nombre:</label>
          <input value={user.nombre} onChange={e=>setUser({ ...user, nombre:e.target.value })} />
          <label style={{marginLeft:'0.5rem'}}>Correo:</label>
          <input value={user.correo} onChange={e=>setUser({ ...user, correo:e.target.value })} />
          <button onClick={guardar}>Guardar</button>
        </div>
      )}
      {msg && <p>{msg}</p>}
      <h2 className="mt-1">Mis Revisiones</h2>
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
          </tr>
        </thead>
        <tbody>
          {imagenes.map(({ img, seg, pwa }) => {
            const sum = pwa ? Array.from({ length: 8 }, (_, i) => pwa[`cat${i+1}`] ?? 0).reduce((a,b)=>a+b,0) : null;
            const color = sum !== null ? blendColors('#e6ffe6', '#ffe6e6', sum/32) : 'transparent';
            return (
              <tr key={img.id} style={{cursor:'pointer', backgroundColor: color}} onClick={()=>router.push(`/imagenes/${img.id}`)}>
                <td>{img.id}</td>
                <td><img src={`${BACKEND_URL}/imagenes/${img.id}/archivo`} alt="img" width={64} height={64} /></td>
                <td>{seg ? (<img src={`${BACKEND_URL}/segmentaciones/${seg.id}/mask`} alt="mask" width={64} height={64} />) : null}</td>
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
