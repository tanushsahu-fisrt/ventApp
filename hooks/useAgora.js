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
  console.warn("Agora SDK not available")
  agoraSdkAvailable = false
}

import { agoraConfig, generateAgoraToken } from "../config/agora.config"

// Global engine management
let globalEngineInstance = null
let globalEngineUsers = new Set()

export default function useAgora(channelName, isVenter) {
  const [joined, setJoined] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState([])
  const [muted, setMuted] = useState(false)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const [error, setError] = useState(null)
  const [connectionState, setConnectionState] = useState("disconnected")

  const isMountedRef = useRef(true)
  const instanceId = useRef(Math.random().toString(36).substr(2, 9))

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
          Alert.alert(
            "Permission Required",
            "Please grant microphone permissions to use voice features."
          )
          return false
        }
        return true
      }
      return true
    } catch (error) {
      console.error("Permission error:", error.message)
      return false
    }
  }, [])

  const initializeEngine = useCallback(async () => {
    if (globalEngineInstance) {
      globalEngineUsers.add(instanceId.current)
      return globalEngineInstance
    }

    try {
      const hasPermissions = await requestPermissions()
      if (!hasPermissions) {
        throw new Error("Required audio permissions not granted")
      }

      if (!agoraConfig.appId) {
        throw new Error("Agora App ID is missing")
      }

      const agoraEngine = await RtcEngine.create(agoraConfig.appId)

      await agoraEngine.setChannelProfile(ChannelProfile.Communication)
      await agoraEngine.setClientRole(ClientRole.Broadcaster)
      await agoraEngine.enableAudio()
      await agoraEngine.setDefaultAudioRoutetoSpeakerphone(true)
      await agoraEngine.setEnableSpeakerphone(true)

      globalEngineInstance = agoraEngine
      globalEngineUsers.add(instanceId.current)
      
      return agoraEngine

    } catch (error) {
      console.error("Engine initialization failed:", error.message)
      throw error
    }
  }, [requestPermissions])

  const addEventListeners = useCallback((engine) => {
    if (!engine || !isMountedRef.current) return

    engine.removeAllListeners()

    engine.addListener(RtcEngineEventType.JoinChannelSuccess, (channel, uid, elapsed) => {
      if (!isMountedRef.current) return
      setJoined(true)
      setError(null)
      setConnectionState("connected")
    })

    engine.addListener(RtcEngineEventType.UserJoined, (uid, elapsed) => {
      if (!isMountedRef.current) return
      setRemoteUsers(prev => prev.includes(uid) ? prev : [...prev, uid])
    })

    engine.addListener(RtcEngineEventType.UserOffline, (uid, reason) => {
      if (!isMountedRef.current) return
      setRemoteUsers(prev => prev.filter(id => id !== uid))
    })

    engine.addListener(RtcEngineEventType.LeaveChannel, (stats) => {
      if (!isMountedRef.current) return
      setJoined(false)
      setRemoteUsers([])
      setConnectionState("disconnected")
    })

    engine.addListener(RtcEngineEventType.Error, (err) => {
      if (!isMountedRef.current) return
      const errorMessage = `Connection error: ${err.message || "Unknown error"}`
      setError(errorMessage)
      setConnectionState("failed")
    })

    engine.addListener(RtcEngineEventType.ConnectionLost, () => {
      if (!isMountedRef.current) return
      setError("Connection lost")
      setConnectionState("connecting")
    })
  }, [])

  const joinChannel = useCallback(async () => {
    if (!channelName) {
      setError("Channel name is required")
      setConnectionState("failed")
      return false
    }

    try {
      setConnectionState("connecting")
      setError(null)

      const engine = await initializeEngine()
      if (!engine) {
        throw new Error("Failed to initialize Agora engine")
      }

      addEventListeners(engine)

      const token = await generateAgoraToken(channelName, 0)
      if (!token) {
        throw new Error("Failed to generate authentication token")
      }

      await engine.joinChannel(token, channelName, null, 0)
      return true

    } catch (error) {
      console.error("Join channel failed:", error.message)

      if (isMountedRef.current) {
        let errorMessage = "Failed to join voice call"
        if (error.message.includes("permission")) {
          errorMessage = "Microphone permission required"
        } else if (error.message.includes("token")) {
          errorMessage = "Authentication failed"
        }

        setError(errorMessage)
        setConnectionState("failed")
      }
      return false
    }
  }, [channelName, initializeEngine, addEventListeners])

  const leaveChannel = useCallback(async () => {
    try {
      setConnectionState("disconnected")

      if (globalEngineInstance) {
        await globalEngineInstance.leaveChannel()
      }

      if (isMountedRef.current) {
        setJoined(false)
        setRemoteUsers([])
        setMuted(false)
        setSpeakerEnabled(true)
        setError(null)
      }

      globalEngineUsers.delete(instanceId.current)
      
      // Clean up global engine if no users
      if (globalEngineUsers.size === 0 && globalEngineInstance) {
        setTimeout(async () => {
          if (globalEngineUsers.size === 0 && globalEngineInstance) {
            try {
              await globalEngineInstance.destroy()
              globalEngineInstance = null
            } catch (error) {
              console.warn("Engine cleanup warning:", error.message)
            }
          }
        }, 5000)
      }
    } catch (error) {
      console.error("Leave channel error:", error.message)
    }
  }, [])

  const toggleMute = useCallback(async () => {
    if (!globalEngineInstance || !joined) return

    try {
      const newMutedState = !muted
      await globalEngineInstance.muteLocalAudioStream(newMutedState)
      if (isMountedRef.current) {
        setMuted(newMutedState)
      }
    } catch (error) {
      console.error("Toggle mute error:", error.message)
    }
  }, [muted, joined])

  const toggleSpeaker = useCallback(async () => {
    if (!globalEngineInstance || !joined) return

    try {
      const newSpeakerState = !speakerEnabled
      await globalEngineInstance.setEnableSpeakerphone(newSpeakerState)
      if (isMountedRef.current) {
        setSpeakerEnabled(newSpeakerState)
      }
    } catch (error) {
      console.error("Toggle speaker error:", error.message)
    }
  }, [speakerEnabled, joined])

  // Component lifecycle
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      globalEngineUsers.delete(instanceId.current)
    }
  }, [])

  // Auto-join when channel name is provided
  useEffect(() => {
    if (!channelName || !agoraSdkAvailable) return

    let cancelled = false

    const attemptJoin = async () => {
      await new Promise(resolve => setTimeout(resolve, 500))

      if (cancelled || !isMountedRef.current || joined) return

      await joinChannel()
    }

    attemptJoin()

    return () => {
      cancelled = true
    }
  }, [channelName, joinChannel, joined])

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