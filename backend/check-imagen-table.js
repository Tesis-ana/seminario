const db = require('./models');

/**
 * Script para verificar la estructura de la tabla imagen
 */
async function checkImagenTable() {
    try {
        console.log('🔍 Verificando estructura de la tabla imagen...\n');

        // Conectar a la base de datos
        await db.sequelize.authenticate();
        console.log('✅ Conexión establecida\n');

        // Obtener la descripción de la tabla
        const tableDescription = await db.sequelize
            .getQueryInterface()
            .describeTable('imagen');

        console.log('📋 Estructura de tabla imagen:');
        console.table(tableDescription);

        // Verificar específicamente el campo 'lado'
        if (tableDescription.lado) {
            console.log('\n✅ Campo "lado" encontrado:');
            console.log('   - Tipo:', tableDescription.lado.type);
            console.log('   - Permite NULL:', tableDescription.lado.allowNull);
            console.log(
                '   - Valor por defecto:',
                tableDescription.lado.defaultValue
            );
        } else {
            console.log('\n❌ Campo "lado" NO encontrado en la tabla');
        }

        // Obtener algunos registros de ejemplo
        console.log('\n📊 Registros de ejemplo de la tabla imagen:');
        const imagenes = await db.Imagen.findAll({
            limit: 5,
            attributes: [
                'id',
                'nombre_archivo',
                'lado',
                'paciente_id',
                'fecha_captura',
            ],
            order: [['id', 'DESC']],
        });

        if (imagenes.length > 0) {
            console.table(
                imagenes.map((img) => ({
                    id: img.id,
                    nombre_archivo: img.nombre_archivo,
                    lado: img.lado,
                    paciente_id: img.paciente_id,
                    fecha_captura: img.fecha_captura,
                }))
            );
        } else {
            console.log('   No hay registros en la tabla imagen');
        }

        // Contar registros por valor de 'lado'
        console.log('\n📈 Distribución de valores del campo "lado":');
        const [results] = await db.sequelize.query(
            'SELECT lado, COUNT(*) as cantidad FROM imagen GROUP BY lado'
        );
        console.table(results);

        console.log('\n✅ Verificación completada');
    } catch (error) {
        console.error('❌ Error al verificar tabla imagen:', error);
        process.exit(1);
    } finally {
        await db.sequelize.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    checkImagenTable()
        .then(() => {
            console.log('✅ Proceso completado');
            process.exit(0);
        })
        .catch((err) => {
            console.error('❌ Error:', err);
            process.exit(1);
        });
}

module.exports = checkImagenTable;
