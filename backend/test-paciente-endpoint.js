const db = require('./models');

async function testPacienteEndpoint() {
    try {
        // Obtener el primer paciente para prueba
        const paciente = await db.Paciente.findOne({
            include: [{ model: db.User, as: 'user' }],
        });

        if (!paciente) {
            console.log('❌ No hay pacientes en la base de datos');
            process.exit(1);
        }

        console.log('✅ Paciente encontrado:');
        console.log('   ID:', paciente.id);
        console.log('   Nombre:', paciente.user?.nombre || 'N/A');
        console.log('   RUT:', paciente.user?.rut || paciente.user_id);
        console.log('   Estado:', paciente.estado);
        console.log('   Fecha ingreso:', paciente.fecha_ingreso);

        console.log('\n📊 Estructura del objeto paciente:');
        console.log(
            JSON.stringify(
                {
                    id: paciente.id,
                    estado: paciente.estado,
                    user_id: paciente.user_id,
                    user: paciente.user
                        ? {
                              nombre: paciente.user.nombre,
                              rut: paciente.user.rut,
                              correo: paciente.user.correo,
                          }
                        : null,
                },
                null,
                2
            )
        );

        // Probar actualización de estado
        console.log('\n🔄 Probando actualización de estado...');
        const estadoOriginal = paciente.estado;
        const nuevoEstado =
            estadoOriginal === 'en_tratamiento' ? 'alta' : 'en_tratamiento';

        const [actualizados] = await db.Paciente.update(
            { estado: nuevoEstado },
            { where: { id: paciente.id } }
        );

        if (actualizados > 0) {
            console.log(
                `✅ Estado actualizado de "${estadoOriginal}" a "${nuevoEstado}"`
            );

            // Revertir cambio
            await db.Paciente.update(
                { estado: estadoOriginal },
                { where: { id: paciente.id } }
            );
            console.log(`✅ Estado revertido a "${estadoOriginal}"`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testPacienteEndpoint();
