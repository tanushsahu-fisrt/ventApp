import React from "react"
import { View, Text, StyleSheet, Platform } from "react-native"
import { getTimeColor, formatTime } from "../../utils/helper"
import { theme } from "../../config/theme"

const SessionTimer = ({ sessionTime, timeRemaining, plan }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.planText}>{plan}</Text>
      <Text style={[styles.timeText, { color: getTimeColor(timeRemaining) }]}>{formatTime(timeRemaining)}</Text>
      <Text style={styles.sessionText}>Session: {formatTime(sessionTime)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  planText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  timeText: {
    fontSize: 48,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 5,
  },
  sessionText: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
  },
})

export default React.memo(SessionTimer)