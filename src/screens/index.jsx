import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GradientContainer from '../../components/ui/GradientContainer';
import StatusBar from '../../components/ui/StatusBar';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';


export default function WelcomeScreen() {
  const [signingIn, setSigningIn] = useState(false);
  const { user, userInfo, loading, signInAnonymous, error } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation(); 

  useEffect(() => {
  
    if (!loading && user && userInfo) {
      
      navigation.replace('DashboardScreen'); 
    }
  }, [loading, user, userInfo, navigation]); 

  const handleGetStarted = async () => {
    if (signingIn) return;

    try {
      setSigningIn(true);

      if (user && userInfo) {
       
        navigation.replace('DashboardScreen');
        return;
      }

      const signedInUser = await signInAnonymous();
      if (signedInUser) {
        // Replaced router.replace with navigation.replace
        // A small timeout can sometimes help ensure navigation is smooth after auth state updates
        setTimeout(() => navigation.replace('DashboardScreen'), 500);
      }
    } catch (error) {
      Alert.alert('Sign In Error', `Failed to sign in: ${error.message}`, [
        { text: 'Retry', onPress: handleGetStarted },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <GradientContainer>
        <StatusBar />
        <View style={styles.loadingContainer}>
          <Avatar emoji="💭" size={120} />
          <Text style={styles.loadingText}>Loading VentBox...</Text>
        </View>
      </GradientContainer>
    );
  }

  // Display error screen if there's an error and no user is signed in
  if (error && !user) {
    return (
      <GradientContainer>
        <StatusBar />
        <View style={styles.errorContainer}>
          <Avatar emoji="⚠️" size={80} />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Retry"
            onPress={handleGetStarted}
            style={styles.retryButton}
          />
        </View>
      </GradientContainer>
    );
  }

  return (
    <GradientContainer>
      <StatusBar />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Avatar emoji="💭" size={120} />
            <Text style={styles.title}>VentBox</Text>
            <Text style={styles.subtitle}>Anonymous venting made safe</Text>
          </View>

          <View style={styles.features}>
            <FeatureItem emoji="🔒" text="Completely Anonymous" />
            <FeatureItem emoji="👂" text="Trained Listeners" />
            <FeatureItem emoji="🎯" text="Instant Matching" />
          </View>

          <Text style={styles.description}>
            Sometimes you just need someone to listen. VentBox connects you with
            caring listeners in a safe, anonymous environment.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            title={signingIn ? 'Signing In...' : 'Get Started'}
            onPress={handleGetStarted}
            disabled={signingIn}
            loading={signingIn}
            style={styles.getStartedButton}
          />
          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </GradientContainer>
  );
}

// Using React.memo for performance optimization if FeatureItem doesn't re-render often
const FeatureItem = React.memo(({ emoji, text }) => (
  <View style={styles.feature}>
    <Text style={styles.featureEmoji}>{emoji}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "400",
    marginTop: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "400",
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    minWidth: 120,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: 'center',
  },
  features: {
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#ffffff",
  },
  description: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  footer: {
    paddingBottom: 48,
  },
  getStartedButton: {
    marginBottom: 24,
  },
  disclaimer: {
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: 'center',
    lineHeight: 16,
  },
});