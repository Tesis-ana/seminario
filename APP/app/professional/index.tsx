import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import {
  getMyProfessional,
  getPatientsForProfessional,
  Paciente,
} from '@/lib/api'

export default function MyPatients() {
  const [patients, setPatients] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const prof = await getMyProfessional()
        const list = await getPatientsForProfessional(prof.id)
        setPatients(list)
      } catch (error) {
        console.error('Error fetching patients', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Pacientes</Text>
      {loading ? (
        <Text>Cargando...</Text>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/professional/patient/${item.id}`)}
            >
              <Text style={styles.itemText}>{item.user.nombre}</Text>
              <Text style={styles.itemSub}>{item.user.rut}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No hay pacientes</Text>}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: { fontSize: 16, fontWeight: '500' },
  itemSub: { fontSize: 12, color: '#666' },
  empty: { textAlign: 'center', marginTop: 20, color: '#888' },
});
