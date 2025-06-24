import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import LogoutButton from '../components/LogoutButton';

export default function ProfesionalPacientes() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [imagenes, setImagenes] = useState([]);

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
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [router]);

  const seleccionar = async (p) => {
    setSeleccionado(p);
    const res = await apiFetch(`/imagenes/paciente/${p.id}`);
    const imgs = await res.json();
    setImagenes(imgs);
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
      setImagenes([...imagenes, json.imagen]);
    }
  };

  const reemplazarImagen = async (imgId, file) => {
    const formData = new FormData();
    formData.append('imagen', file);
    const res = await apiFetch(`/imagenes/${imgId}/archivo`, { method: 'PUT', body: formData });
    const json = await res.json();
    if (res.ok) {
      setImagenes(imagenes.map(i => i.id === imgId ? json.imagen : i));
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
      <table className="mt-1" border="1" cellPadding="5">
        <thead>
          <tr>
            <th>RUT</th>
            <th>Nombre</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map(p => (
            <tr key={p.id} onClick={() => seleccionar(p)} style={{cursor:'pointer'}}>
              <td>{p.user?.rut}</td>
              <td>{p.user?.nombre}</td>
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
          <div className="mt-1" style={{display:'flex', flexWrap:'wrap', gap:'1rem'}}>
            {imagenes.map(img => (
              <div key={img.id}>
                <img src={`${BACKEND_URL}/imagenes/${img.id}/archivo`} alt="img" width={128} height={128} />
                <input type="file" onChange={e => reemplazarImagen(img.id, e.target.files[0])} />
              </div>
            ))}
          </div>
        </div>
      )}
      <LogoutButton />
    </div>
  );
}
