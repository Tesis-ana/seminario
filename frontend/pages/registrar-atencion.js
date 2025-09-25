﻿import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
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

  const formatRut = (valor) => {
    const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase();
    if (limpio.length <= 1) return limpio;
    const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const dv = limpio.slice(-1);
    return `${cuerpo}-${dv}`;
  };

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.replace('/'); return; }
    setToken(stored);
    async function fetchProf() {
      try { const res = await apiFetch('/profesionales/me'); const json = await res.json(); if (res.ok) setProfId(json.id); } catch (e) { console.error(e); }
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
        const res = await apiFetch(`/pacientes/profesional/${profId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error');
        if (!cancelado) setPacientesAtendidos(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelado) setPacientesAtendidos([]);
        console.error(e);
      } finally {
        if (!cancelado) setCargandoLista(false);
      }
    }
    fetchPacientesAtendidos();
    return () => { cancelado = true; };
  }, [profId]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!rut) { setPaciente(null); return; }
    searchTimeout.current = setTimeout(() => { buscar(); }, 500);
    return () => clearTimeout(searchTimeout.current);
  }, [rut]);

  const buscar = async () => {
    setError(''); setPaciente(null); setExito('');
    try {
      const res = await apiFetch('/pacientes/buscar-rut', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rut }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      setPaciente(data);
    } catch (err) { setError(err.message); }
  };

  const confirmar = async () => {
    if (!paciente || !profId) return;
    try {
      const res = await apiFetch('/atenciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paciente_id: paciente.id, profesional_id: profId }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setExito('Atención registrada');
      router.push('/profesional');
    } catch (err) { setError(err.message); }
  };

  if (!token) return null;

  return (
    <Layout subtitle="Registrar Atención" actions={<LogoutButton />}>
      <div className="card">
        <div className="section-title">Buscar paciente por RUT</div>
        <input type="text" placeholder="Buscar por RUT" value={rut} onChange={e => setRut(formatRut(e.target.value))} />
        <button onClick={buscar}>Buscar</button>
        {error && <p style={{color:'red'}}>{error}</p>}
        {paciente && (
          <div className="mt-1">
            <p><strong>Nombre:</strong> {paciente.user?.nombre}</p>
            <p><strong>RUT:</strong> {paciente.user?.rut}</p>
            <button onClick={confirmar}>Confirmar Atención</button>
          </div>
        )}
        {exito && <p style={{color:'green'}}>{exito}</p>}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="section-title">Pacientes atendidos</div>
        {cargandoLista ? (
          <p>Cargando...</p>
        ) : (
          <>
            {pacientesAtendidos.length === 0 ? (
              <p style={{ color: '#666' }}>No hay pacientes con consultas previas</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {pacientesAtendidos.map((p) => (
                  <li key={p.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.user?.nombre}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{p.user?.rut}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>Con atención registrada</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setPaciente(p)}>Seleccionar</button>
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


