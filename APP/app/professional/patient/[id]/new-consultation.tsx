import { useLocalSearchParams, router } from 'expo-router'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useState } from 'react'
import { getMyProfessional, registerAttention } from '@/lib/api'

export default function NewConsultation() {
  const { id } = useLocalSearchParams()
  const [notes, setNotes] = useState('')

  const handleSave = async () => {
    try {
      const prof = await getMyProfessional()
      await registerAttention(Number(id), prof.id, notes)
      Alert.alert('Consulta registrada')
      router.back()
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'No se pudo registrar la consulta')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrar Consulta</Text>
      <TextInput
        style={styles.input}
        placeholder="Notas de la consulta"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Guardar</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
})

