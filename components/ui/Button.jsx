import React from "react"
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native"

const Button = ({ title, onPress, variant = "primary", disabled = false, loading = false, style, textStyle }) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button]

    switch (variant) {
      case "secondary":
        baseStyle.push(styles.secondary)
        break
      case "outline":
        baseStyle.push(styles.outline)
        break
      case "ghost":
        baseStyle.push(styles.ghost)
        break
      default:
        baseStyle.push(styles.primary)
    }

    if (disabled || loading) {
      baseStyle.push(styles.disabled)
    }

    return baseStyle
  }

  const getTextStyle = () => {
    const baseStyle = [styles.text]

    switch (variant) {
      case "secondary":
        baseStyle.push(styles.secondaryText)
        break
      case "outline":
        baseStyle.push(styles.outlineText)
        break
      case "ghost":
        baseStyle.push(styles.ghostText)
        break
      default:
        baseStyle.push(styles.primaryText)
    }

    if (disabled || loading) {
      baseStyle.push(styles.disabledText)
    }

    return baseStyle
  }

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" || variant === "ghost" ? "#FFC940" : "#fff"} />
      ) : (
        <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  primary: {
    backgroundColor: "#FFC940",
  },
  secondary: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#FFC940",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryText: {
    color: "#000",
  },
  secondaryText: {
    color: "#ffffff",
  },
  outlineText: {
    color: "#FFC940",
  },
  ghostText: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  disabledText: {
    opacity: 0.7,
  },
})

export default React.memo(Button)