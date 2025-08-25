import { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

// Datos de ejemplo para mostrar pacientes
const MOCK_PATIENTS = [
  { id: '1', name: 'Juan Pérez', rut: '11111111-1' },
  { id: '2', name: 'María López', rut: '22222222-2' },
  { id: '3', name: 'Ana García', rut: '33333333-3' },
];

export default function ProfessionalHome() {
  const [query, setQuery] = useState('');

  const filtered = MOCK_PATIENTS.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buscar Pacientes</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre del paciente"
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => router.push(`/professional/patient/${item.id}`)}
          >
            <Text style={styles.itemText}>{item.name}</Text>
            <Text style={styles.itemSub}>{item.rut}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Sin pacientes</Text>}
      />
    </View>
  );
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
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: { fontSize: 16, fontWeight: '500' },
  itemSub: { fontSize: 12, color: '#666' },
  empty: { textAlign: 'center', marginTop: 20, color: '#888' },
});

