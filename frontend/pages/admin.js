import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import LogoutButton from '../components/LogoutButton';

export default function Admin() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [segs, setSegs] = useState([]);
  const [userForm, setUserForm] = useState({ nombre:'', correo:'', contra:'', rol:'paciente', rut:'' });
  const [profForm, setProfForm] = useState({ especialidad:'', user_id:'', fecha_ingreso:'' });
  const [editUserId, setEditUserId] = useState(null);
  const [editProfId, setEditProfId] = useState(null);
  const [userCsv, setUserCsv] = useState('');
  const [profCsv, setProfCsv] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const tok = localStorage.getItem('token');
    if (!tok) {
      router.replace('/');
      return;
    }
    const payload = JSON.parse(atob(tok.split('.')[1]));
    if (payload.rol !== 'admin') {
      router.replace('/');
      return;
    }
    loadAll();
    apiFetch('/users/me').then(r => r.ok && r.json().then(setUserInfo));
  }, [router]);

  const loadAll = async () => {
    try {
      const [uRes, pRes, sRes] = await Promise.all([
        apiFetch('/users'),
        apiFetch('/profesionales'),
        apiFetch('/segmentaciones')
      ]);
      setUsers(await uRes.json());
      setProfesionales(await pRes.json());
      setSegs(await sRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const url = editUserId ? '/users' : '/users/crear';
    const method = editUserId ? 'PUT' : 'POST';
    const body = { ...userForm };
    if (editUserId) body.id = editUserId;
    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setUserForm({ nombre:'', correo:'', contra:'', rol:'paciente', rut:'' });
        setEditUserId(null);
        loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfSubmit = async (e) => {
    e.preventDefault();
    const url = '/profesionales';
    const method = editProfId ? 'PUT' : 'POST';
    const body = { ...profForm };
    if (editProfId) body.id = editProfId;
    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setProfForm({ especialidad:'', user_id:'', fecha_ingreso:'' });
        setEditProfId(null);
        loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const eliminarUser = async (id) => {
    if (!confirm('¿Eliminar usuario?')) return;
    await apiFetch('/users', {
      method:'DELETE',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ id })
    });
    loadAll();
  };

  const eliminarProf = async (id) => {
    if (!confirm('¿Eliminar profesional?')) return;
    await apiFetch('/profesionales', {
      method:'DELETE',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ id })
    });
    loadAll();
  };

  const parseCsv = (text) => {
    const lines = text.trim().split(/\n+/);
    const headers = lines.shift().split(',');
    return lines.map(l => {
      const values = l.split(',');
      const obj = {};
      headers.forEach((h,i)=>{obj[h.trim()] = values[i]?.trim();});
      return obj;
    });
  };

  const handleUserCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const users = parseCsv(text);
    await apiFetch('/users/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users })
    });
    loadAll();
  };

  const handleProfCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const profesionales = parseCsv(text);
    await apiFetch('/profesionales/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profesionales })
    });
    loadAll();
  };

  return (
    <div className="container">
      {userInfo ? (
        <div>
          <h1>Administrador: {userInfo.nombre}</h1>
          <p><strong>RUT:</strong> {userInfo.rut}</p>
          <p><strong>Correo:</strong> {userInfo.correo}</p>
          <h2 className="mt-1">Panel de Administración</h2>
        </div>
      ) : (
        <h1>Panel de Administración</h1>
      )}

      <h2>Usuarios</h2>
      <div>
        <label>Cargar CSV:</label>
        <input type="file" accept=".csv" onChange={handleUserCsv} />
      </div>
      <form onSubmit={handleUserSubmit} className="mt-1">
        <input value={userForm.nombre} onChange={e=>setUserForm({ ...userForm, nombre:e.target.value })} placeholder="Nombre" />
        <input value={userForm.correo} onChange={e=>setUserForm({ ...userForm, correo:e.target.value })} placeholder="Correo" />
        <input value={userForm.contra} type="password" onChange={e=>setUserForm({ ...userForm, contra:e.target.value })} placeholder="Contraseña" />
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
      <table className="mt-1">
        <thead>
          <tr>
            <th>ID</th>
            <th>RUT</th>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u=> (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.rut}</td>
              <td>{u.nombre}</td>
              <td>{u.correo}</td>
              <td>{u.rol}</td>
              <td>
                <button onClick={()=>{setUserForm({ nombre:u.nombre, correo:u.correo, contra:'', rol:u.rol, rut:u.rut });setEditUserId(u.id);}}>Editar</button>
                <button onClick={()=>eliminarUser(u.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-1">Profesionales</h2>
      <div>
        <label>Cargar CSV:</label>
        <input type="file" accept=".csv" onChange={handleProfCsv} />
      </div>
      <form onSubmit={handleProfSubmit} className="mt-1">
        <input value={profForm.especialidad} onChange={e=>setProfForm({ ...profForm, especialidad:e.target.value })} placeholder="Especialidad" />
        <input value={profForm.user_id} onChange={e=>setProfForm({ ...profForm, user_id:e.target.value })} placeholder="User RUT" />
        <input value={profForm.fecha_ingreso} onChange={e=>setProfForm({ ...profForm, fecha_ingreso:e.target.value })} placeholder="Fecha ingreso" />
        <button type="submit">{editProfId ? 'Actualizar' : 'Crear'}</button>
        {editProfId && <button type="button" onClick={()=>{setEditProfId(null);setProfForm({ especialidad:'', user_id:'', fecha_ingreso:'' });}}>Cancelar</button>}
      </form>
      <table className="mt-1">
        <thead>
          <tr>
            <th>ID</th>
            <th>User RUT</th>
            <th>Especialidad</th>
            <th>Fecha ingreso</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {profesionales.map(p=> (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.user_id}</td>
              <td>{p.especialidad}</td>
              <td>{p.fecha_ingreso}</td>
              <td>
                <button onClick={()=>{setProfForm({ especialidad:p.especialidad, user_id:p.user_id, fecha_ingreso:p.fecha_ingreso });setEditProfId(p.id);}}>Editar</button>
                <button onClick={()=>eliminarProf(p.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-1">Historial de Segmentaciones</h2>
      <table className="mt-1">
        <thead>
          <tr>
            <th>ID</th>
            <th>Método</th>
            <th>Imagen ID</th>
            <th>Mascara</th>
          </tr>
        </thead>
        <tbody>
          {segs.map(s=> (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.metodo}</td>
              <td>{s.imagen_id}</td>
              <td>{s.imagen_id && (<img src={`${BACKEND_URL}/segmentaciones/${s.imagen_id}/mask`} alt="mask" width={64} height={64} />)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <LogoutButton />
    </div>
  );
}
