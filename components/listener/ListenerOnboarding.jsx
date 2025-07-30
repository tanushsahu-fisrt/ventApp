import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, Modal } from "react-native"
import Ionicons from "react-native-vector-icons/Ionicons"
import LinearGradient from "react-native-linear-gradient"
import Button from "../ui/Button"
import Avatar from "../ui/Avatar"

const ListenerOnboarding = ({ visible, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: "Welcome, Listener!",
      emoji: "👋",
      content: [
        "Thank you for choosing to help others by listening.",
        "Your role is crucial in providing a safe space for people to express their feelings.",
        "Let's go through some important guidelines to ensure positive experiences for everyone.",
      ],
    },
    {
      title: "Your Role as a Listener",
      emoji: "👂",
      content: [
        "• Listen actively without judgment",
        "• Provide emotional support and empathy",
        "• Maintain complete confidentiality",
        "• Respect the venter's anonymity",
        "• Create a safe, non-judgmental space",
      ],
    },
    {
      title: "What NOT to Do",
      emoji: "⚠️",
      content: [
        "• Don't give unsolicited advice",
        "• Don't share personal information",
        "• Don't judge or criticize",
        "• Don't try to solve their problems",
        "• Don't record or screenshot anything",
      ],
    },
    {
      title: "Session Guidelines",
      emoji: "📋",
      content: [
        "• Sessions last 10-30 minutes",
        "• You can end the session if uncomfortable",
        "• Report inappropriate behavior immediately",
        "• Take breaks between sessions if needed",
        "• Your wellbeing matters too",
      ],
    },
    {
      title: "Ready to Listen?",
      emoji: "✨",
      content: [
        "You're all set to start helping others!",
        "Remember: Sometimes just being heard is exactly what someone needs.",
        "Your compassion and time make a real difference in someone's day.",
      ],
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentStepData = steps[currentStep]

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <LinearGradient colors={["#1a1a40", "#0f0f2e"]} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.stepIndicator}>
            {currentStep + 1} of {steps.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentStep + 1) / steps.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stepContent}>
            <Avatar emoji={currentStepData.emoji} size={100} />

            <Text style={styles.title}>{currentStepData.title}</Text>

            <View style={styles.contentContainer}>
              {currentStepData.content.map((item, index) => (
                <Text key={index} style={styles.contentText}>
                  {item}
                </Text>
              ))}
            </View>

            {currentStep === steps.length - 1 && (
              <View style={styles.finalMessage}>
                <Ionicons name="heart" size={24} color="#ff6b6b" />
                <Text style={styles.finalText}>
                  Thank you for being part of our caring community!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            {currentStep > 0 && (
              <Button
                title="Previous"
                onPress={handlePrevious}
                variant="outline"
                style={styles.navButton}
              />
            )}

            <Button
              title={
                currentStep === steps.length - 1 ? "Start Listening" : "Next"
              }
              onPress={handleNext}
              style={[styles.navButton, { flex: 1 }]}
            />
          </View>

          {currentStep < steps.length - 1 && (
            <Button
              title="Skip Tutorial"
              onPress={onComplete}
              variant="outline"
              style={styles.skipButton}
            />
          )}
        </View>
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  stepIndicator: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4ade80",
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContent: {
    alignItems: "center",
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  contentContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    marginBottom: 20,
  },
  contentText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 24,
    marginBottom: 12,
    textAlign: "left",
  },
  finalMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  finalText: {
    fontSize: 16,
    color: "#ff6b6b",
    marginLeft: 10,
    flex: 1,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 15,
  },
  navButton: {
    flex: 1,
  },
  skipButton: {
    opacity: 0.7,
  },
})

export default ListenerOnboarding
