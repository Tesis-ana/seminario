import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { BACKEND_URL, apiFetch } from '../../lib/api';

const operaciones = {
  users: [
    { metodo: 'GET', ruta: '/users', descripcion: 'Listar users' },
    {
      metodo: 'POST',
      ruta: '/users/crear',
      descripcion: 'Crear user',
      campos: ['nombre', 'correo', 'contra', 'rol', 'rut']
    },
    {
      metodo: 'POST',
      ruta: '/users/buscar',
      descripcion: 'Buscar user',
      campos: ['id']
    },
    {
      metodo: 'PUT',
      ruta: '/users',
      descripcion: 'Actualizar user',
      campos: ['id', 'nombre', 'correo', 'contra', 'rol', 'rut']
    },
    { metodo: 'DELETE', ruta: '/users', descripcion: 'Eliminar user', campos: ['id'] },
    {
      metodo: 'POST',
      ruta: '/users/login',
      descripcion: 'Login user',
      campos: ['correo', 'contra']
    }
  ],
  pacientes: [
    { metodo: 'GET', ruta: '/pacientes', descripcion: 'Listar pacientes' },
    {
      metodo: 'POST',
      ruta: '/pacientes',
      descripcion: 'Crear paciente',
      campos: ['sexo', 'fecha_ingreso', 'comentarios', 'user_id', 'profesional_id']
    },
    {
      metodo: 'POST',
      ruta: '/pacientes/buscar',
      descripcion: 'Buscar paciente',
      campos: ['id']
    },
    {
      metodo: 'PUT',
      ruta: '/pacientes',
      descripcion: 'Actualizar paciente',
      campos: ['id', 'sexo', 'fecha_ingreso', 'comentarios', 'user_id', 'profesional_id']
    },
    { metodo: 'DELETE', ruta: '/pacientes', descripcion: 'Eliminar paciente', campos: ['id'] }
  ],
  profesionales: [
    { metodo: 'GET', ruta: '/profesionales', descripcion: 'Listar profesionales' },
    {
      metodo: 'POST',
      ruta: '/profesionales',
      descripcion: 'Crear profesional',
      campos: ['especialidad', 'user_id', 'fecha_ingreso']
    },
    {
      metodo: 'POST',
      ruta: '/profesionales/buscar',
      descripcion: 'Buscar profesional',
      campos: ['id']
    },
    {
      metodo: 'PUT',
      ruta: '/profesionales',
      descripcion: 'Actualizar profesional',
      campos: ['id', 'especialidad', 'user_id', 'fecha_ingreso']
    },
    { metodo: 'DELETE', ruta: '/profesionales', descripcion: 'Eliminar profesional', campos: ['id'] }
  ],
  imagenes: [
    { metodo: 'GET', ruta: '/imagenes', descripcion: 'Listar imagenes' },
    {
      metodo: 'POST',
      ruta: '/imagenes',
      descripcion: 'Crear imagen',
      campos: ['nombre_archivo', 'fecha_captura', 'ruta_archivo', 'paciente_id']
    },
    {
      metodo: 'POST',
      ruta: '/imagenes/buscar',
      descripcion: 'Buscar imagen',
      campos: ['id']
    },
    {
      metodo: 'PUT',
      ruta: '/imagenes',
      descripcion: 'Actualizar imagen',
      campos: ['id', 'nombre_archivo', 'fecha_captura', 'ruta_archivo', 'paciente_id']
    },
    { metodo: 'DELETE', ruta: '/imagenes', descripcion: 'Eliminar imagen', campos: ['id'] }
  ],
  segmentaciones: [
    { metodo: 'GET', ruta: '/segmentaciones', descripcion: 'Listar segmentaciones' },
    {
      metodo: 'POST',
      ruta: '/segmentaciones',
      descripcion: 'Crear segmentacion',
      campos: ['metodo', 'ruta_mascara', 'fecha_creacion', 'imagen_id']
    },
    {
      metodo: 'POST',
      ruta: '/segmentaciones/buscar',
      descripcion: 'Buscar segmentacion',
      campos: ['id']
    },
    {
      metodo: 'PUT',
      ruta: '/segmentaciones',
      descripcion: 'Actualizar segmentacion',
      campos: ['id', 'metodo', 'ruta_mascara', 'fecha_creacion', 'imagen_id']
    },
    { metodo: 'DELETE', ruta: '/segmentaciones', descripcion: 'Eliminar segmentacion', campos: ['id'] }
  ],
  pwatscore: [
    { metodo: 'GET', ruta: '/pwatscore', descripcion: 'Listar pwatscore' },
    {
      metodo: 'POST',
      ruta: '/pwatscore',
      descripcion: 'Crear pwatscore',
      campos: ['evaluador', 'categorias', 'fecha_evaluacion', 'observaciones', 'imagen_id', 'segmentacion_id']
    },
    {
      metodo: 'POST',
      ruta: '/pwatscore/buscar',
      descripcion: 'Buscar pwatscore',
      campos: ['id']
    },
    {
      metodo: 'PUT',
      ruta: '/pwatscore',
      descripcion: 'Actualizar pwatscore',
      campos: ['id', 'evaluador', 'categorias', 'fecha_evaluacion', 'observaciones', 'imagen_id', 'segmentacion_id']
    },
    { metodo: 'DELETE', ruta: '/pwatscore', descripcion: 'Eliminar pwatscore', campos: ['id'] },
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
        const res = await apiFetch(`/${tipo}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('Error al obtener datos');
      }
    };
    fetchData();
  }, [router, tipo]);

  const ejecutarConsulta = async (op, body = null) => {
    try {
      const opciones = {
        method: op.metodo,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (body && ['POST', 'PUT', 'DELETE'].includes(op.metodo)) {
        opciones.body = JSON.stringify(body);
      }

      const res = await apiFetch(op.ruta, opciones);
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
                <form onSubmit={e => { e.preventDefault(); ejecutarConsulta(op, bodies[idx]); }}>
                  <div>
                    <code>{op.metodo} {op.ruta}</code> - {op.descripcion}
                  </div>
                  {op.campos && op.campos.map(campo => (
                    campo === 'categorias' ? (
                      <textarea
                        key={campo}
                        rows={3}
                        style={{ width: '100%', display:'block', marginBottom:'0.5rem' }}
                        placeholder={campo}
                        value={bodies[idx]?.[campo] || ''}
                        onChange={e => setBodies({ ...bodies, [idx]: { ...bodies[idx], [campo]: e.target.value } })}
                      />
                    ) : (
                      <input
                        key={campo}
                        type="text"
                        placeholder={campo}
                        style={{ display:'block', marginBottom:'0.5rem' }}
                        value={bodies[idx]?.[campo] || ''}
                        onChange={e => setBodies({ ...bodies, [idx]: { ...bodies[idx], [campo]: e.target.value } })}
                      />
                    )
                  ))}
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