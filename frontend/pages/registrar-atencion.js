import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import { formatRUT, RUTInput, validateRUT } from '../lib/rut';
import Layout from '../components/Layout';
import LogoutButton from '../components/LogoutButton';

export default function RegistrarAtencion() {
    const router = useRouter();
    const [token, setToken] = useState(null);
    const [rut, setRut] = useState('');
    const [paciente, setPaciente] = useState(null);
    const [profId, setProfId] = useState(null);
    const [pacientesAtendidos, setPacientesAtendidos] = useState([]);
    const [cargandoLista, setCargandoLista] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const searchTimeout = useRef(null);

    // Estados para crear nuevo paciente
    const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
    const [nuevoRut, setNuevoRut] = useState('');
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoCorreo, setNuevoCorreo] = useState('');
    const [nuevoSexo, setNuevoSexo] = useState('M');
    const [nuevaFechaNac, setNuevaFechaNac] = useState('');
    const [creandoPaciente, setCreandoPaciente] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('token');
        if (!stored) {
            router.replace('/');
            return;
        }
        setToken(stored);
        async function fetchProf() {
            try {
                const res = await apiFetch('/profesionales/me');
                const json = await res.json();
                if (res.ok) setProfId(json.id);
            } catch (e) {
                console.error(e);
            }
        }
        fetchProf();
    }, [router]);

    // Cargar pacientes previamente atendidos por el profesional
    useEffect(() => {
        if (!profId) return;
        let cancelado = false;
        async function fetchPacientesAtendidos() {
            setCargandoLista(true);
            try {
                const res = await apiFetch('/profesionales/mis-pacientes');
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Error');

                // Transformar la respuesta al formato esperado
                const pacientes = data.pacientes.map((item) => ({
                    id: item.paciente.id,
                    sexo: item.paciente.sexo,
                    fecha_ingreso: item.paciente.fecha_nacimiento,
                    user: {
                        rut: item.paciente.rut,
                        nombre: item.paciente.nombre,
                        correo: item.paciente.correo,
                    },
                    fecha_atencion: item.fecha_atencion,
                }));

                if (!cancelado)
                    setPacientesAtendidos(
                        Array.isArray(pacientes) ? pacientes : []
                    );
            } catch (e) {
                if (!cancelado) setPacientesAtendidos([]);
                console.error(e);
            } finally {
                if (!cancelado) setCargandoLista(false);
            }
        }
        fetchPacientesAtendidos();
        return () => {
            cancelado = true;
        };
    }, [profId]);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!rut) {
            setPaciente(null);
            return;
        }
        searchTimeout.current = setTimeout(() => {
            buscar();
        }, 500);
        return () => clearTimeout(searchTimeout.current);
    }, [rut]);

    const buscar = async () => {
        setError('');
        setPaciente(null);
        setExito('');
        try {
            const res = await apiFetch('/pacientes/buscar-rut', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rut }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error');
            setPaciente(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const confirmar = async () => {
        if (!paciente || !profId) return;
        try {
            const res = await apiFetch('/atenciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paciente_id: paciente.id,
                    profesional_id: profId,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Error');
            setExito('Atención registrada');
            router.push('/profesional');
        } catch (err) {
            setError(err.message);
        }
    };

    const crearNuevoPaciente = async () => {
        setError('');
        setExito('');

        // Validaciones mínimas para un único flujo "Agregar paciente"
        if (
            !nuevoRut ||
            !nuevoNombre ||
            !nuevoCorreo ||
            !nuevaFechaNac ||
            !nuevoSexo
        ) {
            setError('Todos los campos son obligatorios');
            return;
        }

        setCreandoPaciente(true);

        try {
            const res = await apiFetch('/pacientes/agregar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rut: nuevoRut,
                    nombre: nuevoNombre,
                    correo: nuevoCorreo,
                    contra: nuevoRut, // contraseña inicial = RUT
                    sexo: nuevoSexo,
                    fecha_nacimiento: nuevaFechaNac,
                    profesional_id: profId,
                }),
            });

            const json = await res.json();
            if (!res.ok)
                throw new Error(json.message || 'Error al agregar paciente');

            setExito('Paciente creado y atención registrada exitosamente');

            // Limpiar formulario
            setNuevoRut('');
            setNuevoNombre('');
            setNuevoCorreo('');
            setNuevoSexo('M');
            setNuevaFechaNac('');
            setMostrarFormNuevo(false);

            // Redirigir al panel
            setTimeout(() => {
                router.push('/profesional');
            }, 1200);
        } catch (err) {
            setError(err.message);
        } finally {
            setCreandoPaciente(false);
        }
    };

    if (!token) return null;

    return (
        <Layout
            subtitle='Registrar Atención'
            actions={
                <>
                    <button
                        onClick={() => router.push('/profesional')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            transition: 'background-color 0.2s',
                            marginRight: '8px',
                        }}
                        onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = '#2563eb')
                        }
                        onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = '#3b82f6')
                        }
                    >
                        ← Volver al Panel
                    </button>
                    <LogoutButton />
                </>
            }
        >
            <div className='card'>
                <div className='section-title'>Buscar paciente por RUT</div>
                <RUTInput
                    value={rut}
                    onChange={setRut}
                    placeholder='Buscar por RUT (ej: 12.345.678-9)'
                />
                <button onClick={buscar}>Buscar</button>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {paciente && (
                    <div className='mt-1'>
                        <p>
                            <strong>Nombre:</strong> {paciente.user?.nombre}
                        </p>
                        <p>
                            <strong>RUT:</strong>{' '}
                            {formatRUT(paciente.user?.rut)}
                        </p>
                        <button onClick={confirmar}>Confirmar Atención</button>
                    </div>
                )}
                {exito && <p style={{ color: 'green' }}>{exito}</p>}
            </div>

            {/* Formulario para crear nuevo paciente */}
            <div className='card' style={{ marginTop: '1rem' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                    }}
                >
                    <div className='section-title' style={{ margin: 0 }}>
                        Crear nuevo paciente
                    </div>
                    <button
                        onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: mostrarFormNuevo
                                ? '#ef4444'
                                : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                        }}
                    >
                        {mostrarFormNuevo ? '✕ Cancelar' : '+ Nuevo paciente'}
                    </button>
                </div>

                {mostrarFormNuevo && (
                    <div
                        style={{
                            padding: '1rem',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                        }}
                    >
                        <div style={{ marginBottom: '1rem' }}>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: '600',
                                }}
                            >
                                RUT *
                            </label>
                            <RUTInput
                                value={nuevoRut}
                                onChange={setNuevoRut}
                                placeholder='12.345.678-9'
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: '600',
                                }}
                            >
                                Nombre completo *
                            </label>
                            <input
                                type='text'
                                value={nuevoNombre}
                                onChange={(e) => setNuevoNombre(e.target.value)}
                                placeholder='Juan Pérez González'
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: '600',
                                }}
                            >
                                Correo electrónico *
                            </label>
                            <input
                                type='email'
                                value={nuevoCorreo}
                                onChange={(e) => setNuevoCorreo(e.target.value)}
                                placeholder='correo@ejemplo.com'
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: '600',
                                }}
                            >
                                Sexo *
                            </label>
                            <select
                                value={nuevoSexo}
                                onChange={(e) => setNuevoSexo(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                <option value='M'>Masculino</option>
                                <option value='F'>Femenino</option>
                                <option value='O'>Otro</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: '600',
                                }}
                            >
                                Fecha de nacimiento *
                            </label>
                            <input
                                type='date'
                                value={nuevaFechaNac}
                                onChange={(e) =>
                                    setNuevaFechaNac(e.target.value)
                                }
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div
                            style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '1rem',
                                padding: '8px',
                                backgroundColor: '#eff6ff',
                                borderRadius: '4px',
                                border: '1px solid #bfdbfe',
                            }}
                        >
                            ℹ️ La contraseña inicial será el RUT del paciente.
                            Se registrará automáticamente la atención.
                        </div>

                        <button
                            onClick={crearNuevoPaciente}
                            disabled={
                                creandoPaciente ||
                                !validateRUT(nuevoRut) ||
                                !nuevoNombre ||
                                !nuevoCorreo ||
                                !nuevaFechaNac
                            }
                            style={{
                                padding: '10px 20px',
                                backgroundColor:
                                    creandoPaciente ||
                                    !validateRUT(nuevoRut) ||
                                    !nuevoNombre ||
                                    !nuevoCorreo ||
                                    !nuevaFechaNac
                                        ? '#9ca3af'
                                        : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor:
                                    creandoPaciente ||
                                    !validateRUT(nuevoRut) ||
                                    !nuevoNombre ||
                                    !nuevoCorreo ||
                                    !nuevaFechaNac
                                        ? 'not-allowed'
                                        : 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                width: '100%',
                            }}
                        >
                            {creandoPaciente
                                ? '⏳ Creando paciente...'
                                : !validateRUT(nuevoRut)
                                ? 'RUT inválido'
                                : '✓ Crear paciente y registrar atención'}
                        </button>
                        {!validateRUT(nuevoRut) && nuevoRut && (
                            <div
                                style={{
                                    marginTop: '8px',
                                    color: '#ef4444',
                                    fontSize: '12px',
                                }}
                            >
                                Corrige el RUT para continuar.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className='card' style={{ marginTop: '1rem' }}>
                <div className='section-title'>Pacientes atendidos</div>
                {cargandoLista ? (
                    <p>Cargando...</p>
                ) : (
                    <>
                        {pacientesAtendidos.length === 0 ? (
                            <p style={{ color: '#666' }}>
                                No hay pacientes con consultas previas
                            </p>
                        ) : (
                            <ul
                                style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    margin: 0,
                                }}
                            >
                                {pacientesAtendidos.map((p) => (
                                    <li
                                        key={p.id}
                                        style={{
                                            padding: '0.75rem 0',
                                            borderBottom: '1px solid #eee',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div>
                                                <div
                                                    style={{ fontWeight: 600 }}
                                                >
                                                    {p.user?.nombre}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#666',
                                                    }}
                                                >
                                                    {formatRUT(p.user?.rut)}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#888',
                                                    }}
                                                >
                                                    Con atención registrada
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                <button
                                                    onClick={() =>
                                                        setPaciente(p)
                                                    }
                                                >
                                                    Seleccionar
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
