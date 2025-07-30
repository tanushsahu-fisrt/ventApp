import { useState, useEffect, useRef, useCallback } from "react"
import { Platform, PermissionsAndroid, Alert } from "react-native"

let RtcEngine, ChannelProfile, ClientRole, RtcEngineEventType
let agoraSdkAvailable = false

try {
  const AgoraModule = require("react-native-agora")
  RtcEngine = AgoraModule.default
  ChannelProfile = AgoraModule.ChannelProfile
  ClientRole = AgoraModule.ClientRole
  RtcEngineEventType = AgoraModule.RtcEngineEventType
  agoraSdkAvailable = !!RtcEngine
} catch (error) {
  console.error("Failed to import Agora SDK:", error)
  agoraSdkAvailable = false
}

import { agoraConfig, generateAgoraToken } from "../config/agora.config"

// Global engine management with better lifecycle handling
let globalEngineInstance = null
let globalInitializationPromise = null
let globalEngineUsers = new Set() // Track which components are using the engine
let globalCleanupTimeout = null

// Enhanced debug logging with throttling
const loggedMessages = new Set()
const debugLog = (action, data = {}, level = "info") => {
  const logKey = `${level}-${action}`
  if (loggedMessages.has(logKey)) return

  loggedMessages.add(logKey)
  setTimeout(() => loggedMessages.delete(logKey), 2000)

  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    hook: "useAgora",
    action,
    globalEngineExists: !!globalEngineInstance,
    activeUsers: globalEngineUsers.size,
    ...data,
  }

  const logMessage = `🎙️ [useAgora] ${action}`

  switch (level) {
    case "error":
      console.error(logMessage, logData)
      break
    case "warn":
      console.warn(logMessage, logData)
      break
    default:
      console.log(logMessage, logData)
  }
}

export default function useAgora(channelName, isVenter) {
  const [joined, setJoined] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState([])
  const [muted, setMuted] = useState(false)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const [error, setError] = useState(null)
  const [connectionState, setConnectionState] = useState("disconnected")

  const isMountedRef = useRef(true)
  const tokenRef = useRef(null)
  const joinTimeoutRef = useRef(null)
  const instanceId = useRef(Math.random().toString(36).substr(2, 9))
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 3

  // Early return for unavailable SDK
  if (!agoraSdkAvailable) {
    return {
      joined: false,
      remoteUsers: [],
      muted: false,
      speakerEnabled: true,
      error: "Agora SDK not available",
      connectionState: "failed",
      joinChannel: async () => false,
      leaveChannel: async () => {},
      toggleMute: async () => {},
      toggleSpeaker: async () => {},
    }
  }

  const requestPermissions = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.MODIFY_AUDIO_SETTINGS,
        ]

        const granted = await PermissionsAndroid.requestMultiple(permissions)
        
        const allGranted = permissions.every(
          permission => granted[permission] === PermissionsAndroid.RESULTS.GRANTED
        )

        if (!allGranted) {
          debugLog("permissions_denied", { granted }, "warn")
          return false
        }

        debugLog("permissions_granted")
        return true
      }
      return true
    } catch (error) {
      debugLog("permission_request_error", { error: error.message }, "error")
      return false
    }
  }, [])

  const scheduleGlobalCleanup = useCallback(() => {
    // Clear existing timeout
    if (globalCleanupTimeout) {
      clearTimeout(globalCleanupTimeout)
    }

    // Schedule cleanup if no users remain
    globalCleanupTimeout = setTimeout(() => {
      if (globalEngineUsers.size === 0 && globalEngineInstance) {
        debugLog("scheduled_global_cleanup_executing")
        destroyGlobalEngine()
      }
    }, 5000) // 5 second delay to allow for quick re-initialization
  }, [])

  const destroyGlobalEngine = useCallback(async () => {
    if (!globalEngineInstance) return

    try {
      debugLog("destroying_global_engine")
      
      // Remove all listeners first
      await globalEngineInstance.removeAllListeners()
      
      // Leave channel if still joined
      try {
        await globalEngineInstance.leaveChannel()
      } catch (e) {
        debugLog("leave_channel_during_destroy_warning", { error: e.message }, "warn")
      }
      
      // Destroy the engine
      await globalEngineInstance.destroy()
      
      debugLog("global_engine_destroyed")
    } catch (error) {
      debugLog("destroy_engine_error", { error: error.message }, "error")
    } finally {
      globalEngineInstance = null
      globalInitializationPromise = null
      globalEngineUsers.clear()
      
      if (globalCleanupTimeout) {
        clearTimeout(globalCleanupTimeout)
        globalCleanupTimeout = null
      }
    }
  }, [])

  const initializeEngine = useCallback(async () => {
    // Return existing engine if available
    if (globalEngineInstance) {
      debugLog("using_existing_engine")
      globalEngineUsers.add(instanceId.current)
      return globalEngineInstance
    }

    // Return existing promise if initialization is in progress
    if (globalInitializationPromise) {
      debugLog("waiting_for_existing_initialization")
      const engine = await globalInitializationPromise
      globalEngineUsers.add(instanceId.current)
      return engine
    }

    // Start new initialization
    globalInitializationPromise = (async () => {
      try {
        debugLog("starting_engine_initialization")

        // Check permissions first
        const hasPermissions = await requestPermissions()
        if (!hasPermissions) {
          throw new Error("Required audio permissions not granted")
        }

        if (!agoraConfig.appId) {
          throw new Error("Agora App ID is missing from configuration")
        }

        // Create engine with timeout
        const enginePromise = RtcEngine.create(agoraConfig.appId)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Engine creation timeout after 15 seconds")), 15000)
        )

        const agoraEngine = await Promise.race([enginePromise, timeoutPromise])

        if (!agoraEngine) {
          throw new Error("Engine creation returned null")
        }

        debugLog("engine_created_configuring")

        // Configure engine with individual error handling
        const configSteps = [
          { fn: () => agoraEngine.setChannelProfile(ChannelProfile.Communication), name: "channel_profile" },
          { fn: () => agoraEngine.setClientRole(ClientRole.Broadcaster), name: "client_role" },
          { fn: () => agoraEngine.enableAudio(), name: "enable_audio" },
        ]

        for (const step of configSteps) {
          try {
            await step.fn()
            await new Promise(resolve => setTimeout(resolve, 100)) // Small delay between configs
          } catch (e) {
            debugLog(`config_${step.name}_warning`, { error: e.message }, "warn")
          }
        }

        // Audio routing configuration
        try {
          await agoraEngine.setDefaultAudioRoutetoSpeakerphone(true)
          await new Promise(resolve => setTimeout(resolve, 100))
          await agoraEngine.setEnableSpeakerphone(true)
        } catch (e) {
          debugLog("audio_routing_warning", { error: e.message }, "warn")
        }

        // Store globally
        globalEngineInstance = agoraEngine
        globalEngineUsers.add(instanceId.current)
        
        debugLog("engine_initialization_complete")
        return agoraEngine

      } catch (error) {
        debugLog("engine_initialization_failed", { error: error.message }, "error")
        globalInitializationPromise = null
        throw error
      }
    })()

    return globalInitializationPromise
  }, [requestPermissions])

  const addEventListeners = useCallback((engine) => {
    if (!engine || !isMountedRef.current) return

    try {
      // Clear any existing listeners first
      engine.removeAllListeners()

      // Join Channel Success
      engine.addListener(RtcEngineEventType.JoinChannelSuccess, (channel, uid, elapsed) => {
        if (!isMountedRef.current) return
        debugLog("join_channel_success", { channel, uid })
        
        setJoined(true)
        setError(null)
        setConnectionState("connected")
        reconnectAttempts.current = 0

        // Clear join timeout
        if (joinTimeoutRef.current) {
          clearTimeout(joinTimeoutRef.current)
          joinTimeoutRef.current = null
        }
      })

      // User Joined
      engine.addListener(RtcEngineEventType.UserJoined, (uid, elapsed) => {
        if (!isMountedRef.current) return
        debugLog("user_joined", { uid })
        setRemoteUsers(prev => prev.includes(uid) ? prev : [...prev, uid])
      })

      // User Offline
      engine.addListener(RtcEngineEventType.UserOffline, (uid, reason) => {
        if (!isMountedRef.current) return
        debugLog("user_offline", { uid, reason })
        setRemoteUsers(prev => prev.filter(id => id !== uid))
      })

      // Leave Channel
      engine.addListener(RtcEngineEventType.LeaveChannel, (stats) => {
        if (!isMountedRef.current) return
        debugLog("leave_channel_event")
        setJoined(false)
        setRemoteUsers([])
        setConnectionState("disconnected")
      })

      // Error handling
      engine.addListener(RtcEngineEventType.Error, (err) => {
        if (!isMountedRef.current) return
        debugLog("agora_error", { errorCode: err.code }, "error")
        
        const errorMessage = `Connection error (${err.code})`
        setError(errorMessage)
        setConnectionState("failed")

        // Attempt reconnection for certain errors
        if (err.code === 17 || err.code === 2) { // Network or token errors
          attemptReconnection()
        }
      })

      // Connection Lost
      engine.addListener(RtcEngineEventType.ConnectionLost, () => {
        if (!isMountedRef.current) return
        debugLog("connection_lost", {}, "warn")
        setError("Connection lost")
        setConnectionState("connecting")
        attemptReconnection()
      })

      // Connection Interrupted
      engine.addListener(RtcEngineEventType.ConnectionInterrupted, () => {
        if (!isMountedRef.current) return
        debugLog("connection_interrupted", {}, "warn")
        setConnectionState("connecting")
      })

      debugLog("event_listeners_added")
    } catch (error) {
      debugLog("add_listeners_error", { error: error.message }, "error")
    }
  }, [])

  const attemptReconnection = useCallback(async () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      debugLog("max_reconnect_attempts_reached", { attempts: reconnectAttempts.current }, "error")
      setError("Connection failed after multiple attempts")
      setConnectionState("failed")
      return
    }

    reconnectAttempts.current += 1
    debugLog("attempting_reconnection", { attempt: reconnectAttempts.current })

    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, 2000 * reconnectAttempts.current))

    if (isMountedRef.current && channelName) {
      joinChannel()
    }
  }, [channelName])

  const joinChannel = useCallback(async () => {
    if (!channelName) {
      const errorMsg = "Channel name is required"
      setError(errorMsg)
      setConnectionState("failed")
      debugLog("join_failed_no_channel", {}, "error")
      return false
    }

    try {
      setConnectionState("connecting")
      setError(null)
      debugLog("join_channel_start", { channelName })

      const engine = await initializeEngine()
      if (!engine) {
        throw new Error("Failed to initialize Agora engine")
      }

      // Add event listeners
      addEventListeners(engine)

      // Generate token
      debugLog("generating_token")
      const token = await generateAgoraToken(channelName, 0)
      if (!token) {
        throw new Error("Failed to generate authentication token")
      }

      tokenRef.current = token

      // Set join timeout
      joinTimeoutRef.current = setTimeout(() => {
        if (!joined && isMountedRef.current) {
          debugLog("join_timeout", {}, "warn")
          setError("Connection timeout - please try again")
          setConnectionState("failed")
        }
      }, 25000) // 25 second timeout

      // Join channel
      await engine.joinChannel(token, channelName, null, 0)
      debugLog("join_channel_request_sent")
      return true

    } catch (error) {
      debugLog("join_channel_error", { error: error.message }, "error")
      
      if (isMountedRef.current) {
        let errorMessage = "Failed to join voice call"
        
        if (error.message.includes("permission")) {
          errorMessage = "Microphone permission required"
        } else if (error.message.includes("token")) {
          errorMessage = "Authentication failed"
        } else if (error.message.includes("timeout")) {
          errorMessage = "Connection timeout"
        }
        
        setError(errorMessage)
        setConnectionState("failed")
      }

      // Clear timeout on error
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current)
        joinTimeoutRef.current = null
      }

      return false
    }
  }, [channelName, initializeEngine, addEventListeners, joined])

  const leaveChannel = useCallback(async () => {
    try {
      debugLog("leave_channel_start")
      setConnectionState("disconnected")

      // Clear join timeout
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current)
        joinTimeoutRef.current = null
      }

      if (globalEngineInstance) {
        try {
          await globalEngineInstance.leaveChannel()
          debugLog("leave_channel_success")
        } catch (error) {
          debugLog("leave_channel_error", { error: error.message }, "warn")
        }
      }

      if (isMountedRef.current) {
        setJoined(false)
        setRemoteUsers([])
        setMuted(false)
        setSpeakerEnabled(true)
        setError(null)
        reconnectAttempts.current = 0
      }

      // Remove this instance from global users
      globalEngineUsers.delete(instanceId.current)
      
      // Schedule cleanup if no users remain
      if (globalEngineUsers.size === 0) {
        scheduleGlobalCleanup()
      }

      debugLog("leave_channel_complete")
    } catch (error) {
      debugLog("leave_channel_error", { error: error.message }, "error")
    }
  }, [scheduleGlobalCleanup])

  const toggleMute = useCallback(async () => {
    if (!globalEngineInstance || !joined) {
      debugLog("toggle_mute_skipped", { hasEngine: !!globalEngineInstance, joined }, "warn")
      return
    }

    try {
      const newMutedState = !muted
      await globalEngineInstance.muteLocalAudioStream(newMutedState)
      
      if (isMountedRef.current) {
        setMuted(newMutedState)
        debugLog("mute_toggled", { muted: newMutedState })
      }
    } catch (error) {
      debugLog("toggle_mute_error", { error: error.message }, "error")
    }
  }, [muted, joined])

  const toggleSpeaker = useCallback(async () => {
    if (!globalEngineInstance || !joined) {
      debugLog("toggle_speaker_skipped", { hasEngine: !!globalEngineInstance, joined }, "warn")
      return
    }

    try {
      const newSpeakerState = !speakerEnabled
      await globalEngineInstance.setEnableSpeakerphone(newSpeakerState)
      
      if (isMountedRef.current) {
        setSpeakerEnabled(newSpeakerState)
        debugLog("speaker_toggled", { enabled: newSpeakerState })
      }
    } catch (error) {
      debugLog("toggle_speaker_error", { error: error.message }, "error")
    }
  }, [speakerEnabled, joined])

  // Component lifecycle
  useEffect(() => {
    isMountedRef.current = true
    debugLog("component_mounted", { instanceId: instanceId.current })

    return () => {
      debugLog("component_unmounting", { instanceId: instanceId.current })
      isMountedRef.current = false

      // Clear timeout
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current)
        joinTimeoutRef.current = null
      }

      // Remove from global users and potentially cleanup
      globalEngineUsers.delete(instanceId.current)
      if (globalEngineUsers.size === 0) {
        scheduleGlobalCleanup()
      }
    }
  }, [scheduleGlobalCleanup])

  // Auto-join when channel name is provided
  useEffect(() => {
    if (!channelName || !agoraSdkAvailable) return

    let cancelled = false

    const attemptJoin = async () => {
      // Add delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (cancelled || !isMountedRef.current) return

      debugLog("auto_join_attempt", { channelName })
      const success = await joinChannel()

      if (!success && !cancelled && isMountedRef.current) {
        debugLog("auto_join_failed_cleaning_up")
        await leaveChannel()
      }
    }

    attemptJoin()

    return () => {
      cancelled = true
    }
  }, [channelName, joinChannel, leaveChannel])

  return {
    joined,
    remoteUsers,
    muted,
    speakerEnabled,
    error,
    connectionState,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleSpeaker,
  }
}