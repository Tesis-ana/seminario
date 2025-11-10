import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { searchPatientByRut, Paciente } from '@/lib/api';
import { AppHeader } from '@/components/ui/app-header';
import { Card } from '@/components/ui/card-native';
import { layoutStyles } from '@/components/ui/styles';
import { formatRutInput, validateRut, cleanRut } from '@/lib/rutUtils';

export default function SearchPatients() {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<Paciente | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isValidRut, setIsValidRut] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const performSearch = async (rutToSearch: string) => {
        if (isSearching) return; // Evitar búsquedas múltiples simultáneas

        try {
            setIsSearching(true);
            setError(null);
            const cleanedRut = cleanRut(rutToSearch);
            const patient = await searchPatientByRut(cleanedRut);
            setResult(patient);
        } catch {
            setResult(null);
            setError('Paciente no encontrado');
        } finally {
            setIsSearching(false);
        }
    };

    const handleRutChange = (text: string) => {
        const formatted = formatRutInput(text);
        setQuery(formatted);
        const isValid = formatted.length >= 9 && validateRut(formatted);
        setIsValidRut(isValid);

        if (!isValid) {
            setResult(null);
            setError(null);
        } else {
            // Búsqueda automática cuando el RUT es válido
            performSearch(formatted);
        }
    };

    const getBorderStyle = () => {
        if (query.length === 0) {
            return { borderColor: '#e5e7eb', backgroundColor: '#ffffff' };
        }
        if (isValidRut) {
            return { borderColor: '#10b981', backgroundColor: '#f0fdf4' };
        }
        return { borderColor: '#ef4444', backgroundColor: '#fef2f2' };
    };

    const handleSearch = async () => {
        if (!query || !isValidRut) {
            setError('Por favor ingrese un RUT válido');
            return;
        }
        await performSearch(query);
    };

    return (
        <View style={layoutStyles.container}>
            <AppHeader title='WoundNetB7 AI' subtitle='Buscar' />
            <View style={layoutStyles.body}>
                <Card>
                    <Text style={{ fontWeight: '700', marginBottom: 8 }}>
                        Buscar paciente por RUT
                    </Text>
                    <TextInput
                        style={[
                            {
                                borderWidth: 1,
                                borderRadius: 8,
                                padding: 8,
                                marginBottom: 4,
                            },
                            getBorderStyle(),
                        ]}
                        placeholder='Ingrese RUT (ej: 12.345.678-9)'
                        value={query}
                        onChangeText={handleRutChange}
                        maxLength={12}
                        keyboardType='default'
                    />
                    {query.length > 0 && (
                        <Text
                            style={{
                                fontSize: 12,
                                color: isValidRut ? '#059669' : '#dc2626',
                                marginBottom: 8,
                            }}
                        >
                            {isValidRut ? '✓ RUT válido' : '✗ RUT inválido'}
                        </Text>
                    )}
                    <TouchableOpacity
                        style={{
                            backgroundColor:
                                isValidRut && !isSearching
                                    ? '#6d5efc'
                                    : '#9ca3af',
                            padding: 10,
                            borderRadius: 8,
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                        onPress={handleSearch}
                        disabled={!isValidRut || isSearching}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>
                            {isSearching ? 'Buscando...' : 'Buscar'}
                        </Text>
                    </TouchableOpacity>
                    {result && (
                        <TouchableOpacity
                            style={{
                                paddingVertical: 12,
                                borderTopWidth: 1,
                                borderColor: '#eef2f7',
                            }}
                            onPress={() =>
                                router.push({
                                    pathname: '/professional/patient',
                                    params: { id: String(result.id) },
                                })
                            }
                        >
                            <Text style={{ fontSize: 16, fontWeight: '500' }}>
                                {result.user.nombre}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                {result.user.rut}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {error && <Text style={{ color: '#ef4444' }}>{error}</Text>}
                </Card>
            </View>
        </View>
    );
}
