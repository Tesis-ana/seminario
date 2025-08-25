import { useLocalSearchParams } from 'expo-router'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useEffect, useState } from 'react'
import { getImagesForPatient, Imagen } from '@/lib/api'

export default function PatientDetail() {
  const { id } = useLocalSearchParams()
  const [images, setImages] = useState<Imagen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getImagesForPatient(Number(id))
        setImages(data)
      } catch (e) {
        console.error('Error loading images', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paciente {id}</Text>
      {loading ? (
        <Text>Cargando...</Text>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.date}>{item.fecha_captura}</Text>
              <Text style={styles.notes}>{item.nombre_archivo}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Sin consultas</Text>}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  date: { fontWeight: '500' },
  notes: { flex: 1, marginLeft: 8 },
  empty: { textAlign: 'center', marginTop: 20, color: '#888' },
});

