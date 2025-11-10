import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import Layout from '../components/Layout';
import LogoutButton from '../components/LogoutButton';
import dynamic from 'next/dynamic';

// Importar gráficos dinámicamente para evitar problemas de SSR
const LineChart = dynamic(
    () => import('recharts').then((mod) => mod.LineChart),
    { ssr: false }
);
const Line = dynamic(() => import('recharts').then((mod) => mod.Line), {
    ssr: false,
});
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), {
    ssr: false,
});
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), {
    ssr: false,
});
const CartesianGrid = dynamic(
    () => import('recharts').then((mod) => mod.CartesianGrid),
    { ssr: false }
);
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), {
    ssr: false,
});
const Legend = dynamic(() => import('recharts').then((mod) => mod.Legend), {
    ssr: false,
});
const ResponsiveContainer = dynamic(
    () => import('recharts').then((mod) => mod.ResponsiveContainer),
    { ssr: false }
);

export default function Laboratorio() {
    const router = useRouter();
    const [token, setToken] = useState(null);
    const [pacientes, setPacientes] = useState([]);
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
    const [laboratorios, setLaboratorios] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [editando, setEditando] = useState(null);
    const [mostrarGraficos, setMostrarGraficos] = useState(false);
    const [cargandoLaboratorios, setCargandoLaboratorios] = useState(false);

    // Campos del formulario
    const [formData, setFormData] = useState({
        hba1c: '',
        glucosa: '',
        creatinina: '',
        colesterol: '',
        trigliceridos: '',
        microalbuminuria: '',
    });

    useEffect(() => {
        const stored = localStorage.getItem('token');
        if (!stored) {
            router.replace('/');
            return;
        }
        setToken(stored);
        cargarPacientes();
    }, [router]);

    const cargarPacientes = async () => {
        try {
            const res = await apiFetch('/pacientes');
            const data = await res.json();
            if (res.ok) {
                setPacientes(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error al cargar pacientes:', err);
        }
    };

    const seleccionarPaciente = async (paciente) => {
        setPacienteSeleccionado(paciente);
        setMostrarFormulario(false);
        setEditando(null);
        limpiarFormulario();
        setCargandoLaboratorios(true);

        try {
            const res = await apiFetch(`/laboratorios/paciente/${paciente.id}`);
            const data = await res.json();
            if (res.ok) {
                setLaboratorios(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error al cargar laboratorios:', err);
            setLaboratorios([]);
        } finally {
            setCargandoLaboratorios(false);
        }
    };

    const limpiarFormulario = () => {
        setFormData({
            hba1c: '',
            glucosa: '',
            creatinina: '',
            colesterol: '',
            trigliceridos: '',
            microalbuminuria: '',
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!pacienteSeleccionado) {
            alert('Selecciona un paciente primero');
            return;
        }

        try {
            const payload = {
                paciente_id: pacienteSeleccionado.id,
                hba1c: formData.hba1c ? parseFloat(formData.hba1c) : null,
                glucosa: formData.glucosa ? parseFloat(formData.glucosa) : null,
                creatinina: formData.creatinina
                    ? parseFloat(formData.creatinina)
                    : null,
                colesterol: formData.colesterol
                    ? parseFloat(formData.colesterol)
                    : null,
                trigliceridos: formData.trigliceridos
                    ? parseFloat(formData.trigliceridos)
                    : null,
                microalbuminuria: formData.microalbuminuria
                    ? parseFloat(formData.microalbuminuria)
                    : null,
            };

            if (editando) {
                payload.id = editando.id;
                console.log('📝 Actualizando laboratorio:', payload);
                const res = await apiFetch('/laboratorios', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (res.ok) {
                    alert('Laboratorio actualizado correctamente');
                    seleccionarPaciente(pacienteSeleccionado);
                } else {
                    const error = await res.json();
                    console.error('❌ Error al actualizar:', error);
                    alert('Error: ' + error.message);
                }
            } else {
                console.log('➕ Creando nuevo laboratorio:', payload);
                const res = await apiFetch('/laboratorios', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (res.ok) {
                    alert('Laboratorio registrado correctamente');
                    seleccionarPaciente(pacienteSeleccionado);
                } else {
                    const error = await res.json();
                    console.error('❌ Error al crear:', error);
                    alert('Error: ' + error.message);
                }
            }

            limpiarFormulario();
            setMostrarFormulario(false);
            setEditando(null);
        } catch (err) {
            console.error('Error al guardar laboratorio:', err);
            alert('Error al guardar el registro');
        }
    };

    const editarLaboratorio = (lab) => {
        setEditando(lab);
        setFormData({
            hba1c: lab.hba1c || '',
            glucosa: lab.glucosa || '',
            creatinina: lab.creatinina || '',
            colesterol: lab.colesterol || '',
            trigliceridos: lab.trigliceridos || '',
            microalbuminuria: lab.microalbuminuria || '',
        });
        setMostrarFormulario(true);
    };

    const eliminarLaboratorio = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;

        try {
            const res = await apiFetch('/laboratorios', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (res.ok) {
                alert('Registro eliminado');
                seleccionarPaciente(pacienteSeleccionado);
            }
        } catch (err) {
            console.error('Error al eliminar:', err);
        }
    };

    const pacientesFiltrados = pacientes.filter((p) => {
        if (!filtro) return true;
        const nombre = (p.user?.nombre || '').toLowerCase();
        const rut = (p.user?.rut || p.user_id || '').toLowerCase();
        return (
            nombre.includes(filtro.toLowerCase()) ||
            rut.includes(filtro.toLowerCase())
        );
    });

    // Preparar datos para gráficos
    const prepararDatosGraficos = () => {
        if (!laboratorios.length) return [];

        return laboratorios
            .slice()
            .reverse()
            .map((lab, index) => ({
                fecha: `Registro ${index + 1}`,
                HbA1c: lab.hba1c || null,
                Glucosa: lab.glucosa || null,
                Creatinina: lab.creatinina || null,
                Colesterol: lab.colesterol || null,
                Triglicéridos: lab.trigliceridos || null,
                Microalbuminuria: lab.microalbuminuria || null,
            }));
    };

    // Exportar a PDF
    const exportarPDF = async () => {
        if (!pacienteSeleccionado || !laboratorios.length) {
            alert('Selecciona un paciente con registros');
            return;
        }

        try {
            console.log('📄 Generando PDF...');
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;

            const doc = new jsPDF();

            // Título
            doc.setFontSize(16);
            doc.text('Registros de Laboratorio', 14, 15);

            // Info del paciente
            doc.setFontSize(12);
            doc.text(`Paciente: ${pacienteSeleccionado.user?.nombre}`, 14, 25);
            doc.text(`RUT: ${pacienteSeleccionado.user?.rut}`, 14, 32);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 39);

            // Tabla
            const headers = [
                [
                    'Registro',
                    'HbA1c',
                    'Glucosa',
                    'Creatinina',
                    'Colesterol',
                    'Triglicéridos',
                    'Microalb.',
                ],
            ];
            const data = laboratorios.map((lab) => [
                `#${lab.id}`,
                lab.hba1c ? lab.hba1c.toFixed(2) : '-',
                lab.glucosa ? lab.glucosa.toFixed(1) : '-',
                lab.creatinina ? lab.creatinina.toFixed(2) : '-',
                lab.colesterol ? lab.colesterol.toFixed(1) : '-',
                lab.trigliceridos ? lab.trigliceridos.toFixed(1) : '-',
                lab.microalbuminuria ? lab.microalbuminuria.toFixed(1) : '-',
            ]);

            autoTable(doc, {
                head: headers,
                body: data,
                startY: 45,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [59, 130, 246] },
            });

            const filename = `laboratorio_${
                pacienteSeleccionado.user?.rut
            }_${Date.now()}.pdf`;
            doc.save(filename);
            console.log('✅ PDF generado:', filename);
        } catch (err) {
            console.error('❌ Error al generar PDF:', err);
            alert('Error al generar el PDF: ' + err.message);
        }
    };

    // Exportar a Excel
    const exportarExcel = async () => {
        if (!pacienteSeleccionado || !laboratorios.length) {
            alert('Selecciona un paciente con registros');
            return;
        }

        try {
            console.log('📊 Generando Excel...');
            const XLSX = await import('xlsx');

            const data = laboratorios.map((lab) => ({
                Registro: `#${lab.id}`,
                'HbA1c (%)': lab.hba1c || '',
                'Glucosa (mg/dL)': lab.glucosa || '',
                'Creatinina (mg/dL)': lab.creatinina || '',
                'Colesterol (mg/dL)': lab.colesterol || '',
                'Triglicéridos (mg/dL)': lab.trigliceridos || '',
                'Microalbuminuria (mg/L)': lab.microalbuminuria || '',
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Laboratorios');

            const filename = `laboratorio_${
                pacienteSeleccionado.user?.rut
            }_${Date.now()}.xlsx`;
            XLSX.writeFile(wb, filename);
            console.log('✅ Excel generado:', filename);
        } catch (err) {
            console.error('❌ Error al generar Excel:', err);
            alert('Error al generar el Excel: ' + err.message);
        }
    };

    if (!token) return null;

    return (
        <Layout
            subtitle='Registros de Laboratorio'
            actions={
                <>
                    <button
                        onClick={() => {
                            if (
                                typeof window !== 'undefined' &&
                                window.history.length > 1
                            ) {
                                router.back();
                            } else {
                                // Fallback razonable al panel del profesional
                                router.push('/profesional');
                            }
                        }}
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
                    >
                        ← Volver al Panel
                    </button>
                    <LogoutButton />
                </>
            }
        >
            <div className='grid two'>
                {/* Panel de pacientes */}
                <div className='card'>
                    <div className='section-title'>Seleccionar Paciente</div>
                    <input
                        type='text'
                        placeholder='Buscar por nombre o RUT'
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                        style={{ marginBottom: '1rem' }}
                    />
                    <div className='table-wrapper'>
                        <table>
                            <thead>
                                <tr>
                                    <th>RUT</th>
                                    <th>Nombre</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pacientesFiltrados.map((p) => (
                                    <tr
                                        key={p.id}
                                        style={{
                                            backgroundColor:
                                                pacienteSeleccionado?.id ===
                                                p.id
                                                    ? '#e0f2fe'
                                                    : 'transparent',
                                        }}
                                    >
                                        <td>
                                            {p.user?.rut || p.user_id || ''}
                                        </td>
                                        <td>{p.user?.nombre || ''}</td>
                                        <td>
                                            <button
                                                onClick={() =>
                                                    seleccionarPaciente(p)
                                                }
                                            >
                                                Seleccionar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Panel de laboratorios */}
                <div className='card'>
                    {pacienteSeleccionado ? (
                        <>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1rem',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem',
                                }}
                            >
                                <div
                                    className='section-title'
                                    style={{ margin: 0 }}
                                >
                                    Laboratorios de{' '}
                                    {pacienteSeleccionado.user?.nombre}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <button
                                        onClick={() =>
                                            setMostrarGraficos(!mostrarGraficos)
                                        }
                                        disabled={laboratorios.length === 0}
                                        style={{
                                            backgroundColor:
                                                laboratorios.length === 0
                                                    ? '#9ca3af'
                                                    : mostrarGraficos
                                                    ? '#ef4444'
                                                    : '#6366f1',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            cursor:
                                                laboratorios.length === 0
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                        }}
                                    >
                                        {mostrarGraficos
                                            ? '📊 Ocultar gráficos'
                                            : '📊 Ver gráficos'}
                                    </button>
                                    <button
                                        onClick={exportarPDF}
                                        disabled={laboratorios.length === 0}
                                        style={{
                                            backgroundColor:
                                                laboratorios.length === 0
                                                    ? '#9ca3af'
                                                    : '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            cursor:
                                                laboratorios.length === 0
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                        }}
                                    >
                                        📄 PDF
                                    </button>
                                    <button
                                        onClick={exportarExcel}
                                        disabled={laboratorios.length === 0}
                                        style={{
                                            backgroundColor:
                                                laboratorios.length === 0
                                                    ? '#9ca3af'
                                                    : '#059669',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            cursor:
                                                laboratorios.length === 0
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                        }}
                                    >
                                        📊 Excel
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMostrarFormulario(
                                                !mostrarFormulario
                                            );
                                            setEditando(null);
                                            limpiarFormulario();
                                        }}
                                        style={{
                                            backgroundColor: mostrarFormulario
                                                ? '#ef4444'
                                                : '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                        }}
                                    >
                                        {mostrarFormulario
                                            ? '✕ Cancelar'
                                            : '+ Nuevo registro'}
                                    </button>
                                </div>
                            </div>

                            {mostrarFormulario && (
                                <form
                                    onSubmit={handleSubmit}
                                    style={{
                                        marginBottom: '1rem',
                                        padding: '1rem',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '8px',
                                    }}
                                >
                                    <div
                                        className='grid two'
                                        style={{ gap: '1rem' }}
                                    >
                                        <div>
                                            <label
                                                style={{
                                                    display: 'block',
                                                    marginBottom: '0.5rem',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                HbA1c (%)
                                            </label>
                                            <input
                                                type='number'
                                                step='0.01'
                                                value={formData.hba1c}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        hba1c: e.target.value,
                                                    })
                                                }
                                                placeholder='5.5'
                                            />
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: 'block',
                                                    marginBottom: '0.5rem',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                Glucosa (mg/dL)
                                            </label>
                                            <input
                                                type='number'
                                                step='0.01'
                                                value={formData.glucosa}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        glucosa: e.target.value,
                                                    })
                                                }
                                                placeholder='100'
                                            />
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: 'block',
                                                    marginBottom: '0.5rem',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                Creatinina (mg/dL)
                                            </label>
                                            <input
                                                type='number'
                                                step='0.01'
                                                value={formData.creatinina}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        creatinina:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder='1.0'
                                            />
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: 'block',
                                                    marginBottom: '0.5rem',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                Colesterol (mg/dL)
                                            </label>
                                            <input
                                                type='number'
                                                step='0.01'
                                                value={formData.colesterol}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        colesterol:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder='200'
                                            />
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: 'block',
                                                    marginBottom: '0.5rem',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                Triglicéridos (mg/dL)
                                            </label>
                                            <input
                                                type='number'
                                                step='0.01'
                                                value={formData.trigliceridos}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        trigliceridos:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder='150'
                                            />
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: 'block',
                                                    marginBottom: '0.5rem',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                Microalbuminuria (mg/L)
                                            </label>
                                            <input
                                                type='number'
                                                step='0.01'
                                                value={
                                                    formData.microalbuminuria
                                                }
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        microalbuminuria:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder='20'
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type='submit'
                                        style={{
                                            marginTop: '1rem',
                                            width: '100%',
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                        }}
                                    >
                                        {editando
                                            ? '💾 Actualizar registro'
                                            : '✓ Guardar registro'}
                                    </button>
                                </form>
                            )}

                            {/* Gráficos de evolución */}
                            {mostrarGraficos && laboratorios.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3
                                        style={{
                                            marginBottom: '1rem',
                                            color: '#374151',
                                        }}
                                    >
                                        Evolución de valores
                                    </h3>

                                    {/* Gráfico de HbA1c */}
                                    <div
                                        style={{
                                            marginBottom: '2rem',
                                            backgroundColor: '#f9fafb',
                                            padding: '1rem',
                                            borderRadius: '8px',
                                        }}
                                    >
                                        <h4
                                            style={{
                                                marginBottom: '1rem',
                                                fontSize: '14px',
                                                color: '#6b7280',
                                            }}
                                        >
                                            Hemoglobina Glicosilada (HbA1c)
                                        </h4>
                                        <ResponsiveContainer
                                            width='100%'
                                            height={250}
                                        >
                                            <LineChart
                                                data={prepararDatosGraficos()}
                                            >
                                                <CartesianGrid strokeDasharray='3 3' />
                                                <XAxis
                                                    dataKey='fecha'
                                                    style={{ fontSize: '12px' }}
                                                />
                                                <YAxis
                                                    style={{ fontSize: '12px' }}
                                                />
                                                <Tooltip />
                                                <Legend />
                                                <Line
                                                    type='monotone'
                                                    dataKey='HbA1c'
                                                    stroke='#ef4444'
                                                    strokeWidth={2}
                                                    name='HbA1c (%)'
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Gráfico de todos los valores en mg/dL y mg/L */}
                                    <div
                                        style={{
                                            backgroundColor: '#f9fafb',
                                            padding: '1rem',
                                            borderRadius: '8px',
                                        }}
                                    >
                                        <h4
                                            style={{
                                                marginBottom: '1rem',
                                                fontSize: '14px',
                                                color: '#6b7280',
                                            }}
                                        >
                                            Panel Metabólico Completo
                                        </h4>
                                        <ResponsiveContainer
                                            width='100%'
                                            height={300}
                                        >
                                            <LineChart
                                                data={prepararDatosGraficos()}
                                            >
                                                <CartesianGrid strokeDasharray='3 3' />
                                                <XAxis
                                                    dataKey='fecha'
                                                    style={{ fontSize: '12px' }}
                                                />
                                                <YAxis
                                                    style={{ fontSize: '12px' }}
                                                />
                                                <Tooltip />
                                                <Legend />
                                                <Line
                                                    type='monotone'
                                                    dataKey='Glucosa'
                                                    stroke='#f59e0b'
                                                    strokeWidth={2}
                                                    name='Glucosa (mg/dL)'
                                                />
                                                <Line
                                                    type='monotone'
                                                    dataKey='Creatinina'
                                                    stroke='#10b981'
                                                    strokeWidth={2}
                                                    name='Creatinina (mg/dL)'
                                                />
                                                <Line
                                                    type='monotone'
                                                    dataKey='Colesterol'
                                                    stroke='#3b82f6'
                                                    strokeWidth={2}
                                                    name='Colesterol (mg/dL)'
                                                />
                                                <Line
                                                    type='monotone'
                                                    dataKey='Triglicéridos'
                                                    stroke='#8b5cf6'
                                                    strokeWidth={2}
                                                    name='Triglicéridos (mg/dL)'
                                                />
                                                <Line
                                                    type='monotone'
                                                    dataKey='Microalbuminuria'
                                                    stroke='#06b6d4'
                                                    strokeWidth={2}
                                                    name='Microalbuminuria (mg/L)'
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            <div className='table-wrapper'>
                                {cargandoLaboratorios ? (
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            padding: '2rem',
                                            color: '#3b82f6',
                                        }}
                                    >
                                        <p>
                                            ⏳ Cargando resultados de
                                            laboratorio...
                                        </p>
                                    </div>
                                ) : laboratorios.length === 0 ? (
                                    <p
                                        style={{
                                            color: '#666',
                                            textAlign: 'center',
                                            padding: '2rem',
                                        }}
                                    >
                                        No hay registros de laboratorio para
                                        este paciente
                                    </p>
                                ) : (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>HbA1c</th>
                                                <th>Glucosa</th>
                                                <th>Creatinina</th>
                                                <th>Colesterol</th>
                                                <th>Triglicéridos</th>
                                                <th>Microalb.</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {laboratorios.map((lab) => (
                                                <tr key={lab.id}>
                                                    <td>#{lab.id}</td>
                                                    <td>
                                                        {lab.hba1c
                                                            ? lab.hba1c.toFixed(
                                                                  2
                                                              )
                                                            : '-'}
                                                    </td>
                                                    <td>
                                                        {lab.glucosa
                                                            ? lab.glucosa.toFixed(
                                                                  1
                                                              )
                                                            : '-'}
                                                    </td>
                                                    <td>
                                                        {lab.creatinina
                                                            ? lab.creatinina.toFixed(
                                                                  2
                                                              )
                                                            : '-'}
                                                    </td>
                                                    <td>
                                                        {lab.colesterol
                                                            ? lab.colesterol.toFixed(
                                                                  1
                                                              )
                                                            : '-'}
                                                    </td>
                                                    <td>
                                                        {lab.trigliceridos
                                                            ? lab.trigliceridos.toFixed(
                                                                  1
                                                              )
                                                            : '-'}
                                                    </td>
                                                    <td>
                                                        {lab.microalbuminuria
                                                            ? lab.microalbuminuria.toFixed(
                                                                  1
                                                              )
                                                            : '-'}
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() =>
                                                                editarLaboratorio(
                                                                    lab
                                                                )
                                                            }
                                                            style={{
                                                                marginRight:
                                                                    '0.5rem',
                                                            }}
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                eliminarLaboratorio(
                                                                    lab.id
                                                                )
                                                            }
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    ) : (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '3rem',
                                color: '#666',
                            }}
                        >
                            <p>
                                Selecciona un paciente para ver sus registros de
                                laboratorio
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
