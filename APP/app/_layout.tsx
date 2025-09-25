import { useColorScheme } from "@/hooks/useColorScheme"
import { useFonts } from "expo-font"
import * as NavigationBar from "expo-navigation-bar"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { StyleSheet } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import "react-native-reanimated"

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  })
  useEffect(() => {
    const hideNavigationBar = async () => {
      await NavigationBar.setVisibilityAsync("hidden");
      await NavigationBar.setBehaviorAsync('overlay-swipe')
    }
    hideNavigationBar()
  }, [])

  if (!loaded) {
    return null
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar hidden style="auto" />
        {/** Reservar siempre el área segura inferior para no pegar contenido a la barra de navegación */}
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="EditorScreen" options={{ orientation: "all", headerShown:false}} />
            <Stack.Screen
              name="camera"
              options={{
                title: "Cámara",
                headerShown: false,
                presentation: "fullScreenModal",
              }}
            />
            <Stack.Screen name="professional" options={{ headerShown: false }} />
            {/** Nota: no declaramos rutas no existentes */}
            <Stack.Screen name="+not-found" />
          </Stack>
        </SafeAreaView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
