import React from "react"
import { View, StyleSheet } from "react-native"
import LinearGradient from "react-native-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { theme } from "../../config/theme"

const GradientContainer = ({ children, colors, style }) => {
  const insets = useSafeAreaInsets()

  const gradientColors = colors || [
    "#1a1a40",
    "#0f0f2e",
    "#1a1a40",
  ]

  return (
    <LinearGradient colors={gradientColors} style={[styles.container, style]}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        {children}
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
})

export default React.memo(GradientContainer)