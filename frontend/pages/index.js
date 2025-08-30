import { use, useEffect, useState } from 'react';
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

    useEffect(() => {
        const stored = localStorage.getItem('token');
        if (stored) {
            setToken(stored);
            const fetch = apiFetch('/users/validate', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${stored}` }
            });
            if (fetch.status === 401) {
                localStorage.removeItem('token');
                setToken(null);
            }else{
                redirectByRole(stored);
            }
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
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
                            onChange={(e) => setRut(e.target.value)}
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
