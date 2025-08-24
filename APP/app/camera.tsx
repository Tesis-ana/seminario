import { Ionicons } from "@expo/vector-icons"
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera"
import { router } from "expo-router"
import { useRef, useState } from "react"
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native"

export default function CameraScreen() {
  const [type, setType] = useState<CameraType>("back")
  const [permission, requestPermission] = useCameraPermissions()
  const [isTakingPicture, setIsTakingPicture] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  if (!permission) {
    // La cámara aún está cargando los permisos
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Cargando permisos de cámara...</Text>
      </View>
    )
  }

  if (!permission.granted) {
    // No se han concedido permisos para la cámara
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Necesitamos acceso a tu cámara para continuar</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Conceder Permiso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    )
  }

  function toggleCameraFacing() {
    setType((current) => (current === "back" ? "front" : "back"))
  }

  const takePicture = async () => {
    if (cameraRef.current && !isTakingPicture) {
      try {
        setIsTakingPicture(true)


        // Tomar la foto
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          exif: false,
          skipProcessing: true, // Para mayor velocidad
        })
        // Navegar al editor con la foto tomada
        router.replace({
          pathname: "/EditorScreen",
          params: { imageUri: photo.uri },
        })
      } catch (error) {
        console.error("Error al tomar la foto:", error)
        Alert.alert("Error", "No se pudo tomar la foto. Inténtalo de nuevo.")
      } finally {
        setIsTakingPicture(false)
      }
    }
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={type} ratio="16:9" />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={isTakingPicture}>
          {isTakingPicture ? <View style={styles.capturingIndicator} /> : <View style={styles.captureButtonInner} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing}>
          <Ionicons name="camera-reverse" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  camera: {
    flex: 1,
  },
  text: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  button: {
    backgroundColor: "#4a90e2",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    width: "80%",
    alignSelf: "center",
  },
  cancelButton: {
    backgroundColor: "#e25c4a",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  iconButton: {
    padding: 15,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  capturingIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ff4757",
  },
})
