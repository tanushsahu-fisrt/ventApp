import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Clock, Users, MessageCircle } from 'lucide-react-native';

const RoomCard = ({ room, onJoinRoom, disabled }) => {
  const handleJoinPress = () => {
    if (disabled) return;
    
    Alert.alert(
      "Join Room",
      `Do you want to join this conversation?\n\nPlan: ${room.plan}\nWaiting: ${room.timeWaiting} min`,
      [
        { 
          text: "Cancel", 
          style: "cancel" 
        },
        { 
          text: "Join", 
          onPress: () => onJoinRoom(room) 
        }
      ]
    );
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case "Quick Vent (10 min)":
        return "#10b981"; // green
      case "20-Min Vent":
        return "#3b82f6"; // blue  
      case "Extended Vent (40 min)":
        return "#f59e0b"; // amber
      default:
        return "#6b7280"; // gray
    }
  };

  const getTimeWaitingText = (minutes) => {
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 min ago";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      onPress={handleJoinPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.planBadge, { backgroundColor: getPlanColor(room.plan) }]}>
          <Text style={styles.planText}>{room.plan}</Text>
        </View>
        <View style={styles.timeContainer}>
          <Clock size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.timeText}>{getTimeWaitingText(room.timeWaiting)}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.previewContainer}>
          <MessageCircle size={18} color="rgba(255,255,255,0.8)" />
          <Text style={styles.previewText} numberOfLines={3}>
            {room.previewText}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.occupancyContainer}>
          <Users size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.occupancyText}>
            {room.listenerCount}/{room.maxListeners} listeners
          </Text>
        </View>
        <View style={styles.joinButton}>
          <Text style={styles.joinButtonText}>Join Room</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabled: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flex: 1,
    marginRight: 12,
  },
  planText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '400',
  },
  content: {
    marginBottom: 16,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  previewText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  occupancyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  occupancyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '400',
  },
  joinButton: {
    backgroundColor: 'rgba(79, 70, 229, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RoomCard;