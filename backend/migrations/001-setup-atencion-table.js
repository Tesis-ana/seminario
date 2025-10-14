const { QueryInterface, DataTypes } = require('sequelize');

/**
 * Migración para asegurar que las tablas tengan la estructura correcta
 * para las nuevas funcionalidades de atención automática
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            console.log('🔄 Iniciando migración de base de datos...');

            // Verificar si la tabla atencion existe
            const tables = await queryInterface.showAllTables();

            if (!tables.includes('atencion')) {
                console.log('📝 Creando tabla atencion...');
                await queryInterface.createTable(
                    'atencion',
                    {
                        paciente_id: {
                            type: DataTypes.INTEGER,
                            allowNull: false,
                            primaryKey: true,
                            references: {
                                model: 'paciente',
                                key: 'id',
                            },
                            onUpdate: 'CASCADE',
                            onDelete: 'CASCADE',
                        },
                        profesional_id: {
                            type: DataTypes.INTEGER,
                            allowNull: false,
                            primaryKey: true,
                            references: {
                                model: 'profesional',
                                key: 'id',
                            },
                            onUpdate: 'CASCADE',
                            onDelete: 'CASCADE',
                        },
                        fecha_atencion: {
                            type: DataTypes.DATE,
                            allowNull: false,
                            defaultValue: Sequelize.NOW,
                        },
                    },
                    { transaction }
                );
            } else {
                console.log(
                    '✅ Tabla atencion ya existe, verificando estructura...'
                );

                // Verificar estructura actual
                const tableInfo = await queryInterface.describeTable(
                    'atencion'
                );

                // Si fecha_atencion permite NULL, actualizarla
                if (
                    tableInfo.fecha_atencion &&
                    tableInfo.fecha_atencion.allowNull
                ) {
                    console.log(
                        '🔧 Actualizando campo fecha_atencion para que sea NOT NULL...'
                    );

                    // Primero, actualizar registros que tengan NULL
                    await queryInterface.sequelize.query(
                        'UPDATE atencion SET fecha_atencion = NOW() WHERE fecha_atencion IS NULL',
                        { transaction }
                    );

                    // Luego cambiar la columna para que sea NOT NULL
                    await queryInterface.changeColumn(
                        'atencion',
                        'fecha_atencion',
                        {
                            type: DataTypes.DATE,
                            allowNull: false,
                            defaultValue: Sequelize.NOW,
                        },
                        { transaction }
                    );
                }

                if (!tableInfo.fecha_atencion) {
                    console.log('➕ Agregando campo fecha_atencion...');
                    await queryInterface.addColumn(
                        'atencion',
                        'fecha_atencion',
                        {
                            type: DataTypes.DATE,
                            allowNull: false,
                            defaultValue: Sequelize.NOW,
                        },
                        { transaction }
                    );
                }
            }

            // Verificar índices para mejorar performance
            console.log('🔍 Verificando índices...');

            try {
                await queryInterface.addIndex('atencion', ['paciente_id'], {
                    name: 'idx_atencion_paciente_id',
                    transaction,
                });
            } catch (err) {
                // Índice ya existe, continuar
            }

            try {
                await queryInterface.addIndex('atencion', ['profesional_id'], {
                    name: 'idx_atencion_profesional_id',
                    transaction,
                });
            } catch (err) {
                // Índice ya existe, continuar
            }

            try {
                await queryInterface.addIndex('atencion', ['fecha_atencion'], {
                    name: 'idx_atencion_fecha',
                    transaction,
                });
            } catch (err) {
                // Índice ya existe, continuar
            }

            // Verificar constraints de foreign key
            console.log('🔗 Verificando foreign keys...');

            // Para MySQL, verificar que las foreign keys estén correctas
            const [foreignKeys] = await queryInterface.sequelize.query(
                `SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
         FROM information_schema.KEY_COLUMN_USAGE 
         WHERE TABLE_NAME = 'atencion' AND TABLE_SCHEMA = DATABASE() 
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
                { transaction }
            );

            // Si no hay foreign keys, crearlas
            if (foreignKeys.length === 0) {
                console.log('➕ Agregando foreign key constraints...');

                // FK para paciente
                await queryInterface.addConstraint('atencion', {
                    fields: ['paciente_id'],
                    type: 'foreign key',
                    name: 'fk_atencion_paciente',
                    references: {
                        table: 'paciente',
                        field: 'id',
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                    transaction,
                });

                // FK para profesional
                await queryInterface.addConstraint('atencion', {
                    fields: ['profesional_id'],
                    type: 'foreign key',
                    name: 'fk_atencion_profesional',
                    references: {
                        table: 'profesional',
                        field: 'id',
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                    transaction,
                });
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
            console.log('🔄 Revirtiendo migración...');

            // Remover índices
            try {
                await queryInterface.removeIndex(
                    'atencion',
                    'idx_atencion_paciente_id',
                    { transaction }
                );
                await queryInterface.removeIndex(
                    'atencion',
                    'idx_atencion_profesional_id',
                    { transaction }
                );
                await queryInterface.removeIndex(
                    'atencion',
                    'idx_atencion_fecha',
                    { transaction }
                );
            } catch (err) {
                // Los índices pueden no existir
            }

            // Remover constraints
            try {
                await queryInterface.removeConstraint(
                    'atencion',
                    'fk_atencion_paciente',
                    { transaction }
                );
                await queryInterface.removeConstraint(
                    'atencion',
                    'fk_atencion_profesional',
                    { transaction }
                );
            } catch (err) {
                // Los constraints pueden no existir
            }

            // Nota: No eliminamos la tabla para preservar datos
            // Si necesitas eliminar completamente:
            // await queryInterface.dropTable('atencion', { transaction });

            await transaction.commit();
            console.log('✅ Migración revertida');
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error al revertir migración:', error);
            throw error;
        }
    },
};
