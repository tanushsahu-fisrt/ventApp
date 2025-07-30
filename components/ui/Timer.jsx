import React from "react"
import { View, Text, StyleSheet } from "react-native"

const Timer = ({ seconds, label, variant = "default", showWarning = false }) => {
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getTimerColor = () => {
    if (showWarning) {
      if (seconds <= 60) return "#ff4444" 
      if (seconds <= 300) return "#ffa726" 
    }
    return "white"
  }

  const getTimerStyle = () => {
    switch (variant) {
      case "large":
        return [styles.timer, styles.largeTimer, { color: getTimerColor() }]
      case "small":
        return [styles.timer, styles.smallTimer, { color: getTimerColor() }]
      default:
        return [styles.timer, { color: getTimerColor() }]
    }
  }

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: getTimerColor() }]}>{label}</Text>}
      <Text style={getTimerStyle()}>{formatTime(seconds)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  timer: {
    fontSize: 24,
    fontWeight: "bold",
  },
  largeTimer: {
    fontSize: 32,
  },
  smallTimer: {
    fontSize: 18,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
  },
})

export default Timer