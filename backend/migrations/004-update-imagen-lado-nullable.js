/**
 * Migración 004: Actualizar columna lado en tabla imagen para permitir NULL
 *
 * Contexto:
 * - Inicialmente lado era NOT NULL (obligatorio)
 * - Ahora se permite que sea NULL para dar flexibilidad
 * - Cuando se sube una imagen individual, el lado se puede asignar después en pwatscore.js
 * - Las imágenes existentes mantienen sus valores actuales
 *
 * Cambios:
 * - Modificar columna 'lado' de NOT NULL a NULLABLE
 */

const sequelize = require('../config/database');

async function up() {
    const transaction = await sequelize.transaction();

    try {
        console.log('Iniciando migración 004: Actualizar lado a nullable...');

        // Modificar la columna lado para permitir NULL
        console.log('Modificando columna lado para permitir NULL...');
        await sequelize.query(
            `
            ALTER TABLE imagen 
            MODIFY COLUMN lado TINYINT(1) NULL
        `,
            { transaction }
        );

        await transaction.commit();
        console.log('✅ Migración 004 completada exitosamente');
        console.log('   - Columna lado ahora permite valores NULL');
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error en migración 004:', error);
        throw error;
    }
}

async function down() {
    const transaction = await sequelize.transaction();

    try {
        console.log('Revirtiendo migración 004...');

        // Primero, asignar un valor por defecto a los registros NULL
        console.log('Asignando valor false a registros con lado NULL...');
        await sequelize.query(
            `
            UPDATE imagen 
            SET lado = false 
            WHERE lado IS NULL
        `,
            { transaction }
        );

        // Luego modificar la columna para que no permita NULL
        console.log('Modificando columna lado para NO permitir NULL...');
        await sequelize.query(
            `
            ALTER TABLE imagen 
            MODIFY COLUMN lado TINYINT(1) NOT NULL
        `,
            { transaction }
        );

        await transaction.commit();
        console.log('✅ Rollback de migración 004 completado');
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error en rollback de migración 004:', error);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    up()
        .then(() => {
            console.log('Migración ejecutada correctamente');
            process.exit(0);
        })
        .catch((err) => {
            console.error('Error ejecutando migración:', err);
            process.exit(1);
        });
}

module.exports = { up, down };
