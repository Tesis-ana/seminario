import React from 'react';
import { useLanguage } from '../lib/LanguageContext';

// Configuración de estados con sus colores e íconos (sin labels traducidos)
export const ESTADOS_CONFIG = {
    en_tratamiento: {
        color: '#10b981', // Verde
        bgColor: '#d1fae5',
        icon: '🟢',
    },
    alta: {
        color: '#3b82f6', // Azul
        bgColor: '#dbeafe',
        icon: '🔵',
    },
    interrumpido: {
        color: '#f59e0b', // Naranja
        bgColor: '#fef3c7',
        icon: '🟡',
    },
    inactivo: {
        color: '#6b7280', // Gris
        bgColor: '#f3f4f6',
        icon: '⚫',
    },
};

/**
 * Componente Badge para mostrar el estado de un paciente
 */
export default function EstadoBadge({
    estado,
    showIcon = true,
    className = '',
}) {
    const { t } = useLanguage();
    const config = ESTADOS_CONFIG[estado] || ESTADOS_CONFIG.en_tratamiento;
    const label = t.patientStates[estado] || t.patientStates.en_tratamiento;

    return (
        <span
            className={`estado-badge ${className}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                color: config.color,
                backgroundColor: config.bgColor,
                border: `1px solid ${config.color}20`,
                whiteSpace: 'nowrap',
            }}
        >
            {showIcon && <span>{config.icon}</span>}
            <span>{label}</span>
        </span>
    );
}

/**
 * Componente Selector de Estado para actualizar el estado de un paciente
 */
export function EstadoSelector({ estadoActual, onChange, disabled = false }) {
    const { t } = useLanguage();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
                style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                }}
            >
                {t.pwat.patientState}:
            </label>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                }}
            >
                {Object.entries(ESTADOS_CONFIG).map(([value, config]) => (
                    <button
                        key={value}
                        type='button'
                        onClick={() => !disabled && onChange(value)}
                        disabled={disabled}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border:
                                estadoActual === value
                                    ? `2px solid ${config.color}`
                                    : '2px solid #e5e7eb',
                            backgroundColor:
                                estadoActual === value
                                    ? config.bgColor
                                    : 'white',
                            color:
                                estadoActual === value
                                    ? config.color
                                    : '#6b7280',
                            fontWeight: estadoActual === value ? '600' : '400',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            opacity: disabled ? 0.5 : 1,
                        }}
                    >
                        <span>{config.icon}</span>
                        <span>{t.patientStates[value]}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Componente para filtrar pacientes por estado
 */
export function EstadoFilter({ estadoActual, onChange }) {
    const { t } = useLanguage();

    return (
        <div
            style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                alignItems: 'center',
            }}
        >
            <span
                style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6b7280',
                }}
            >
                {t.professional.filterByState}:
            </span>
            <button
                onClick={() => onChange(null)}
                style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border:
                        estadoActual === null
                            ? '2px solid #7c3aed'
                            : '1px solid #e5e7eb',
                    backgroundColor:
                        estadoActual === null ? '#ede9fe' : 'white',
                    color: estadoActual === null ? '#7c3aed' : '#6b7280',
                    fontSize: '12px',
                    fontWeight: estadoActual === null ? '600' : '400',
                    cursor: 'pointer',
                }}
            >
                {t.professional.allStates}
            </button>
            {Object.entries(ESTADOS_CONFIG).map(([value, config]) => (
                <button
                    key={value}
                    onClick={() => onChange(value)}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border:
                            estadoActual === value
                                ? `2px solid ${config.color}`
                                : '1px solid #e5e7eb',
                        backgroundColor:
                            estadoActual === value ? config.bgColor : 'white',
                        color:
                            estadoActual === value ? config.color : '#6b7280',
                        fontSize: '12px',
                        fontWeight: estadoActual === value ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    <span>{config.icon}</span>
                    <span>{t.patientStates[value]}</span>
                </button>
            ))}
        </div>
    );
}
