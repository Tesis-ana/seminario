import { useLocalSearchParams, router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import {
  uploadPatientImage,
  createManualSegmentation,
  calculatePwatscore,
  createAutomaticSegmentation,
  Imagen,
} from '@/lib/api'

export default function UploadImage() {
  const { id } = useLocalSearchParams()
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState<Imagen | null>(null)
  const [maskUri, setMaskUri] = useState<string | null>(null)

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    })
    if (!res.canceled && res.assets.length > 0) {
      setImageUri(res.assets[0].uri)
      setUploaded(null)
    }
  }

  const uploadImage = async () => {
    if (!imageUri) return
    try {
      const img = await uploadPatientImage(Number(id), imageUri)
      setUploaded(img)
      Alert.alert('Imagen subida')
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'No se pudo subir la imagen')
    }
  }

  const pickMask = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    })
    if (!res.canceled && res.assets.length > 0) {
      setMaskUri(res.assets[0].uri)
    }
  }

  const sendMask = async () => {
    if (!uploaded || !maskUri) return
    try {
      await createManualSegmentation(uploaded.id, maskUri)
      Alert.alert('Máscara enviada')
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'No se pudo enviar la máscara')
    }
  }

  const autoSegment = async () => {
    if (!uploaded) return
    try {
      await createAutomaticSegmentation(uploaded.id)
      Alert.alert('Segmentación generada')
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'No se pudo segmentar la imagen')
    }
  }

  const calculatePWAT = async () => {
    if (!uploaded) {
      Alert.alert('Sube una imagen primero')
      return
    }
    try {
      const res = await calculatePwatscore(uploaded.id)
      Alert.alert('PWAT', JSON.stringify(res.categorias ?? {}))
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'No se pudo calcular PWAT')
    }
  }

  const editMask = () => {
    if (!imageUri) return
    router.push({ pathname: '/EditorScreen', params: { imageUri } })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paciente {id} - Imagen</Text>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>{imageUri ? 'Cambiar Imagen' : 'Seleccionar Imagen'}</Text>
      </TouchableOpacity>
      {imageUri && (
        <TouchableOpacity style={styles.button} onPress={uploadImage}>
          <Text style={styles.buttonText}>Subir Imagen</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.button} onPress={editMask} disabled={!imageUri}>
        <Text style={styles.buttonText}>Editar Máscara</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={pickMask} disabled={!uploaded}>
        <Text style={styles.buttonText}>Seleccionar Máscara</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={sendMask} disabled={!maskUri || !uploaded}>
        <Text style={styles.buttonText}>Enviar Máscara</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={autoSegment} disabled={!uploaded}>
        <Text style={styles.buttonText}>Segmentación Automática</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={calculatePWAT} disabled={!uploaded}>
        <Text style={styles.buttonText}>Calcular PWAT</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  image: { width: 250, height: 250, marginBottom: 16, borderRadius: 8 },
  button: {
    backgroundColor: '#4a90e2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
})

