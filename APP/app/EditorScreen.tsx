'use client';

import Slider from '@react-native-community/slider';
import { useLocalSearchParams } from 'expo-router';
import { Brush, Eraser, Layers2, Trash2, Undo2 } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setMaskDraft } from '@/lib/maskStore';

type StrokeData = {
    path: string;
    isEraser: boolean;
    strokeWidth: number;
};

const getStrokeColor = (isEraser: boolean, exportMode: boolean) =>
    exportMode
        ? isEraser
            ? 'black'
            : 'white'
        : isEraser
        ? '#f5f5f5'
        : 'rgba(255,0,0,0.5)';

export default function EditorScreen() {
    const params = useLocalSearchParams<{
        imageUri?: string | string[];
        maskUri?: string | string[];
    }>();
    const imageParam = params.imageUri;

    const uri = useMemo(() => {
        if (!imageParam) return undefined;
        const rawUri = Array.isArray(imageParam) ? imageParam[0] : imageParam;

        // Don't modify the URI if it's already properly formatted
        if (
            rawUri.startsWith('file://') ||
            rawUri.startsWith('content://') ||
            rawUri.startsWith('http')
        ) {
            return rawUri;
        }

        // Only add file:// if it's a local path that doesn't have a scheme
        return rawUri.startsWith('/') ? `file://${rawUri}` : rawUri;
    }, [imageParam]);

    const maskParam = params.maskUri;

    const maskOverlayUri = useMemo(() => {
        if (!maskParam) return undefined;
        const value = Array.isArray(maskParam) ? maskParam[0] : maskParam;
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }, [maskParam]);

    const insets = useSafeAreaInsets();

    const [brushSize, setBrushSize] = useState(20);
    const [showSizeSlider, setShowSizeSlider] = useState<
        'brush' | 'eraser' | null
    >(null);
    const [imageOpacity, setImageOpacity] = useState(1);
    const [maskOpacity, setMaskOpacity] = useState(0.35);
    const [showOpacitySlider, setShowOpacitySlider] = useState<
        'image' | 'mask' | null
    >(null);
    const [strokes, setStrokes] = useState<StrokeData[]>([]);
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [isErasing, setIsErasing] = useState<boolean>(false);
    const [imageSize, setImageSize] = useState<{
        width: number;
        height: number;
    } | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [exportMode, setExportMode] = useState(false);
    // Estados para zoom y pan
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const viewShotRef = useRef<ViewShot | null>(null);
    const strokeHistoryRef = useRef<StrokeData[][]>([]);

    useEffect(() => {
        if (!uri) {
            Alert.alert('Error', 'No se proporciono una imagen valida.');
            setLoading(false);
            return;
        }
        Image.getSize(
            uri,
            (width, height) => {
                const screenWidth = Dimensions.get('window').width;
                const TOOLBAR_ESTIMATED = 80;
                const screenHeight =
                    Dimensions.get('window').height -
                    insets.top -
                    insets.bottom -
                    TOOLBAR_ESTIMATED;
                const scaleFactor = Math.min(
                    screenWidth / width,
                    screenHeight / height
                );
                setImageSize({
                    width: width * scaleFactor,
                    height: height * scaleFactor,
                });
                setLoading(false);
            },
            (error) => {
                console.error('Error loading image:', error);
                console.error('Failed URI:', uri);
                Alert.alert(
                    'Error',
                    `No se pudo cargar la imagen. URI: ${uri}\nError: ${
                        error.message || error
                    }`
                );
                setLoading(false);
            }
        );
    }, [uri, insets.top, insets.bottom]);

    const transformCoordinates = (x: number, y: number) => {
        if (!imageSize) return { x, y };

        // Centro de la imagen
        const centerX = imageSize.width / 2;
        const centerY = imageSize.height / 2;

        // Ajustar coordenadas relativas al centro de la imagen
        const relativeX = x - centerX;
        const relativeY = y - centerY;

        // Aplicar transformación inversa: primero restar traslación, luego dividir por escala
        const transformedX = (relativeX - translateX.value) / scale.value;
        const transformedY = (relativeY - translateY.value) / scale.value;

        // Volver a coordenadas absolutas
        return {
            x: transformedX + centerX,
            y: transformedY + centerY,
        };
    };

    // Función para ajustar el ancho del trazo según el zoom
    const getAdjustedStrokeWidth = (originalWidth: number) => {
        return originalWidth / scale.value;
    };

    const startNewPath = (x: number, y: number) => {
        const coords = transformCoordinates(x, y);
        setCurrentPath([`M ${coords.x} ${coords.y}`]);
        lastPosRef.current = { x: coords.x, y: coords.y };
    };

    const appendToPath = (x: number, y: number) => {
        const coords = transformCoordinates(x, y);
        setCurrentPath((prev) => [...prev, `L ${coords.x} ${coords.y}`]);
        lastPosRef.current = { x: coords.x, y: coords.y };
    };

    const commitPath = () => {
        if (currentPath.length === 0) return;
        const fullPath = currentPath.join(' ');

        strokeHistoryRef.current = [...strokeHistoryRef.current, strokes];

        setStrokes((prev) => [
            ...prev,
            { path: fullPath, isEraser: isErasing, strokeWidth: brushSize },
        ]);
        setCurrentPath([]);
        lastPosRef.current = null;
    };

    // Gesto de dibujo
    const drawGesture = Gesture.Pan()
        .onStart((event) => runOnJS(startNewPath)(event.x, event.y))
        .onUpdate((event) => runOnJS(appendToPath)(event.x, event.y))
        .onEnd(() => runOnJS(commitPath)());

    // Gesto de zoom (pinch)
    const pinchGesture = Gesture.Pinch()
        .onUpdate((event) => {
            scale.value = Math.max(0.5, Math.min(event.scale, 5));
        })
        .onEnd(() => {
            scale.value = withSpring(Math.max(1, Math.min(scale.value, 3)));
        });

    // Gesto de pan (desplazamiento con dos dedos)
    const panGesture = Gesture.Pan()
        .minPointers(2)
        .onUpdate((event) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY;
        });

    // Gesto combinado - pinch tiene prioridad, luego pan, y finalmente dibujo
    const combinedGesture = Gesture.Simultaneous(
        pinchGesture,
        Gesture.Race(panGesture, drawGesture)
    );

    // Estilo animado para las transformaciones
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: scale.value },
            ],
        };
    });

    const handleUndo = () => {
        if (strokeHistoryRef.current.length > 0) {
            const previousState = strokeHistoryRef.current.pop();
            setStrokes(previousState || []);
        } else {
            setStrokes([]);
        }
    };

    const handleConfirmMask = async () => {
        try {
            setExportMode(true);
            await new Promise((resolve) => setTimeout(resolve, 60));
            const capturedUri = await viewShotRef.current?.capture?.();
            if (!capturedUri) {
                throw new Error('capture_failed');
            }
            setMaskDraft({ uri: capturedUri, createdAt: Date.now() });
            Alert.alert(
                'Mascara lista',
                'La mascara se ha generado para la gestion.'
            );
            router.back();
        } catch (error) {
            console.error('Error exporting mask:', error);
            Alert.alert('Error', 'No se pudo generar la mascara.');
        } finally {
            setExportMode(false);
        }
    };

    const clearCanvas = () => {
        strokeHistoryRef.current = [...strokeHistoryRef.current, strokes];
        setStrokes([]);
        setCurrentPath([]);
    };

    const resetZoom = () => {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
    };

    if (loading || !imageSize) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size='large' color='#4a90e2' />
                <Text style={styles.loadingText}>Cargando imagen...</Text>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <TouchableOpacity
                onPress={() => router.replace('/professional')}
                style={{
                    position: 'absolute',
                    top: insets.top + 8,
                    left: 12,
                    zIndex: 10,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: 8,
                    borderRadius: 20,
                }}
            >
                <Ionicons name='home' size={20} color='#fff' />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleUndo}
                style={{
                    position: 'absolute',
                    top: insets.top + 8,
                    right: 12,
                    zIndex: 10,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: 8,
                    borderRadius: 20,
                }}
            >
                <Undo2 color='#fff' size={20} />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setShowOpacitySlider('mask')}
                style={{
                    position: 'absolute',
                    top: insets.top + 56, // Position below the undo button
                    right: 12,
                    zIndex: 10,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: 8,
                    borderRadius: 20,
                }}
            >
                <Ionicons name='layers-outline' size={20} color='#fff' />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setShowOpacitySlider('image')}
                style={{
                    position: 'absolute',
                    top: insets.top + 104, // Position below the mask opacity button
                    right: 12,
                    zIndex: 10,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: 8,
                    borderRadius: 20,
                }}
            >
                <Ionicons name='image-outline' size={20} color='#fff' />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={resetZoom}
                style={{
                    position: 'absolute',
                    top: insets.top + 152, // Position below the image opacity button
                    right: 12,
                    zIndex: 10,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: 8,
                    borderRadius: 20,
                }}
            >
                <Ionicons name='expand-outline' size={20} color='#fff' />
            </TouchableOpacity>

            {/* Instrucciones de zoom */}
            <View
                style={{
                    position: 'absolute',
                    top: insets.top + 8,
                    left: 60,
                    right: 60,
                    zIndex: 5,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: 8,
                    borderRadius: 12,
                }}
            >
                <Text
                    style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}
                >
                    Pellizca para zoom • Arrastra con 2 dedos para mover • 1
                    dedo para dibujar
                </Text>
            </View>

            <View style={[styles.editorContainer, { paddingTop: insets.top }]}>
                <GestureDetector gesture={combinedGesture}>
                    <Animated.View style={[animatedStyle]}>
                        <ViewShot
                            ref={viewShotRef}
                            options={{ format: 'jpg', quality: 1 }}
                            style={[
                                styles.imageContainer,
                                {
                                    width: imageSize.width,
                                    height: imageSize.height,
                                    backgroundColor: exportMode
                                        ? 'black'
                                        : 'transparent',
                                },
                            ]}
                        >
                            {!exportMode && uri && (
                                <Image
                                    source={{ uri }}
                                    style={[
                                        styles.image,
                                        {
                                            width: imageSize.width,
                                            height: imageSize.height,
                                            opacity: imageOpacity,
                                        },
                                    ]}
                                    resizeMode='contain'
                                    onError={(error) => {
                                        console.error(
                                            'Image component error:',
                                            error.nativeEvent.error
                                        );
                                        Alert.alert(
                                            'Error',
                                            'La imagen no se pudo mostrar correctamente.'
                                        );
                                    }}
                                />
                            )}
                            {maskOverlayUri && (
                                <Image
                                    source={{ uri: maskOverlayUri }}
                                    style={[
                                        styles.maskOverlay,
                                        {
                                            width: imageSize.width,
                                            height: imageSize.height,
                                            opacity: exportMode
                                                ? 1
                                                : maskOpacity,
                                        },
                                    ]}
                                    resizeMode='stretch'
                                    onError={(error) => {
                                        console.error(
                                            'Mask overlay error:',
                                            error.nativeEvent.error
                                        );
                                    }}
                                />
                            )}
                            <Svg
                                style={[
                                    styles.drawingSurface,
                                    {
                                        width: imageSize.width,
                                        height: imageSize.height,
                                    },
                                ]}
                            >
                                {strokes.map((stroke, index) => (
                                    <Path
                                        key={`stroke-${stroke.path.slice(
                                            0,
                                            20
                                        )}-${index}`}
                                        d={stroke.path}
                                        stroke={getStrokeColor(
                                            stroke.isEraser,
                                            exportMode
                                        )}
                                        strokeWidth={getAdjustedStrokeWidth(
                                            stroke.strokeWidth
                                        )}
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        fill='none'
                                    />
                                ))}
                                {currentPath.length > 0 && (
                                    <Path
                                        d={currentPath.join(' ')}
                                        stroke={getStrokeColor(
                                            isErasing,
                                            exportMode
                                        )}
                                        strokeWidth={getAdjustedStrokeWidth(
                                            brushSize
                                        )}
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        fill='none'
                                    />
                                )}
                            </Svg>
                        </ViewShot>
                    </Animated.View>
                </GestureDetector>
            </View>

            {showOpacitySlider && (
                <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>
                        {showOpacitySlider === 'image'
                            ? 'Opacidad de imagen original'
                            : 'Opacidad de máscara'}
                    </Text>
                    <Slider
                        style={{ width: '80%', height: 40 }}
                        minimumValue={0}
                        maximumValue={1}
                        value={
                            showOpacitySlider === 'image'
                                ? imageOpacity
                                : maskOpacity
                        }
                        onValueChange={(value) => {
                            if (showOpacitySlider === 'image') {
                                setImageOpacity(value);
                            } else {
                                setMaskOpacity(value);
                            }
                        }}
                        minimumTrackTintColor='#4a90e2'
                        maximumTrackTintColor='#ddd'
                        step={0.01}
                    />
                    <Text style={styles.sliderValue}>
                        {Math.round(
                            (showOpacitySlider === 'image'
                                ? imageOpacity
                                : maskOpacity) * 100
                        )}
                        %
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowOpacitySlider(null)}
                    >
                        <Text style={{ color: '#4a90e2', marginTop: 5 }}>
                            Cerrar
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {showSizeSlider && (
                <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>
                        {showSizeSlider === 'brush'
                            ? 'Tamano de pincel'
                            : 'Tamano de borrador'}
                    </Text>
                    <Slider
                        style={{ width: '80%', height: 40 }}
                        minimumValue={5}
                        maximumValue={100}
                        value={brushSize}
                        onValueChange={setBrushSize}
                        minimumTrackTintColor='#4a90e2'
                        maximumTrackTintColor='#ddd'
                        step={1}
                    />
                    <Text style={styles.sliderValue}>
                        {Math.round(brushSize)}px
                    </Text>
                    <TouchableOpacity onPress={() => setShowSizeSlider(null)}>
                        <Text style={{ color: '#4a90e2', marginTop: 5 }}>
                            Cerrar
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <View
                style={[
                    styles.toolbar,
                    { paddingBottom: Math.max(6, insets.bottom) },
                ]}
            >
                <TouchableOpacity
                    style={[
                        styles.toolButton,
                        !isErasing && styles.activeToolButton,
                    ]}
                    onPress={() => setIsErasing(false)}
                    onLongPress={() => setShowSizeSlider('brush')}
                >
                    <Brush color={!isErasing ? 'white' : '#333'} size={24} />
                    <Text
                        style={[
                            styles.toolText,
                            !isErasing && styles.activeToolText,
                        ]}
                    >
                        Pintar
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.toolButton,
                        isErasing && styles.activeToolButton,
                    ]}
                    onPress={() => setIsErasing(true)}
                    onLongPress={() => setShowSizeSlider('eraser')}
                >
                    <Eraser color={isErasing ? 'white' : '#333'} size={24} />
                    <Text
                        style={[
                            styles.toolText,
                            isErasing && styles.activeToolText,
                        ]}
                    >
                        Borrar
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.toolButton}
                    onPress={handleConfirmMask}
                >
                    <Layers2 color='#333' size={24} />
                    <Text style={styles.toolText}>Guardar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.toolButton}
                    onPress={clearCanvas}
                >
                    <Trash2 color='#333' size={24} />
                    <Text style={styles.toolText}>Limpiar</Text>
                </TouchableOpacity>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    editorContainer: {
        flex: 0.92,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
    imageContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: { position: 'absolute', top: 0, left: 0 },
    maskOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    drawingSurface: { position: 'absolute', top: 0, left: 0 },
    toolbar: {
        flex: 0.08,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: 2,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        width: '100%',
    },
    toolButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginHorizontal: 4,
        borderRadius: 10,
        minHeight: 60, // Ensure consistent button height
    },
    activeToolButton: { backgroundColor: '#4a90e2' },
    toolText: {
        marginTop: 4,
        fontSize: 12,
        color: '#333',
        textAlign: 'center',
        lineHeight: 14,
    },
    activeToolText: { color: '#fff' },
    sliderContainer: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 10,
        marginHorizontal: 20,
        elevation: 5,
    },
    sliderLabel: {
        fontSize: 14,
        marginBottom: 5,
        color: '#333',
        fontWeight: '500',
    },
    sliderValue: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
});
