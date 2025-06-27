import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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

  const handleCreateUser = (e) => {
    e.preventDefault();
    setMsg('Usuario creado (simulado)');
  };

  const handleDeleteUser = (e) => {
    e.preventDefault();
    setMsg('Usuario eliminado (simulado)');
  };

  const handleCreateProf = (e) => {
    e.preventDefault();
    setMsg('Profesional creado (simulado)');
  };

  const handleAssign = (e) => {
    e.preventDefault();
    setMsg('Paciente asignado (simulado)');
  };

  return (
    <div className="container fantasy">
      <h1>👑 Panel Administrador</h1>
      <form onSubmit={handleCreateUser} className="mt-1">
        <h2>✏️ Crear Usuario</h2>
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
        <h2>🗑️ Eliminar Usuario</h2>
        <input placeholder="RUT" value={delRut} onChange={e=>setDelRut(e.target.value)} />
        <button type="submit">Eliminar</button>
      </form>

      <form onSubmit={handleCreateProf} className="mt-1">
        <h2>🩺 Crear Profesional</h2>
        <input placeholder="RUT usuario" value={prof.user_rut} onChange={e=>setProf({ ...prof, user_rut:e.target.value })} />
        <input placeholder="Especialidad" value={prof.especialidad} onChange={e=>setProf({ ...prof, especialidad:e.target.value })} />
        <input placeholder="Fecha ingreso" value={prof.fecha_ingreso} onChange={e=>setProf({ ...prof, fecha_ingreso:e.target.value })} />
        <button type="submit">Crear</button>
      </form>

      <form onSubmit={handleAssign} className="mt-1">
        <h2>🔗 Asignar Paciente a Profesional</h2>
        <input placeholder="RUT paciente" value={asig.paciente_rut} onChange={e=>setAsig({ ...asig, paciente_rut:e.target.value })} />
        <input placeholder="ID profesional" value={asig.profesional_id} onChange={e=>setAsig({ ...asig, profesional_id:e.target.value })} />
        <button type="submit">Asignar</button>
      </form>

      {msg && <p className="mt-1">{msg}</p>}
      <LogoutButton />
    </div>
  );
}
