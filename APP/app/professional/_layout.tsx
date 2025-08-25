import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfessionalTabs() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mis Pacientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
