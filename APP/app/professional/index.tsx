'use client';

import { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
    Users,
    Images,
    User,
    ChevronRight,
    Loader2,
    UserX,
    List,
    AlertCircle,
    CheckCircle,
    Camera,
} from 'lucide-react-native';
import {
    getMyProfessional,
    getPatientsForProfessional,
    getImagesForPatient,
    AtencionPaciente,
    updatePatient,
    BACKEND_URL,
    Imagen,
} from '@/lib/api';
import { AppHeader } from '@/components/ui/app-header';
import { Card } from '@/components/ui/card-native';
import { StatCard } from '@/components/ui/startCard';
import { layoutStyles } from '@/components/ui/styles';
import EstadoBadge, {
    EstadoFilter,
    EstadoSelector,
    ESTADOS_CONFIG,
} from '@/components/EstadoBadge';
import LadoBadge from '@/components/LadoBadge';

type EstadoType = keyof typeof ESTADOS_CONFIG;

interface StatsData {
    total: number;
    totalImgs: number;
    recientesPct: number;
    alerta: number;
}

export default function MyPatients() {
    const [patients, setPatients] = useState<AtencionPaciente[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<StatsData>({
        total: 0,
        totalImgs: 0,
    });
    const [filtro, setFiltro] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<EstadoType | null>(null);
    const [seleccionado, setSeleccionado] = useState<AtencionPaciente | null>(
        null
    );
    const [imagenes, setImagenes] = useState<Imagen[]>([]);
    const [ultimas, setUltimas] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            const prof = await getMyProfessional();
            const response = await getPatientsForProfessional(prof.id);
            setPatients(response.pacientes);

            // Calcular estadísticas completas
            const now = Date.now();
            let totalImgs = 0;
            let recientes = 0;
            let alerta = 0;
            const fechasUltimas: { [key: number]: string } = {};

            await Promise.all(
                response.pacientes.map(async (atencion) => {
                    try {
                        const imgs = await getImagesForPatient(
                            atencion.paciente.id
                        );
                        if (Array.isArray(imgs) && imgs.length > 0) {
                            totalImgs += imgs.length;

                            // Encontrar imagen más reciente
                            const sorted = imgs.sort(
                                (a: ImageData, b: ImageData) =>
                                    new Date(b.fecha_captura).getTime() -
                                    new Date(a.fecha_captura).getTime()
                            );
                            const latest = sorted[0];
                            fechasUltimas[atencion.paciente.id] =
                                latest.fecha_captura;

                            // Verificar si es reciente (menos de 30 días)
                            const ts = new Date(latest.fecha_captura).getTime();
                            const isReciente =
                                now - ts < 1000 * 60 * 60 * 24 * 30;
                            if (isReciente) {
                                recientes++;
                            } else {
                                alerta++;
                            }
                        } else {
                            alerta++;
                        }
                    } catch {
                        console.error(
                            'Error fetching images for patient',
                            atencion.paciente.id
                        );
                        alerta++;
                    }
                })
            );

            const total = response.pacientes.length || 1;
            setStats({
                total: response.pacientes.length,
                totalImgs,
                recientesPct: Math.round((recientes / total) * 100),
                alerta,
            });
            setUltimas(fechasUltimas);
        } catch (error) {
            console.error('Error fetching patients', error);
            Alert.alert('Error', 'No se pudieron cargar los pacientes');
        } finally {
            setLoading(false);
        }
    };

    const seleccionar = async (atencion: AtencionPaciente) => {
        setSeleccionado(atencion);
        try {
            const imgs = await getImagesForPatient(atencion.paciente.id);
            if (Array.isArray(imgs)) {
                const sorted = imgs.sort(
                    (a: ImageData, b: ImageData) =>
                        new Date(b.fecha_captura).getTime() -
                        new Date(a.fecha_captura).getTime()
                );
                setImagenes(sorted);
            } else {
                setImagenes([]);
            }
        } catch (error) {
            console.error('Error loading images', error);
            setImagenes([]);
        }
    };

    const cambiarEstadoPaciente = async (nuevoEstado: EstadoType) => {
        if (!seleccionado) return;

        try {
            await updatePatient(seleccionado.paciente.id, {
                estado: nuevoEstado,
            });

            // Actualizar localmente
            const updatedPaciente = {
                ...seleccionado,
                paciente: { ...seleccionado.paciente, estado: nuevoEstado },
            };
            setSeleccionado(updatedPaciente);

            // Actualizar en la lista
            setPatients(
                patients.map((p) =>
                    p.paciente.id === seleccionado.paciente.id
                        ? {
                              ...p,
                              paciente: { ...p.paciente, estado: nuevoEstado },
                          }
                        : p
                )
            );

            Alert.alert(
                'Éxito',
                'Estado del paciente actualizado correctamente'
            );
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            Alert.alert(
                'Error',
                'No se pudo actualizar el estado del paciente'
            );
        }
    };

    // Filtrar pacientes
    const filtrados = patients.filter((atencion) => {
        const cumpleRUT =
            !filtro ||
            atencion.paciente.rut.toLowerCase().includes(filtro.toLowerCase());
        const cumpleEstado =
            filtroEstado === null || atencion.paciente.estado === filtroEstado;
        return cumpleRUT && cumpleEstado;
    });

    return (
        <ScrollView style={layoutStyles.container}>
            <AppHeader title='Estimacion PWAT' subtitle='Profesionales' />
            <View style={layoutStyles.body}>
                {/* Estadísticas */}
                <View
                    style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 12,
                        marginBottom: 16,
                    }}
                >
                    <StatCard
                        color='#7c3aed'
                        title='Pacientes'
                        value={stats.total}
                        icon={<Users size={24} color='#7c3aed' />}
                    />
                    <StatCard
                        color='#3b82f6'
                        title='Imágenes totales'
                        value={stats.totalImgs}
                        icon={<Images size={24} color='#3b82f6' />}
                    />
                </View>

                {/* Lista de Pacientes */}
                <Card>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <List
                            size={20}
                            color='#374151'
                            style={{ marginRight: 8 }}
                        />
                        <Text
                            style={{
                                fontWeight: '700',
                                fontSize: 18,
                                color: '#374151',
                            }}
                        >
                            Mis Pacientes
                        </Text>
                    </View>

                    {/* Filtro por RUT */}
                    <View style={{ marginBottom: 12 }}>
                        <TextInput
                            style={{
                                borderWidth: 1,
                                borderColor: '#e5e7eb',
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                fontSize: 14,
                            }}
                            placeholder='Buscar por RUT'
                            value={filtro}
                            onChangeText={setFiltro}
                        />
                    </View>

                    {/* Filtro por Estado */}
                    <View style={{ marginBottom: 16 }}>
                        <EstadoFilter
                            estadoActual={filtroEstado}
                            onChange={setFiltroEstado}
                        />
                    </View>

                    {loading ? (
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 32,
                            }}
                        >
                            <Loader2
                                size={20}
                                color='#6b7280'
                                style={{ marginRight: 8 }}
                            />
                            <Text style={{ color: '#6b7280' }}>
                                Cargando pacientes...
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filtrados}
                            keyExtractor={(item) => item.atencion_id}
                            scrollEnabled={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 16,
                                        paddingHorizontal: 4,
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#eef2f7',
                                    }}
                                    onPress={() => seleccionar(item)}
                                >
                                    <View
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            backgroundColor: '#f3f4f6',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 12,
                                        }}
                                    >
                                        <User size={20} color='#6b7280' />
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={{
                                                fontSize: 16,
                                                fontWeight: '600',
                                                color: '#374151',
                                                marginBottom: 2,
                                            }}
                                        >
                                            {item.paciente.nombre}
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                color: '#6b7280',
                                            }}
                                        >
                                            RUT: {item.paciente.rut}
                                        </Text>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                gap: 8,
                                                marginTop: 4,
                                            }}
                                        >
                                            <EstadoBadge
                                                estado={
                                                    (item.paciente
                                                        .estado as EstadoType) ||
                                                    'en_tratamiento'
                                                }
                                            />
                                            {ultimas[item.paciente.id] && (
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#9ca3af',
                                                    }}
                                                >
                                                    {new Date(
                                                        ultimas[
                                                            item.paciente.id
                                                        ]
                                                    ).toLocaleDateString()}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    <ChevronRight size={20} color='#9ca3af' />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View
                                    style={{
                                        alignItems: 'center',
                                        paddingVertical: 48,
                                        paddingHorizontal: 24,
                                    }}
                                >
                                    <UserX
                                        size={48}
                                        color='#d1d5db'
                                        style={{ marginBottom: 16 }}
                                    />
                                    <Text
                                        style={{
                                            textAlign: 'center',
                                            color: '#6b7280',
                                            fontSize: 16,
                                            fontWeight: '500',
                                            marginBottom: 4,
                                        }}
                                    >
                                        No hay pacientes
                                    </Text>
                                    <Text
                                        style={{
                                            textAlign: 'center',
                                            color: '#9ca3af',
                                            fontSize: 14,
                                        }}
                                    >
                                        Los pacientes aparecerán aquí cuando
                                        sean asignados
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </Card>

                {/* Detalle del Paciente Seleccionado */}
                {seleccionado && (
                    <Card style={{ marginTop: 16 }}>
                        <Text
                            style={{
                                fontWeight: '700',
                                fontSize: 18,
                                color: '#374151',
                                marginBottom: 16,
                            }}
                        >
                            Paciente: {seleccionado.paciente.nombre}
                        </Text>

                        {/* Badges de Estado */}
                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 8,
                                marginBottom: 12,
                            }}
                        >
                            <EstadoBadge
                                estado={
                                    (seleccionado.paciente
                                        .estado as EstadoType) ||
                                    'en_tratamiento'
                                }
                            />
                        </View>

                        {/* Información del Paciente */}
                        <Text
                            style={{
                                fontSize: 14,
                                color: '#6b7280',
                                marginBottom: 16,
                            }}
                        >
                            <Text style={{ fontWeight: '600' }}>RUT:</Text>{' '}
                            {seleccionado.paciente.rut} ·{' '}
                            <Text style={{ fontWeight: '600' }}>Sexo:</Text>{' '}
                            {seleccionado.paciente.sexo}
                        </Text>

                        {/* Selector de Estado */}
                        <View
                            style={{
                                padding: 16,
                                backgroundColor: '#f9fafb',
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#e5e7eb',
                                marginBottom: 16,
                            }}
                        >
                            <EstadoSelector
                                estadoActual={
                                    (seleccionado.paciente
                                        .estado as EstadoType) ||
                                    'en_tratamiento'
                                }
                                onChange={cambiarEstadoPaciente}
                            />
                        </View>

                        {/* Botón para subir imágenes */}
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#3b82f6',
                                padding: 12,
                                borderRadius: 8,
                                marginBottom: 16,
                            }}
                            onPress={() =>
                                router.push({
                                    pathname:
                                        '/professional/patient/upload-image',
                                    params: {
                                        id: String(seleccionado.paciente.id),
                                    },
                                })
                            }
                        >
                            <Camera
                                size={20}
                                color='white'
                                style={{ marginRight: 8 }}
                            />
                            <Text
                                style={{
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: 16,
                                }}
                            >
                                Subir Imagen
                            </Text>
                        </TouchableOpacity>

                        {/* Lista de Imágenes */}
                        <Text
                            style={{
                                fontWeight: '600',
                                fontSize: 16,
                                color: '#374151',
                                marginBottom: 12,
                            }}
                        >
                            Imágenes ({imagenes.length})
                        </Text>
                        {imagenes.length > 0 ? (
                            <FlatList
                                data={imagenes}
                                keyExtractor={(item) => String(item.id)}
                                scrollEnabled={false}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: '#eef2f7',
                                        }}
                                        onPress={() =>
                                            router.push({
                                                pathname:
                                                    '/professional/patient/upload-image',
                                                params: {
                                                    id: String(
                                                        seleccionado.paciente.id
                                                    ),
                                                    imageId: String(item.id),
                                                },
                                            })
                                        }
                                    >
                                        <Image
                                            source={{
                                                uri: `${BACKEND_URL}/imagenes/${item.id}/archivo`,
                                            }}
                                            style={{
                                                width: 60,
                                                height: 60,
                                                borderRadius: 8,
                                                marginRight: 12,
                                            }}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={{
                                                    fontSize: 14,
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                }}
                                            >
                                                ID: {item.id}
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: '#6b7280',
                                                }}
                                            >
                                                {new Date(
                                                    item.fecha_captura
                                                ).toLocaleDateString()}
                                            </Text>
                                            <View style={{ marginTop: 4 }}>
                                                <LadoBadge
                                                    lado={
                                                        item.lado !== undefined
                                                            ? item.lado
                                                            : null
                                                    }
                                                />
                                            </View>
                                        </View>
                                        <ChevronRight
                                            size={20}
                                            color='#9ca3af'
                                        />
                                    </TouchableOpacity>
                                )}
                            />
                        ) : (
                            <Text
                                style={{
                                    textAlign: 'center',
                                    color: '#9ca3af',
                                    paddingVertical: 24,
                                }}
                            >
                                No hay imágenes
                            </Text>
                        )}
                    </Card>
                )}
            </View>
        </ScrollView>
    );
}
