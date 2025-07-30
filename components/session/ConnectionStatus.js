// ConnectionStatus.jsx

import { View, Text, StyleSheet } from "react-native"

// Renamed 'status' and 'statusColor' props to match what's being passed from VoiceCallScreen
// connectionStatus is passed, and ConnectionStatus component internally derives color/emoji
const ConnectionStatus = ({ joined, remoteUsers, timeRemaining, connectionStatus, onRetry }) => {

  const getStatusEmoji = () => {
    switch (connectionStatus) { // Use the 'connectionStatus' prop
      case "connected": return "✅";
      case "connecting": return "🔄";
      case "reconnecting": return "🔄";
      case "failed": return "❌";
      default: return "⚙️"; // Default for other states
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected": return "Connected";
      case "connecting": return "Connecting...";
      case "reconnecting": return "Reconnecting...";
      case "failed": return "Connection Failed";
      default: return "Initializing...";
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected": return "#4ade80"; // Green
      case "connecting": return "#60a5fa"; // Blue
      case "reconnecting": return "#fbbf24"; // Yellow/Orange
      case "failed": return "#ef4444"; // Red
      default: return "rgba(255, 255, 255, 0.7)"; // Greyish white
    }
  };

  return (
    <View style={styles.container}>

      <Text style={[styles.statusText, { color: getStatusColor() }]}>
        {getStatusEmoji()} {getStatusText()}
      </Text>

      <Text style={styles.participantsText}>
        {/* Corrected: Use remoteUsers.length */}
        {remoteUsers.length > 0
          ? `${remoteUsers.length + 1} participants` // +1 for the local user
          : (connectionStatus === "connected" ? "Waiting for others to join..." : "No participants yet")}
      </Text>

      {/* This warning should ideally appear when the local user has successfully joined and isConnected===true */}
      {joined && timeRemaining <= 300 && timeRemaining > 0 && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Session ending in {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
          </Text>
        </View>
      )}

      {connectionStatus === "failed" && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry Connection</Text>
        </TouchableOpacity>
      )}

      <View style={styles.expoGoIndicator}>
        <Text style={styles.expoGoText}>📱 Expo Go Compatible</Text>
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 50,
  },
  statusText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  participantsText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    marginBottom: 10,
  },
  warningContainer: {
    backgroundColor: "rgba(255, 167, 38, 0.2)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ffa726",
    marginTop: 15,
  },
  warningText: {
    color: "#ffa726",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  expoGoIndicator: {
    marginTop: 15,
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.3)",
  },
  expoGoText: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: '#60a5fa', // A distinct color for retry
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 15,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
})

export default ConnectionStatus