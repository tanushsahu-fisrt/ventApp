import React from "react"
import { View, Text, StyleSheet } from "react-native"

const Avatar = ({ emoji = "💭", size = 80, backgroundColor }) => {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: backgroundColor || "rgba(255, 255, 255, 0.1)",
  }

  const emojiStyle = {
    fontSize: size * 0.6,
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.emoji, emojiStyle]}>{emoji}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  emoji: {
    textAlign: "center",
  },
})

export default React.memo(Avatar)