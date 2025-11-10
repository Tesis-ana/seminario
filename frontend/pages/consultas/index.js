import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import LogoutButton from '../../components/LogoutButton';
import Layout from '../../components/Layout';

export default function Consultas() {
  const router = useRouter();
  const [token, setToken] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.replace('/'); } else { setToken(stored); }
  }, [router]);

  if (!token) return null;

  const endpoints = ['users', 'pacientes', 'profesionales', 'imagenes', 'segmentaciones', 'pwatscore'];

  return (
    <Layout subtitle="Consultas del backend" actions={<LogoutButton />}>
      <div className="card">
        <ul className="stack">
          {endpoints.map((ep) => (
            <li key={ep}><Link href={`/consultas/${ep}`}>{ep}</Link></li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
