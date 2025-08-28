import { useLocalSearchParams, router } from 'expo-router'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { useEffect, useState } from 'react'
import { getConsultationsForPatient, Consulta } from '@/lib/api'
import { AppHeader, Card, layoutStyles } from '@/components/ui'

export default function PatientDetail() {
  const { id } = useLocalSearchParams()
  const [consultations, setConsultations] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getConsultationsForPatient(Number(id))
        setConsultations(data)
      } catch (e) {
        console.error('Error loading consultations', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  return (
    <View style={layoutStyles.container}>
      <AppHeader title="WoundNetB7 AI" subtitle={`Paciente ${id}`} />
      <View style={layoutStyles.body}>
        <Card>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Acciones</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:10, borderRadius:8 }} onPress={() => router.push(`/professional/patient/${id}/upload-image`)}>
              <Text style={{ color:'#fff', fontWeight:'600' }}>Subir imagen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor:'#6d5efc', padding:10, borderRadius:8 }} onPress={() => router.push(`/professional/patient/${id}/new-consultation`)}>
              <Text style={{ color:'#fff', fontWeight:'600' }}>Nueva consulta</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Consultas</Text>
          {loading ? (
            <Text>Cargando...</Text>
          ) : (
            <FlatList
              data={consultations}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef2f7' }}>
                  <Text style={{ fontWeight: '500' }}>{item.fecha}</Text>
                  <Text style={{ flex: 1, marginLeft: 8 }}>{item.notas}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>Sin consultas</Text>}
            />
          )}
        </Card>
      </View>
    </View>
  )
}