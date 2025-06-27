import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import LogoutButton from '../components/LogoutButton';

export default function Admin() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [msg, setMsg] = useState('');

  const [newUser, setNewUser] = useState({ nombre:'', correo:'', contra:'', rol:'paciente', rut:'' });
  const [delRut, setDelRut] = useState('');
  const [prof, setProf] = useState({ especialidad:'', user_rut:'', fecha_ingreso:'' });
  const [asig, setAsig] = useState({ paciente_rut:'', profesional_id:'' });

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) router.replace('/');
    else setToken(t);
  }, [router]);

  if (!token) return null;

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/users/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setMsg('Usuario creado');
    } catch (err) {
      setMsg('Error al crear');
    }
  };

  const handleDeleteUser = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: delRut })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setMsg('Usuario eliminado');
    } catch (err) {
      setMsg('Error al eliminar');
    }
  };

  const handleCreateProf = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/profesionales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          especialidad: prof.especialidad,
          user_id: prof.user_rut,
          fecha_ingreso: prof.fecha_ingreso
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setMsg('Profesional creado');
    } catch (err) {
      setMsg('Error al crear profesional');
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      const pac = await apiFetch('/pacientes/buscar-rut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut: asig.paciente_rut })
      });
      const pacJson = await pac.json();
      if (!pac.ok) throw new Error('Paciente no encontrado');

      const res = await apiFetch('/pacientes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pacJson.id, profesional_id: asig.profesional_id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setMsg('Paciente asignado');
    } catch (err) {
      setMsg('Error al asignar');
    }
  };

  return (
    <div className="container">
      <h1>Panel Administrador</h1>
      <form onSubmit={handleCreateUser} className="mt-1">
        <h2>Crear Usuario</h2>
        <input placeholder="RUT" value={newUser.rut} onChange={e=>setNewUser({ ...newUser, rut:e.target.value })} />
        <input placeholder="Nombre" value={newUser.nombre} onChange={e=>setNewUser({ ...newUser, nombre:e.target.value })} />
        <input placeholder="Correo" value={newUser.correo} onChange={e=>setNewUser({ ...newUser, correo:e.target.value })} />
        <input type="password" placeholder="Contraseña" value={newUser.contra} onChange={e=>setNewUser({ ...newUser, contra:e.target.value })} />
        <select value={newUser.rol} onChange={e=>setNewUser({ ...newUser, rol:e.target.value })}>
          <option value="paciente">Paciente</option>
          <option value="doctor">Doctor</option>
          <option value="enfermera">Enfermera</option>
          <option value="admin">Admin</option>
          <option value="investigador">Investigador</option>
        </select>
        <button type="submit">Crear</button>
      </form>

      <form onSubmit={handleDeleteUser} className="mt-1">
        <h2>Eliminar Usuario</h2>
        <input placeholder="RUT" value={delRut} onChange={e=>setDelRut(e.target.value)} />
        <button type="submit">Eliminar</button>
      </form>

      <form onSubmit={handleCreateProf} className="mt-1">
        <h2>Crear Profesional</h2>
        <input placeholder="RUT usuario" value={prof.user_rut} onChange={e=>setProf({ ...prof, user_rut:e.target.value })} />
        <input placeholder="Especialidad" value={prof.especialidad} onChange={e=>setProf({ ...prof, especialidad:e.target.value })} />
        <input placeholder="Fecha ingreso" value={prof.fecha_ingreso} onChange={e=>setProf({ ...prof, fecha_ingreso:e.target.value })} />
        <button type="submit">Crear</button>
      </form>

      <form onSubmit={handleAssign} className="mt-1">
        <h2>Asignar Paciente a Profesional</h2>
        <input placeholder="RUT paciente" value={asig.paciente_rut} onChange={e=>setAsig({ ...asig, paciente_rut:e.target.value })} />
        <input placeholder="ID profesional" value={asig.profesional_id} onChange={e=>setAsig({ ...asig, profesional_id:e.target.value })} />
        <button type="submit">Asignar</button>
      </form>

      {msg && <p>{msg}</p>}
      <LogoutButton />
    </div>
  );
}
