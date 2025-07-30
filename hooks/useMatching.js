import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import firestoreService from "../services/firestoreService"; 
import { useAuth } from "../context/AuthContext"; 
import { useNavigation } from "@react-navigation/native"; 

const useMatching = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [matchingStatus, setMatchingStatus] = useState("idle"); 
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(null);

  const unsubscribeRef = useRef(null);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const matchProcessingRef = useRef(false); 

  const { userInfo } = useAuth();
  const navigation = useNavigation(); 

  const calculateEstimatedWaitTime = useCallback(async (userType) => {
    try {
      const stats = await firestoreService.getQueueStats();
      const waitingCount = userType === "venter" ? stats.ventersWaiting : stats.listenersWaiting;
      const oppositeCount = userType === "venter" ? stats.listenersWaiting : stats.ventersWaiting;

      let estimatedTime;
      if (oppositeCount > 0) {
        estimatedTime = "< 30 seconds";
      } else if (waitingCount < 3) {
        estimatedTime = "1-2 minutes";
      } else if (waitingCount < 8) {
        estimatedTime = "3-5 minutes";
      } else {
        estimatedTime = "5+ minutes";
      }

      setEstimatedWaitTime(estimatedTime);
    } catch (error) {
      setEstimatedWaitTime("Unknown");
    }
  }, []);

  const cleanupMatching = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      } catch (error) {
        console.warn("Unsubscribe error:", error.message);
      }
    }

    if (matchData?.queueDocId && userInfo?.uid) {
      try {
        await firestoreService.removeFromQueue(matchData.queueDocId);
      } catch (error) {
        console.warn("Remove from queue error:", error.message);
      }
    }

    if (isMountedRef.current) {
      setIsMatching(false);
      setMatchData(null);
      setMatchingStatus("idle");
      setEstimatedWaitTime(null);
      matchProcessingRef.current = false;
    }
  }, [matchData, userInfo?.uid]);

  const stopMatching = useCallback(async () => {
    if (!isMountedRef.current) return;
    setMatchingStatus("idle");
    await cleanupMatching();
  }, [cleanupMatching]);

  const handleMatchFound = useCallback(
    async (match, userType, ventText, selectedPlan) => {
      if (matchProcessingRef.current) return;
      matchProcessingRef.current = true;

      if (!isMountedRef.current || matchingStatus !== "searching") {
        matchProcessingRef.current = false;
        return;
      }

      setMatchingStatus("found");

      try {
        const currentQueueData = matchData;
        if (!currentQueueData || !currentQueueData.queueDocId) {
          throw new Error("No valid queue data available");
        }

        let session;
        if (userType === "venter") {
          session = await firestoreService.createSession(
            userInfo.uid,
            match.userId,
            currentQueueData.queueDocId,
            match.docId,
            ventText,
            selectedPlan
          );
        } else {
          session = await firestoreService.createSession(
            match.userId,
            userInfo.uid,
            match.docId,
            currentQueueData.queueDocId,
            match.ventText,
            match.plan || "20-Min Vent"
          );
        }

        await cleanupMatching();

        // Navigate to voice call
        navigation.navigate("VoiceCall", {
          ventText: userType === "venter" ? ventText : match.ventText,
          plan: userType === "venter" ? selectedPlan : match.plan || "20-Min Vent",
          channelName: session.channelName,
          isHost: (userType === "venter").toString(),
          sessionId: session.sessionId,
        });

      } catch (error) {
        console.error("Match processing error:", error.message);

        if (isMountedRef.current) {
          setMatchingStatus("failed");

          Alert.alert("Connection Failed", "Failed to connect with your match. Please try again.", [
            {
              text: "Try Again",
              onPress: () => {
                matchProcessingRef.current = false;
                startMatching(userType, ventText, selectedPlan);
              },
            },
            { text: "Cancel", onPress: () => stopMatching(), style: "cancel" },
          ]);
        }
        await stopMatching();
      } finally {
        matchProcessingRef.current = false;
      }
    },
    [userInfo?.uid, matchingStatus, matchData, cleanupMatching, stopMatching, navigation]
  );

  const startMatching = useCallback(
    async (userType, ventText = null, selectedPlan = null) => {
      if (!userInfo?.uid) {
        Alert.alert("Authentication Required", "Please sign in to continue.");
        return false;
      }

      if (isMatching) {
        Alert.alert("Already Matching", "You are already in the matching queue.");
        return false;
      }

      if (userType === "venter") {
        if (!ventText || ventText.trim().length < 10) {
          Alert.alert("Input Required", "Please provide a detailed description (at least 10 characters).");
          return false;
        }
        if (!selectedPlan) {
          Alert.alert("Plan Required", "Please select a plan for your vent session.");
          return false;
        }
      }

      await cleanupMatching();

      try {
        setIsMatching(true);
        setMatchingStatus("searching");
        setMatchData(null);
        matchProcessingRef.current = false;

        await calculateEstimatedWaitTime(userType);

        let queueData;
        if (userType === "venter") {
          queueData = await firestoreService.addToQueue(userInfo.uid, "venter", ventText.trim(), selectedPlan);
        } else {
          queueData = await firestoreService.addToQueue(userInfo.uid, "listener");
        }

        setMatchData(queueData);

        const oppositeType = userType === "venter" ? "listener" : "venter";

        unsubscribeRef.current = firestoreService.listenToQueue(oppositeType, async (matches) => {
          if (!isMountedRef.current || matchingStatus !== "searching" || matchProcessingRef.current) {
            return;
          }

          if (matches.length > 0) {
            const match = matches[0];
            await handleMatchFound(match, userType, ventText, selectedPlan);
          }
        });

        // Timeout after 4 minutes
        timeoutRef.current = setTimeout(async () => {
          if (isMountedRef.current && matchingStatus === "searching") {
            setMatchingStatus("failed");

            Alert.alert("No Match Found", "We couldn't find a match right now. Please try again later.", [
              {
                text: "Try Again",
                onPress: () => startMatching(userType, ventText, selectedPlan),
              },
              { text: "Cancel", onPress: () => stopMatching(), style: "cancel" },
            ]);
          }
        }, 240000);

        return true;
      } catch (error) {
        console.error("Start matching error:", error.message);

        if (isMountedRef.current) {
          setMatchingStatus("failed");
          Alert.alert("Matching Error", "Failed to start matching. Please try again.", [
            { text: "OK", onPress: () => stopMatching() }
          ]);
        }

        await stopMatching();
        return false;
      }
    },
    [userInfo?.uid, isMatching, matchingStatus, cleanupMatching, calculateEstimatedWaitTime, handleMatchFound, stopMatching]
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cleanupMatching();
    };
  }, [cleanupMatching]);

  return {
    isMatching,
    matchData,
    matchingStatus,
    estimatedWaitTime,
    startMatching,
    stopMatching,
  };
};

export default useMatching;