import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function UploadImage() {
  const { id } = useLocalSearchParams();
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled && res.assets.length > 0) {
      setImageUri(res.assets[0].uri);
    }
  };

  const editMask = () => {
    if (!imageUri) return;
    router.push({ pathname: '/EditorScreen', params: { imageUri } });
  };

  const calculatePWAT = () => {
    if (!imageUri) {
      Alert.alert('Selecciona una imagen');
      return;
    }
    Alert.alert('PWAT', 'Cálculo de PWAT simulado');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paciente {id} - Imagen</Text>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>{imageUri ? 'Cambiar Imagen' : 'Seleccionar Imagen'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={editMask} disabled={!imageUri}>
        <Text style={styles.buttonText}>Editar Máscara</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={calculatePWAT} disabled={!imageUri}>
        <Text style={styles.buttonText}>Calcular PWAT</Text>
      </TouchableOpacity>
    </View>
  );
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
});

