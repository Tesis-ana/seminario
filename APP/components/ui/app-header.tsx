import type React from "react"
import { View, Text, StyleSheet, type TextStyle, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"

type HeaderProps = {
  title?: string
  subtitle?: string
  right?: React.ReactNode
  showHome?: boolean
  onPressHome?: () => void
  variant?: "brand" | "custom"
  leftIcon?: React.ReactNode
}

export function AppHeader({
  title,
  subtitle,
  right,
  showHome = true,
  onPressHome,
  variant = "brand",
}: Readonly<HeaderProps>) {
  const isBrand = variant !== "custom"
  const titleText = isBrand ? "Estimación PWAT" : (title ?? "Estimación PWAT")
  const subtitleText = isBrand ? "Panel de Profesionales" : (subtitle ?? "")

  return (
    <SafeAreaView edges={["top"]} style={styles.header}>
      <View style={styles.headerInner}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>EP</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{titleText}</Text>
            {subtitleText ? <Text style={styles.headerSub}>{subtitleText}</Text> : null}
          </View>
        </View>
        <View>
          {right ??
            (showHome ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Ir al inicio"
                onPress={onPressHome ?? (() => router.replace("/professional"))}
              >
                <Ionicons name="home" size={22} color="#fff" />
              </TouchableOpacity>
            ) : null)}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#6d5efc",
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 6,
  },
  headerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  logoText: {
    color: "#fff",
    fontWeight: "700" as TextStyle["fontWeight"],
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSub: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
  },
})
