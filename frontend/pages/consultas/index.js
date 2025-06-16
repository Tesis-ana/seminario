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
  }, [router]);

  if (!token) {
    return null;
  }

  const endpoints = ['pacientes', 'profesionales', 'imagenes', 'segmentaciones', 'pwatscore'];

  return (
    <div>
      <h1>Consultas del backend</h1>
      <ul>
        {endpoints.map((ep) => (
          <li key={ep}>
            <Link href={`/consultas/${ep}`}>{ep}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
