const db = require('./models');

/**
 * Script para verificar el estado actual de la base de datos
 * y mostrar información relevante antes de ejecutar migraciones
 */
async function checkDatabaseStatus() {
    try {
        console.log('🔍 Verificando estado actual de la base de datos...\n');

        // Conectar a la base de datos
        await db.sequelize.authenticate();
        console.log('✅ Conexión establecida\n');

        // Obtener lista de tablas
        console.log('📋 Tablas existentes:');
        const tables = await db.sequelize.getQueryInterface().showAllTables();
        tables.forEach((table) => console.log(`  - ${table}`));

        // Verificar estructura de tabla atencion si existe
        if (tables.includes('atencion')) {
            console.log('\n🔍 Estructura de tabla atencion:');
            const atencionStructure = await db.sequelize
                .getQueryInterface()
                .describeTable('atencion');
            console.table(atencionStructure);

            // Contar registros
            const [count] = await db.sequelize.query(
                'SELECT COUNT(*) as total FROM atencion',
                { type: db.Sequelize.QueryTypes.SELECT }
            );
            console.log(`📊 Total de registros en atencion: ${count.total}`);
        } else {
            console.log('\n⚠️ Tabla atencion NO existe');
        }

        // Verificar otras tablas importantes
        console.log('\n📊 Conteo de registros en tablas principales:');

        const tablesToCheck = ['user', 'paciente', 'profesional', 'imagen'];
        for (const table of tablesToCheck) {
            if (tables.includes(table)) {
                try {
                    const [count] = await db.sequelize.query(
                        `SELECT COUNT(*) as total FROM ${table}`,
                        { type: db.Sequelize.QueryTypes.SELECT }
                    );
                    console.log(`  - ${table}: ${count.total} registros`);
                } catch (err) {
                    console.log(
                        `  - ${table}: Error al contar (${err.message})`
                    );
                }
            } else {
                console.log(`  - ${table}: No existe`);
            }
        }

        // Verificar foreign keys existentes en atencion si existe
        if (tables.includes('atencion')) {
            console.log('\n🔗 Foreign keys en tabla atencion:');
            try {
                const [foreignKeys] = await db.sequelize.query(`
          SELECT 
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_NAME = 'atencion' 
            AND TABLE_SCHEMA = DATABASE() 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `);

                if (foreignKeys.length > 0) {
                    console.table(foreignKeys);
                } else {
                    console.log('  ⚠️ No se encontraron foreign keys');
                }
            } catch (err) {
                console.log(
                    `  Error al verificar foreign keys: ${err.message}`
                );
            }
        }

        // Verificar índices
        if (tables.includes('atencion')) {
            console.log('\n📇 Índices en tabla atencion:');
            try {
                const [indexes] = await db.sequelize.query(`
          SELECT 
            INDEX_NAME,
            COLUMN_NAME,
            NON_UNIQUE
          FROM information_schema.STATISTICS 
          WHERE TABLE_NAME = 'atencion' 
            AND TABLE_SCHEMA = DATABASE()
          ORDER BY INDEX_NAME, SEQ_IN_INDEX
        `);

                if (indexes.length > 0) {
                    console.table(indexes);
                } else {
                    console.log('  ⚠️ No se encontraron índices');
                }
            } catch (err) {
                console.log(`  Error al verificar índices: ${err.message}`);
            }
        }

        console.log('\n✅ Verificación completada');
    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
    } finally {
        await db.sequelize.close();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    checkDatabaseStatus()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Error:', error);
            process.exit(1);
        });
}

module.exports = { checkDatabaseStatus };
