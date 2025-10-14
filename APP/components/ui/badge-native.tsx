import type React from "react"
import { View, Text, StyleSheet, type ViewStyle } from "react-native"

type BadgeProps = {
  children: React.ReactNode
  color?: string
  textColor?: string
  style?: ViewStyle
}

export function Badge({ children, color = "#efe9ff", textColor = "#5b21b6", style }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{children as any}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
})
