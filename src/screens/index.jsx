import { useState } from "react"
import { View, Text, StyleSheet, ActivityIndicator } from "react-native"
import { useNavigation } from "@react-navigation/native"
import GradientContainer from "../../components/ui/GradientContainer"
import StatusBar from "../../components/ui/StatusBar"
import Button from "../../components/ui/Button"
import Avatar from "../../components/ui/Avatar"
import { useAuth } from "../../context/AuthContext"

export default function WelcomeScreen() {
  const navigation = useNavigation()
  const [loading, setLoading] = useState(false)
  const [anonymousLoading, setAnonymousLoading] = useState(false)
  const { signInAnonymous, signInWithGoogle, userInfo } = useAuth()

  const handleAnonymousSignIn = async () => {
    if (anonymousLoading) return
    setAnonymousLoading(true)
    try {
      await signInAnonymous()
      navigation.replace("Dashboard")
    } catch (error) {
      console.error("Anonymous Sign-in Error:", error)
    } finally {
      setAnonymousLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (loading) return
    setLoading(true)
    try {
      await signInWithGoogle()
      navigation.navigate("Vent")
    } catch (error) {
      console.error("Google Sign-in Error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <GradientContainer>
      <StatusBar />

      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          {userInfo?.isAnonymous ? "You are anonymous" : "Welcome to Vent Box"}
        </Text>

        <View style={styles.mainContent}>
          <Text style={styles.title}>💭 Vent Box</Text>
          <Text style={styles.subtitle}>Share your thoughts anonymously</Text>

          <View style={styles.avatarContainer}>
            <Avatar emoji="💬" />
          </View>

          <View style={styles.techStack}>
            <Text style={styles.techTitle}>🚀 Built With:</Text>
            {["📱 Expo Go", "🔐 Expo Crypto", "🔥 Firebase Auth", "⚡ React Native"].map((tech, i) => (
              <Text key={i} style={styles.techItem}>{tech}</Text>
            ))}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={loading ? "Signing in..." : "🔍 Continue with Google"}
            onPress={handleGoogleSignIn}
            variant="secondary"
            disabled={loading}
          />

          <Button
            title={anonymousLoading ? "Signing in..." : "👤 Continue Anonymously"}
            onPress={handleAnonymousSignIn}
            disabled={anonymousLoading}
          />

          <Text style={styles.privacyText}>
            No personal data is collected in Anonymous mode.
          </Text>
        </View>
      </View>
    </GradientContainer>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  welcomeText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  avatarContainer: {
    marginBottom: 28,
  },
  techStack: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 5,
  },
  techTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4ade80",
    marginBottom: 6,
  },
  techItem: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    marginVertical: 2,
  },
  buttonContainer: {
    paddingBottom: 40,
    gap: 15,
  },
  privacyText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    color: "rgba(255,255,255,0.6)",
    fontStyle: "italic",
  },
})
