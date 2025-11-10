import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import LogoutButton from '../components/LogoutButton';
import { CAT_INFO } from '../lib/categorias';
import Layout from '../components/Layout';
import EstadoBadge, {
    EstadoFilter,
    EstadoSelector,
} from '../components/EstadoBadge';
import { subirImagenes, validarImagenes } from '../lib/imageUpload';

// Utilidades fuera del componente para bajar complejidad cognitiva
const blendColors = (c1, c2, ratio) => {
    const hex = (c) => c.replace('#', '');
    const r1 = parseInt(hex(c1).substring(0, 2), 16);
    const g1 = parseInt(hex(c1).substring(2, 4), 16);
    const b1 = parseInt(hex(c1).substring(4, 6), 16);
    const r2 = parseInt(hex(c2).substring(0, 2), 16);
    const g2 = parseInt(hex(c2).substring(2, 4), 16);
    const b2 = parseInt(hex(c2).substring(4, 6), 16);
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    return `#${r.toString(16).padStart(2, '0')}${g
        .toString(16)
        .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const analyzeImages = (imgs, now) => {
    const isArray = Array.isArray(imgs);
    const count = isArray ? imgs.length : 0;
    if (!isArray || imgs.length === 0) {
        return { ultimo: null, recientes: 0, alerta: 1, count };
    }
    const latest = imgs
        .slice()
        .sort(
            (a, b) => new Date(b.fecha_captura) - new Date(a.fecha_captura)
        )[0];
    const ts = new Date(latest.fecha_captura).getTime();
    const isReciente = now - ts < 1000 * 60 * 60 * 24 * 30;
    return {
        ultimo: latest.fecha_captura,
        recientes: isReciente ? 1 : 0,
        alerta: isReciente ? 0 : 1,
        count,
    };
};

const computeFechasYStats = async (pacs) => {
    const now = Date.now();
    const fechas = {};
    let totalImgs = 0;
    let recientes = 0;
    let alerta = 0;
    await Promise.all(
        pacs.map(async (pa) => {
            try {
                const r = await apiFetch(`/imagenes/paciente/${pa.id}`);
                const imgs = await r.json();
                const info = analyzeImages(imgs, now);
                fechas[pa.id] = info.ultimo;
                totalImgs += info.count;
                recientes += info.recientes;
                alerta += info.alerta;
            } catch (e) {
                // Log and continue with safe defaults to avoid breaking stats aggregation
                console.error(
                    'Error al obtener imágenes del paciente',
                    pa?.id,
                    e
                );
                fechas[pa.id] = null;
                alerta += 1;
            }
        })
    );
    const total = pacs.length || 1;
    return {
        fechas,
        stats: {
            total: pacs.length,
            totalImgs,
            recientesPct: Math.round((recientes / total) * 100),
            alerta,
        },
    };
};

const riskLabelFromSum = (sum) => {
    if (sum == null) return '';
    if (sum >= 16) return 'Riesgo Alto';
    if (sum >= 8) return 'Riesgo Medio';
    return 'Riesgo Bajo';
};

const riskColorFromSum = (sum) => {
    if (sum == null) return 'gray';
    if (sum >= 16) return 'red';
    if (sum >= 8) return 'yellow';
    return 'green';
};

export default function ProfesionalPacientes() {
    const router = useRouter();
    const [pacientes, setPacientes] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [filtroEstado, setFiltroEstado] = useState(null); // Filtro por estado
    const [seleccionado, setSeleccionado] = useState(null);
    const [imagenes, setImagenes] = useState([]);
    const [ultimas, setUltimas] = useState({});
    const [userInfo, setUserInfo] = useState(null);
    const [profInfo, setProfInfo] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        totalImgs: 0,
        recientesPct: 0,
        alerta: 0,
    });
    const [uploading, setUploading] = useState(false); // Estado de carga

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.replace('/');
            return;
        }
        async function load() {
            try {
                const [userRes, profRes] = await Promise.all([
                    apiFetch('/users/me'),
                    apiFetch('/profesionales/me'),
                ]);
                if (userRes.ok) setUserInfo(await userRes.json());
                const prof = await profRes.json();
                if (!profRes.ok) throw new Error(prof.message || 'Error');
                setProfInfo(prof);

                // Usar el nuevo endpoint que retorna pacientes atendidos
                const resPacs = await apiFetch('/profesionales/mis-pacientes');
                const data = await resPacs.json();
                if (!resPacs.ok) throw new Error(data.message || 'Error');

                // Transformar la respuesta al formato esperado por el componente
                const pacs = data.pacientes.map((item) => ({
                    id: item.paciente.id,
                    sexo: item.paciente.sexo,
                    fecha_ingreso: item.paciente.fecha_nacimiento,
                    estado: item.paciente.estado || 'en_tratamiento', // Agregar estado
                    user: {
                        rut: item.paciente.rut,
                        nombre: item.paciente.nombre,
                        correo: item.paciente.correo,
                    },
                    fecha_atencion: item.fecha_atencion,
                }));

                setPacientes(pacs);
                const { fechas, stats } = await computeFechasYStats(pacs);
                setUltimas(fechas);
                setStats(stats);
            } catch (err) {
                console.error('Error al cargar panel profesional:', err);
            }
        }
        load();
    }, [router]);

    const seleccionar = async (p) => {
        setSeleccionado(p);
        try {
            const [imgRes, segRes, pwaRes] = await Promise.all([
                apiFetch(`/imagenes/paciente/${p.id}`),
                apiFetch('/segmentaciones'),
                apiFetch('/pwatscore'),
            ]);
            const imgs = await imgRes.json();
            const segs = await segRes.json();
            const pwas = await pwaRes.json();
            const data = imgs
                .map((img) => {
                    const seg = segs.find((s) => s.imagen_id === img.id);
                    const pwa = pwas.find((ps) => ps.imagen_id === img.id);
                    return { img, seg, pwa };
                })
                .sort(
                    (a, b) =>
                        new Date(b.img.fecha_captura) -
                        new Date(a.img.fecha_captura)
                );
            setImagenes(data);
            if (imgs.length > 0)
                setUltimas({ ...ultimas, [p.id]: data[0].img.fecha_captura });
        } catch (err) {
            console.error(err);
            setImagenes([]);
        }
    };

    const subirImagen = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !seleccionado) return;

        // Validar archivos
        const validacion = validarImagenes(files);
        if (!validacion.valid) {
            alert(validacion.error);
            e.target.value = '';
            return;
        }

        setUploading(true);

        try {
            // Usar siempre el endpoint múltiple (funciona para 1 o más imágenes)
            // El lado se asignará después en pwatscore.js
            const resultado = await subirImagenes(
                files,
                seleccionado.id,
                null // No pasar lado, se asignará después
            );

            if (resultado.success) {
                if (resultado.data.tipo === 'single') {
                    // Una imagen subida con lado especificado
                    setImagenes([
                        { img: resultado.data.imagen, seg: null, pwa: null },
                        ...imagenes,
                    ]);
                    setUltimas({
                        ...ultimas,
                        [seleccionado.id]: resultado.data.imagen.fecha_captura,
                    });
                    alert(
                        'Imagen subida correctamente. Podrá asignar el lado en la siguiente pantalla.'
                    );
                    router.push(`/pwatscore?id=${resultado.data.imagen.id}`);
                } else {
                    // Múltiples imágenes o una imagen sin lado especificado
                    const nuevasImagenes = resultado.data.imagenes.map(
                        (img) => ({
                            img: { ...img, paciente_id: seleccionado.id },
                            seg: null,
                            pwa: null,
                        })
                    );
                    setImagenes([...nuevasImagenes, ...imagenes]);

                    if (resultado.data.imagenes.length > 0) {
                        setUltimas({
                            ...ultimas,
                            [seleccionado.id]:
                                resultado.data.imagenes[0].fecha_captura,
                        });
                    }

                    let mensaje = resultado.data.message;
                    if (
                        resultado.data.errores &&
                        resultado.data.errores.length > 0
                    ) {
                        mensaje +=
                            '\n\nErrores:\n' +
                            resultado.data.errores
                                .map((e) => `- Imagen ${e.indice}: ${e.error}`)
                                .join('\n');
                    }

                    // Si es solo una imagen, mensaje específico
                    if (resultado.data.imagenes.length === 1) {
                        mensaje =
                            'Imagen subida correctamente.\n\nPodrá asignar el lado en la siguiente pantalla.';
                    } else {
                        mensaje +=
                            '\n\nℹ️ Puede asignar el lado de cada imagen desde la vista de análisis (PWATScore).';
                    }

                    alert(mensaje);

                    // Redirigir a la primera imagen para asignar lado
                    if (resultado.data.imagenes.length > 0) {
                        router.push(
                            `/pwatscore?id=${resultado.data.imagenes[0].id}`
                        );
                    }
                }

                // Limpiar
                e.target.value = '';
            } else {
                alert('Error: ' + resultado.error);
                e.target.value = '';
            }
        } catch (error) {
            console.error('Error al subir imagen(es):', error);
            alert('Error inesperado al subir imagen(es)');
            e.target.value = '';
        } finally {
            setUploading(false);
        }
    };

    const reemplazarImagen = async (imgId, file) => {
        const formData = new FormData();
        formData.append('imagen', file);
        const res = await apiFetch(`/imagenes/${imgId}/archivo`, {
            method: 'PUT',
            body: formData,
        });
        const json = await res.json();
        if (res.ok) {
            setImagenes(
                imagenes.map((item) =>
                    item.img.id === imgId ? { ...item, img: json.imagen } : item
                )
            );
            const item = imagenes.find((i) => i.img.id === imgId);
            if (item) {
                const pid = item.img.paciente_id;
                const prev = ultimas[pid];
                if (
                    !prev ||
                    new Date(json.imagen.fecha_captura) > new Date(prev)
                ) {
                    setUltimas({
                        ...ultimas,
                        [pid]: json.imagen.fecha_captura,
                    });
                }
            }
        }
    };

    const cambiarEstadoPaciente = async (nuevoEstado) => {
        if (!seleccionado) return;

        try {
            const res = await apiFetch('/pacientes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: seleccionado.id,
                    estado: nuevoEstado,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Error al actualizar estado');
            }

            const data = await res.json();

            // Actualizar el paciente seleccionado
            setSeleccionado({
                ...seleccionado,
                estado: nuevoEstado,
            });

            // Actualizar la lista de pacientes
            setPacientes(
                pacientes.map((p) =>
                    p.id === seleccionado.id ? { ...p, estado: nuevoEstado } : p
                )
            );

            alert('Estado del paciente actualizado correctamente');
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            alert('Error al actualizar el estado: ' + error.message);
        }
    };

    const filtrados = pacientes.filter((p) => {
        // Filtro por RUT
        const cumpleRUT =
            !filtro ||
            (p.user && p.user.rut.toLowerCase().includes(filtro.toLowerCase()));
        // Filtro por estado
        const cumpleEstado = filtroEstado === null || p.estado === filtroEstado;
        return cumpleRUT && cumpleEstado;
    });

    const latestPwa = imagenes && imagenes.length > 0 ? imagenes[0].pwa : null;
    const latestSum = latestPwa
        ? Array.from(
              { length: 8 },
              (_, i) => latestPwa[`cat${i + 1}`] ?? 0
          ).reduce((a, b) => a + b, 0)
        : null;
    const riskLabel = riskLabelFromSum(latestSum);
    const riskColor = riskColorFromSum(latestSum);
    const riskPct =
        latestSum == null
            ? 0
            : Math.min(100, Math.round((latestSum / 32) * 100));

    return (
        <Layout
            subtitle='Panel de Profesionales'
            actions={
                <>
                    <a href='/registrar-atencion' className='btn-primary'>
                        Registrar atencion
                    </a>
                    <a href='/laboratorio' className='btn-primary'>
                        Laboratorio
                    </a>
                    <LogoutButton />
                </>
            }
        >
            <div className='grid stats'>
                <div className='stat-card'>
                    <div
                        className='stat-icon'
                        style={{ background: '#7c3aed' }}
                    >
                        US
                    </div>
                    <div className='stat-content'>
                        <div className='stat-title'>Pacientes</div>
                        <div className='stat-value'>{stats.total}</div>
                    </div>
                </div>
                <div className='stat-card'>
                    <div
                        className='stat-icon'
                        style={{ background: '#ef4444' }}
                    >
                        AL
                    </div>
                    <div className='stat-content'>
                        <div className='stat-title'>
                            Sin control {'>'} 30 dias
                        </div>
                        <div className='stat-value'>{stats.alerta}</div>
                    </div>
                </div>
                <div className='stat-card'>
                    <div
                        className='stat-icon'
                        style={{ background: '#10b981' }}
                    >
                        OK
                    </div>
                    <div className='stat-content'>
                        <div className='stat-title'>Controles recientes</div>
                        <div className='stat-value'>{stats.recientesPct}%</div>
                    </div>
                </div>
                <div className='stat-card'>
                    <div
                        className='stat-icon'
                        style={{ background: '#3b82f6' }}
                    >
                        IM
                    </div>
                    <div className='stat-content'>
                        <div className='stat-title'>Imagenes totales</div>
                        <div className='stat-value'>{stats.totalImgs}</div>
                    </div>
                </div>
            </div>

            <div className='grid two mt-1'>
                <div className='stack'>
                    <div className='card'>
                        <div className='section-title'>Mis Pacientes</div>
                        <div style={{ marginBottom: 8 }}>
                            <input
                                type='text'
                                placeholder='Buscar por RUT'
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                            />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <EstadoFilter
                                estadoActual={filtroEstado}
                                onChange={setFiltroEstado}
                            />
                        </div>
                        <div className='table-wrapper'>
                            <table>
                                <thead>
                                    <tr>
                                        <th>RUT</th>
                                        <th>Nombre</th>
                                        <th>Estado</th>
                                        <th>Ultimo Control</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map((p) => (
                                        <tr
                                            key={p.id}
                                            onClick={() => seleccionar(p)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>{p.user?.rut}</td>
                                            <td>{p.user?.nombre}</td>
                                            <td>
                                                <EstadoBadge
                                                    estado={
                                                        p.estado ||
                                                        'en_tratamiento'
                                                    }
                                                />
                                            </td>
                                            <td>
                                                {ultimas[p.id]
                                                    ? new Date(
                                                          ultimas[p.id]
                                                      ).toLocaleDateString()
                                                    : ''}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {seleccionado && (
                        <div className='card'>
                            <div className='section-title'>
                                Paciente: {seleccionado.user?.nombre}
                            </div>
                            <div className='stack'>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '8px',
                                        alignItems: 'center',
                                    }}
                                >
                                    <EstadoBadge
                                        estado={
                                            seleccionado.estado ||
                                            'en_tratamiento'
                                        }
                                    />
                                    <span className={`badge ${riskColor}`}>
                                        {riskLabel}
                                    </span>
                                </div>
                                <div>
                                    <strong>RUT:</strong>{' '}
                                    {seleccionado.user?.rut} ·{' '}
                                    <strong>Sexo:</strong> {seleccionado.sexo} ·{' '}
                                    <strong>Ingreso:</strong>{' '}
                                    {seleccionado.fecha_ingreso}
                                </div>

                                {/* Selector de Estado */}
                                <div
                                    style={{
                                        padding: '16px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                    }}
                                >
                                    <EstadoSelector
                                        estadoActual={
                                            seleccionado.estado ||
                                            'en_tratamiento'
                                        }
                                        onChange={cambiarEstadoPaciente}
                                    />
                                </div>

                                <div
                                    style={{
                                        padding: '12px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '8px',
                                        border: '2px dashed #d1d5db',
                                    }}
                                >
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontWeight: '600',
                                            color: '#374151',
                                        }}
                                    >
                                        📸 Subir Imágenes
                                    </label>
                                    <input
                                        type='file'
                                        onChange={subirImagen}
                                        multiple
                                        accept='image/jpeg,image/jpg'
                                        disabled={uploading}
                                        style={{ width: '100%' }}
                                    />
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            marginTop: '4px',
                                        }}
                                    >
                                        • Seleccione una o más imágenes JPG
                                        <br />
                                        • El lado (izquierdo/derecho) se
                                        asignará después en la vista de análisis
                                        <br />• Máximo 10 imágenes, 200MB cada
                                        una
                                    </div>
                                    {uploading && (
                                        <div
                                            style={{
                                                marginTop: '8px',
                                                color: '#3b82f6',
                                                fontWeight: '600',
                                            }}
                                        >
                                            ⏳ Subiendo imagen(es)...
                                        </div>
                                    )}
                                </div>
                                <div className='table-wrapper'>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Identificador</th>
                                                <th>Vista Previa</th>
                                                <th>Lado</th>
                                                {Array.from(
                                                    { length: 8 },
                                                    (_, i) => (
                                                        <th
                                                            key={`cat-h-${i}`}
                                                            title={
                                                                CAT_INFO[i + 1]
                                                            }
                                                        >
                                                            Cat {i + 1}
                                                        </th>
                                                    )
                                                )}
                                                <th>Fecha</th>
                                                <th>Reemplazar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {imagenes.map(
                                                ({ img, seg, pwa }) => {
                                                    const sum = pwa
                                                        ? Array.from(
                                                              { length: 8 },
                                                              (_, i) =>
                                                                  pwa[
                                                                      `cat${
                                                                          i + 1
                                                                      }`
                                                                  ] ?? 0
                                                          ).reduce(
                                                              (a, b) => a + b,
                                                              0
                                                          )
                                                        : null;
                                                    const color =
                                                        sum !== null
                                                            ? blendColors(
                                                                  '#e6ffe6',
                                                                  '#ffe6e6',
                                                                  sum / 32
                                                              )
                                                            : 'transparent';
                                                    return (
                                                        <tr
                                                            key={img.id}
                                                            style={{
                                                                backgroundColor:
                                                                    color,
                                                            }}
                                                            onClick={() =>
                                                                router.push(
                                                                    `/pwatscore?id=${img.id}`
                                                                )
                                                            }
                                                        >
                                                            <td>{img.id}</td>
                                                            <td>
                                                                <div
                                                                    style={{
                                                                        position:
                                                                            'relative',
                                                                        maxWidth: 200,
                                                                        display:
                                                                            'inline-block',
                                                                    }}
                                                                >
                                                                    <img
                                                                        src={`${BACKEND_URL}/imagenes/${img.id}/archivo`}
                                                                        alt='img'
                                                                        style={{
                                                                            width: '100%',
                                                                            height: 'auto',
                                                                            display:
                                                                                'block',
                                                                            borderRadius:
                                                                                '4px',
                                                                        }}
                                                                    />
                                                                    {seg && (
                                                                        <img
                                                                            src={`${BACKEND_URL}/segmentaciones/${img.id}/contorno`}
                                                                            alt='contorno'
                                                                            style={{
                                                                                position:
                                                                                    'absolute',
                                                                                top: 0,
                                                                                left: 0,
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                objectFit:
                                                                                    'fill',
                                                                                pointerEvents:
                                                                                    'none',
                                                                                opacity: 0.7,
                                                                                // transform: 'scaleX(-1)',
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span
                                                                    style={{
                                                                        padding:
                                                                            '4px 8px',
                                                                        borderRadius:
                                                                            '8px',
                                                                        fontSize:
                                                                            '12px',
                                                                        fontWeight:
                                                                            '600',
                                                                        backgroundColor:
                                                                            img.lado ===
                                                                            null
                                                                                ? '#fef3c7'
                                                                                : img.lado
                                                                                ? '#dbeafe'
                                                                                : '#d1fae5',
                                                                        color:
                                                                            img.lado ===
                                                                            null
                                                                                ? '#f59e0b'
                                                                                : img.lado
                                                                                ? '#3b82f6'
                                                                                : '#10b981',
                                                                        border: `1px solid ${
                                                                            img.lado ===
                                                                            null
                                                                                ? '#f59e0b40'
                                                                                : img.lado
                                                                                ? '#3b82f640'
                                                                                : '#10b98140'
                                                                        }`,
                                                                        display:
                                                                            'inline-block',
                                                                        whiteSpace:
                                                                            'nowrap',
                                                                    }}
                                                                >
                                                                    {img.lado ===
                                                                    null
                                                                        ? '⚠️ Sin asignar'
                                                                        : img.lado
                                                                        ? '➡️ Derecho'
                                                                        : '⬅️ Izquierdo'}
                                                                </span>
                                                            </td>
                                                            {Array.from(
                                                                { length: 8 },
                                                                (_, i) => (
                                                                    <td
                                                                        key={`cat-c-${i}`}
                                                                    >
                                                                        {pwa
                                                                            ? pwa[
                                                                                  `cat${
                                                                                      i +
                                                                                      1
                                                                                  }`
                                                                              ] ??
                                                                              ''
                                                                            : ''}
                                                                    </td>
                                                                )
                                                            )}
                                                            <td>
                                                                {new Date(
                                                                    img.fecha_captura
                                                                ).toLocaleDateString()}
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type='file'
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        reemplazarImagen(
                                                                            img.id,
                                                                            e
                                                                                .target
                                                                                .files[0]
                                                                        )
                                                                    }
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className='card'>
                    <div className='section-title'>Predicciones IA</div>
                    {latestSum == null ? (
                        <div className='badge gray'>
                            Selecciona un paciente para ver su ultimo PWAT
                        </div>
                    ) : (
                        <div className='stack'>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <span>Severidad (ultima toma)</span>
                                <span className={`badge ${riskColor}`}>
                                    {riskPct}%
                                </span>
                            </div>
                            <div className='progress'>
                                <div
                                    className={`bar ${riskColor}`}
                                    style={{ width: riskPct + '%' }}
                                />
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                                Basado en el puntaje PWAT total (0-32).
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
