const { DataTypes } = require('sequelize');

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            const tables = await queryInterface.showAllTables();

            if (!tables.includes('laboratorio')) {
                await queryInterface.createTable(
                    'laboratorio',
                    {
                        id: {
                            type: DataTypes.INTEGER,
                            autoIncrement: true,
                            primaryKey: true,
                        },
                        paciente_id: {
                            type: DataTypes.INTEGER,
                            allowNull: false,
                            references: { model: 'paciente', key: 'id' },
                            onUpdate: 'CASCADE',
                            onDelete: 'CASCADE',
                        },
                        hba1c: { type: DataTypes.FLOAT, allowNull: true },
                        glucosa: { type: DataTypes.FLOAT, allowNull: true },
                        creatinina: { type: DataTypes.FLOAT, allowNull: true },
                        colesterol: { type: DataTypes.FLOAT, allowNull: true },
                        trigliceridos: {
                            type: DataTypes.FLOAT,
                            allowNull: true,
                        },
                        microalbuminuria: {
                            type: DataTypes.FLOAT,
                            allowNull: true,
                        },
                        // Opcionalmente timestamps
                        createdAt: {
                            type: DataTypes.DATE,
                            allowNull: false,
                            defaultValue:
                                Sequelize.literal('CURRENT_TIMESTAMP'),
                        },
                        updatedAt: {
                            type: DataTypes.DATE,
                            allowNull: false,
                            defaultValue: Sequelize.literal(
                                'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
                            ),
                        },
                    },
                    { transaction }
                );

                // Índice por paciente para consultas
                try {
                    await queryInterface.addIndex(
                        'laboratorio',
                        ['paciente_id'],
                        { name: 'idx_laboratorio_paciente_id', transaction }
                    );
                } catch (_) {}
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // Eliminar índice si existe
            try {
                await queryInterface.removeIndex(
                    'laboratorio',
                    'idx_laboratorio_paciente_id',
                    { transaction }
                );
            } catch (_) {}

            // Eliminar tabla (si necesitas preservar datos, comenta esta línea)
            await queryInterface.dropTable('laboratorio', { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
