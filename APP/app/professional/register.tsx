import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native'
import { router } from 'expo-router'
import { AppHeader, Card, layoutStyles } from '@/components/ui'
import { getMyProfessional, getPatientsForProfessional, Paciente, searchPatientByRut } from '@/lib/api'

export default function RegisterAttentionList() {
  const [patients, setPatients] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Paciente | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const prof = await getMyProfessional()
        // Este endpoint ya retorna los pacientes que tienen una atenciÃ³n con el profesional
        const list = await getPatientsForProfessional(prof.id)
        setPatients(list)
      } catch (e) {
        console.error('Error loading patients for register list', e)
        setPatients([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const goRegister = (id: number) => {
    router.push({ pathname: '/professional/patient/new-consultation', params: { id: String(id) } })
  }

  const handleSearch = async () => {
    if (!query) { setFound(null); return }
    try {
      setSearching(true)
      const p = await searchPatientByRut(query)
      setFound(p)
    } catch (e) {
      setFound(null)
      Alert.alert('Paciente no encontrado')
    } finally {
      setSearching(false)
    }
  }

  return (
    <View style={layoutStyles.container}>
      <AppHeader /* brand variant shows EP + EstimaciÃ³n PWAT */ />
      <View style={layoutStyles.body}>
        <Card>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Buscar paciente por RUT</Text>
          <TextInput
            style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding:8, marginBottom:12 }}
            placeholder="Ingrese RUT"
            value={query}
            onChangeText={setQuery}
            autoCapitalize='characters'
          />
          <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:10, borderRadius:8, alignItems:'center', marginBottom:12 }} onPress={handleSearch} disabled={searching}>
            <Text style={{ color:'#fff', fontWeight:'600' }}>{searching ? 'Buscando...' : 'Buscar'}</Text>
          </TouchableOpacity>
          {found && (
            <TouchableOpacity style={{ paddingVertical: 12, borderTopWidth:1, borderColor:'#eef2f7' }} onPress={() => goRegister(found.id)}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>{found.user.nombre}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{found.user.rut}</Text>
            </TouchableOpacity>
          )}
        </Card>

        <Card>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Pacientes atendidos</Text>
          {loading ? (
            <Text>Cargando...</Text>
          ) : (
            <FlatList
              data={patients}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eef2f7' }}
                  onPress={() => goRegister(item.id)}
                >
                  <Text style={{ fontSize: 16, fontWeight: '500' }}>{item.user.nombre}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Con atenciÃ³n registrada</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>No hay pacientes con consultas previas</Text>}
            />
          )}
        </Card>
      </View>
    </View>
  )
}


