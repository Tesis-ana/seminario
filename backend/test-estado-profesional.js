/**
 * Script de prueba para verificar la actualización de estado de paciente
 * desde la vista profesional
 *
 * Ejecutar: node test-estado-profesional.js
 */

const API_URL = 'http://localhost:3001/api';

// Simular login y obtener token
async function login() {
    const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            rut: '12345678-9', // Ajustar con un RUT de profesional válido
            password: 'password123',
        }),
    });
    const data = await response.json();
    if (response.ok) {
        console.log('✅ Login exitoso');
        return data.token;
    } else {
        throw new Error('Login falló: ' + data.message);
    }
}

// Obtener primer paciente
async function obtenerPrimerPaciente(token) {
    const response = await fetch(`${API_URL}/profesionales/mis-pacientes`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (response.ok && data.pacientes && data.pacientes.length > 0) {
        const paciente = data.pacientes[0].paciente;
        console.log(
            `✅ Paciente obtenido: ${paciente.nombre} (ID: ${paciente.id})`
        );
        console.log(`   Estado actual: ${paciente.estado || 'en_tratamiento'}`);
        return paciente;
    } else {
        throw new Error('No se encontraron pacientes');
    }
}

// Cambiar estado del paciente
async function cambiarEstado(token, pacienteId, nuevoEstado) {
    console.log(`\n🔄 Cambiando estado a: ${nuevoEstado}`);

    const response = await fetch(`${API_URL}/pacientes`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            id: pacienteId,
            estado: nuevoEstado,
        }),
    });

    const data = await response.json();

    if (response.ok) {
        console.log('✅ Estado actualizado correctamente');
        console.log('   Respuesta:', data.message);
        return true;
    } else {
        console.error('❌ Error al actualizar estado:', data.message);
        return false;
    }
}

// Verificar cambio consultando el paciente
async function verificarCambio(token, pacienteId, estadoEsperado) {
    const response = await fetch(`${API_URL}/pacientes/${pacienteId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (response.ok) {
        const estadoActual = data.estado;
        if (estadoActual === estadoEsperado) {
            console.log(`✅ Verificación exitosa: Estado es "${estadoActual}"`);
            return true;
        } else {
            console.error(
                `❌ Verificación falló: Esperado "${estadoEsperado}", Actual "${estadoActual}"`
            );
            return false;
        }
    } else {
        console.error('❌ Error al verificar:', data.message);
        return false;
    }
}

// Test principal
async function runTest() {
    console.log('🧪 INICIANDO TEST DE CAMBIO DE ESTADO\n');
    console.log('═══════════════════════════════════════\n');

    try {
        // 1. Login
        console.log('1️⃣ PASO 1: Login');
        const token = await login();

        // 2. Obtener paciente
        console.log('\n2️⃣ PASO 2: Obtener paciente');
        const paciente = await obtenerPrimerPaciente(token);
        const estadoOriginal = paciente.estado || 'en_tratamiento';

        // 3. Cambiar a "alta"
        console.log('\n3️⃣ PASO 3: Cambiar estado a "alta"');
        await cambiarEstado(token, paciente.id, 'alta');
        await verificarCambio(token, paciente.id, 'alta');

        // 4. Cambiar a "interrumpido"
        console.log('\n4️⃣ PASO 4: Cambiar estado a "interrumpido"');
        await cambiarEstado(token, paciente.id, 'interrumpido');
        await verificarCambio(token, paciente.id, 'interrumpido');

        // 5. Cambiar a "inactivo"
        console.log('\n5️⃣ PASO 5: Cambiar estado a "inactivo"');
        await cambiarEstado(token, paciente.id, 'inactivo');
        await verificarCambio(token, paciente.id, 'inactivo');

        // 6. Restaurar estado original
        console.log(
            `\n6️⃣ PASO 6: Restaurar estado original "${estadoOriginal}"`
        );
        await cambiarEstado(token, paciente.id, estadoOriginal);
        await verificarCambio(token, paciente.id, estadoOriginal);

        console.log('\n═══════════════════════════════════════');
        console.log('✅ TEST COMPLETADO EXITOSAMENTE');
        console.log('═══════════════════════════════════════\n');
    } catch (error) {
        console.error('\n❌ TEST FALLÓ:', error.message);
        console.error('═══════════════════════════════════════\n');
        process.exit(1);
    }
}

// Test de estado inválido
async function testEstadoInvalido() {
    console.log('\n🧪 TEST DE VALIDACIÓN: Estado Inválido\n');
    console.log('═══════════════════════════════════════\n');

    try {
        const token = await login();
        const paciente = await obtenerPrimerPaciente(token);

        console.log('🔄 Intentando estado inválido: "estado_falso"');
        const response = await fetch(`${API_URL}/pacientes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                id: paciente.id,
                estado: 'estado_falso',
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.log(
                '✅ Validación correcta: Backend rechazó estado inválido'
            );
            console.log('   Mensaje:', data.message || 'Error de validación');
        } else {
            console.error('❌ ERROR: Backend aceptó estado inválido');
        }
    } catch (error) {
        console.error('❌ Test falló:', error.message);
    }
}

// Ejecutar tests
(async () => {
    await runTest();
    await testEstadoInvalido();
})();
