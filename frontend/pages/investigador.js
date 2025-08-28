import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import LogoutButton from '../components/LogoutButton';
import Layout from '../components/Layout';

export default function Investigador() {
  const router = useRouter();
  const [metrics, setMetrics] = useState(null);
  const [catMetrics, setCatMetrics] = useState(null);
  const [form, setForm] = useState({ learning_rate: '', epochs: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/'); return; }
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.rol !== 'investigador') { router.replace('/'); return; }
    loadMetrics();
  }, [router]);

  const loadMetrics = async () => {
    try { const res = await apiFetch('/investigador/metrics'); if (res.ok) setMetrics(await res.json()); } catch (e) { console.error(e); }
    try { const res = await apiFetch('/categorizador/metrics'); if (res.ok) setCatMetrics(await res.json()); } catch (e) { console.error(e); }
  };

  const handleRetrain = async (e) => {
    e.preventDefault(); setMessage('');
    try {
      const res = await apiFetch('/investigador/retrain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) { setMessage(data.message); setMetrics(data.metrics); } else { setMessage(data.message || 'Error'); }
    } catch (err) { setMessage('Error'); }
  };

  return (
    <Layout subtitle="Interfaz de Investigador" actions={<LogoutButton />}>
      {metrics && (
        <div className="card">
          <div className="section-title">Métricas del sistema</div>
          <p><strong>IoU:</strong> {metrics.iou}</p>
          <p><strong>Spearman:</strong> {metrics.spearman}</p>
          <p><strong>Actualizado:</strong> {metrics.updated_at}</p>
        </div>
      )}
      {catMetrics && (
        <div className="card mt-1">
          <div className="section-title">Métricas de Categorizadores</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Modelo</th><th>Accuracy</th><th>F1</th></tr>
              </thead>
              <tbody>
                {Object.entries(catMetrics).map(([name, m]) => (
                  <tr key={name}><td>{name}</td><td>{m.accuracy}</td><td>{m.f1}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="card mt-1">
        <div className="section-title">Reentrenar</div>
        <form onSubmit={handleRetrain}>
          <input placeholder="learning rate" value={form.learning_rate} onChange={e => setForm({ ...form, learning_rate: e.target.value })} />
          <input placeholder="epochs" value={form.epochs} onChange={e => setForm({ ...form, epochs: e.target.value })} />
          <button type="submit">Reentrenar</button>
        </form>
        {message && <p>{message}</p>}
      </div>
    </Layout>
  );
}
