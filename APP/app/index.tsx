import { useEffect } from 'react';
import { router } from 'expo-router';

export default function HomeRedirect() {
  useEffect(() => {
    router.replace('/professional');
  }, []);

  return null;
}
