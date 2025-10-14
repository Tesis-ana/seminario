const { QueryInterface, DataTypes } = require('sequelize');

/**
 * Migración para agregar el campo 'estado' a la tabla paciente
 * Estados posibles: alta, en_tratamiento, interrumpido, inactivo
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            console.log(
                '🔄 Iniciando migración de tabla paciente (campo estado)...'
            );

            // Verificar si la tabla paciente existe
            const tables = await queryInterface.showAllTables();

            if (!tables.includes('paciente')) {
                console.log('⚠️  La tabla paciente no existe.');
                await transaction.rollback();
                throw new Error('La tabla paciente no existe');
            }

            console.log('📋 Verificando estructura de tabla paciente...');

            // Obtener las columnas existentes
            const tableDescription = await queryInterface.describeTable(
                'paciente'
            );

            // Verificar si la columna 'estado' ya existe
            if (!tableDescription.estado) {
                console.log(
                    '➕ Agregando columna "estado" a la tabla paciente...'
                );

                // Agregar la columna estado
                await queryInterface.addColumn(
                    'paciente',
                    'estado',
                    {
                        type: DataTypes.ENUM(
                            'alta',
                            'en_tratamiento',
                            'interrumpido',
                            'inactivo'
                        ),
                        allowNull: false,
                        defaultValue: 'en_tratamiento',
                        comment:
                            'Estado del paciente: alta (dado de alta), en_tratamiento (en tratamiento activo), interrumpido (tratamiento interrumpido), inactivo (paciente inactivo)',
                    },
                    { transaction }
                );

                console.log('✅ Columna "estado" agregada correctamente');

                // Actualizar registros existentes con el valor por defecto
                console.log('🔧 Actualizando registros existentes...');
                await queryInterface.sequelize.query(
                    "UPDATE paciente SET estado = 'en_tratamiento' WHERE estado IS NULL",
                    { transaction }
                );
                console.log(
                    '✅ Registros existentes actualizados con estado="en_tratamiento"'
                );
            } else {
                console.log(
                    'ℹ️  La columna "estado" ya existe en la tabla paciente'
                );
            }

            // Crear índice para mejorar consultas por estado
            console.log('📊 Verificando índice para estado...');
            const indexes = await queryInterface.showIndex('paciente');
            const hasEstadoIndex = indexes.some(
                (index) => index.name === 'idx_paciente_estado'
            );

            if (!hasEstadoIndex) {
                console.log('➕ Creando índice idx_paciente_estado...');
                await queryInterface.addIndex('paciente', ['estado'], {
                    name: 'idx_paciente_estado',
                    transaction,
                });
                console.log('✅ Índice creado correctamente');
            } else {
                console.log('ℹ️  Índice idx_paciente_estado ya existe');
            }

            await transaction.commit();
            console.log('✅ Migración completada exitosamente');
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error durante la migración:', error);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            console.log('🔄 Revirtiendo migración de tabla paciente...');

            const tables = await queryInterface.showAllTables();

            if (tables.includes('paciente')) {
                const tableDescription = await queryInterface.describeTable(
                    'paciente'
                );

                // Eliminar índice
                const indexes = await queryInterface.showIndex('paciente');
                const hasEstadoIndex = indexes.some(
                    (index) => index.name === 'idx_paciente_estado'
                );

                if (hasEstadoIndex) {
                    console.log('➖ Eliminando índice idx_paciente_estado...');
                    await queryInterface.removeIndex(
                        'paciente',
                        'idx_paciente_estado',
                        { transaction }
                    );
                    console.log('✅ Índice eliminado');
                }

                // Eliminar columna
                if (tableDescription.estado) {
                    console.log('➖ Eliminando columna "estado"...');
                    await queryInterface.removeColumn('paciente', 'estado', {
                        transaction,
                    });
                    console.log('✅ Columna "estado" eliminada');
                }
            }

            await transaction.commit();
            console.log('✅ Reversión completada exitosamente');
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error durante la reversión:', error);
            throw error;
        }
    },
};
