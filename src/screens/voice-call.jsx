import { useEffect, useCallback, useState } from "react";
import { View, Alert, StyleSheet, ActivityIndicator, Text, BackHandler } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native"; 
import GradientContainer from "../../components/ui/GradientContainer"; 
import StatusBar from "../../components/ui/StatusBar"; 
import Button from "../../components/ui/Button";
import SessionTimer from "../../components/session/SessionTimer"; 
import ConnectionStatus from "../../components/session/ConnectionStatus"; 
import VoiceControls from "../../components/session/VoiceControls"; 
import useTimer from "../../hooks/useTimer"; 
import useAgora from "../../hooks/useAgora"; 
import firestoreService from "../../services/firestoreService"; 
import { PLANS } from "../../utils/constants"; 

export default function VoiceCall() {
  const route = useRoute(); 
  const navigation = useNavigation(); 

  const { ventText, plan, channelName, isHost, sessionId } = route.params || {};
  const [isExiting, setIsExiting] = useState(false);

  const isVenter = isHost === "true"; 

  const getDurationInSeconds = (planName) => {
    const planData = PLANS.find((p) => p.name === planName);
    return planData ? planData.duration : 20 * 60;
  };

  const initialCallDuration = getDurationInSeconds(plan);

  const handleTimeUp = useCallback(async () => {
    if (isExiting) return;
    setIsExiting(true);

    Alert.alert("Session Ended", "Your session has ended automatically.", [
      {
        text: "OK",
        onPress: async () => {
          await leaveChannel();
          if (sessionId) {
            try {
              await firestoreService.endSession(sessionId, sessionTime, "auto-ended");
            } catch (error) {
              console.error("Error ending session:", error);
            }
          }
          
          navigation.replace("SessionEndedScreen", { 
            sessionTime: sessionTime.toString(),
            plan,
            autoEnded: "true",
          });
        },
      },
    ]);
  }, [isExiting, sessionTime, plan, navigation]); 

  const { sessionTime, timeRemaining, stopTimer } = useTimer(initialCallDuration, handleTimeUp);
  const {
    joined,
    remoteUsers,
    muted,
    speakerEnabled,
    error: agoraError,
    connectionState,
    toggleMute,
    toggleSpeaker,
    leaveChannel,
    joinChannel,
  } = useAgora(channelName, isVenter);

  const handleEndCall = useCallback(async () => {
    if (isExiting) return;
    setIsExiting(true);

    Alert.alert("End Session", "Are you sure you want to end this session?", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setIsExiting(false),
      },
      {
        text: "End",
        onPress: async () => {
          try {
            stopTimer();
            await leaveChannel();

            if (sessionId) {
              try {
                await firestoreService.endSession(sessionId, sessionTime, "manual-ended");
              } catch (error) {
                console.error("Error ending session:", error);
              }
            }

            navigation.replace("SessionEndedScreen", {
              sessionTime: sessionTime.toString(),
              plan,
              autoEnded: "false",
            });
          } catch (error) {
            console.error("Error during call ending:", error);
            navigation.replace("index"); // Go back to main screen
          }
        },
      },
    ]);
  }, [stopTimer, leaveChannel, sessionId, sessionTime, plan, isExiting, navigation]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      handleEndCall();
      return true; 
    });

    return () => backHandler.remove();
  }, [handleEndCall]);

  useEffect(() => {
    if (!channelName || !sessionId || typeof isHost === "undefined" || !plan) {
      console.error("Missing required parameters");
      Alert.alert("Error", "Missing call parameters. Returning to home.");
      navigation.replace("index");
    }
  }, [channelName, sessionId, isHost, plan, navigation]);

  useEffect(() => {
    if (agoraError && !isExiting) {
      console.error("Agora error:", agoraError);
      
      Alert.alert(
        "Connection Error",
        agoraError,
        [
          {
            text: "Retry",
            onPress: () => joinChannel(),
          },
          {
            text: "End Call",
            onPress: () => navigation.replace("index"),
          },
        ],
      );
    }
  }, [agoraError, isExiting, joinChannel, navigation]);

  // Loading state
  if (connectionState === "connecting" || (!joined && remoteUsers.length === 0 && !agoraError)) {
    return (
      <GradientContainer>
        <StatusBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Connecting to session...</Text>
          <Text style={styles.loadingSubText}>Please wait while we connect you.</Text>
          <Button
            title="Cancel"
            onPress={() => navigation.replace("index")}
            variant="outline"
            style={styles.cancelButton}
          />
        </View>
      </GradientContainer>
    );
  }

  // Error state
  if (agoraError && connectionState === "failed") {
    return (
      <GradientContainer>
        <StatusBar />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Failed</Text>
          <Text style={styles.errorMessage}>{agoraError}</Text>
          <Button title="Try Again" onPress={() => joinChannel()} variant="primary" />
          <Button
            title="Go Back"
            onPress={() => navigation.replace("index")}
            variant="outline"
            style={{ marginTop: 10 }}
          />
        </View>
      </GradientContainer>
    );
  }

  // Main voice call UI
  return (
    <GradientContainer>
      <StatusBar />
      <View style={styles.container}>
        <SessionTimer sessionTime={sessionTime} timeRemaining={timeRemaining} plan={plan} />
        <ConnectionStatus
          joined={joined}
          remoteUsers={remoteUsers}
          timeRemaining={timeRemaining}
          agoraError={agoraError}
          connectionState={connectionState}
          isVenter={isVenter}
        />
        <VoiceControls
          muted={muted}
          speakerEnabled={speakerEnabled}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onEndCall={handleEndCall}
          disabled={!joined || isExiting}
          connectionState={connectionState}
        />

        {connectionState !== "connected" && (
          <View style={styles.connectionIndicator}>
            <Text style={styles.connectionText}>
              Status: {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
            </Text>
          </View>
        )}
      </View>
    </GradientContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
  },
  loadingSubText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },
  cancelButton: {
    marginTop: 30,
    minWidth: 180,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    color: "red",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  errorMessage: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  connectionIndicator: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  connectionText: {
    color: "#fff",
    fontSize: 12,
  },
});