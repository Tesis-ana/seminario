import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { getMyProfessional, getPatientsForProfessional, Paciente, getImagesForPatient } from '@/lib/api'
import { AppHeader, Card, StatCard, layoutStyles } from '@/components/ui'

export default function MyPatients() {
  const [patients, setPatients] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, totalImgs: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const prof = await getMyProfessional()
        const list = await getPatientsForProfessional(prof.id)
        setPatients(list)
        // simple stats: total images across patients
        let imgs = 0
        for (const p of list) {
          try { const arr = await getImagesForPatient(p.id); imgs += Array.isArray(arr) ? arr.length : 0 } catch {}
        }
        setStats({ total: list.length, totalImgs: imgs })
      } catch (error) {
        console.error('Error fetching patients', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <View style={layoutStyles.container}>
      <AppHeader title="WoundNetB7 AI" subtitle="Profesionales" />
      <View style={layoutStyles.body}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard color="#7c3aed" title="Pacientes" value={stats.total} />
          <StatCard color="#3b82f6" title="Imagenes" value={stats.totalImgs} />
        </View>

        <Card>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Mis Pacientes</Text>
          {loading ? (
            <Text>Cargando...</Text>
          ) : (
            <FlatList
              data={patients}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eef2f7' }} onPress={() => router.push({ pathname: '/professional/patient', params: { id: String(item.id) } })}>
                  <Text style={{ fontSize: 16, fontWeight: '500' }}>{item.user.nombre}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.user.rut}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>No hay pacientes</Text>}
            />
          )}
        </Card>
      </View>
    </View>
  )
}
