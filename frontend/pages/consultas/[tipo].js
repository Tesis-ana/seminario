import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { BACKEND_URL } from '../../lib/api';

const operaciones = {
  pacientes: [
    { metodo: 'GET', ruta: '/pacientes', descripcion: 'Listar pacientes' },
    { metodo: 'POST', ruta: '/pacientes', descripcion: 'Crear paciente' },
    { metodo: 'POST', ruta: '/pacientes/buscar', descripcion: 'Buscar paciente' },
    { metodo: 'PUT', ruta: '/pacientes', descripcion: 'Actualizar paciente' },
    { metodo: 'DELETE', ruta: '/pacientes', descripcion: 'Eliminar paciente' }
  ],
  profesionales: [
    { metodo: 'GET', ruta: '/profesionales', descripcion: 'Listar profesionales' },
    { metodo: 'POST', ruta: '/profesionales', descripcion: 'Crear profesional' },
    { metodo: 'POST', ruta: '/profesionales/buscar', descripcion: 'Buscar profesional' },
    { metodo: 'PUT', ruta: '/profesionales', descripcion: 'Actualizar profesional' },
    { metodo: 'DELETE', ruta: '/profesionales', descripcion: 'Eliminar profesional' }
  ],
  imagenes: [
    { metodo: 'GET', ruta: '/imagenes', descripcion: 'Listar imagenes' },
    { metodo: 'POST', ruta: '/imagenes', descripcion: 'Crear imagen' },
    { metodo: 'POST', ruta: '/imagenes/buscar', descripcion: 'Buscar imagen' },
    { metodo: 'PUT', ruta: '/imagenes', descripcion: 'Actualizar imagen' },
    { metodo: 'DELETE', ruta: '/imagenes', descripcion: 'Eliminar imagen' }
  ],
  segmentaciones: [
    { metodo: 'GET', ruta: '/segmentaciones', descripcion: 'Listar segmentaciones' },
    { metodo: 'POST', ruta: '/segmentaciones', descripcion: 'Crear segmentacion' },
    { metodo: 'POST', ruta: '/segmentaciones/buscar', descripcion: 'Buscar segmentacion' },
    { metodo: 'PUT', ruta: '/segmentaciones', descripcion: 'Actualizar segmentacion' },
    { metodo: 'DELETE', ruta: '/segmentaciones', descripcion: 'Eliminar segmentacion' }
  ],
  pwatscore: [
    { metodo: 'GET', ruta: '/pwatscore', descripcion: 'Listar pwatscore' },
    { metodo: 'POST', ruta: '/pwatscore', descripcion: 'Crear pwatscore' },
    { metodo: 'POST', ruta: '/pwatscore/buscar', descripcion: 'Buscar pwatscore' },
    { metodo: 'PUT', ruta: '/pwatscore', descripcion: 'Actualizar pwatscore' },
    { metodo: 'DELETE', ruta: '/pwatscore', descripcion: 'Eliminar pwatscore' },
    { metodo: 'GET', ruta: '/pwatscore/run-python', descripcion: 'Ejecutar script de categorizador' }
  ]
};

export default function ConsultaTipo() {
  const router = useRouter();
  const { tipo } = router.query;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [bodies, setBodies] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return;
    }
    if (!tipo) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/${tipo}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('Error al obtener datos');
      }
    };
    fetchData();
  }, [router, tipo]);

  const ejecutarConsulta = async (op, body = '') => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token no encontrado');
      return;
    }

    try {
      const opciones = {
        method: op.metodo,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (body && ['POST', 'PUT', 'DELETE'].includes(op.metodo)) {
        opciones.body = body;
      }

      const res = await fetch(`${BACKEND_URL}${op.ruta}`, opciones);
      const json = await res.json();
      setData(json);
      setError('');
    } catch (err) {
      setError('Error al ejecutar la consulta');
    }
  };

  if (error) return <p style={{color:'red'}}>{error}</p>;
  if (!data) return <p>Cargando...</p>;

  return (
    <div>
      <h1>{tipo}</h1>
      {operaciones[tipo] && (
        <>
          <h2>Consultas disponibles</h2>
          <ul>
            {operaciones[tipo].map((op, idx) => (
              <li key={idx} style={{marginBottom:'1rem'}}>
                <form onSubmit={(e) => {e.preventDefault(); ejecutarConsulta(op, bodies[idx]);}}>
                  <div>
                    <code>{op.metodo} {op.ruta}</code> - {op.descripcion}
                  </div>
                  {['POST','PUT','DELETE'].includes(op.metodo) && (
                    <textarea
                      rows={3}
                      style={{width:'100%'}}
                      placeholder="{ }"
                      value={bodies[idx] || ''}
                      onChange={(e) => setBodies({...bodies, [idx]: e.target.value})}
                    />
                  )}
                  <button type="submit">Ejecutar</button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
