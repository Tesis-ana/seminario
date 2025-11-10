import { useEffect, useState } from 'react';
import { BACKEND_URL } from '../lib/api';

export default function TestAPI() {
    const [backendUrl, setBackendUrl] = useState('');
    const [envVar, setEnvVar] = useState('');
    const [testResult, setTestResult] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setBackendUrl(BACKEND_URL);
        setEnvVar(process.env.NEXT_PUBLIC_API_URL || 'NO DEFINIDA');

        // Probar conexión directa
        fetch(BACKEND_URL)
            .then((res) => res.json())
            .then((data) => {
                setTestResult(JSON.stringify(data, null, 2));
            })
            .catch((err) => {
                setError(err.message);
            });
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Test de Conexión API</h1>

            <div
                style={{
                    marginBottom: '20px',
                    padding: '10px',
                    background: '#f0f0f0',
                }}
            >
                <h2>Variables de Entorno:</h2>
                <p>
                    <strong>NEXT_PUBLIC_API_URL:</strong> {envVar}
                </p>
                <p>
                    <strong>BACKEND_URL (calculada):</strong> {backendUrl}
                </p>
            </div>

            {testResult && (
                <div
                    style={{
                        marginBottom: '20px',
                        padding: '10px',
                        background: '#d4edda',
                    }}
                >
                    <h2>✅ Respuesta del Backend:</h2>
                    <pre>{testResult}</pre>
                </div>
            )}

            {error && (
                <div
                    style={{
                        marginBottom: '20px',
                        padding: '10px',
                        background: '#f8d7da',
                    }}
                >
                    <h2>❌ Error:</h2>
                    <pre>{error}</pre>
                </div>
            )}
        </div>
    );
}
