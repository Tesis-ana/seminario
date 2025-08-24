import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
export default function HomeScreen() {
  const requestPermission = async (type: "camera" | "gallery") => {
    if (type === "camera") {
      const { status } = await Camera.requestCameraPermissionsAsync()
      return status === "granted"
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      return status === "granted"
    }
  }

  const pickImage = async (type: "camera" | "gallery") => {
    const hasPermission = await requestPermission(type)

    if (!hasPermission) {
      return
    }

    try {
      if (type === "camera") {
        // En lugar de usar ImagePicker, navegamos a nuestra pantalla de cámara personalizada
        router.push("/camera")
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsEditing: true,
          quality: 1,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          router.push({
            pathname: "/EditorScreen",
            params: { imageUri: result.assets[0].uri },
          })
        }
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error)
      Alert.alert("Error", `Hubo un problema al ${type === "camera" ? "abrir la cámara" : "seleccionar la imagen"}.`)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Editor de Máscaras</Text>
        <Text style={styles.subtitle}>Selecciona una imagen para comenzar a editar</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.galleryButton]} onPress={() => pickImage("gallery")}>
          <Text style={styles.buttonText}>Seleccionar de Galería</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.cameraButton]} onPress={() => pickImage("camera")}>
          <Text style={styles.buttonText}>Tomar Foto</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Después de seleccionar una imagen, podrás pintar una máscara sobre ella.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  buttonContainer: {
    gap: 20,
  },
  button: {
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  galleryButton: {
    backgroundColor: "#4a90e2",
  },
  cameraButton: {
    backgroundColor: "#50c878",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  infoContainer: {
    marginTop: 40,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#4a90e2",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
})
