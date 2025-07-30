import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native";
import GradientContainer from "../../components/ui/GradientContainer";
import StatusBar from "../../components/ui/StatusBar"; 
import Button from "../../components/ui/Button"; 
import Avatar from "../../components/ui/Avatar"; 

import { formatDuration } from "../../utils/helper"; 

export default function SessionEndedScreen() {
  
  const route = useRoute(); 
  const navigation = useNavigation();

 
  const { sessionTime, plan, autoEnded } = route.params || {};

  const duration = Number.parseInt(sessionTime) || 0;
  const wasAutoEnded = autoEnded === "true";

  useEffect(() => {
    console.log("Session completed:", { duration, plan, autoEnded: wasAutoEnded });
  }, [duration, plan, wasAutoEnded]); 

  const handleBackToDashboard = () => {
   
    navigation.navigate("DashboardScreen"); 
  };

  const handleVentAgain = () => {
   
    navigation.navigate("VentSubmittedScreen");  
  };

  const handleBeListener = () => {
   
    navigation.navigate("ListenerScreen"); 
  };

  return (
    <GradientContainer>
      <StatusBar />
      <View style={styles.container}>
        <View style={styles.content}>
          <Avatar emoji="✅" size={100} />

          <Text style={styles.title}>Session Complete</Text>

          <Text style={styles.subtitle}>
            {wasAutoEnded ? "Your session has ended automatically" : "Thank you for using VentBox"}
          </Text>

          <View style={styles.sessionInfo}>
            <InfoCard label="Session Duration" value={formatDuration(duration)} />
            <InfoCard label="Plan Used" value={plan || "20-Min Vent"} />
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.messageTitle}>{wasAutoEnded ? "Time's Up!" : "Hope You Feel Better"}</Text>
            <Text style={styles.messageText}>
              {wasAutoEnded
                ? "Your session time has ended. We hope this conversation was helpful."
                : "Remember, it's okay to not be okay. You're not alone in this journey."}
            </Text>
          </View>

          <View style={styles.reminderContainer}>
            <Text style={styles.reminderTitle}>🔒 Your Privacy</Text>
            <Text style={styles.reminderText}>
              This conversation was completely anonymous and has not been recorded or stored.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="Back to Dashboard" onPress={handleBackToDashboard} style={styles.primaryButton} />

          <View style={styles.secondaryActions}>
            <Button title="Vent Again" onPress={handleVentAgain} variant="outline" style={styles.secondaryButton} />
            <Button title="Be a Listener" onPress={handleBeListener} variant="outline" style={styles.secondaryButton} />
          </View>
        </View>
      </View>
    </GradientContainer>
  );
}

const InfoCard = React.memo(({ label, value }) => (
  <View style={styles.infoCard}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  sessionInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4ade80",
  },
  messageContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    width: "100%",
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 22,
  },
  reminderContainer: {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.3)",
    width: "100%",
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4ade80",
    textAlign: "center",
    marginBottom: 8,
  },
  reminderText: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 20,
  },
  actions: {
    paddingBottom: 48,
  },
  primaryButton: {
    marginBottom: 24,
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});