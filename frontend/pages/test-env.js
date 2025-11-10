import { BACKEND_URL } from '../lib/api';

export default function TestEnv() {
    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Test de Variables de Entorno</h1>
            <div
                style={{
                    backgroundColor: '#f3f4f6',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                }}
            >
                <h2>Variables desde api.js:</h2>
                <p>
                    <strong>BACKEND_URL:</strong> {BACKEND_URL}
                </p>
            </div>
            <div
                style={{
                    backgroundColor: '#f3f4f6',
                    padding: '16px',
                    borderRadius: '8px',
                }}
            >
                <h2>Variables directas de process.env:</h2>
                <p>
                    <strong>NEXT_PUBLIC_API_URL:</strong>{' '}
                    {process.env.NEXT_PUBLIC_API_URL || 'NO DEFINIDA'}
                </p>
                <p>
                    <strong>NEXT_PUBLIC_BASE_URL:</strong>{' '}
                    {process.env.NEXT_PUBLIC_BASE_URL || 'NO DEFINIDA'}
                </p>
            </div>
            <div
                style={{
                    backgroundColor: '#fef3c7',
                    padding: '16px',
                    borderRadius: '8px',
                    marginTop: '16px',
                }}
            >
                <h3>URLs de prueba:</h3>
                <p>Imagen: {`${BACKEND_URL}/imagenes/1/archivo`}</p>
                <p>Máscara: {`${BACKEND_URL}/segmentaciones/1/mask`}</p>
                <p>Contorno: {`${BACKEND_URL}/segmentaciones/1/contorno`}</p>
            </div>
        </div>
    );
}
