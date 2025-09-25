import { useLocalSearchParams, router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native'
import { uploadPatientImage, createManualSegmentation, calculatePwatscore, createAutomaticSegmentation, Imagen } from '@/lib/api'
import { AppHeader, Card, layoutStyles } from '@/components/ui'

export default function UploadImage() {
  const { id } = useLocalSearchParams()
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState<Imagen | null>(null)
  const [maskUri, setMaskUri] = useState<string | null>(null)

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 })
    if (!res.canceled && res.assets.length > 0) {
      setImageUri(res.assets[0].uri)
      setUploaded(null)
      setMaskUri(null)
    }
  }

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Activa el acceso a la camara para tomar fotos')
      return
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 })
    if (!res.canceled && res.assets.length > 0) {
      setImageUri(res.assets[0].uri)
      setUploaded(null)
      setMaskUri(null)
    }
  }

  const uploadImage = async () => {
    if (!imageUri) return
    try { const img = await uploadPatientImage(Number(id), imageUri); setUploaded(img); Alert.alert('Imagen subida') }
    catch (e) { console.error(e); Alert.alert('Error', 'No se pudo subir la imagen') }
  }

  const pickMask = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 })
    if (!res.canceled && res.assets.length > 0) { setMaskUri(res.assets[0].uri) }
  }

  const sendMask = async () => {
    if (!uploaded || !maskUri) return
    try { await createManualSegmentation(uploaded.id, maskUri); Alert.alert('Mascara enviada') }
    catch (e) { console.error(e); Alert.alert('Error', 'No se pudo enviar la mascara') }
  }

  const autoSegment = async () => {
    if (!uploaded) return
    try { await createAutomaticSegmentation(uploaded.id); Alert.alert('Segmentacion generada') }
    catch (e) { console.error(e); Alert.alert('Error', 'No se pudo segmentar la imagen') }
  }

  const calculatePWAT = async () => {
    if (!uploaded) { Alert.alert('Sube una imagen primero'); return }
    try { const res = await calculatePwatscore(uploaded.id); Alert.alert('PWAT', JSON.stringify(res.categorias ?? {})) }
    catch (e) { console.error(e); Alert.alert('Error', 'No se pudo calcular PWAT') }
  }

  const editMask = () => { if (!imageUri) return; router.push({ pathname: '/EditorScreen', params: { imageUri } }) }

  return (
    <View style={layoutStyles.container}>
      <AppHeader title="WoundNetB7 AI" subtitle={`Paciente ${id} - Imagen`} />
      <View style={[layoutStyles.body, {alignItems:'center'}]}>
        <Card style={{ width:'100%', alignItems:'center' }}>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Gestion de Imagen</Text>
          {imageUri && <Image source={{ uri: imageUri }} style={{ width: 250, height: 250, borderRadius: 8, marginBottom: 12 }} />}
          <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:12, borderRadius:8, alignItems:'center', width:'100%', marginBottom:10 }} onPress={takePhoto}>
            <Text style={{ color:'#fff', fontWeight:'600' }}>Tomar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:12, borderRadius:8, alignItems:'center', width:'100%', marginBottom:10 }} onPress={pickImage}>
            <Text style={{ color:'#fff', fontWeight:'600' }}>{imageUri ? 'Cambiar Imagen' : 'Seleccionar Imagen'}</Text>
          </TouchableOpacity>
          {imageUri && (
            <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:12, borderRadius:8, alignItems:'center', width:'100%', marginBottom:10 }} onPress={uploadImage}>
              <Text style={{ color:'#fff', fontWeight:'600' }}>Subir Imagen</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:12, borderRadius:8, alignItems:'center', width:'100%', marginBottom:10 }} onPress={editMask} disabled={!imageUri}>
            <Text style={{ color:'#fff', fontWeight:'600' }}>Editar Mascara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:12, borderRadius:8, alignItems:'center', width:'100%', marginBottom:10 }} onPress={pickMask} disabled={!uploaded}>
            <Text style={{ color:'#fff', fontWeight:'600' }}>Seleccionar Mascara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:12, borderRadius:8, alignItems:'center', width:'100%', marginBottom:10 }} onPress={sendMask} disabled={!maskUri || !uploaded}>
            <Text style={{ color:'#fff', fontWeight:'600' }}>Enviar Mascara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:12, borderRadius:8, alignItems:'center', width:'100%', marginBottom:10 }} onPress={autoSegment} disabled={!uploaded}>
            <Text style={{ color:'#fff', fontWeight:'600' }}>Segmentacion Automatica</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:12, borderRadius:8, alignItems:'center', width:'100%' }} onPress={calculatePWAT} disabled={!uploaded}>
            <Text style={{ color:'#fff', fontWeight:'600' }}>Calcular PWAT</Text>
          </TouchableOpacity>
        </Card>
      </View>
    </View>
  )
}
