import React from "react"
import { View, Text, StyleSheet, ActivityIndicator } from "react-native"
import Ionicons from "react-native-vector-icons/Ionicons"
import { theme } from "../../config/theme"

const ConnectionStatus = ({ joined, remoteUsers, timeRemaining }) => {
  const getStatusInfo = () => {
    if (!joined) {
      return {
        icon: "time-outline",
        text: "Connecting...",
        color: theme.colors.warning,
        showSpinner: true,
      }
    }

    if (remoteUsers.length === 0) {
      return {
        icon: "search-outline",
        text: "Waiting for listener...",
        color: theme.colors.warning,
        showSpinner: true,
      }
    }

    return {
      icon: "checkmark-circle",
      text: `Connected with ${remoteUsers.length} listener${remoteUsers.length > 1 ? "s" : ""}`,
      color: theme.colors.secondary,
      showSpinner: false,
    }
  }

  const status = getStatusInfo()

  return (
    <View style={styles.container}>
      <View style={[styles.statusCard, { borderColor: status.color }]}>
        <View style={styles.statusHeader}>
          {status.showSpinner ? (
            <ActivityIndicator size="small" color={status.color} />
          ) : (
            <Ionicons name={status.icon} size={24} color={status.color} />
          )}
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>

        {joined && remoteUsers.length > 0 && (
          <View style={styles.connectionInfo}>
            <View style={styles.connectionDot} />
            <Text style={styles.connectionText}>Voice call active</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  statusCard: {
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 2,
    ...theme.shadows.small,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    ...theme.typography.body,
    fontWeight: "600",
    marginLeft: theme.spacing.sm,
  },
  connectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.overlay,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.secondary,
    marginRight: theme.spacing.sm,
  },
  connectionText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
})

export default React.memo(ConnectionStatus)
