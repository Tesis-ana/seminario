import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import { formatRUT, RUTInput } from '../lib/rut';
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

    if (!token) return null;

    return (
        <Layout subtitle='Registrar Atención' actions={<LogoutButton />}>
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
