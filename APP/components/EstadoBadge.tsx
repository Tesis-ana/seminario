import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Configuración de estados con sus colores, íconos y labels
export const ESTADOS_CONFIG = {
    en_tratamiento: {
        color: '#10b981',
        bgColor: '#d1fae5',
        icon: '🟢',
        label: 'En Tratamiento',
    },
    alta: {
        color: '#3b82f6',
        bgColor: '#dbeafe',
        icon: '🔵',
        label: 'Alta',
    },
    interrumpido: {
        color: '#f59e0b',
        bgColor: '#fef3c7',
        icon: '🟡',
        label: 'Interrumpido',
    },
    inactivo: {
        color: '#6b7280',
        bgColor: '#f3f4f6',
        icon: '⚫',
        label: 'Inactivo',
    },
} as const;

type EstadoType = keyof typeof ESTADOS_CONFIG;

interface EstadoBadgeProps {
    estado: EstadoType;
    showIcon?: boolean;
}

/**
 * Componente Badge para mostrar el estado de un paciente
 */
export default function EstadoBadge({
    estado,
    showIcon = true,
}: EstadoBadgeProps) {
    const config = ESTADOS_CONFIG[estado] || ESTADOS_CONFIG.en_tratamiento;

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: config.bgColor,
                    borderColor: config.color + '33',
                },
            ]}
        >
            {showIcon && <Text style={styles.icon}>{config.icon}</Text>}
            <Text style={[styles.label, { color: config.color }]}>
                {config.label}
            </Text>
        </View>
    );
}

interface EstadoSelectorProps {
    estadoActual: EstadoType;
    onChange: (estado: EstadoType) => void;
    disabled?: boolean;
}

/**
 * Componente Selector de Estado para actualizar el estado de un paciente
 */
export function EstadoSelector({
    estadoActual,
    onChange,
    disabled = false,
}: EstadoSelectorProps) {
    return (
        <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Estado del Paciente:</Text>
            <View style={styles.buttonGrid}>
                {(
                    Object.entries(ESTADOS_CONFIG) as [
                        EstadoType,
                        (typeof ESTADOS_CONFIG)[EstadoType]
                    ][]
                ).map(([value, config]) => (
                    <TouchableOpacity
                        key={value}
                        onPress={() => !disabled && onChange(value)}
                        disabled={disabled}
                        style={[
                            styles.button,
                            estadoActual === value
                                ? {
                                      borderColor: config.color,
                                      backgroundColor: config.bgColor,
                                      borderWidth: 2,
                                  }
                                : {
                                      borderColor: '#e5e7eb',
                                      backgroundColor: 'white',
                                      borderWidth: 2,
                                  },
                            disabled && styles.buttonDisabled,
                        ]}
                    >
                        <Text style={styles.buttonIcon}>{config.icon}</Text>
                        <Text
                            style={[
                                styles.buttonText,
                                {
                                    color:
                                        estadoActual === value
                                            ? config.color
                                            : '#6b7280',
                                    fontWeight:
                                        estadoActual === value ? '600' : '400',
                                },
                            ]}
                        >
                            {config.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

interface EstadoFilterProps {
    estadoActual: EstadoType | null;
    onChange: (estado: EstadoType | null) => void;
}

/**
 * Componente para filtrar pacientes por estado
 */
export function EstadoFilter({ estadoActual, onChange }: EstadoFilterProps) {
    return (
        <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Filtrar por Estado:</Text>
            <View style={styles.filterButtons}>
                <TouchableOpacity
                    onPress={() => onChange(null)}
                    style={[
                        styles.filterButton,
                        estadoActual === null
                            ? {
                                  borderColor: '#7c3aed',
                                  backgroundColor: '#ede9fe',
                                  borderWidth: 2,
                              }
                            : {
                                  borderColor: '#e5e7eb',
                                  backgroundColor: 'white',
                                  borderWidth: 1,
                              },
                    ]}
                >
                    <Text
                        style={[
                            styles.filterButtonText,
                            {
                                color:
                                    estadoActual === null
                                        ? '#7c3aed'
                                        : '#6b7280',
                                fontWeight:
                                    estadoActual === null ? '600' : '400',
                            },
                        ]}
                    >
                        Todos
                    </Text>
                </TouchableOpacity>
                {(
                    Object.entries(ESTADOS_CONFIG) as [
                        EstadoType,
                        (typeof ESTADOS_CONFIG)[EstadoType]
                    ][]
                ).map(([value, config]) => (
                    <TouchableOpacity
                        key={value}
                        onPress={() => onChange(value)}
                        style={[
                            styles.filterButton,
                            estadoActual === value
                                ? {
                                      borderColor: config.color,
                                      backgroundColor: config.bgColor,
                                      borderWidth: 2,
                                  }
                                : {
                                      borderColor: '#e5e7eb',
                                      backgroundColor: 'white',
                                      borderWidth: 1,
                                  },
                        ]}
                    >
                        <Text style={styles.filterButtonIcon}>
                            {config.icon}
                        </Text>
                        <Text
                            style={[
                                styles.filterButtonText,
                                {
                                    color:
                                        estadoActual === value
                                            ? config.color
                                            : '#6b7280',
                                    fontWeight:
                                        estadoActual === value ? '600' : '400',
                                },
                            ]}
                        >
                            {config.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    icon: {
        fontSize: 12,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
    },
    selectorContainer: {
        gap: 8,
    },
    selectorLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    buttonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    button: {
        flex: 1,
        minWidth: '45%',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonIcon: {
        fontSize: 13,
    },
    buttonText: {
        fontSize: 13,
    },
    filterContainer: {
        gap: 8,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    filterButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    filterButtonIcon: {
        fontSize: 12,
    },
    filterButtonText: {
        fontSize: 12,
    },
});
