import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

const ATTENDED_PATIENTS = [
  { id: '1', name: 'Juan Pérez', lastVisit: '2024-01-10' },
  { id: '2', name: 'María López', lastVisit: '2024-02-05' },
  { id: '3', name: 'Ana García', lastVisit: '2024-03-12' },
];

export default function MyPatients() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Pacientes</Text>
      <FlatList
        data={ATTENDED_PATIENTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => router.push(`/professional/patient/${item.id}`)}
          >
            <Text style={styles.itemText}>{item.name}</Text>
            <Text style={styles.itemSub}>Última consulta: {item.lastVisit}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay pacientes</Text>}
      />
    </View>
  );
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
