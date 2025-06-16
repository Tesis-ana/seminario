import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Consultas() {
  const router = useRouter();
  const [token, setToken] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) {
      router.replace('/');
    } else {
      setToken(stored);
    }
  if (!token) {
    return null;
  }

  const endpoints = ['pacientes', 'profesionales', 'imagenes', 'segmentaciones', 'pwatscore'];

      <ul>
        {endpoints.map(ep => (
          <li key={ep}>
            <Link href={`/consultas/${ep}`}>{ep}</Link>
          </li>
        ))}
      </ul>

  return (
    <div>
      <h1>Consultas del backend</h1>
      {error && <p style={{color:'red'}}>{error}</p>}
      <pre>{JSON.stringify(datos, null, 2)}</pre>
    </div>
  );
}
