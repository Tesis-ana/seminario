const { QueryInterface, DataTypes } = require('sequelize');

/**
 * Migración para agregar el campo 'lado' a la tabla imagen
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            console.log('🔄 Iniciando migración de tabla imagen...');

            // Verificar si la tabla imagen existe
            const tables = await queryInterface.showAllTables();

            if (!tables.includes('imagen')) {
                console.log('⚠️  La tabla imagen no existe. Creándola...');
                await queryInterface.createTable(
                    'imagen',
                    {
                        id: {
                            type: DataTypes.INTEGER,
                            autoIncrement: true,
                            primaryKey: true,
                        },
                        nombre_archivo: {
                            type: DataTypes.STRING(255),
                            allowNull: true,
                        },
                        fecha_captura: {
                            type: DataTypes.DATE,
                            allowNull: false,
                        },
                        ruta_archivo: {
                            type: DataTypes.TEXT,
                            allowNull: true,
                        },
                        lado: {
                            type: DataTypes.BOOLEAN,
                            allowNull: false,
                            defaultValue: false,
                        },
                        paciente_id: {
                            type: DataTypes.INTEGER,
                            allowNull: true,
                            references: {
                                model: 'paciente',
                                key: 'id',
                            },
                            onUpdate: 'CASCADE',
                            onDelete: 'SET NULL',
                        },
                        createdAt: {
                            type: DataTypes.DATE,
                            allowNull: false,
                            defaultValue: Sequelize.NOW,
                        },
                        updatedAt: {
                            type: DataTypes.DATE,
                            allowNull: false,
                            defaultValue: Sequelize.NOW,
                        },
                    },
                    { transaction }
                );
                console.log('✅ Tabla imagen creada correctamente');
            } else {
                console.log('📋 Verificando estructura de tabla imagen...');

                // Obtener las columnas existentes
                const tableDescription = await queryInterface.describeTable(
                    'imagen'
                );

                // Verificar si la columna 'lado' ya existe
                if (!tableDescription.lado) {
                    console.log(
                        '➕ Agregando columna "lado" a la tabla imagen...'
                    );
                    await queryInterface.addColumn(
                        'imagen',
                        'lado',
                        {
                            type: DataTypes.BOOLEAN,
                            allowNull: false,
                            defaultValue: false,
                        },
                        { transaction }
                    );
                    console.log('✅ Columna "lado" agregada correctamente');
                } else {
                    console.log(
                        'ℹ️  La columna "lado" ya existe en la tabla imagen'
                    );

                    // Actualizar registros existentes con valores vacíos o inválidos
                    console.log(
                        '🔧 Actualizando registros existentes con valores predeterminados...'
                    );
                    await queryInterface.sequelize.query(
                        "UPDATE imagen SET lado = 0 WHERE lado IS NULL OR lado = '' OR lado NOT IN (0, 1)",
                        { transaction }
                    );
                    console.log('✅ Registros existentes actualizados');
                }

                // Verificar y actualizar otras columnas si es necesario
                if (
                    tableDescription.nombre_archivo &&
                    tableDescription.nombre_archivo.type !== 'VARCHAR(255)'
                ) {
                    console.log('🔧 Actualizando columna nombre_archivo...');
                    await queryInterface.changeColumn(
                        'imagen',
                        'nombre_archivo',
                        {
                            type: DataTypes.STRING(255),
                            allowNull: true,
                        },
                        { transaction }
                    );
                }

                if (
                    tableDescription.ruta_archivo &&
                    tableDescription.ruta_archivo.type !== 'TEXT'
                ) {
                    console.log('🔧 Actualizando columna ruta_archivo...');
                    await queryInterface.changeColumn(
                        'imagen',
                        'ruta_archivo',
                        {
                            type: DataTypes.TEXT,
                            allowNull: true,
                        },
                        { transaction }
                    );
                }

                // Verificar la foreign key de paciente_id
                if (tableDescription.paciente_id) {
                    console.log('🔧 Verificando relación con paciente...');
                    // La foreign key debería estar configurada correctamente
                    // Si necesitas actualizarla, puedes hacerlo aquí
                }
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
            console.log('🔄 Revirtiendo migración de tabla imagen...');

            const tables = await queryInterface.showAllTables();

            if (tables.includes('imagen')) {
                const tableDescription = await queryInterface.describeTable(
                    'imagen'
                );

                if (tableDescription.lado) {
                    console.log('➖ Eliminando columna "lado"...');
                    await queryInterface.removeColumn('imagen', 'lado', {
                        transaction,
                    });
                    console.log('✅ Columna "lado" eliminada');
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
