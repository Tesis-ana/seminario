import Slider from '@react-native-community/slider'
import { useLocalSearchParams } from 'expo-router'
import { Brush, Eraser, Layers2, Trash2, Undo2 } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'
import ViewShot from 'react-native-view-shot'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { setMaskDraft } from '@/lib/maskStore'

type StrokeData = {
  path: string
  isEraser: boolean
  strokeWidth: number
}

const getStrokeColor = (isEraser: boolean, exportMode: boolean) =>
  exportMode
    ? isEraser
      ? 'black'
      : 'white'
    : isEraser
    ? '#f5f5f5'
    : 'rgba(255,0,0,0.5)'

export default function EditorScreen() {
  const params = useLocalSearchParams<{ imageUri?: string | string[]; maskUri?: string | string[] }>()
  const imageParam = params.imageUri
  const uri = Array.isArray(imageParam) ? imageParam[0] : (imageParam as string | undefined)
  const maskParam = params.maskUri

  const maskOverlayUri = useMemo(() => {
    if (!maskParam) return undefined
    const value = Array.isArray(maskParam) ? maskParam[0] : maskParam
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }, [maskParam])

  const insets = useSafeAreaInsets()

  const [brushSize, setBrushSize] = useState(20)
  const [showSizeSlider, setShowSizeSlider] = useState<'brush' | 'eraser' | null>(null)
  const [strokes, setStrokes] = useState<StrokeData[]>([])
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [isErasing, setIsErasing] = useState<boolean>(false)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [exportMode, setExportMode] = useState(false)

  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const viewShotRef = useRef<ViewShot | null>(null)
  const strokeHistoryRef = useRef<StrokeData[][]>([])

  useEffect(() => {
    if (!uri) {
      Alert.alert('Error', 'No se proporciono una imagen valida.')
      setLoading(false)
      return
    }

    Image.getSize(
      uri,
      (width, height) => {
        const screenWidth = Dimensions.get('window').width
        const TOOLBAR_ESTIMATED = 80
        const screenHeight =
          Dimensions.get('window').height - insets.top - insets.bottom - TOOLBAR_ESTIMATED
        const scaleFactor = Math.min(screenWidth / width, screenHeight / height)
        setImageSize({
          width: width * scaleFactor,
          height: height * scaleFactor,
        })
        setLoading(false)
      },
      () => {
        Alert.alert('Error', 'No se pudo cargar la imagen.')
        setLoading(false)
      }
    )
  }, [uri, insets.top, insets.bottom])

  const startNewPath = (x: number, y: number) => {
    setCurrentPath([`M ${x} ${y}`])
    lastPosRef.current = { x, y }
  }

  const appendToPath = (x: number, y: number) => {
    setCurrentPath((prev) => [...prev, `L ${x} ${y}`])
    lastPosRef.current = { x, y }
  }

  const commitPath = () => {
    if (currentPath.length === 0) return
    const fullPath = currentPath.join(' ')

    strokeHistoryRef.current = [...strokeHistoryRef.current, strokes]

    setStrokes((prev) => [
      ...prev,
      { path: fullPath, isEraser: isErasing, strokeWidth: brushSize },
    ])
    setCurrentPath([])
    lastPosRef.current = null
  }

  const gesture = Gesture.Pan()
    .onStart((event) => runOnJS(startNewPath)(event.x, event.y))
    .onUpdate((event) => runOnJS(appendToPath)(event.x, event.y))
    .onEnd(() => runOnJS(commitPath)())

  const handleUndo = () => {
    if (strokeHistoryRef.current.length > 0) {
      const previousState = strokeHistoryRef.current.pop()
      setStrokes(previousState || [])
    } else {
      setStrokes([])
    }
  }

  const handleConfirmMask = async () => {
    try {
      setExportMode(true)
      await new Promise((resolve) => setTimeout(resolve, 60))
      const capturedUri = await viewShotRef.current?.capture?.()
      if (!capturedUri) {
        throw new Error('capture_failed')
      }
      setMaskDraft({ uri: capturedUri, createdAt: Date.now() })
      Alert.alert('Mascara lista', 'La mascara se ha generado para la gestion.')
      router.back()
    } catch (error) {
      console.error('Error exporting mask:', error)
      Alert.alert('Error', 'No se pudo generar la mascara.')
    } finally {
      setExportMode(false)
    }
  }

  const clearCanvas = () => {
    strokeHistoryRef.current = [...strokeHistoryRef.current, strokes]
    setStrokes([])
    setCurrentPath([])
  }

  if (loading || !imageSize) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Cargando imagen...</Text>
      </View>
    )
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
        <Ionicons name="home" size={20} color="#fff" />
      </TouchableOpacity>
      <View style={[styles.editorContainer, { paddingTop: insets.top }]}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'jpg', quality: 1 }}
          style={[
            styles.imageContainer,
            {
              width: imageSize.width,
              height: imageSize.height,
              backgroundColor: exportMode ? 'black' : 'transparent',
            },
          ]}
        >
          {!exportMode && uri && (
            <Image
              source={{ uri }}
              style={[styles.image, { width: imageSize.width, height: imageSize.height }]}
              resizeMode="contain"
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
                  opacity: exportMode ? 1 : 0.35,
                },
              ]}
              resizeMode="contain"
            />
          )}
          <GestureDetector gesture={gesture}>
            <Svg
              style={[
                styles.drawingSurface,
                { width: imageSize.width, height: imageSize.height },
              ]}
            >
              {strokes.map((stroke, index) => (
                <Path
                  key={`stroke-${index}`}
                  d={stroke.path}
                  stroke={getStrokeColor(stroke.isEraser, exportMode)}
                  strokeWidth={stroke.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              {currentPath.length > 0 && (
                <Path
                  d={currentPath.join(' ')}
                  stroke={getStrokeColor(isErasing, exportMode)}
                  strokeWidth={brushSize}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </Svg>
          </GestureDetector>
        </ViewShot>
      </View>

      {showSizeSlider && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            {showSizeSlider === 'brush' ? 'Tamano de pincel' : 'Tamano de borrador'}
          </Text>
          <Slider
            style={{ width: '80%', height: 40 }}
            minimumValue={5}
            maximumValue={100}
            value={brushSize}
            onValueChange={setBrushSize}
            minimumTrackTintColor="#4a90e2"
            maximumTrackTintColor="#ddd"
            step={1}
          />
          <Text style={styles.sliderValue}>{Math.round(brushSize)}px</Text>
          <TouchableOpacity onPress={() => setShowSizeSlider(null)}>
            <Text style={{ color: '#4a90e2', marginTop: 5 }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.toolbar, { paddingBottom: Math.max(6, insets.bottom) }]}>
        <TouchableOpacity
          style={[styles.toolButton, !isErasing && styles.activeToolButton]}
          onPress={() => setIsErasing(false)}
          onLongPress={() => setShowSizeSlider('brush')}
        >
          <Brush color={!isErasing ? 'white' : '#333'} size={24} />
          <Text style={[styles.toolText, !isErasing && styles.activeToolText]}>Pintar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolButton, isErasing && styles.activeToolButton]}
          onPress={() => setIsErasing(true)}
          onLongPress={() => setShowSizeSlider('eraser')}
        >
          <Eraser color={isErasing ? 'white' : '#333'} size={24} />
          <Text style={[styles.toolText, isErasing && styles.activeToolText]}>Borrar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolButton} onPress={handleUndo}>
          <Undo2 color="#333" size={24} />
          <Text style={styles.toolText}>Deshacer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolButton} onPress={handleConfirmMask}>
          <Layers2 color="#333" size={24} />
          <Text style={styles.toolText}>Guardar mascara</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolButton} onPress={clearCanvas}>
          <Trash2 color="#333" size={24} />
          <Text style={styles.toolText}>Limpiar</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  editorContainer: {
    flex: 0.92,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    marginHorizontal: 4,
    borderRadius: 10,
  },
  activeToolButton: { backgroundColor: '#4a90e2' },
  toolText: { marginTop: 4, fontSize: 12, color: '#333' },
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
})


