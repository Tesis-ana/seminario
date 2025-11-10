import { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Card } from '@/components/ui/card-native';
import { AppHeader } from '@/components/ui/app-header';
import { layoutStyles } from '@/components/ui/styles';
import {
    getMyProfessional,
    getPatientsForProfessional,
    Paciente,
    searchPatientByRut,
    AtencionPaciente,
} from '@/lib/api';
import { formatRutInput, validateRut, cleanRut } from '@/lib/rutUtils';

export default function RegisterAttentionList() {
    const [patients, setPatients] = useState<AtencionPaciente[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [found, setFound] = useState<Paciente | null>(null);
    const [searching, setSearching] = useState(false);
    const [isValidRut, setIsValidRut] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const prof = await getMyProfessional();
                // Este endpoint ya retorna los pacientes que tienen una atenciÃ³n con el profesional
                const response = await getPatientsForProfessional(prof.id);
                setPatients(response.pacientes);
            } catch (e) {
                console.error('Error loading patients for register list', e);
                setPatients([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const goRegister = (id: number) => {
        router.push({
            pathname: '/professional/patient/new-consultation',
            params: { id: String(id) },
        });
    };

    const performSearch = async (rutToSearch: string) => {
        if (searching) return; // Evitar búsquedas múltiples simultáneas

        try {
            setSearching(true);
            const cleanedRut = cleanRut(rutToSearch);
            const p = await searchPatientByRut(cleanedRut);
            setFound(p);
        } catch {
            setFound(null);
            // No mostramos alert automáticamente en búsqueda automática
        } finally {
            setSearching(false);
        }
    };

    const handleRutChange = (text: string) => {
        const formatted = formatRutInput(text);
        setQuery(formatted);
        const isValid = formatted.length >= 9 && validateRut(formatted);
        setIsValidRut(isValid);

        if (!isValid) {
            setFound(null);
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
            Alert.alert('Error', 'Por favor ingrese un RUT válido');
            return;
        }

        try {
            setSearching(true);
            const cleanedRut = cleanRut(query);
            const p = await searchPatientByRut(cleanedRut);
            setFound(p);
        } catch {
            setFound(null);
            Alert.alert(
                'Paciente no encontrado',
                'No se encontró un paciente con el RUT ingresado'
            );
        } finally {
            setSearching(false);
        }
    };

    return (
        <View style={layoutStyles.container}>
            <AppHeader /* brand variant shows EP + EstimaciÃ³n PWAT */ />
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
                            backgroundColor: isValidRut ? '#6d5efc' : '#9ca3af',
                            padding: 10,
                            borderRadius: 8,
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                        onPress={handleSearch}
                        disabled={searching || !isValidRut}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>
                            {searching ? 'Buscando...' : 'Buscar'}
                        </Text>
                    </TouchableOpacity>
                    {found && (
                        <TouchableOpacity
                            style={{
                                paddingVertical: 12,
                                borderTopWidth: 1,
                                borderColor: '#eef2f7',
                            }}
                            onPress={() => goRegister(found.id)}
                        >
                            <Text style={{ fontSize: 16, fontWeight: '500' }}>
                                {found.user.nombre}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                {found.user.rut}
                            </Text>
                        </TouchableOpacity>
                    )}
                </Card>

                <Card>
                    <Text style={{ fontWeight: '700', marginBottom: 8 }}>
                        Pacientes atendidos
                    </Text>
                    {loading ? (
                        <Text>Cargando...</Text>
                    ) : (
                        <FlatList
                            data={patients}
                            keyExtractor={(item) => item.atencion_id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#eef2f7',
                                    }}
                                    onPress={() => goRegister(item.paciente.id)}
                                >
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: '500',
                                        }}
                                    >
                                        {item.paciente.nombre}
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: '#6b7280',
                                        }}
                                    >
                                        Última atención:{' '}
                                        {new Date(
                                            item.fecha_atencion
                                        ).toLocaleDateString()}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text
                                    style={{
                                        textAlign: 'center',
                                        marginTop: 20,
                                        color: '#888',
                                    }}
                                >
                                    No hay pacientes con consultas previas
                                </Text>
                            }
                        />
                    )}
                </Card>
            </View>
        </View>
    );
}
