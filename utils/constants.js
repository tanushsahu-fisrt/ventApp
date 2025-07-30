export const APP_CONFIG = {
  name: "VentBox",
  version: "1.0.0",
  supportEmail: "support@ventbox.app",
}

export const PLANS = [
  {
    name: "10-Min Vent",
    price: "$2.99",
    duration: 10 * 60,
    durationInMinutes: 10,
    description: "Quick, focused vent session",
    popular: false,
  },
  {
    name: "20-Min Vent",
    price: "$4.99",
    duration: 20 * 60,
    durationInMinutes: 20,
    description: "Standard, comforting vent session",
    popular: true,
  },
  {
    name: "30-Min Vent",
    price: "$6.99",
    duration: 30 * 60,
    durationInMinutes: 30,
    description: "Extended, deep-dive vent session",
    popular: false,
  },
]

export const FIREBASE_COLLECTIONS = {
  USERS: "users",
  QUEUE: "queue",
  SESSIONS: "sessions",
}

export const ROUTES = {
  WELCOME: "/",
  DASHBOARD: "/dashboard-screen",
  VENT_SUBMIT: "/vent-submitted",
  LISTENER: "/listener",
  VOICE_CALL: "/voice-call",
  SESSION_ENDED: "/session-ended",
}

export const VALIDATION = {
  VENT_TEXT: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 500,
  },
  SESSION: {
    MAX_DURATION: 30 * 60,
    TIMEOUT_WARNING: 60,
  },
}
