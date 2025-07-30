import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MessageSquare, Clock } from 'lucide-react-native';

const EmptyRoomsState = ({ loading, error }) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <MessageSquare size={48} color="rgba(255,255,255,0.4)" />
        </View>
        <Text style={styles.title}>Loading rooms...</Text>
        <Text style={styles.subtitle}>Finding people who need someone to listen</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <MessageSquare size={48} color="rgba(239, 68, 68, 0.6)" />
        </View>
        <Text style={styles.title}>Unable to load rooms</Text>
        <Text style={styles.subtitle}>Pull down to refresh and try again</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Clock size={48} color="rgba(255,255,255,0.4)" />
      </View>
      <Text style={styles.title}>No rooms available</Text>
      <Text style={styles.subtitle}>
        Check back in a few minutes. People are always looking for someone to listen.
      </Text>
      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>💡 Tip</Text>
        <Text style={styles.tipText}>
          Rooms appear when people need to vent. Peak times are usually evenings and weekends.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  iconContainer: {
    marginBottom: 24,
    opacity: 0.7,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  tipContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    width: '100%',
    maxWidth: 300,
  },
  tipTitle: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  tipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default EmptyRoomsState;