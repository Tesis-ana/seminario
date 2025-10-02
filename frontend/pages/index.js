import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import LogoutButton from '../components/LogoutButton';
import Layout from '../components/Layout';

export default function Home() {
    const router = useRouter();
    const [token, setToken] = useState(null);
    const [rut, setRut] = useState('');
    const [contra, setContra] = useState('');
    const [error, setError] = useState('');

    const redirectByRole = (tok) => {
        try {
            const payload = JSON.parse(atob(tok.split('.')[1]));
            const rol = payload.rol;
            if (rol === 'doctor' || rol === 'enfermera')
                router.push('/profesional');
            else if (rol === 'paciente') router.push('/paciente');
            else if (rol === 'admin') router.push('/admin');
            else if (rol === 'investigador') router.push('/investigador');
        } catch (e) {
            console.error('Error decoding token', e);
        }
    };

    // Limpia y formatea un RUT chileno: agrega puntos y guión antes del dígito verificador
    // Limita la parte numérica a 9 dígitos como máximo (por ejemplo 12.345.678)
    const formatRut = (value) => {
        if (!value) return '';
        // Mantener sólo dígitos y K (mayúscula)
        let cleaned = value.replace(/[^0-9kK]/g, '').toUpperCase();
        if (cleaned.length <= 1) return cleaned;
        // Limitar longitud limpia: hasta 9 números + 1 DV = 10 caracteres
        // Si el usuario pegó algo muy largo, lo truncamos: tomar últimos (dv + 9 nums)
        if (cleaned.length > 10) {
            cleaned = cleaned.slice(cleaned.length - 10);
        }
        const dv = cleaned.slice(-1);
        let nums = cleaned.slice(0, -1);
        // Insertar puntos cada 3 dígitos desde la derecha
        nums = nums.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${nums}-${dv}`;
    };

    const handleRutChange = (e) => {
        const raw = e.target.value;
        let cleaned = raw.replace(/[^0-9kK]/g, '').toUpperCase();
        // Limitar la parte limpia a 9 dígitos + 1 DV = 10 caracteres
        if (cleaned.length > 10) {
            cleaned = cleaned.slice(0, 10);
        }
        // Si el usuario está escribiendo sólo 1 carácter, no pongas aún el guión/puntos
        if (cleaned.length <= 1) {
            setRut(cleaned);
            return;
        }
        setRut(formatRut(cleaned));
    };

    useEffect(() => {
        const validateToken = async () => {
            const stored = localStorage.getItem('token');
            if (!stored) return;
            setToken(stored);
            try {
                const res = await apiFetch('/users/validate', {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${stored}` },
                });
                if (res.ok) {
                    redirectByRole(stored);
                } else {
                    localStorage.removeItem('token');
                    setToken(null);
                }
            } catch (e) {
                console.error('Error validating token', e);
                localStorage.removeItem('token');
                setToken(null);
            }
        };
        validateToken();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!rut.trim() || !contra.trim()) {
            setError('RUT y contrasena son obligatorios');
            return;
        }
        try {
            const res = await apiFetch('/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rut, contra }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error');
            localStorage.setItem('token', data.token);
            setToken(data.token);
            redirectByRole(data.token);
        } catch (err) {
            setError(err.message);
        }
    };

    if (!token) {
        return (
            <Layout subtitle='Inicio de sesion'>
                <div className='card' style={{ maxWidth: 480 }}>
                    <div className='section-title'>Iniciar sesion</div>
                    <form onSubmit={handleSubmit} className='stack'>
                        <input
                            placeholder='RUT'
                            value={rut}
                            onChange={handleRutChange}
                            onBlur={() => setRut(formatRut(rut))}
                            maxLength={12}
                        />
                        <input
                            type='password'
                            placeholder='Contrasena'
                            value={contra}
                            onChange={(e) => setContra(e.target.value)}
                        />
                        <button type='submit'>Ingresar</button>
                        {error && <p style={{ color: 'red' }}>{error}</p>}
                    </form>
                </div>
            </Layout>
        );
    }

    return (
        <Layout subtitle='Inicio' actions={<LogoutButton />}>
            <div className='card'>
                <div className='section-title'>Accesos rapidos</div>
                <div className='stack'>
                    <a href='/consultas'>Ir a consultas</a>
                    <a href='/pwatscore'>Calcular PWATScore</a>
                    <a href='/paciente'>Mis Imagenes</a>
                </div>
            </div>
        </Layout>
    );
}
