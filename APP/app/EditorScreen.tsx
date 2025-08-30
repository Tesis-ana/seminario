import Slider from "@react-native-community/slider";
import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams } from "expo-router";
import { Brush, Layers2, Trash2, Undo2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import ViewShot from "react-native-view-shot";

// Types
type StrokeData = {
  path: string;
  isEraser: boolean;
  strokeWidth: number;
};

const getStrokeColor = (isEraser: boolean, exportMode: boolean) =>
  exportMode
    ? isEraser
      ? "black"
      : "white"
    : isEraser
    ? "#f5f5f5"
    : "rgba(255,0,0,0.5)";

export default function EditorScreen() {
  const { imageUri } = useLocalSearchParams();
  const uri = Array.isArray(imageUri) ? imageUri[0] : (imageUri as string);

  const [brushSize, setBrushSize] = useState(20);
  const [showSizeSlider, setShowSizeSlider] = useState<
    "brush" | "eraser" | null
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

  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const viewShotRef = useRef<any>(null);
  const strokeHistoryRef = useRef<StrokeData[][]>([]);

  useEffect(() => {
    if (!uri) {
      Alert.alert("Error", "No se proporcionó una imagen válida.");
      setLoading(false);
      return;
    }

    Image.getSize(
      uri,
      (width, height) => {
        const screenWidth = Dimensions.get("window").width;
        const screenHeight = Dimensions.get("window").height - 100;
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
      () => {
        Alert.alert("Error", "No se pudo cargar la imagen.");
        setLoading(false);
      }
    );
  }, [uri]);

  const startNewPath = (x: number, y: number) => {
    setCurrentPath([`M ${x} ${y}`]);
    lastPosRef.current = { x, y };
  };

  const appendToPath = (x: number, y: number) => {
    setCurrentPath((prev) => [...prev, `L ${x} ${y}`]);
    lastPosRef.current = { x, y };
  };

  const commitPath = () => {
    if (currentPath.length === 0) return;
    const fullPath = currentPath.join(" ");
    
    // Guardar el estado actual en el historial antes de modificar
    strokeHistoryRef.current = [...strokeHistoryRef.current, strokes];
    
    setStrokes((prev) => [
      ...prev,
      { path: fullPath, isEraser: isErasing, strokeWidth: brushSize },
    ]);
    setCurrentPath([]);
    lastPosRef.current = null;
  };

  const gesture = Gesture.Pan()
    .onStart((event) => runOnJS(startNewPath)(event.x, event.y))
    .onUpdate((event) => runOnJS(appendToPath)(event.x, event.y))
    .onEnd(() => runOnJS(commitPath)());

  const handleUndo = () => {
    if (strokeHistoryRef.current.length > 0) {
      const previousState = strokeHistoryRef.current.pop();
      setStrokes(previousState || []);
    } else {
      setStrokes([]);
    }
  };

  const saveImage = async (isMask = false) => {
    try {
      setExportMode(true);
      setTimeout(async () => {
        const uri = await viewShotRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert(
          "Éxito",
          isMask
            ? "Máscara exportada correctamente."
            : "Imagen guardada correctamente."
        );
        setExportMode(false);
      }, 100);
    } catch (error) {
      console.error("Error saving image:", error);
      Alert.alert("Error", "No se pudo guardar la imagen.");
      setExportMode(false);
    }
  };

  const clearCanvas = () => {
    strokeHistoryRef.current = [...strokeHistoryRef.current, strokes];
    setStrokes([]);
    setCurrentPath([]);
  };

  if (loading || !imageSize) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Cargando imagen...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.editorContainer}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1 }}
          style={[
            styles.imageContainer,
            {
              width: imageSize.width,
              height: imageSize.height,
              backgroundColor: exportMode ? "black" : "transparent",
            },
          ]}
        >
          {!exportMode && (
            <Image
              source={{ uri }}
              style={[
                styles.image,
                { width: imageSize.width, height: imageSize.height },
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
              {/* Renderizamos todos los trazos en orden */}
              {strokes.map((stroke, i) => (
                <Path
                  key={`stroke-${i}`}
                  d={stroke.path}
                  stroke={getStrokeColor(stroke.isEraser, exportMode)}
                  strokeWidth={stroke.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              
              {/* Trazo actual en progreso */}
              {currentPath.length > 0 && (
                <Path
                  d={currentPath.join(" ")}
                  stroke={getStrokeColor(isErasing, exportMode)}
                  strokeWidth={brushSize}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>
          </GestureDetector>
        </ViewShot>
      </View>

      {showSizeSlider && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            {showSizeSlider === "brush"
              ? "Tamaño de pincel"
              : "Tamaño de borrador"}
          </Text>
          <Slider
            style={{ width: "80%", height: 40 }}
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
            <Text style={{ color: "#4a90e2", marginTop: 5 }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolButton, !isErasing && styles.activeToolButton]}
          onPress={() => setIsErasing(false)}
          onLongPress={() => setShowSizeSlider("brush")}
        >
          <Brush color={!isErasing ? "white" : "#333"} size={24} />
          <Text style={[styles.toolText, !isErasing && styles.activeToolText]}>
            Pintar
          </Text>
        </TouchableOpacity>
        {/* 
        <TouchableOpacity
          style={[styles.toolButton, isErasing && styles.activeToolButton]}
          onPress={() => setIsErasing(true)}
          onLongPress={() => setShowSizeSlider("eraser")}
        >
          <Eraser color={isErasing ? "white" : "#333"} size={24} />
          <Text style={[styles.toolText, isErasing && styles.activeToolText]}>
            Borrar
          </Text>
        </TouchableOpacity>
*/}
        <TouchableOpacity style={styles.toolButton} onPress={handleUndo}>
          <Undo2 color="#333" size={24} />
          <Text style={styles.toolText}>Deshacer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => saveImage(true)}
        >
          <Layers2 color="#333" size={24} />
          <Text style={styles.toolText}>Máscara</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolButton} onPress={clearCanvas}>
          <Trash2 color="#333" size={24} />
          <Text style={styles.toolText}>Limpiar</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  editorContainer: {
    flex: 0.92,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#666" },
  imageContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { position: "absolute", top: 0, left: 0 },
  drawingSurface: { position: "absolute", top: 0, left: 0 },
  toolbar: {
    flex: 0.08,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 2,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    width: "100%",
  },
  toolButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 10,
  },
  activeToolButton: { backgroundColor: "#4a90e2" },
  toolText: { marginTop: 4, fontSize: 12, color: "#333" },
  activeToolText: { color: "#fff" },
  sliderContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 20,
    elevation: 5,
  },
  sliderLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: "#333",
    fontWeight: "500",
  },
  sliderValue: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
});