import type React from "react"

import { View, Text } from "react-native"

interface StatCardProps {
  color: string
  title: string
  value: number
  icon?: React.ReactNode // Agregando prop opcional para icono
}

export function StatCard({ color, title, value, icon }: Readonly<StatCardProps>) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
        <Text
          style={{
            fontSize: 14,
            color: "#6b7280",
            fontWeight: "500",
            flex: 1,
          }}
        >
          {title}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: color,
        }}
      >
        {value}
      </Text>
    </View>
  )
}
