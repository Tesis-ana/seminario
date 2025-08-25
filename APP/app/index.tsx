import { Redirect } from 'expo-router';

// Redirige al flujo de profesionales mostrando inicialmente "Mis Pacientes".
export default function AppIndex() {
  return <Redirect href="/professional" />;
}
