import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { searchPatientByRut, Paciente } from '@/lib/api'
import { AppHeader, Card, layoutStyles } from '@/components/ui'

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
    <View style={layoutStyles.container}>
      <AppHeader title="WoundNetB7 AI" subtitle="Buscar" />
      <View style={layoutStyles.body}>
        <Card>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Buscar Paciente por RUT</Text>
          <TextInput style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding:8, marginBottom:12 }} placeholder="Ingrese RUT" value={query} onChangeText={setQuery} />
          <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:10, borderRadius:8, alignItems:'center', marginBottom:12 }} onPress={handleSearch}>
            <Text style={{ color:'#fff', fontWeight:'600' }}>Buscar</Text>
          </TouchableOpacity>
          {result && (
            <TouchableOpacity style={{ paddingVertical: 12, borderTopWidth:1, borderColor:'#eef2f7' }} onPress={() => router.push(`/professional/patient/${result.id}`)}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>{result.user.nombre}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{result.user.rut}</Text>
            </TouchableOpacity>
          )}
          {error && <Text style={{ color:'#ef4444' }}>{error}</Text>}
        </Card>
      </View>
    </View>
  )
}
