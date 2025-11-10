import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PatientTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Consultas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="new-consultation"
        options={{
          title: 'Registrar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload-image"
        options={{
          title: 'Imagen',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="image" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
