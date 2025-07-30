import { VALIDATION } from "./constants"

export const validateVentText = (text) => {
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      error: "Please enter your thoughts before submitting.",
    }
  }

  if (text.trim().length < VALIDATION.VENT_TEXT.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Please enter at least ${VALIDATION.VENT_TEXT.MIN_LENGTH} characters.`,
    }
  }

  if (text.length > VALIDATION.VENT_TEXT.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Please keep your message under ${VALIDATION.VENT_TEXT.MAX_LENGTH} characters.`,
    }
  }

  return { isValid: true }
}

export const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

export const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}