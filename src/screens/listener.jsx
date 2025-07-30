import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native"; 
import GradientContainer from "../../components/ui/GradientContainer";
import StatusBar from "../../components/ui/StatusBar"; 
import Button from "../../components/ui/Button"; 
import Avatar from "../../components/ui/Avatar"; 
import RoomCard from "../../components/room/RoomCard";

import { useAuth } from "../../context/AuthContext"; 
import useRooms from "../../hooks/useRooms";
import useRoomMatching from "../../hooks/useRoomMatching";
import EmptyRoomsState from "../../components/room/EmptyRoomsStats";

export default function ListenerScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { userInfo } = useAuth();
  const { availableRooms, loading, error, refreshRooms } = useRooms();
  const { joinRoom, isJoining } = useRoomMatching();
  const navigation = useNavigation();
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshRooms();
    setRefreshing(false);
  }, [refreshRooms]);

  const handleJoinRoom = useCallback(async (room) => {
    const success = await joinRoom(room);
    if (success) {
      // Navigation is handled in useRoomMatching
    }
  }, [joinRoom]);

  const renderRoomCard = useCallback(({ item }) => (
    <RoomCard
      room={item}
      onJoinRoom={handleJoinRoom}
      disabled={isJoining}
    />
  ), [handleJoinRoom, isJoining]);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <GradientContainer>
      <StatusBar />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.anonymousText}>
            {userInfo?.isAnonymous ? "You are anonymous" : `Welcome, ${userInfo?.displayName || "Listener"}`}
          </Text>
          
          <View style={styles.titleContainer}>
            <Avatar emoji="👂" size={80} />
            <Text style={styles.title}>Available Rooms</Text>
            <Text style={styles.subtitle}>
              Choose a room to join and provide support
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{loading ? "..." : availableRooms.length}</Text>
              <Text style={styles.statLabel}>
                {availableRooms.length === 1 ? "room available" : "rooms available"}
              </Text>
            </View>
          </View>
        </View>

        {/* Rooms List */}
        <View style={styles.roomsContainer}>
          {availableRooms.length === 0 ? (
            <EmptyRoomsState loading={loading} error={error} />
          ) : (
            <FlatList
              data={availableRooms}
              renderItem={renderRoomCard}
              keyExtractor={keyExtractor}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  tintColor="#fff"
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.roomsList}
            />
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.reminderContainer}>
            <Text style={styles.reminderTitle}>🌟 Remember</Text>
            <Text style={styles.reminderText}>
              Your role is to listen with empathy and provide a safe space. Avoid giving advice unless asked.
            </Text>
          </View>

          <Button
            title="Back to Dashboard"
            onPress={() => navigation.navigate("DashboardScreen")}
            variant="outline"
            style={styles.backButton}
          />
        </View>
      </View>
    </GradientContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  anonymousText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 20,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  statsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    color: "#4ade80",
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
  },
  roomsContainer: {
    flex: 1,
    marginVertical: 20,
  },
  roomsList: {
    paddingBottom: 20,
  },
  footer: {
    paddingBottom: 40,
  },
  reminderContainer: {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#4ade80",
    marginBottom: 20,
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
  backButton: {
    alignSelf: "center",
    minWidth: 200,
  },
});