import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Alert, ScrollView, RefreshControl } from "react-native";

import { useNavigation } from "@react-navigation/native"; 
import GradientContainer from "../../components/ui/GradientContainer";
import StatusBar from "../../components/ui/StatusBar"; 
import Button from "../../components/ui/Button"; 
import Avatar from "../../components/ui/Avatar"; 
import { useAuth } from "../../context/AuthContext"; 
import useQueue from "../../hooks/useQueue"; 
import useMatching from "../../hooks/useMatching"; 
 

export default function ListenerScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { userInfo } = useAuth();
  const { queueStats, loading, refreshStats } = useQueue();
  const { isMatching, startMatching, stopMatching } = useMatching();

  const navigation = useNavigation(); 

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshStats();
    setRefreshing(false);
  }, [refreshStats]);

  const handleStartListening = useCallback(async () => {
    if (!userInfo?.uid) {
      Alert.alert("Error", "Please sign in to continue");
      return;
    }

    const success = await startMatching("listener");
    if (!success) {
      Alert.alert("Error", "Failed to start listening. Please try again.");
    }
  }, [userInfo, startMatching]);

  const handleStopListening = useCallback(async () => {
    Alert.alert(
      "Stop Listening",
      "Are you sure you want to stop listening? You won't be matched with anyone who needs to vent.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Stop", onPress: stopMatching },
      ],
    );
  }, [stopMatching]);

  const getEstimatedWaitMessage = useCallback(() => {
    const ventersWaiting = queueStats.ventersWaiting || 0;
    if (ventersWaiting > 0) {
      return `${ventersWaiting} ${ventersWaiting === 1 ? "person" : "people"} waiting - Match likely soon!`;
    }
    return "Waiting for someone to vent...";
  }, [queueStats.ventersWaiting]);

  return (
    <GradientContainer>
      <StatusBar />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <Text style={styles.anonymousText}>
          {userInfo?.isAnonymous ? "You are anonymous" : `Welcome, ${userInfo?.displayName || "Listener"}`}
        </Text>

        <View style={styles.mainContent}>
          <Avatar emoji="👂" size={120} />
          <Text style={styles.title}>Ready to{"\n"}Listen?</Text>

          <View style={styles.queueContainer}>
            <Text style={styles.queueTitle}>Current Queue</Text>
            <Text style={styles.queueNumber}>{loading ? "..." : queueStats.ventersWaiting}</Text>
            <Text style={styles.queueLabel}>
              {queueStats.ventersWaiting === 1 ? "person waiting" : "people waiting"} to vent
            </Text>
            {!loading && <Text style={styles.estimateText}>{getEstimatedWaitMessage()}</Text>}
          </View>

          {isMatching ? (
            <View style={styles.listeningContainer}>
              <View style={styles.pulseContainer}>
                <Text style={styles.listeningEmoji}>👂</Text>
              </View>
              <Text style={styles.listeningText}>Listening for venters...</Text>
              <Text style={styles.listeningSubtext}>You'll be connected automatically when someone needs to vent</Text>
            </View>
          ) : (
            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>As a Listener, you will:</Text>
              <InfoItem emoji="🤝" text="Provide a safe space for someone to vent" />
              <InfoItem emoji="👂" text="Listen without judgment or giving advice" />
              <InfoItem emoji="💝" text="Offer support and empathy" />
              <InfoItem emoji="🔒" text="Maintain complete anonymity and confidentiality" />

              <View style={styles.reminderContainer}>
                <Text style={styles.reminderTitle}>🌟 Remember</Text>
                <Text style={styles.reminderText}>
                  Sometimes just being heard is exactly what someone needs. Your compassion makes a real difference.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          {!isMatching ? (
            <Button title="Start Listening" onPress={handleStartListening} variant="secondary" />
          ) : (
            <Button title="Stop Listening" onPress={handleStopListening} variant="outline" />
          )}

          <Button
            title="Back to Dashboard"
            onPress={() => navigation.navigate("DashboardScreen")}
            variant="outline"
            style={styles.backButton}
          />
        </View>
      </ScrollView>
    </GradientContainer>
  );
}

const InfoItem = React.memo(({ emoji, text }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoEmoji}>{emoji}</Text>
    <Text style={styles.infoText}>{text}</Text>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 32,
  },
  anonymousText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 24,
    marginBottom: 24,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 32,
    marginBottom: 32,
    lineHeight: 44,
  },
  queueContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 32,
    minWidth: 220,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  queueTitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 8,
  },
  queueNumber: {
    color: "#4ade80",
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 5,
  },
  queueLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 8,
  },
  estimateText: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  listeningContainer: {
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#4f46e5",
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  pulseContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  listeningEmoji: {
    fontSize: 32,
  },
  listeningText: {
    color: "#4f46e5",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  listeningSubtext: {
    color: "rgba(79, 70, 229, 0.8)",
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 24,
    borderRadius: 20,
    width: "100%",
    maxWidth: 320,
  },
  infoTitle: {
    color: "#f59e0b",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoEmoji: {
    fontSize: 20,
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
    flex: 1,
  },
  reminderContainer: {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#4ade80",
    marginTop: 24,
  },
  reminderTitle: {
    color: "#4ade80",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  reminderText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  buttonContainer: {
    paddingBottom: 48,
    paddingTop: 24,
    gap: 16,
  },
  backButton: {
    marginTop: 5,
  },
});