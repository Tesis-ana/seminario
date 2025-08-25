import { useLocalSearchParams } from 'expo-router';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useState } from 'react';

interface Consultation {
  id: string;
  date: string;
  notes: string;
}

export default function PatientDetail() {
  const { id } = useLocalSearchParams();
  const [consultations] = useState<Consultation[]>([
    { id: 'c1', date: '2024-01-01', notes: 'Consulta inicial' },
    { id: 'c2', date: '2024-02-15', notes: 'Control mensual' },
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paciente {id}</Text>
      <FlatList
        data={consultations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.notes}>{item.notes}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Sin consultas</Text>}
      />
    </View>
  );
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

