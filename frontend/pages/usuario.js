import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import LogoutButton from '../components/LogoutButton';

export default function Usuario() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/'); return; }
    setUser({ nombre: 'Paciente', correo: 'paciente@example.com' });
    setImagenes([
      { id: 1, fecha: '2025-01-01' },
      { id: 2, fecha: '2025-02-15' },
    ]);
    setLoading(false);
  }, [router]);

  if (loading) return <p>Cargando...</p>;

  const guardar = () => {
    setMsg('Datos actualizados (simulado)');
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
            <th>Fecha de captura</th>
          </tr>
        </thead>
        <tbody>
          {imagenes.map((img) => (
            <tr key={img.id}>
              <td>{img.id}</td>
              <td>{img.fecha}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <LogoutButton />
    </div>
  );
}
