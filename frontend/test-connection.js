// Test simple de conexión
const testBackend = async () => {
    const BACKEND_URL = 'http://localhost:5001';

    console.log('🔍 Probando conexión a:', BACKEND_URL);

    try {
        // Test 1: Endpoint raíz
        console.log('\n📡 Test 1: GET /');
        const res1 = await fetch(BACKEND_URL);
        const data1 = await res1.json();
        console.log('✅ Respuesta:', data1);
        console.log('Status:', res1.status);
        console.log('Headers:', Object.fromEntries(res1.headers.entries()));

        // Test 2: Login endpoint (debería fallar sin credenciales válidas)
        console.log('\n📡 Test 2: POST /users/login');
        const res2 = await fetch(`${BACKEND_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                rut: '11111111-1',
                contra: 'test123',
            }),
        });
        const data2 = await res2.json();
        console.log('Respuesta:', data2);
        console.log('Status:', res2.status);
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        console.error('Stack:', error.stack);
    }
};

testBackend();
