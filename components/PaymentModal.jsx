import { useState, useCallback } from "react"
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert } from "react-native"
import Ionicons from "react-native-vector-icons/Ionicons"
import LinearGradient from "react-native-linear-gradient"
import Button from "./ui/Button"
import { theme } from "../config/theme"
import { PLANS } from "../utils/constants"

const PaymentModal = ({ visible, onClose, onPaymentSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]?.name || "20-Min Vent")
  const [processing, setProcessing] = useState(false)

  const plans = PLANS

  const debugLog = useCallback(
    (action, data = {}) => {
      const timestamp = new Date().toISOString()
      console.log(`💳 [PaymentModal] ${action}`, {
        timestamp,
        selectedPlan,
        processing,
        visible,
        ...data,
      })
    },
    [selectedPlan, processing, visible],
  )

  const handlePlanSelection = useCallback(
    (planName) => {
      debugLog("plan_selected", {
        previousPlan: selectedPlan,
        newPlan: planName,
      })
      setSelectedPlan(planName)
    },
    [selectedPlan, debugLog],
  )

  const handlePayment = useCallback(async () => {
    const selectedPlanObject = plans.find((p) => p.name === selectedPlan)

    debugLog("payment_start", {
      selectedPlanObject,
      planPrice: selectedPlanObject?.price,
      planDuration: selectedPlanObject?.durationInMinutes,
    })

    setProcessing(true)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      debugLog("payment_success", {
        planName: selectedPlan,
        planObject: selectedPlanObject,
      })

      Alert.alert("Payment Successful", `You have successfully purchased ${selectedPlan}. Preparing your session...`, [
        {
          text: "Continue",
          onPress: () => {
            debugLog("payment_success_confirmed", {
              proceedingToSession: true,
            })
            onPaymentSuccess(selectedPlanObject)
          },
        },
      ])
    } catch (error) {
      debugLog("payment_error", {
        error: error.message,
        stack: error.stack?.substring(0, 200),
      })

      console.error("Payment processing error:", error)
      Alert.alert("Payment Failed", "There was an issue processing your payment. Please try again later.")
    } finally {
      setProcessing(false)
      debugLog("payment_processing_complete")
    }
  }, [selectedPlan, onPaymentSuccess, plans, debugLog])

  const PlanCard = useCallback(
    ({ plan }) => (
      <TouchableOpacity
        style={[styles.planCard, selectedPlan === plan.name && styles.selectedPlan]}
        onPress={() => handlePlanSelection(plan.name)}
        disabled={processing}
      >
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planDescription}>{plan.description}</Text>
          </View>
          {plan.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>Popular</Text>
            </View>
          )}
        </View>

        <View style={styles.planDetails}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          <Text style={styles.planDuration}>{plan.durationInMinutes} minutes</Text>
        </View>

        {selectedPlan === plan.name && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          </View>
        )}
      </TouchableOpacity>
    ),
    [selectedPlan, processing, handlePlanSelection],
  )

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <LinearGradient colors={["#1a1a40", "#0f0f2e"]} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <TouchableOpacity
            onPress={() => {
              debugLog("modal_close_requested")
              onClose()
            }}
            style={styles.closeButton}
            disabled={processing}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Select a plan to start your anonymous vent session</Text>

          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </View>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>What's included:</Text>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>Anonymous voice session</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>Matched with trained listener</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>End-to-end encrypted</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>No recording or storage</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={processing ? "Processing..." : `Pay ${plans.find((p) => p.name === selectedPlan)?.price || "N/A"}`}
            onPress={handlePayment}
            disabled={processing}
            loading={processing}
            variant="primary"
          />

          <Text style={styles.disclaimer}>Secure payment processed by Stripe. Cancel anytime.</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  plansContainer: {
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedPlan: {
    borderColor: "#FFC940",
    backgroundColor: "rgba(255, 201, 64, 0.15)",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  popularBadge: {
    backgroundColor: "#4ade80",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  popularText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  planDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  planDuration: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  checkmark: {
    position: "absolute",
    top: 15,
    right: 15,
  },
  features: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#3e3e5c",
  },
  disclaimer: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 16,
  },
})

export default PaymentModal