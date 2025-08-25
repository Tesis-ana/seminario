import { useColorScheme } from "@/hooks/useColorScheme"
import { useFonts } from "expo-font"
import * as NavigationBar from "expo-navigation-bar"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { StyleSheet, View } from "react-native"
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
    <View style={styles.container}>
      <StatusBar hidden style="auto" />
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
        <Stack.Screen name="professional/index" options={{ title: 'Profesional' }} />
        <Stack.Screen name="professional/patient/[id]/index" options={{ title: 'Paciente' }} />
        <Stack.Screen name="professional/patient/[id]/new-consultation" options={{ title: 'Registrar Consulta' }} />
        <Stack.Screen name="professional/patient/[id]/upload-image" options={{ title: 'Imagen y PWAT' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
