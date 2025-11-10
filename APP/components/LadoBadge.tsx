import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Configuración de lados con sus colores e íconos
export const LADOS_CONFIG = {
    izquierdo: {
        color: '#10b981', // Verde
        bgColor: '#d1fae5',
        icon: '⬅️',
        label: 'Izquierdo',
    },
    derecho: {
        color: '#3b82f6', // Azul
        bgColor: '#dbeafe',
        icon: '➡️',
        label: 'Derecho',
    },
    sin_asignar: {
        color: '#f59e0b', // Naranja/Amarillo
        bgColor: '#fef3c7',
        icon: '⚠️',
        label: 'Sin asignar',
    },
} as const;

type LadoType = 'izquierdo' | 'derecho' | 'sin_asignar';

interface LadoBadgeProps {
    lado: boolean | null; // true=derecho, false=izquierdo, null=sin asignar
    showIcon?: boolean;
}

/**
 * Componente Badge para mostrar el lado de la herida
 */
export default function LadoBadge({ lado, showIcon = true }: LadoBadgeProps) {
    const ladoKey: LadoType =
        lado === null ? 'sin_asignar' : lado ? 'derecho' : 'izquierdo';
    const config = LADOS_CONFIG[ladoKey];

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

interface LadoSelectorProps {
    ladoActual: boolean | null;
    onChange: (lado: boolean | null) => void;
    disabled?: boolean;
}

/**
 * Componente Selector de Lado para asignar el lado de la herida
 */
export function LadoSelector({
    ladoActual,
    onChange,
    disabled = false,
}: LadoSelectorProps) {
    const opciones: Array<{ key: LadoType; valor: boolean | null }> = [
        { key: 'izquierdo', valor: false },
        { key: 'derecho', valor: true },
        { key: 'sin_asignar', valor: null },
    ];

    return (
        <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Lado de la Herida:</Text>
            <View style={styles.buttonGrid}>
                {opciones.map(({ key, valor }) => {
                    const config = LADOS_CONFIG[key];
                    const isSelected = ladoActual === valor;
                    return (
                        <TouchableOpacity
                            key={key}
                            onPress={() => !disabled && onChange(valor)}
                            disabled={disabled}
                            style={[
                                styles.button,
                                isSelected
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
                                        color: isSelected
                                            ? config.color
                                            : '#6b7280',
                                        fontWeight: isSelected ? '600' : '400',
                                    },
                                ]}
                            >
                                {config.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    icon: {
        fontSize: 12,
        marginRight: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
    },
    selectorContainer: {
        marginBottom: 8,
    },
    selectorLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    buttonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    button: {
        width: '31%',
        marginHorizontal: '1%',
        marginBottom: 8,
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonIcon: {
        fontSize: 13,
        marginRight: 4,
    },
    buttonText: {
        fontSize: 12,
    },
});
