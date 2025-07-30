import { useEffect, useState, useRef } from "react";
import { Text, StyleSheet, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import GradientContainer from "../../components/ui/GradientContainer";
import StatusBar from "../../components/ui/StatusBar";
import SessionTimer from "../../components/session/SessionTimer";
import ConnectionStatus from "../../components/session/ConnectionStatus";
import VoiceControls from "../../components/session/VoiceControls";
import useTimer from "../../hooks/useTimer";
import { getAuth } from "firebase/auth"
import { firestore } from "../../config/firebase.config";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from "react-native-agora";

const AGORA_APP_ID = "f16b94ea49fd47b5b65e86d20ef1badd";

export default function VoiceCallScreen() {
  
  const navigation = useNavigation();
  const route = useRoute();
  
  const { ventText, plan, channelName, isHost , isListener } = route.params;

  const [isJoined, setIsJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true)
  const [remoteUserIds, setRemoteUserIds] = useState([])
  const [connectionStatus, setConnectionStatus] = useState("connecting") // connecting, connected, failed, reconnecting
  const engine = useRef(null)
  const [localUid, setLocalUid] = useState(0)
  const joinAttempts = useRef(0)
  const maxJoinAttempts = 3

  const getDurationInSeconds = (planName) => {
    switch (planName) {
      case "10-Min Vent":
        return 10 * 60
      case "30-Min Vent":
        return 30 * 60
      default:
        return 20 * 60
    }
  }

  const initialCallDuration = getDurationInSeconds(plan)

  const handleTimeUp = () => {
    Alert.alert("Session Ended", "Your session has ended automatically.", [
      {
        text: "OK",
        onPress: async () => {
          await destroyAgora()
          await updateRoomStatusInFirebase("ended")
          navigation.replace("Dashboard");
        },
      },
    ])
  }

  const { sessionTime, timeRemaining, stopTimer } = useTimer(initialCallDuration, handleTimeUp)

  // Enhanced join channel with retry logic
  const joinChannelWithRetry = async (engine, channelName, uid) => {
    joinAttempts.current++
    
    try {
      console.log(`Agora: Join attempt ${joinAttempts.current}/${maxJoinAttempts}`)
      
      await engine.joinChannel(null, channelName, uid, {
        autoSubscribeAudio: true,
        autoSubscribeVideo: false,
        publishMicrophoneTrack: true,
        publishCameraTrack: false,
      })
      
      console.log("Agora: Successfully joined channel", channelName, "with UID", uid)
      joinAttempts.current = 0 // Reset on success
      
    } catch (error) {
      console.error(`Agora: Join attempt ${joinAttempts.current} failed:`, error)
      
      if (joinAttempts.current < maxJoinAttempts) {
        console.log(`Agora: Retrying in 2 seconds...`)
        setConnectionStatus("reconnecting")
        
        setTimeout(() => {
          joinChannelWithRetry(engine, channelName, uid)
        }, 2000)
      } else {
        console.error("Agora: Max join attempts reached")
        setConnectionStatus("failed")
        Alert.alert(
          "Connection Failed", 
          "Unable to connect to voice channel after multiple attempts. Please check your internet connection and try again.",
          [
            {
              text: "Retry",
              onPress: () => {
                joinAttempts.current = 0
                setConnectionStatus("connecting")
                joinChannelWithRetry(engine, channelName, uid)
              }
            },
            {
              text: "Exit",
              onPress: () => {
                navigation.replace("Dashboard")
              }
            }
          ]
        )
      }
    }
  }

  const initAgora = async () => {
    try {
      if (!AGORA_APP_ID) {
        Alert.alert("Agora App ID Missing")
        navigation.replace("Dashboard");
        return
      }

      console.log("Agora: Initializing engine...")
      engine.current = createAgoraRtcEngine()
      
      await engine.current.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      })

      const clientRole = isListener
        ? ClientRoleType.ClientRoleBroadcaster // Listeners can speak now
        : ClientRoleType.ClientRoleBroadcaster; // Venter is always a broadcaster

      // Add network and audio optimizations
      await engine.current.setChannelProfile(ChannelProfileType.ChannelProfileCommunication)
      await engine.current.setClientRole(clientRole)
      
      // Enable audio with better settings
      await engine.current.enableAudio()
      await engine.current.setAudioProfile(0, 1) // Default profile, speech standard
      await engine.current.setEnableSpeakerphone(true)
      
      // Add network resilience settings
      await engine.current.enableDualStreamMode(false) // Disable dual stream for voice-only
      
      setIsSpeakerEnabled(true)

      engine.current.registerEventHandler({

        onJoinChannelSuccess: (connection, elapsed) => {
          console.log("Agora: Join channel success", connection)
          setIsJoined(true)
          setConnectionStatus("connected")
          setLocalUid(connection.localUid || 0)
          engine.current?.muteLocalAudioStream(false)
          setIsMuted(false)
          joinAttempts.current = 0 // Reset attempts on successful join
          
          // Test if connection is actually working
          setTimeout(() => {
            if (engine.current) {
              console.log("Agora: Testing connection stability...")
              // Try to get connection stats to verify connection
              engine.current.getCallId()
                .then(callId => {
                  console.log("Agora: Connection verified - Call ID:", callId)
                })
                .catch(e => {
                  console.log("Agora: Connection test failed:", e)
                })
            }
          }, 3000)
        },
        
        onUserJoined : async  (connection, remoteUid, elapsed) => {
          console.log("Agora: User joined", remoteUid)

          // Update state with new remote user ID
          setRemoteUserIds( (prev) => {
            if (!prev.includes(remoteUid)) return [...prev, remoteUid]
            return prev
          })
        },

        onUserOffline: (connection, remoteUid, reason) => {
          console.log("Agora: User offline", remoteUid, reason)
          setRemoteUserIds((prev) => prev.filter((id) => id !== remoteUid))
        },

        onError: (err, msg) => {
          console.error("Agora Error:", err, msg)
          
          // Handle specific error codes
          if (err === 110) {
            console.log("Agora: Error 110 - Known false positive, ignoring...")
            
            return
          } else if (err === 101) {
            setConnectionStatus("failed")
            Alert.alert("Invalid App ID", "Voice service configuration error.")
          } else if (err === 2) {
            console.log("Agora: Invalid argument error - this is often recoverable")
          } else if (err === 17) {
            console.log("Agora: Not initialized error - reinitializing...")
            setTimeout(() => {
              initAgora()
            }, 1000)
          } else {
            console.log(`Agora: Error ${err} - ${msg}`)
            // Don't show alert for every error, many are recoverable
          }
        },

        onLeaveChannel: (connection, stats) => {
          console.log("Agora: Left channel", stats)
          setIsJoined(false)
          setRemoteUserIds([])
          setLocalUid(0)
          setConnectionStatus("connecting")
          stopTimer()
        },

        onConnectionStateChanged: (connection, state, reason) => {
          console.log("Agora: Connection State Changed", state, reason)
          
          // Update connection status based on Agora states
          switch (state) {
            case 1: // DISCONNECTED
              setConnectionStatus("connecting")
              break
            case 2: // CONNECTING
              setConnectionStatus("connecting")
              break
            case 3: // CONNECTED
              setConnectionStatus("connected")
              break
            case 4: // RECONNECTING
              setConnectionStatus("reconnecting")
              break
            case 5: // FAILED
              console.log("Agora: Connection state FAILED - reason:", reason)
              // Only treat as real failure if we never successfully joined
              if (!isJoined && joinAttempts.current < maxJoinAttempts) {
                console.log("Agora: Will retry due to connection state failure")
                setTimeout(() => {
                  const uid = Math.floor(Math.random() * 1000000)
                  joinChannelWithRetry(engine.current, channelName, uid)
                }, 2000)
              } else if (!isJoined) {
                setConnectionStatus("failed")
                Alert.alert("Connection Failed", "Unable to establish voice connection. Please try again.")
              } else {
                console.log("Agora: Connection failed but we're joined - might be false positive")
              }
              break
          }
        },

        onRejoinChannelSuccess: (connection, elapsed) => {
          console.log("Agora: Rejoin channel success")
          setIsJoined(true)
          setConnectionStatus("connected")
        },

        onConnectionLost: (connection) => {
          console.log("Agora: Connection lost")
          setConnectionStatus("reconnecting")
        },

        onConnectionInterrupted: (connection) => {
          console.log("Agora: Connection interrupted")
          setConnectionStatus("reconnecting")
        },
      })

      if (!channelName) {
        Alert.alert("Room Error", "No channel name provided.")
        navigation.replace("Dashboard");
        return
      }

      const uid = Math.floor(Math.random() * 1000000)
      console.log("Agora: Starting channel join process...")
      
      // Try a simpler join first
      try {
        await engine.current.joinChannel(null, channelName, uid, {
          autoSubscribeAudio: true,
          autoSubscribeVideo: false,
          publishMicrophoneTrack: true,
          publishCameraTrack: false,
        })
        console.log("Agora: Join channel initiated for", channelName, "with UID", uid)
      } catch (joinError) {
        console.error("Agora: Direct join failed, using retry logic:", joinError)
        await joinChannelWithRetry(engine.current, channelName, uid)
      }

    } catch (e) {
      console.error("Agora Init Error:", e)
      setConnectionStatus("failed")
      Alert.alert("Call Setup Failed", e.message || e.toString())
      navigation.replace("Dashboard");
    }
  }

  const destroyAgora = async () => {
    if (engine.current) {
      try {
        console.log("Agora: Cleaning up...")
        await engine.current.leaveChannel()
        engine.current.release()
        engine.current = null
        setConnectionStatus("connecting")
      } catch (error) {
        console.error("Agora Cleanup Error:", error)
      }
    }
  }

  const updateRoomStatusInFirebase = async (status) => {
    if (channelName) {
      try {
        const roomRef = doc(firestore, "rooms", channelName)
        await updateDoc(roomRef, {
          status,
          endTime: serverTimestamp(),
        })
        console.log("Firebase: Room status updated to", status)
      } catch (error) {
        console.error("Firebase Update Error:", error)
      }
    }
  }

  useEffect(() => {
    initAgora()
    return () => {
      stopTimer()
      destroyAgora()
      if (isJoined) updateRoomStatusInFirebase("ended")
    }
  }, [])

  const toggleMute = async () => {
    if (engine.current && isJoined) {
      try {
        const newMutedState = !isMuted
        await engine.current.muteLocalAudioStream(newMutedState)
        setIsMuted(newMutedState)
      } catch (error) {
        console.error("Toggle mute error:", error)
        Alert.alert("Error", "Failed to toggle microphone")
      }
    }
  }

  const toggleSpeaker = async () => {
    if (engine.current && isJoined) {
      try {
        const newSpeakerState = !isSpeakerEnabled
        await engine.current.setEnableSpeakerphone(newSpeakerState)
        setIsSpeakerEnabled(newSpeakerState)
      } catch (error) {
        console.error("Toggle speaker error:", error)
        Alert.alert("Error", "Failed to toggle speaker")
      }
    }
  }

  const handleEndCall = async () => {
    Alert.alert("End Session", "Are you sure you want to end this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        onPress: async () => {
          stopTimer()
          await destroyAgora()
          await updateRoomStatusInFirebase("ended")
          navigation.replace("Dashboard");
        },
      },
    ])
  }

  const handleRetryConnection = () => {
    joinAttempts.current = 0
    setConnectionStatus("connecting")
    if (engine.current && channelName) {
      const uid = Math.floor(Math.random() * 1000000)
      joinChannelWithRetry(engine.current, channelName, uid)
    }
  }

  return (
    <GradientContainer>
      
      <StatusBar />
      <SessionTimer sessionTime={sessionTime} timeRemaining={timeRemaining} plan={plan} />
      
      <Text style={styles.ventTextDisplay}>{ventText}</Text>
      
      {/* Enhanced connection status with retry option */}
      <ConnectionStatus 
        joined={isJoined} 
        remoteUsers={remoteUserIds} 
        timeRemaining={timeRemaining}
        connectionStatus={connectionStatus}
        onRetry={handleRetryConnection}
      />
      
      <VoiceControls
        muted={isMuted}
        speakerEnabled={isSpeakerEnabled}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
        onEndCall={handleEndCall}
        disabled={!isJoined}
        connectionStatus={connectionStatus}
      />
    </GradientContainer>
  )
}

const styles = StyleSheet.create({
  ventTextDisplay: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    fontStyle: "italic",
    paddingHorizontal: 20,
  },
})