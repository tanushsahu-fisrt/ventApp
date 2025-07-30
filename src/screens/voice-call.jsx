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
  const [connectionAttempts, setConnectionAttempts] = useState(0);
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

    Alert.alert("Session Ended", "Your session has ended automatically due to time limit.", [
      {
        text: "OK",
        onPress: async () => {
          await leaveChannel();
          if (sessionId) {
            try {
              await firestoreService.endSession(sessionId, sessionTime, "auto-ended");
            } catch (error) {
              console.error("Error ending session in Firestore (auto-ended):", error);
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
  }, [isExiting, leaveChannel, sessionId, sessionTime, plan, navigation]); 

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

 
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      handleEndCall();
      return true; 
    });

    return () => backHandler.remove();
  }, [handleEndCall]);

  
  useEffect(() => {
    if (!channelName || !sessionId || typeof isHost === "undefined" || !plan) {
      console.error("Missing required parameters:", { channelName, sessionId, isHost, plan });
      Alert.alert("Error", "Missing call parameters. Returning to dashboard.");
      
      navigation.replace("DashboardScreen"); 
    }
  }, [channelName, sessionId, isHost, plan, navigation]); 

  
  useEffect(() => {
    if (agoraError && !isExiting) {
      console.error("VoiceCall Screen: Agora reported an error:", agoraError);

     
      if (connectionState === "failed" && connectionAttempts < 2) {
        console.log(`Attempting to reconnect (attempt ${connectionAttempts + 1}/2)`);
        setConnectionAttempts((prev) => prev + 1);

        setTimeout(() => {
          if (!isExiting) {
            joinChannel();
          }
        }, 3000);
      } else if (connectionAttempts >= 2) {
        // Max retries reached
        Alert.alert(
          "Connection Failed",
          "Unable to establish voice connection after multiple attempts. Please try again later.",
          [
            {
              text: "OK",
              onPress: () => navigation.replace("DashboardScreen"), 
            },
          ],
        );
      }
    }
  }, [agoraError, connectionState, connectionAttempts, joinChannel, isExiting, navigation]); 

  
  useEffect(() => {
    if (joined) {
      setConnectionAttempts(0);
    }
  }, [joined]);

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
                console.error("Error ending session in Firestore (manual-ended):", error);
              }
            }

            // Changed router.replace to navigation.replace
            navigation.replace("SessionEndedScreen", { // Use the actual screen name for SessionEndedScreen
              sessionTime: sessionTime.toString(),
              plan,
              autoEnded: "false",
            });
          } catch (error) {
            console.error("Error during manual call ending process:", error);
            // Still navigate away even if there's an error
            navigation.replace("DashboardScreen"); // Changed router.replace
          }
        },
      },
    ]);
  }, [stopTimer, leaveChannel, sessionId, sessionTime, plan, isExiting, navigation]); // Added navigation to dependencies

  const handleRetryConnection = useCallback(() => {
    if (isExiting) return;
    setConnectionAttempts(0);
    joinChannel();
  }, [joinChannel, isExiting]);

  // Loading state while connecting
  if (connectionState === "connecting" || (!joined && remoteUsers.length === 0 && !agoraError)) {
    return (
      <GradientContainer>
        <StatusBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>
            {connectionState === "connecting" ? "Connecting to session..." : "Initializing voice call..."}
          </Text>
          <Text style={styles.loadingSubText}>
            {connectionAttempts > 0
              ? `Retry attempt ${connectionAttempts}/2`
              : "Please ensure your internet connection is stable."}
          </Text>
          <Button
            title="Cancel Connection"
            onPress={() => navigation.replace("DashboardScreen")} // Changed router.replace
            variant="outline"
            style={styles.cancelButton}
          />
        </View>
      </GradientContainer>
    );
  }

  
  if (agoraError && connectionState === "failed" && connectionAttempts >= 2) {
    return (
      <GradientContainer>
        <StatusBar />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Failed</Text>
          <Text style={styles.errorMessage}>{agoraError}</Text>
          <Text style={styles.errorSubMessage}>Failed to connect after {connectionAttempts} attempts.</Text>
          <Button title="Try Again" onPress={handleRetryConnection} variant="primary" />
          <Button
            title="Go Back to Dashboard"
            onPress={() => navigation.replace("DashboardScreen")} // Changed router.replace
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

        {/* Connection status indicator */}
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
    backgroundColor: "rgba(0,0,0,0.5)",
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
  errorSubMessage: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
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