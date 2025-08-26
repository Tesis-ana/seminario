import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { searchPatientByRut, Paciente } from '@/lib/api'

export default function SearchPatients() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Paciente | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    try {
      const patient = await searchPatientByRut(query)
      setResult(patient)
      setError(null)
    } catch (e) {
      console.error(e)
      setResult(null)
      setError('Paciente no encontrado')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buscar Paciente por RUT</Text>
      <TextInput
        style={styles.input}
        placeholder="Ingrese RUT"
        value={query}
        onChangeText={setQuery}
      />
      <TouchableOpacity style={styles.button} onPress={handleSearch}>
        <Text style={styles.buttonText}>Buscar</Text>
      </TouchableOpacity>
      {result && (
        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push(`/professional/patient/${result.id}`)}
        >
          <Text style={styles.itemText}>{result.user.nombre}</Text>
          <Text style={styles.itemSub}>{result.user.rut}</Text>
        </TouchableOpacity>
      )}
      {error && <Text style={styles.empty}>{error}</Text>}
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
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: { fontSize: 16, fontWeight: '500' },
  itemSub: { fontSize: 12, color: '#666' },
  empty: { textAlign: 'center', marginTop: 20, color: '#888' },
});

