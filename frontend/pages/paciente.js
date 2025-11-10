import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import { formatRUT } from '../lib/rut';
import LogoutButton from '../components/LogoutButton';
import { CAT_INFO } from '../lib/categorias';
import Layout from '../components/Layout';
import EstadoBadge from '../components/EstadoBadge';

// Utilidades fuera del componente para reducir anidación de funciones
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

const mergeImageData = (imgs, segs, pwas) => {
    const segByImg = new Map();
    for (const s of segs) segByImg.set(s.imagen_id, s);
    const pwaByImg = new Map();
    for (const p of pwas) pwaByImg.set(p.imagen_id, p);

    const out = [];
    for (const img of imgs) {
        out.push({
            img,
            seg: segByImg.get(img.id) || null,
            pwa: pwaByImg.get(img.id) || null,
        });
    }
    out.sort(
        (a, b) => new Date(b.img.fecha_captura) - new Date(a.img.fecha_captura)
    );
    return out;
};

const buildCategoryHeaders = () => {
    const headers = [];
    for (let i = 0; i < 8; i++)
        headers.push(<th key={i}>{CAT_INFO[i + 1]}</th>);
    return headers;
};

const buildCategoryCells = (pwa) => {
    const cells = [];
    for (let i = 0; i < 8; i++) {
        const val = pwa ? pwa[`cat${i + 1}`] ?? '' : '';
        cells.push(<td key={i}>{val}</td>);
    }
    return cells;
};

const sumScore = (pwa) => {
    if (!pwa) return null;
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += pwa[`cat${i + 1}`] ?? 0;
    return sum;
};

export default function Paciente() {
    const router = useRouter();
    const [imagenes, setImagenes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [pacInfo, setPacInfo] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.replace('/');
            return;
        }
        const fetchData = async () => {
            try {
                const [userRes, pacRes] = await Promise.all([
                    apiFetch('/users/me'),
                    apiFetch('/pacientes/me'),
                ]);
                if (userRes.ok) setUserInfo(await userRes.json());
                if (!pacRes.ok) throw new Error('Paciente no encontrado');
                const paciente = await pacRes.json();
                setPacInfo(paciente);
                const [imgRes, segRes, pwaRes] = await Promise.all([
                    apiFetch(`/imagenes/paciente/${paciente.id}`),
                    apiFetch('/segmentaciones'),
                    apiFetch('/pwatscore'),
                ]);
                const imgs = await imgRes.json();
                const segs = await segRes.json();
                const pwas = await pwaRes.json();
                setImagenes(mergeImageData(imgs, segs, pwas));
            } catch (err) {
                console.error('Error al cargar datos:', err);
                const message =
                    err && err.message ? err.message : 'Error al cargar datos';
                setError(message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    if (loading) return <p>Cargando...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <Layout subtitle='Panel del Paciente' actions={<LogoutButton />}>
            <div className='card'>
                <div className='section-title'>Mis Datos</div>
                {userInfo && (
                    <div>
                        <p>
                            <strong>RUT:</strong> {formatRUT(userInfo.rut)}
                        </p>
                        <p>
                            <strong>Nombre:</strong> {userInfo.nombre}
                        </p>
                        <p>
                            <strong>Correo:</strong> {userInfo.correo}
                        </p>
                    </div>
                )}
                {pacInfo && (
                    <div>
                        <p>
                            <strong>Estado:</strong>{' '}
                            <EstadoBadge
                                estado={pacInfo.estado || 'en_tratamiento'}
                            />
                        </p>
                        <p>
                            <strong>Sexo:</strong> {pacInfo.sexo}
                        </p>
                        <p>
                            <strong>Ingreso:</strong>{' '}
                            {new Date(
                                pacInfo.fecha_ingreso
                            ).toLocaleDateString()}
                        </p>
                        <p>
                            <strong>Comentarios:</strong> {pacInfo.comentarios}
                        </p>
                    </div>
                )}
            </div>

            <div className='card mt-1'>
                <div className='section-title'>Mis Imagenes</div>
                <div className='table-wrapper'>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>PWATScore</th>
                                <th>Imagen</th>
                                <th>Mascara</th>
                                {buildCategoryHeaders()}
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {imagenes.map(({ img, seg, pwa }, index) => {
                                const total = imagenes.length;
                                const contadorDesc = total - index;
                                const sum = sumScore(pwa);
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
                                        onClick={() =>
                                            router.push(`/imagenes/${img.id}`)
                                        }
                                        style={{
                                            cursor: 'pointer',
                                            backgroundColor: color,
                                        }}
                                    >
                                        <td>{contadorDesc}</td>
                                        <td>{sum !== null ? sum : ''}</td>
                                        <td>
                                            <img
                                                src={`${BACKEND_URL}/imagenes/${img.id}/archivo`}
                                                alt='img'
                                                width={64}
                                                height={64}
                                            />
                                        </td>
                                        <td>
                                            {seg ? (
                                                <img
                                                    src={`${BACKEND_URL}/segmentaciones/${img.id}/mask`}
                                                    alt='mask'
                                                    width={64}
                                                    height={64}
                                                />
                                            ) : null}
                                        </td>
                                        {buildCategoryCells(pwa)}
                                        <td>
                                            {new Date(
                                                img.fecha_captura
                                            ).toLocaleDateString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}
