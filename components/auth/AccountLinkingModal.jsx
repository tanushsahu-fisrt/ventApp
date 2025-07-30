import { View, Text, StyleSheet, Modal, Alert } from "react-native"
import LinearGradient from "react-native-linear-gradient"
import Button from "../ui/Button"
import { useAuth } from "../../context/AuthContext"


const AccountLinkingModal = ({ visible, onClose }) => {
  const { linkWithGoogle, userInfo, isLinkingAccount } = useAuth()

  const handleLinkWithGoogle = async () => {
    try {
      await linkWithGoogle()
      Alert.alert("Success!", "Your account has been linked with Google", [
        {
          text: "OK",
          onPress: onClose,
        },
      ])
    } catch (error) {
      // Error is already handled in context
    }
  }

  if (!userInfo?.canLinkAccount) {
    return null
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Link Your Account</Text>
            <Text style={styles.subtitle}>
              You're currently signed in anonymously. Link your account to save your data and access it from other
              devices.
            </Text>
          </View>

          <View style={styles.benefits}>
            <Text style={styles.benefitsTitle}>Benefits of linking:</Text>
            <Text style={styles.benefit}>• Access your account from any device</Text>
            <Text style={styles.benefit}>• Your data will be saved permanently</Text>
            <Text style={styles.benefit}>• Better security and recovery options</Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title={isLinkingAccount ? "Linking..." : "🔗 Link with Google"}
              onPress={handleLinkWithGoogle}
              disabled={isLinkingAccount}
            />

            <Button title="Maybe Later" onPress={onClose} variant="outline" />
          </View>
        </LinearGradient>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    borderRadius: 20,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  benefits: {
    marginBottom: 30,
  },
  benefitsTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  benefit: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginBottom: 5,
  },
  buttonContainer: {
    gap: 15,
  },
})

export default AccountLinkingModal
