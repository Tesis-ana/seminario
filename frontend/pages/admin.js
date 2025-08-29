import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import LogoutButton from '../components/LogoutButton';
import Layout from '../components/Layout';

export default function Admin() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [segs, setSegs] = useState([]);
  const [imagenes, setImagenes] = useState([]);
  const [pwats, setPwats] = useState([]);

  const [userForm, setUserForm] = useState({ nombre:'', correo:'', contra:'', rol:'paciente', rut:'' });
  const [profForm, setProfForm] = useState({ especialidad:'', user_id:'', fecha_ingreso:'' });
  const [editUserId, setEditUserId] = useState(null);
  const [editProfId, setEditProfId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const tok = localStorage.getItem('token');
    if (!tok) { router.replace('/'); return; }
    const payload = JSON.parse(atob(tok.split('.')[1]));
    if (payload.rol !== 'admin') { router.replace('/'); return; }
    loadAll();
    apiFetch('/users/me').then(r => r.ok && r.json().then(setUserInfo));
  }, [router]);

  const loadAll = async () => {
    try {
      const [uRes, pRes, sRes, iRes, wRes] = await Promise.all([
        apiFetch('/users'), apiFetch('/profesionales'), apiFetch('/segmentaciones'), apiFetch('/imagenes'), apiFetch('/pwatscore')
      ]);
      setUsers(await uRes.json());
      setProfesionales(await pRes.json());
      setSegs(await sRes.json());
      setImagenes(await iRes.json());
      setPwats(await wRes.json());
    } catch (e) { console.error(e); }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const url = editUserId ? '/users' : '/users/crear';
    const method = editUserId ? 'PUT' : 'POST';
    const body = { ...userForm }; if (editUserId) body.id = editUserId;
    try {
      const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { setUserForm({ nombre:'', correo:'', contra:'', rol:'paciente', rut:'' }); setEditUserId(null); loadAll(); }
    } catch (err) { console.error(err); }
  };

  const handleProfSubmit = async (e) => {
    e.preventDefault();
    const url = '/profesionales'; const method = editProfId ? 'PUT' : 'POST'; const body = { ...profForm }; if (editProfId) body.id = editProfId;
    try {
      const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { setProfForm({ especialidad:'', user_id:'', fecha_ingreso:'' }); setEditProfId(null); loadAll(); }
    } catch (err) { console.error(err); }
  };

  const eliminarUser = async (id) => { if (!confirm('Eliminar usuario?')) return; 
  
  await apiFetch('/users', { 
    method:'DELETE', 
    headers:{ 'Content-Type':'application/json' }, 
    body: JSON.stringify({ id }) }); 
    loadAll(); };
  
  const eliminarProf = async (id) => { if (!confirm('Eliminar profesional?')) return; 

  await apiFetch('/profesionales', { 
    method:'DELETE', 
    headers:{ 'Content-Type':'application/json' }, 
    body: JSON.stringify({ id }) }); 
    loadAll(); };

  // Stats
  const pacientesActivos = users.filter(u => u.rol === 'paciente').length;
  const analisisRealizados = pwats.length;
  const segRate = imagenes.length ? Math.round((segs.length / imagenes.length) * 100) : 0;
  const altoRiesgo = pwats.reduce((acc, p) => { const sum = [1,2,3,4,5,6,7,8].reduce((s, i) => s + (p[`cat${i}`] || 0), 0); return acc + (sum >= 16 ? 1 : 0); }, 0);
  const dist = pwats.reduce((d, p) => {
    const sum = [1, 2, 3, 4, 5, 6, 7, 8].reduce((s, i) => s + (p[`cat${i}`] || 0), 0);
    if (sum >= 16) {
      d.alto++;
    } else if (sum >= 8) {
      d.medio++;
    } else {
      d.bajo++;
    }
    return d;
  }, { bajo: 0, medio: 0, alto: 0 });
  const totalPwats = Math.max(1, pwats.length);
  const pct = (n) => Math.round((n / totalPwats) * 100);

  return (
    <Layout subtitle="Panel de Administracion" actions={<><span className="badge purple">{userInfo?.nombre}</span><LogoutButton /></>}>
      <div className="grid stats">
        <div className="stat-card"><div className="stat-icon" style={{background:'#7c3aed'}}>US</div><div className="stat-content"><div className="stat-title">Pacientes activos</div><div className="stat-value">{pacientesActivos}</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{background:'#ef4444'}}>AL</div><div className="stat-content"><div className="stat-title">Casos alto riesgo</div><div className="stat-value">{altoRiesgo}</div><div className="stat-note">critico</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{background:'#10b981'}}>OK</div><div className="stat-content"><div className="stat-title">Tasa de segmentacion</div><div className="stat-value">{segRate}%</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{background:'#3b82f6'}}>AN</div><div className="stat-content"><div className="stat-title">Analisis realizados</div><div className="stat-value">{analisisRealizados}</div></div></div>
      </div>

      <div className="grid two mt-1">
        <div className="stack">
          <div className="card">
            <div className="section-title">Usuarios</div>
            <div style={{marginBottom:8}}>
              <label className="badge gray" style={{marginRight:8}} htmlFor="usersCsv">CSV</label>
              <input id="usersCsv" type="file" accept=".csv" onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) { return; }
                const text = await file.text();
                const lines = text.trim().split(/\n+/);
                const headers = lines.shift().split(',');
                const users = lines.map(l => {
                  const v = l.split(',');
                  const o = {};
                  headers.forEach((h, i) => o[h.trim()] = v[i]?.trim());
                  return o;
                });
                await apiFetch('/users/bulk', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ users })
                });
                loadAll();
              }} />
            </div>
            <form onSubmit={handleUserSubmit}>
              <input value={userForm.nombre} onChange={e=>setUserForm({ ...userForm, nombre:e.target.value })} placeholder="Nombre" />
              <input value={userForm.correo} onChange={e=>setUserForm({ ...userForm, correo:e.target.value })} placeholder="Correo" />
              <input value={userForm.contra} type="password" onChange={e=>setUserForm({ ...userForm, contra:e.target.value })} placeholder="Contrasena" />
              <select value={userForm.rol} onChange={e=>setUserForm({ ...userForm, rol:e.target.value })}>
                <option value="doctor">doctor</option>
                <option value="enfermera">enfermera</option>
                <option value="paciente">paciente</option>
                <option value="investigador">investigador</option>
                <option value="admin">admin</option>
              </select>
              <input value={userForm.rut} onChange={e=>setUserForm({ ...userForm, rut:e.target.value })} placeholder="RUT" />
              <button type="submit">{editUserId ? 'Actualizar' : 'Crear'}</button>
              {editUserId && <button type="button" onClick={()=>{setEditUserId(null);setUserForm({ nombre:'', correo:'', contra:'', rol:'paciente', rut:'' });}}>Cancelar</button>}
            </form>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>ID</th><th>RUT</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acciones</th></tr></thead>
                <tbody>
                  {users.map(u=> (
                    <tr key={u.id}>
                      <td>{u.id}</td><td>{u.rut}</td><td>{u.nombre}</td><td>{u.correo}</td><td>{u.rol}</td>
                      <td><button onClick={()=>{setUserForm({ nombre:u.nombre, correo:u.correo, contra:'', rol:u.rol, rut:u.rut });setEditUserId(u.id);}}>Editar</button><button onClick={()=>eliminarUser(u.id)}>Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="section-title">Profesionales</div>
            <div style={{marginBottom:8}}>
              <label className="badge gray" style={{marginRight:8}} htmlFor="profesCsv">CSV</label>
              <input id="profesCsv" type="file" accept=".csv" onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) { return; }
                const text = await file.text();
                const lines = text.trim().split(/\n+/);
                const headers = lines.shift().split(',');
                const profesionales = lines.map(l => {
                  const v = l.split(',');
                  const o = {};
                  headers.forEach((h, i) => o[h.trim()] = v[i]?.trim());
                  return o;
                });
                await apiFetch('/profesionales/bulk', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ profesionales })
                });
                loadAll();
              }} />
            </div>
            <form onSubmit={handleProfSubmit}>
              <input value={profForm.especialidad} onChange={e=>setProfForm({ ...profForm, especialidad:e.target.value })} placeholder="Especialidad" />
              <input value={profForm.user_id} onChange={e=>setProfForm({ ...profForm, user_id:e.target.value })} placeholder="User RUT" />
              <input value={profForm.fecha_ingreso} onChange={e=>setProfForm({ ...profForm, fecha_ingreso:e.target.value })} placeholder="Fecha ingreso" />
              <button type="submit">{editProfId ? 'Actualizar' : 'Crear'}</button>
              {editProfId && <button type="button" onClick={()=>{setEditProfId(null);setProfForm({ especialidad:'', user_id:'', fecha_ingreso:'' });}}>Cancelar</button>}
            </form>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>ID</th><th>User RUT</th><th>Especialidad</th><th>Fecha ingreso</th><th>Acciones</th></tr></thead>
                <tbody>
                  {profesionales.map(p=> (
                    <tr key={p.id}>
                      <td>{p.id}</td><td>{p.user_id}</td><td>{p.especialidad}</td><td>{p.fecha_ingreso}</td>
                      <td><button onClick={()=>{setProfForm({ especialidad:p.especialidad, user_id:p.user_id, fecha_ingreso:p.fecha_ingreso });setEditProfId(p.id);}}>Editar</button><button onClick={()=>eliminarProf(p.id)}>Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="section-title">Historial de Segmentaciones</div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>ID</th><th>Metodo</th><th>Imagen ID</th><th>Mascara</th></tr></thead>
                <tbody>
                  {segs.map(s=> (
                    <tr key={s.id}>
                      <td>{s.id}</td><td>{s.metodo}</td><td>{s.imagen_id}</td>
                      <td>{s.imagen_id && (<img src={`${BACKEND_URL}/segmentaciones/${s.imagen_id}/mask`} alt="mask" width={64} height={64} />)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Predicciones IA</div>
          <div style={{display:'grid', gap:12}}>
            <div>
              <div style={{display:'flex', justifyContent:'space-between'}}><span>Riesgo Bajo</span><span className="badge green">{pct(dist.bajo)}%</span></div>
              <div className="progress"><div className="bar green" style={{width: pct(dist.bajo)+'%'}} /></div>
            </div>
            <div>
              <div style={{display:'flex', justifyContent:'space-between'}}><span>Riesgo Medio</span><span className="badge yellow">{pct(dist.medio)}%</span></div>
              <div className="progress"><div className="bar yellow" style={{width: pct(dist.medio)+'%'}} /></div>
            </div>
            <div>
              <div style={{display:'flex', justifyContent:'space-between'}}><span>Riesgo Alto</span><span className="badge red">{pct(dist.alto)}%</span></div>
              <div className="progress"><div className="bar red" style={{width: pct(dist.alto)+'%'}} /></div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
