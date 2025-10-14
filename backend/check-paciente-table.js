const db = require('./models');

/**
 * Script para verificar la estructura de la tabla paciente
 */
async function checkPacienteTable() {
    try {
        console.log('🔍 Verificando estructura de la tabla paciente...\n');

        // Conectar a la base de datos
        await db.sequelize.authenticate();
        console.log('✅ Conexión establecida\n');

        // Obtener la descripción de la tabla
        const tableDescription = await db.sequelize
            .getQueryInterface()
            .describeTable('paciente');

        console.log('📋 Estructura de tabla paciente:');
        console.table(tableDescription);

        // Verificar específicamente el campo 'estado'
        if (tableDescription.estado) {
            console.log('\n✅ Campo "estado" encontrado:');
            console.log('   - Tipo:', tableDescription.estado.type);
            console.log(
                '   - Permite NULL:',
                tableDescription.estado.allowNull
            );
            console.log(
                '   - Valor por defecto:',
                tableDescription.estado.defaultValue
            );
        } else {
            console.log('\n❌ Campo "estado" NO encontrado en la tabla');
        }

        // Obtener todos los pacientes con su estado
        console.log('\n📊 Pacientes registrados:');
        const pacientes = await db.Paciente.findAll({
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['rut', 'nombre'],
                },
            ],
            order: [['id', 'ASC']],
        });

        if (pacientes.length > 0) {
            console.table(
                pacientes.map((p) => ({
                    id: p.id,
                    nombre: p.user ? p.user.nombre : 'N/A',
                    rut: p.user ? p.user.rut : 'N/A',
                    fecha_ingreso: p.fecha_ingreso,
                    estado: p.estado,
                    comentarios: p.comentarios
                        ? p.comentarios.substring(0, 30) + '...'
                        : null,
                }))
            );
        } else {
            console.log('   No hay pacientes registrados');
        }

        // Contar pacientes por estado
        console.log('\n📈 Distribución de pacientes por estado:');
        const [results] = await db.sequelize.query(
            'SELECT estado, COUNT(*) as cantidad FROM paciente GROUP BY estado'
        );
        console.table(results);

        // Verificar índices
        console.log('\n📇 Índices en tabla paciente:');
        const indexes = await db.sequelize
            .getQueryInterface()
            .showIndex('paciente');
        console.table(
            indexes.map((idx) => ({
                nombre: idx.name,
                columna: idx.column_name,
                unico: idx.unique ? 'Sí' : 'No',
            }))
        );

        console.log('\n✅ Verificación completada');
    } catch (error) {
        console.error('❌ Error al verificar tabla paciente:', error);
        process.exit(1);
    } finally {
        await db.sequelize.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    checkPacienteTable()
        .then(() => {
            console.log('✅ Proceso completado');
            process.exit(0);
        })
        .catch((err) => {
            console.error('❌ Error:', err);
            process.exit(1);
        });
}

module.exports = checkPacienteTable;
