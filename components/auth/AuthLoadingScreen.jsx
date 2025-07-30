import { View, Text, ActivityIndicator, StyleSheet } from "react-native"
import GradientContainer from "../ui/GradientContainer"

const AuthLoadingScreen = ({ message = "Loading..." }) => {
  return (
    <GradientContainer>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffa726" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </GradientContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  message: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
})

export default AuthLoadingScreen