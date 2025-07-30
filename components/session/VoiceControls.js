import React from "react"
import { View, StyleSheet, TouchableOpacity, Text } from "react-native"
import Ionicons from "react-native-vector-icons/Ionicons"
import { theme } from "../../config/theme"

const VoiceControls = ({ muted, speakerEnabled, onToggleMute, onToggleSpeaker, onEndCall, disabled = false }) => {
  const ControlButton = ({ icon, onPress, active, variant = "default", label }) => (
    <View style={styles.controlContainer}>
      <TouchableOpacity
        style={[
          styles.controlButton,
          variant === "danger" && styles.dangerButton,
          active && styles.activeButton,
          disabled && styles.disabledButton,
        ]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons
          name={icon}
          size={28}
          color={disabled ? theme.colors.text.muted : variant === "danger" ? "#fff" : active ? "#000" : "#fff"}
        />
      </TouchableOpacity>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        <ControlButton
          icon={muted ? "mic-off" : "mic"}
          onPress={onToggleMute}
          active={!muted}
          label={muted ? "Unmute" : "Mute"}
        />

        <ControlButton icon="call" onPress={onEndCall} variant="danger" label="End Call" />

        <ControlButton
          icon={speakerEnabled ? "volume-high" : "volume-low"}
          onPress={onToggleSpeaker}
          active={speakerEnabled}
          label="Speaker"
        />
      </View>

      <Text style={styles.instructionText}>Tap the microphone to mute/unmute yourself</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    maxWidth: 300,
    marginBottom: theme.spacing.xl,
  },
  controlContainer: {
    alignItems: "center",
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.overlayStrong,
    ...theme.shadows.medium,
  },
  activeButton: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  dangerButton: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  disabledButton: {
    opacity: 0.5,
  },
  controlLabel: {
    ...theme.typography.small,
    color: theme.colors.text.secondary,
    textAlign: "center",
  },
  instructionText: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
    textAlign: "center",
    paddingHorizontal: theme.spacing.xl,
    lineHeight: 20,
  },
})

export default React.memo(VoiceControls)
