import { useFocusEffect, useLocalSearchParams, router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native'
import {
  uploadPatientImage,
  createManualSegmentation,
  calculatePwatscore,
  createAutomaticSegmentation,
  Imagen,
  downloadSegmentationMask,
  updateSegmentationMask,
  updatePwatscore,
} from '@/lib/api'
import { AppHeader, Card, layoutStyles } from '@/components/ui'
import { consumeMaskDraft } from '@/lib/maskStore'

type SegmentationState = {
  id: number
  metodo: 'manual' | 'automatica'
}

type PwatForm = {
  cat1: string
  cat2: string
  cat3: string
  cat4: string
  cat5: string
  cat6: string
  cat7: string
  cat8: string
}

const INITIAL_PWAT: PwatForm = {
  cat1: '',
  cat2: '',
  cat3: '',
  cat4: '',
  cat5: '',
  cat6: '',
  cat7: '',
  cat8: '',
}

export default function UploadImage() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const patientId = useMemo(() => Number(id), [id])

  const [imageUri, setImageUri] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState<Imagen | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const [pendingMaskUri, setPendingMaskUri] = useState<string | null>(null)
  const [currentMaskUri, setCurrentMaskUri] = useState<string | null>(null)
  const [segmentation, setSegmentation] = useState<SegmentationState | null>(null)
  const [maskBusy, setMaskBusy] = useState(false)

  const [pwatscoreId, setPwatscoreId] = useState<number | null>(null)
  const [pwatValues, setPwatValues] = useState<PwatForm>(INITIAL_PWAT)
  const [isCalculatingPwat, setIsCalculatingPwat] = useState(false)
  const [isSavingPwat, setIsSavingPwat] = useState(false)

  useFocusEffect(
    useCallback(() => {
      const draft = consumeMaskDraft()
      if (draft?.uri) {
        setPendingMaskUri(draft.uri)
        Alert.alert('Mascara cargada', 'Confirma para asociarla al paciente.')
      }
    }, [])
  )

  const resetMaskState = () => {
    setPendingMaskUri(null)
    setCurrentMaskUri(null)
    setSegmentation(null)
  }

  const resetPwatscore = () => {
    setPwatscoreId(null)
    setPwatValues(INITIAL_PWAT)
  }

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    })
    if (!res.canceled && res.assets.length > 0) {
      setImageUri(res.assets[0].uri)
      setUploaded(null)
      resetMaskState()
      resetPwatscore()
    }
  }

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Activa el acceso a la camara para tomar fotos.')
      return
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    })
    if (!res.canceled && res.assets.length > 0) {
      setImageUri(res.assets[0].uri)
      setUploaded(null)
      resetMaskState()
      resetPwatscore()
    }
  }

  const uploadImage = async () => {
    if (!imageUri || Number.isNaN(patientId)) return
    try {
      setIsUploadingImage(true)
      const img = await uploadPatientImage(patientId, imageUri)
      setUploaded(img)
      Alert.alert('Imagen subida', 'La imagen se registro correctamente.')
    } catch (error) {
      console.error(error)
      Alert.alert('Error', 'No se pudo subir la imagen.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const openMaskEditor = (maskUri?: string | null) => {
    if (!imageUri) {
      Alert.alert('Selecciona una imagen', 'Necesitas una imagen base para editar la mascara.')
      return
    }
    const params: Record<string, string> = { imageUri }
    if (maskUri) {
      params.maskUri = encodeURIComponent(maskUri)
    }
    router.push({ pathname: '/EditorScreen', params })
  }

  const pickMask = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    })
    if (!res.canceled && res.assets.length > 0) {
      setPendingMaskUri(res.assets[0].uri)
    }
  }

  const saveMask = async () => {
    if (!uploaded || !pendingMaskUri) {
      Alert.alert('Datos incompletos', 'Necesitas seleccionar una mascara pendiente.')
      return
    }
    try {
      setMaskBusy(true)
      if (segmentation) {
        await updateSegmentationMask(segmentation.id, pendingMaskUri)
        Alert.alert('Mascara actualizada', 'Se actualizo la mascara de la imagen.')
      } else {
        const res = await createManualSegmentation(uploaded.id, pendingMaskUri)
        setSegmentation({ id: res.segmentacionId, metodo: 'manual' })
        Alert.alert('Mascara guardada', 'Se asocio la mascara manual a la imagen.')
      }
      setCurrentMaskUri(pendingMaskUri)
      setPendingMaskUri(null)
    } catch (error) {
      console.error(error)
      Alert.alert('Error', 'No se pudo guardar la mascara.')
    } finally {
      setMaskBusy(false)
    }
  }

  const autoSegment = async () => {
    if (!uploaded) {
      Alert.alert('Sube la imagen primero', 'Debes subir la imagen antes de segmentar.')
      return
    }
    try {
      setMaskBusy(true)
      const res = await createAutomaticSegmentation(uploaded.id)
      setSegmentation({ id: res.segmentacionId, metodo: 'automatica' })
      const localUri = await downloadSegmentationMask(uploaded.id)
      setCurrentMaskUri(localUri)
      setPendingMaskUri(null)
      Alert.alert('Segmentacion completa', 'Se genero una mascara automatica.')
    } catch (error) {
      console.error(error)
      Alert.alert('Error', 'No se pudo calcular la segmentacion automatica.')
    } finally {
      setMaskBusy(false)
    }
  }

  const calculatePWAT = async () => {
    if (!uploaded) {
      Alert.alert('Sube una imagen primero', 'Debes subir la imagen antes de calcular PWAT.')
      return
    }
    if (!segmentation) {
      Alert.alert('Mascara requerida', 'Debes asociar una mascara antes de calcular PWAT.')
      return
    }
    try {
      setIsCalculatingPwat(true)
      const res = await calculatePwatscore(uploaded.id)
      setPwatscoreId(res.pwatscoreId)
      setPwatValues((prev) => ({
        cat1: prev.cat1,
        cat2: prev.cat2,
        cat3: String(res.categorias?.cat3 ?? ''),
        cat4: String(res.categorias?.cat4 ?? ''),
        cat5: String(res.categorias?.cat5 ?? ''),
        cat6: String(res.categorias?.cat6 ?? ''),
        cat7: String(res.categorias?.cat7 ?? ''),
        cat8: String(res.categorias?.cat8 ?? ''),
      }))
      Alert.alert('PWAT calculado', 'Revisa los valores antes de guardar.')
    } catch (error) {
      console.error(error)
      Alert.alert('Error', 'No se pudo calcular el PWAT.')
    } finally {
      setIsCalculatingPwat(false)
    }
  }

  const handlePwatChange = (key: keyof PwatForm, value: string) => {
    setPwatValues((prev) => ({ ...prev, [key]: value }))
  }

  const savePwatscore = async () => {
    if (!pwatscoreId) {
      Alert.alert('Calculo requerido', 'Primero debes calcular el PWAT.')
      return
    }
    if (!pwatValues.cat1 || !pwatValues.cat2) {
      Alert.alert('Campos requeridos', 'Las categorias 1 y 2 son obligatorias.')
      return
    }

    let parsed: Record<string, number>
    try {
      parsed = Object.entries(pwatValues).reduce<Record<string, number>>((acc, [key, value]) => {
        const num = Number(value)
        if (!Number.isFinite(num)) {
          throw new Error(`El valor ${key} no es valido.`)
        }
        acc[key] = num
        return acc
      }, {})
    } catch (error: any) {
      Alert.alert('Valor invalido', error?.message ?? 'Revisa los campos ingresados.')
      return
    }

    try {
      setIsSavingPwat(true)
      await updatePwatscore({
        id: pwatscoreId,
        cat1: parsed.cat1,
        cat2: parsed.cat2,
        cat3: parsed.cat3,
        cat4: parsed.cat4,
        cat5: parsed.cat5,
        cat6: parsed.cat6,
        cat7: parsed.cat7,
        cat8: parsed.cat8,
      })
      Alert.alert('PWAT guardado', 'Los valores se registraron correctamente.')
    } catch (error) {
      console.error(error)
      Alert.alert('Error', 'No se pudo guardar el PWAT.')
    } finally {
      setIsSavingPwat(false)
    }
  }

  return (
    <View style={layoutStyles.container}>
      <AppHeader title="WoundNetB7 AI" subtitle={`Paciente ${id} - Imagen`} variant="custom" />
      <ScrollView contentContainerStyle={[layoutStyles.body, { paddingBottom: 24 }]}>
        <Card style={{ width: '100%' }}>
          <Text style={styles.cardTitle}>1. Seleccion de imagen</Text>
          <Text style={styles.cardSubtitle}>Elige el origen de la fotografia de la herida.</Text>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : null}
          <TouchableOpacity style={styles.primaryButton} onPress={pickImage}>
            <Text style={styles.buttonText}>
              {imageUri ? 'Cambiar imagen (galeria)' : 'Seleccionar desde galeria'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={takePhoto}>
            <Text style={styles.buttonText}>Capturar con camara</Text>
          </TouchableOpacity>
          {imageUri ? (
            <TouchableOpacity
              style={[styles.primaryButton, { opacity: isUploadingImage ? 0.7 : 1 }]}
              onPress={uploadImage}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Subir imagen</Text>
              )}
            </TouchableOpacity>
          ) : null}
          {uploaded ? <Text style={styles.successText}>Imagen subida (ID {uploaded.id}).</Text> : null}
        </Card>

        <Card style={{ width: '100%', opacity: uploaded ? 1 : 0.5 }}>
          <Text style={styles.cardTitle}>2. Mascara de la herida</Text>
          <Text style={styles.cardSubtitle}>
            Dibuja una mascara, selecciona una existente o solicita la version automatica.
          </Text>

          <TouchableOpacity
            style={[styles.secondaryButton, { opacity: uploaded ? 1 : 0.6 }]}
            onPress={() => openMaskEditor(null)}
            disabled={!uploaded}
          >
            <Text style={styles.secondaryButtonText}>Dibujar mascara manualmente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { opacity: uploaded ? 1 : 0.6 }]}
            onPress={pickMask}
            disabled={!uploaded}
          >
            <Text style={styles.secondaryButtonText}>Seleccionar mascara desde galeria</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { opacity: uploaded && !maskBusy ? 1 : 0.6 }]}
            onPress={autoSegment}
            disabled={!uploaded || maskBusy}
          >
            {maskBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.secondaryButtonText}>Calcular mascara automaticamente</Text>
            )}
          </TouchableOpacity>

          {pendingMaskUri ? (
            <View style={styles.maskPreviewContainer}>
              <Text style={styles.infoText}>Mascara pendiente de guardado</Text>
              <Image source={{ uri: pendingMaskUri }} style={styles.maskPreview} />
              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 8 }]}
                onPress={saveMask}
                disabled={maskBusy}
              >
                {maskBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {segmentation ? 'Actualizar mascara' : 'Guardar mascara'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {currentMaskUri ? (
            <View style={styles.maskPreviewContainer}>
              <Text style={styles.infoText}>Mascara asociada</Text>
              <Image source={{ uri: currentMaskUri }} style={styles.maskPreview} />
              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 8 }]}
                onPress={() => openMaskEditor(currentMaskUri)}
                disabled={maskBusy}
              >
                <Text style={styles.secondaryButtonText}>Editar mascara</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Card>

        <Card style={{ width: '100%', opacity: segmentation ? 1 : 0.5 }}>
          <Text style={styles.cardTitle}>3. Calculo PWAT</Text>
          <Text style={styles.cardSubtitle}>
            Las categorias 3 a 8 se precargan desde el backend. Ingresa manualmente las categorias 1 y 2 y ajusta las demas antes de guardar.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, { opacity: segmentation ? 1 : 0.6 }]}
            onPress={calculatePWAT}
            disabled={!segmentation || isCalculatingPwat}
          >
            {isCalculatingPwat ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Calcular PWAT</Text>
            )}
          </TouchableOpacity>

          <View style={styles.pwatGrid}>
            {(['cat1', 'cat2', 'cat3', 'cat4', 'cat5', 'cat6', 'cat7', 'cat8'] as Array<keyof PwatForm>).map((key) => (
              <View key={key} style={styles.pwatField}>
                <Text style={styles.pwatLabel}>{key.toUpperCase()}</Text>
                <TextInput
                  style={styles.pwatInput}
                  value={pwatValues[key]}
                  onChangeText={(text) => handlePwatChange(key, text)}
                  keyboardType="numeric"
                  editable={segmentation !== null}
                  placeholder="0"
                />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 12, opacity: pwatscoreId ? 1 : 0.6 }]}
            onPress={savePwatscore}
            disabled={!pwatscoreId || isSavingPwat}
          >
            {isSavingPwat ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Guardar PWAT</Text>
            )}
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
    color: '#1f2937',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#6d5efc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#4b5563',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: {
    color: '#059669',
    fontSize: 13,
  },
  maskPreviewContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  maskPreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginTop: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#4b5563',
  },
  pwatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  pwatField: {
    width: '45%',
  },
  pwatLabel: {
    fontSize: 12,
    color: '#111827',
    marginBottom: 4,
    fontWeight: '600',
  },
  pwatInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
})





