import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import LogoutButton from '../components/LogoutButton';
import { CAT_INFO } from '../lib/categorias';
import Layout from '../components/Layout';

export default function ProfesionalPacientes() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [ultimas, setUltimas] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [profInfo, setProfInfo] = useState(null);
  const [stats, setStats] = useState({ total:0, totalImgs:0, recientesPct:0, alerta:0 });

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
    async function load() {
      try {
        const [userRes, profRes] = await Promise.all([ apiFetch('/users/me'), apiFetch('/profesionales/me') ]);
        if (userRes.ok) setUserInfo(await userRes.json());
        const prof = await profRes.json(); if (!profRes.ok) throw new Error(prof.message || 'Error');
        setProfInfo(prof);
        const resPacs = await apiFetch(`/pacientes/profesional/${prof.id}`);
        const pacs = await resPacs.json(); setPacientes(pacs);
        const fechas = {}; let totalImgs = 0; let recientes = 0; let alerta = 0; const now = Date.now();
        await Promise.all(pacs.map(async (pa) => {
          try {
            const r = await apiFetch(`/imagenes/paciente/${pa.id}`);
            const imgs = await r.json(); totalImgs += Array.isArray(imgs) ? imgs.length : 0;
            if (Array.isArray(imgs) && imgs.length > 0) {
              const ult = imgs.sort((a,b) => new Date(b.fecha_captura) - new Date(a.fecha_captura))[0];
              const ts = new Date(ult.fecha_captura).getTime(); fechas[pa.id] = ult.fecha_captura; if (now - ts < 1000*60*60*24*30) recientes++; else alerta++;
            } else { alerta++; }
          } catch(e) { fechas[pa.id] = null; alerta++; }
        }));
        setUltimas(fechas); const total = pacs.length || 1; setStats({ total: pacs.length, totalImgs, recientesPct: Math.round((recientes/total)*100), alerta });
      } catch (err) { console.error(err); }
    }
    load();
  }, [router]);

  const seleccionar = async (p) => {
    setSeleccionado(p);
    try {
      const [imgRes, segRes, pwaRes] = await Promise.all([ apiFetch(`/imagenes/paciente/${p.id}`), apiFetch('/segmentaciones'), apiFetch('/pwatscore') ]);
      const imgs = await imgRes.json(); const segs = await segRes.json(); const pwas = await pwaRes.json();
      const data = imgs.map(img => { const seg = segs.find(s => s.imagen_id === img.id); const pwa = pwas.find(ps => ps.imagen_id === img.id); return { img, seg, pwa }; }).sort((a,b) => new Date(b.img.fecha_captura) - new Date(a.img.fecha_captura));
      setImagenes(data); if (imgs.length > 0) setUltimas({ ...ultimas, [p.id]: data[0].img.fecha_captura });
    } catch (err) { console.error(err); setImagenes([]); }
  };

  const subirImagen = async (e) => {
    const file = e.target.files[0]; if (!file || !seleccionado) return; const formData = new FormData(); formData.append('id', seleccionado.id); formData.append('imagen', file);
    const res = await apiFetch('/imagenes', { method: 'POST', body: formData }); const json = await res.json();
    if (res.ok) { setImagenes([{ img: json.imagen, seg: null, pwa: null }, ...imagenes, ]); setUltimas({ ...ultimas, [seleccionado.id]: json.imagen.fecha_captura }); router.push(`/pwatscore?id=${json.imagen.id}`); }
  };

  const reemplazarImagen = async (imgId, file) => {
    const formData = new FormData(); formData.append('imagen', file);
    const res = await apiFetch(`/imagenes/${imgId}/archivo`, { method: 'PUT', body: formData }); const json = await res.json();
    if (res.ok) {
      setImagenes(imagenes.map(item => item.img.id === imgId ? { ...item, img: json.imagen } : item));
      const item = imagenes.find(i => i.img.id === imgId); if (item) { const pid = item.img.paciente_id; const prev = ultimas[pid]; if (!prev || new Date(json.imagen.fecha_captura) > new Date(prev)) { setUltimas({ ...ultimas, [pid]: json.imagen.fecha_captura }); } }
    }
  };

  const filtrados = pacientes.filter(p => p.user && p.user.rut.toLowerCase().includes(filtro.toLowerCase()));

  const latestPwa = imagenes && imagenes.length > 0 ? imagenes[0].pwa : null;
  const latestSum = latestPwa ? Array.from({ length: 8 }, (_, i) => latestPwa[`cat${i+1}`] ?? 0).reduce((a,b)=>a+b,0) : null;
  const riskLabel = latestSum==null ? '' : latestSum>=16 ? 'Riesgo Alto' : latestSum>=8 ? 'Riesgo Medio' : 'Riesgo Bajo';
  const riskColor = latestSum==null ? 'gray' : latestSum>=16 ? 'red' : latestSum>=8 ? 'yellow' : 'green';
  const riskPct = latestSum==null ? 0 : Math.min(100, Math.round((latestSum/32)*100));

  return (
    <Layout subtitle="Panel de Profesionales" actions={<><a href="/registrar-atencion" className="btn-primary">Registrar atencion</a><LogoutButton /></>}>
      <div className="grid stats">
        <div className="stat-card"><div className="stat-icon" style={{background:'#7c3aed'}}>US</div><div className="stat-content"><div className="stat-title">Pacientes</div><div className="stat-value">{stats.total}</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{background:'#ef4444'}}>AL</div><div className="stat-content"><div className="stat-title">Sin control {'>'} 30 dias</div><div className="stat-value">{stats.alerta}</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{background:'#10b981'}}>OK</div><div className="stat-content"><div className="stat-title">Controles recientes</div><div className="stat-value">{stats.recientesPct}%</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{background:'#3b82f6'}}>IM</div><div className="stat-content"><div className="stat-title">Imagenes totales</div><div className="stat-value">{stats.totalImgs}</div></div></div>
      </div>

      <div className="grid two mt-1">
        <div className="stack">
          <div className="card">
            <div className="section-title">Mis Pacientes</div>
            <div style={{marginBottom:8}}><input type="text" placeholder="Buscar por RUT" value={filtro} onChange={e => setFiltro(e.target.value)} /></div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>RUT</th><th>Nombre</th><th>Ultimo Control</th></tr></thead>
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
            </div>
          </div>

          {seleccionado && (
            <div className="card">
              <div className="section-title">Paciente: {seleccionado.user?.nombre}</div>
              <div className="stack">
                <div><span className={`badge ${riskColor}`}>{riskLabel}</span></div>
                <div><strong>RUT:</strong> {seleccionado.user?.rut} · <strong>Sexo:</strong> {seleccionado.sexo} · <strong>Ingreso:</strong> {seleccionado.fecha_ingreso}</div>
                <div><input type="file" onChange={subirImagen} /></div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Identificador</th>
                        <th>Imagen</th>
                        <th>Mascara</th>
                        {Array.from({ length: 8 }, (_, i) => (<th key={i} title={CAT_INFO[i+1]}>Cat {i+1}</th>))}
                        <th>Fecha</th>
                        <th>Reemplazar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {imagenes.map(({ img, seg, pwa }) => {
                        const sum = pwa ? Array.from({ length: 8 }, (_, i) => pwa[`cat${i+1}`] ?? 0).reduce((a,b) => a + b, 0) : null;
                        const color = sum !== null ? blendColors('#e6ffe6', '#ffe6e6', sum / 32) : 'transparent';
                        return (
                          <tr key={img.id} style={{ backgroundColor: color }} onClick={() => router.push(`/pwatscore?id=${img.id}`)}>
                            <td>{img.id}</td>
                            <td><img src={`${BACKEND_URL}/imagenes/${img.id}/archivo`} alt="img" width={64} height={64} /></td>
                            <td>{seg ? (<img src={`${BACKEND_URL}/segmentaciones/${img.id}/mask`} alt="mask" width={64} height={64} />) : null}</td>
                            {Array.from({ length: 8 }, (_, i) => (<td key={i}>{pwa ? pwa[`cat${i+1}`] ?? '' : ''}</td>))}
                            <td>{new Date(img.fecha_captura).toLocaleDateString()}</td>
                            <td><input type="file" onChange={e => reemplazarImagen(img.id, e.target.files[0])} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title">Predicciones IA</div>
          {latestSum == null ? (
            <div className="badge gray">Selecciona un paciente para ver su ultimo PWAT</div>
          ) : (
            <div className="stack">
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span>Severidad (ultima toma)</span>
                <span className={`badge ${riskColor}`}>{riskPct}%</span>
              </div>
              <div className="progress"><div className={`bar ${riskColor}`} style={{width: riskPct + '%'}} /></div>
              <div style={{fontSize:12, color:'#6b7280'}}>Basado en el puntaje PWAT total (0-32).</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
