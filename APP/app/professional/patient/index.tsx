import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Modal,
    Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import {
    getConsultationsForPatient,
    getImagesForPatient,
    getSegmentationByImageId,
    getPwatscoreByImageId,
    API_URL,
    type Consulta,
    type Imagen,
    type Segmentacion,
    type Pwatscore,
} from '@/lib/api';
import { AppHeader } from '@/components/ui/app-header';
import { Card } from '@/components/ui/card-native';
import {
    Upload,
    Plus,
    Calendar,
    FileText,
    Loader2,
    ClipboardList,
    User,
    Image as ImageIcon,
} from 'lucide-react-native';

interface ImageWithData {
    imagen: Imagen;
    segmentacion: Segmentacion | null;
    pwatscore: Pwatscore | null;
}

// <CHANGE> Memoized color blending function
const blendColors = (color1: string, color2: string, ratio: number): string => {
    const hex = (c: string) => parseInt(c.substring(1), 16);
    const r1 = (hex(color1) >> 16) & 255;
    const g1 = (hex(color1) >> 8) & 255;
    const b1 = hex(color1) & 255;
    const r2 = (hex(color2) >> 16) & 255;
    const g2 = (hex(color2) >> 8) & 255;
    const b2 = hex(color2) & 255;

    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
};

// <CHANGE> Extracted and memoized ImageRow component
const ImageRow = memo(
    ({
        imageData,
        patientId,
        onPress,
    }: {
        imageData: ImageWithData;
        patientId: number;
        onPress: (imageData: ImageWithData) => void;
    }) => {
        const { imagen, segmentacion, pwatscore } = imageData;

        // <CHANGE> Memoize calculations
        const sum = useMemo(() => {
            if (!pwatscore) return null;
            return (
                (pwatscore.cat1 ?? 0) +
                (pwatscore.cat2 ?? 0) +
                (pwatscore.cat3 ?? 0) +
                (pwatscore.cat4 ?? 0) +
                (pwatscore.cat5 ?? 0) +
                (pwatscore.cat6 ?? 0) +
                (pwatscore.cat7 ?? 0) +
                (pwatscore.cat8 ?? 0)
            );
        }, [pwatscore]);

        const backgroundColor = useMemo(() => {
            return sum !== null
                ? blendColors('#e6ffe6', '#ffe6e6', sum / 32)
                : 'transparent';
        }, [sum]);

        const handlePress = useCallback(() => {
            onPress(imageData);
        }, [onPress, imageData]);

        return (
            <TouchableOpacity
                style={[styles.tableRow, { backgroundColor }]}
                onPress={handlePress}
            >
                <View style={styles.imageCellContainer}>
                    <Image
                        source={{
                            uri: `${API_URL}/imagenes/${imagen.id}/archivo`,
                        }}
                        style={styles.thumbnailImage}
                        contentFit='cover'
                    />
                </View>
                <View style={styles.maskCellContainer}>
                    {segmentacion ? (
                        <Image
                            source={{
                                uri: `${API_URL}/segmentaciones/${imagen.id}/mask`,
                            }}
                            style={styles.thumbnailImage}
                            contentFit='cover'
                        />
                    ) : (
                        <Text style={styles.emptyCell}>-</Text>
                    )}
                </View>
                <Text style={styles.scoreCellText}>{sum ?? '-'}</Text>
                <Text style={styles.dateCellText}>
                    {new Date(imagen.fecha_captura).toLocaleDateString()}
                </Text>
            </TouchableOpacity>
        );
    }
);

ImageRow.displayName = 'ImageRow';

// <CHANGE> Extracted and memoized ConsultationRow component
const ConsultationRow = memo(({ item }: { item: Consulta }) => (
    <View style={styles.consultationRow}>
        <View style={styles.consultationDateContainer}>
            <Calendar size={14} color='#6b7280' style={styles.iconMargin} />
            <Text style={styles.consultationDate}>{item.fecha}</Text>
        </View>
        <View style={styles.consultationNotesContainer}>
            <FileText size={14} color='#6b7280' style={styles.iconMarginTop} />
            <Text style={styles.consultationNotes}>{item.notas}</Text>
        </View>
    </View>
));

ConsultationRow.displayName = 'ConsultationRow';

export default function PatientDetail() {
    const { id } = useLocalSearchParams();
    const patientId = Number(id);
    const [consultations, setConsultations] = useState<Consulta[]>([]);
    const [imagesWithData, setImagesWithData] = useState<ImageWithData[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingImages, setLoadingImages] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImageData, setSelectedImageData] =
        useState<ImageWithData | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getConsultationsForPatient(patientId);
                setConsultations(data);
            } catch (e) {
                console.error('Error loading consultations', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [patientId]);

    // <CHANGE> Reload images every time the screen gains focus
    useFocusEffect(
        useCallback(() => {
            const loadImages = async () => {
                setLoadingImages(true);
                try {
                    const images = await getImagesForPatient(patientId);

                    // <CHANGE> Fetch all segmentations and pwatscores in parallel
                    const imagesData = await Promise.all(
                        images.map(async (imagen) => {
                            const [segmentacion, pwatscore] = await Promise.all(
                                [
                                    getSegmentationByImageId(imagen.id).catch(
                                        () => null
                                    ),
                                    getPwatscoreByImageId(imagen.id).catch(
                                        () => null
                                    ),
                                ]
                            );
                            return { imagen, segmentacion, pwatscore };
                        })
                    );

                    setImagesWithData(imagesData);
                } catch (e) {
                    console.error('Error loading images', e);
                } finally {
                    setLoadingImages(false);
                }
            };
            loadImages();
        }, [patientId])
    );

    // <CHANGE> Memoized callbacks
    const handleUploadImage = useCallback(() => {
        router.push({
            pathname: '/professional/patient/upload-image',
            params: { id: String(patientId) },
        });
    }, [patientId]);

    const handleNewConsultation = useCallback(() => {
        router.push({
            pathname: '/professional/patient/new-consultation',
            params: { id: String(patientId) },
        });
    }, [patientId]);

    const handleImageRowPress = useCallback((imageData: ImageWithData) => {
        setSelectedImageData(imageData);
        setModalVisible(true);
    }, []);

    const handleModalClose = useCallback(() => {
        setModalVisible(false);
        setSelectedImageData(null);
    }, []);

    const handleNavigateToEdit = useCallback(() => {
        if (selectedImageData) {
            setModalVisible(false);
            router.push({
                pathname: '/professional/patient/upload-image',
                params: {
                    id: String(patientId),
                    imageId: String(selectedImageData.imagen.id),
                },
            });
        }
    }, [selectedImageData, patientId]);

    // <CHANGE> Memoized render functions
    const renderConsultation = useCallback(
        ({ item }: { item: Consulta }) => <ConsultationRow item={item} />,
        []
    );

    const keyExtractor = useCallback((item: Consulta) => String(item.id), []);

    // <CHANGE> Memoized list header
    const ListHeaderComponent = useMemo(
        () => (
            <>
                <Card>
                    <View style={styles.cardHeader}>
                        <ClipboardList
                            size={18}
                            color='#374151'
                            style={styles.iconMargin}
                        />
                        <Text style={styles.cardTitle}>Acciones</Text>
                    </View>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleUploadImage}
                        >
                            <Upload
                                size={16}
                                color='#fff'
                                style={styles.iconMargin}
                            />
                            <Text style={styles.actionButtonText}>
                                Subir imagen
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleNewConsultation}
                        >
                            <Plus
                                size={16}
                                color='#fff'
                                style={styles.iconMargin}
                            />
                            <Text style={styles.actionButtonText}>
                                Nueva consulta
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Card>

                <Card>
                    <View style={styles.cardHeader}>
                        <ImageIcon
                            size={18}
                            color='#374151'
                            style={styles.iconMargin}
                        />
                        <Text style={styles.cardTitle}>
                            Imágenes y Evaluaciones PWAT
                        </Text>
                    </View>
                    {loadingImages && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size='small' color='#6d5efc' />
                            <Text style={styles.loadingText}>
                                Cargando imágenes...
                            </Text>
                        </View>
                    )}
                    {!loadingImages && imagesWithData.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <ImageIcon
                                size={32}
                                color='#d1d5db'
                                style={styles.emptyIcon}
                            />
                            <Text style={styles.emptyText}>
                                Sin imágenes registradas
                            </Text>
                        </View>
                    )}
                    {!loadingImages && imagesWithData.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={true}
                        >
                            <View style={styles.tableContainer}>
                                <View style={styles.tableHeader}>
                                    <Text style={styles.tableHeaderImage}>
                                        Imagen
                                    </Text>
                                    <Text style={styles.tableHeaderMask}>
                                        Máscara
                                    </Text>
                                    <Text style={styles.tableHeaderScore}>
                                        PWAT Score
                                    </Text>
                                    <Text style={styles.tableHeaderDate}>
                                        Fecha
                                    </Text>
                                </View>
                                {imagesWithData.map((imageData) => (
                                    <ImageRow
                                        key={imageData.imagen.id}
                                        imageData={imageData}
                                        patientId={patientId}
                                        onPress={handleImageRowPress}
                                    />
                                ))}
                            </View>
                        </ScrollView>
                    )}
                </Card>

                <Card>
                    <View style={styles.cardHeader}>
                        <Calendar
                            size={18}
                            color='#374151'
                            style={styles.iconMargin}
                        />
                        <Text style={styles.cardTitle}>Consultas</Text>
                    </View>
                    {loading && (
                        <View style={styles.loadingContainer}>
                            <Loader2
                                size={20}
                                color='#6d5efc'
                                style={styles.iconMargin}
                            />
                            <Text style={styles.loadingText}>
                                Cargando consultas...
                            </Text>
                        </View>
                    )}
                </Card>
            </>
        ),
        [
            loadingImages,
            imagesWithData,
            loading,
            patientId,
            handleUploadImage,
            handleNewConsultation,
            handleImageRowPress,
        ]
    );

    const ListEmptyComponent = useMemo(
        () =>
            !loading ? (
                <View style={styles.emptyConsultationsContainer}>
                    <FileText
                        size={32}
                        color='#d1d5db'
                        style={styles.emptyIcon}
                    />
                    <Text style={styles.emptyText}>
                        Sin consultas registradas
                    </Text>
                    <Text style={styles.emptySubtext}>
                        Las consultas aparecerán aquí una vez que sean creadas
                    </Text>
                </View>
            ) : null,
        [loading]
    );

    return (
        <View style={styles.container}>
            <AppHeader
                title='Estimacion PWAT'
                subtitle={`Paciente ${id}`}
                leftIcon={<User size={20} color='#6d5efc' />}
            />
            <FlatList
                style={styles.body}
                contentContainerStyle={styles.contentContainer}
                data={consultations}
                keyExtractor={keyExtractor}
                ListHeaderComponent={ListHeaderComponent}
                renderItem={renderConsultation}
                ListEmptyComponent={ListEmptyComponent}
                // <CHANGE> Performance optimizations
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={10}
            />

            <Modal
                animationType='fade'
                transparent={true}
                visible={modalVisible}
                onRequestClose={handleModalClose}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={handleModalClose}
                >
                    <Pressable
                        style={styles.modalContent}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {selectedImageData && (
                            <>
                                <Text style={styles.modalTitle}>
                                    Vista Previa de Imagen
                                </Text>

                                <View style={styles.modalImagesContainer}>
                                    <View style={styles.modalImageSection}>
                                        <Text style={styles.modalImageLabel}>
                                            Imagen Original
                                        </Text>
                                        <Image
                                            source={{
                                                uri: `${API_URL}/imagenes/${selectedImageData.imagen.id}/archivo`,
                                            }}
                                            style={styles.modalImage}
                                            contentFit='contain'
                                        />
                                    </View>

                                    {selectedImageData.segmentacion && (
                                        <View style={styles.modalImageSection}>
                                            <Text
                                                style={styles.modalImageLabel}
                                            >
                                                Máscara
                                            </Text>
                                            <Image
                                                source={{
                                                    uri: `${API_URL}/segmentaciones/${selectedImageData.imagen.id}/mask`,
                                                }}
                                                style={styles.modalImage}
                                                contentFit='contain'
                                            />
                                        </View>
                                    )}
                                </View>

                                {selectedImageData.pwatscore && (
                                    <View style={styles.modalPwatInfo}>
                                        <Text style={styles.modalPwatLabel}>
                                            PWAT Score Total:
                                        </Text>
                                        <Text style={styles.modalPwatValue}>
                                            {(selectedImageData.pwatscore
                                                .cat1 ?? 0) +
                                                (selectedImageData.pwatscore
                                                    .cat2 ?? 0) +
                                                (selectedImageData.pwatscore
                                                    .cat3 ?? 0) +
                                                (selectedImageData.pwatscore
                                                    .cat4 ?? 0) +
                                                (selectedImageData.pwatscore
                                                    .cat5 ?? 0) +
                                                (selectedImageData.pwatscore
                                                    .cat6 ?? 0) +
                                                (selectedImageData.pwatscore
                                                    .cat7 ?? 0) +
                                                (selectedImageData.pwatscore
                                                    .cat8 ?? 0)}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={styles.modalButtonSecondary}
                                        onPress={handleModalClose}
                                    >
                                        <Text
                                            style={
                                                styles.modalButtonSecondaryText
                                            }
                                        >
                                            Cerrar
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.modalButtonPrimary}
                                        onPress={handleNavigateToEdit}
                                    >
                                        <Text
                                            style={
                                                styles.modalButtonPrimaryText
                                            }
                                        >
                                            Editar
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

// <CHANGE> Moved all inline styles to StyleSheet for better performance
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f6f8' },
    body: { padding: 16 },
    contentContainer: { paddingBottom: 16 },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: { fontWeight: '700', fontSize: 16 },
    iconMargin: { marginRight: 6 },
    iconMarginTop: { marginRight: 6, marginTop: 1 },
    actionsRow: { flexDirection: 'row', gap: 8 },
    actionButton: {
        backgroundColor: '#6d5efc',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        color: '#6d5efc',
        fontWeight: '500',
        marginLeft: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyIcon: { marginBottom: 8 },
    emptyText: {
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: 16,
        fontWeight: '500',
    },
    emptySubtext: {
        textAlign: 'center',
        color: '#d1d5db',
        fontSize: 14,
        marginTop: 4,
    },
    tableContainer: { minWidth: '100%' },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 2,
        borderBottomColor: '#e5e7eb',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    tableHeaderImage: {
        fontWeight: '700',
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
        paddingHorizontal: 4,
        width: 80,
    },
    tableHeaderMask: {
        fontWeight: '700',
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
        paddingHorizontal: 4,
        width: 80,
    },
    tableHeaderScore: {
        fontWeight: '700',
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
        paddingHorizontal: 4,
        width: 80,
    },
    tableHeaderDate: {
        fontWeight: '700',
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
        paddingHorizontal: 4,
        width: 100,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingVertical: 8,
        paddingHorizontal: 4,
        alignItems: 'center',
    },
    imageCellContainer: {
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    maskCellContainer: {
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    thumbnailImage: {
        width: 64,
        height: 64,
        borderRadius: 4,
    },
    emptyCell: {
        fontSize: 12,
        color: '#9ca3af',
    },
    scoreCellText: {
        width: 80,
        fontWeight: '600',
        fontSize: 14,
        color: '#374151',
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 600,
        maxHeight: '90%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalImagesContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    modalImageSection: {
        flex: 1,
        alignItems: 'center',
    },
    modalImageLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    modalImage: {
        width: '100%',
        height: 250,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    modalPwatInfo: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    modalPwatLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginRight: 8,
    },
    modalPwatValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#6d5efc',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButtonSecondary: {
        flex: 1,
        backgroundColor: '#e5e7eb',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonSecondaryText: {
        color: '#374151',
        fontWeight: '600',
        fontSize: 16,
    },
    modalButtonPrimary: {
        flex: 1,
        backgroundColor: '#6d5efc',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonPrimaryText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    dateCellText: {
        width: 100,
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    consultationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eef2f7',
        backgroundColor: '#fff',
        marginHorizontal: 16,
    },
    consultationDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 100,
    },
    consultationDate: {
        fontWeight: '500',
        fontSize: 14,
        color: '#374151',
    },
    consultationNotesContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
        marginLeft: 12,
    },
    consultationNotes: {
        flex: 1,
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    emptyConsultationsContainer: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
});
