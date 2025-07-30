import { useState, useEffect, useRef, useCallback } from "react";
import { Alert } from "react-native";
import firestoreService from "../services/firestoreService";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

const useRoomMatching = () => {
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  const isMountedRef = useRef(true);
  const { userInfo } = useAuth();
  const navigation = useNavigation();

  const joinRoom = useCallback(async (room) => {
    if (!userInfo?.uid) {
      Alert.alert("Authentication Required", "Please sign in to continue.");
      return false;
    }

    if (isJoining) {
      return false;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const result = await firestoreService.joinRoom(room.roomId, userInfo.uid);
      
      if (!isMountedRef.current) return false;

      // Navigate to voice call
      navigation.navigate("VoiceCall", {
        ventText: result.ventText,
        plan: result.plan,
        channelName: result.channelName,
        isHost: "false", // Listener is not host
        sessionId: result.sessionId,
        roomId: result.roomId,
      });

      return true;

    } catch (error) {
      console.error("Join room error:", error.message);

      if (isMountedRef.current) {
        let errorMessage = "Failed to join room";
        
        if (error.message.includes("not available")) {
          errorMessage = "This room is no longer available";
        } else if (error.message.includes("full")) {
          errorMessage = "This room is full";
        } else if (error.message.includes("already joined")) {
          errorMessage = "This room has already been joined";
        }

        setJoinError(errorMessage);
        Alert.alert("Unable to Join", errorMessage, [
          { text: "OK", onPress: () => setJoinError(null) }
        ]);
      }

      return false;
    } finally {
      if (isMountedRef.current) {
        setIsJoining(false);
      }
    }
  }, [userInfo?.uid, isJoining, navigation]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    joinRoom,
    isJoining,
    joinError,
  };
};

export default useRoomMatching;