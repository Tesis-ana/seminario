import { View, StyleSheet } from "react-native"

type ProgressProps = {
  value: number
  color?: string
}

export function ProgressBar({ value, color = "#10b981" }: ProgressProps) {
  return (
    <View style={styles.progressOuter}>
      <View
        style={[
          styles.progressInner,
          {
            width: `${Math.max(0, Math.min(100, value))}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  progressOuter: {
    height: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressInner: {
    height: 8,
    borderRadius: 999,
  },
})
