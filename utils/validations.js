export const validateVentText = (text) => {
  if (!text || typeof text !== "string") {
    return { isValid: false, error: "Vent text is required" };
  }

  const trimmedText = text.trim();

  if (trimmedText.length === 0) {
    return {
      isValid: false,
      error: "Please write something before submitting",
    };
  }

  if (trimmedText.length < 10) {
    return { isValid: false, error: "Please write at least 10 characters" };
  }

  if (trimmedText.length > 500) {
    return {
      isValid: false,
      error: "Vent text must be less than 500 characters",
    };
  }

  return { isValid: true, error: null };
};

export const validateChannelName = (channelName) => {
  if (!channelName || typeof channelName !== "string") {
    return false;
  }

  // Agora channel name requirements
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(channelName) && channelName.length <= 64;
};

export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return "Unknown";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
};
