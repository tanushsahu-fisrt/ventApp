import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";

import firestoreService from "../services/firestoreService"; 
import { useAuth } from "../context/AuthContext"; 
import { useNavigation } from "@react-navigation/native"; 

const useMatching = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [matchingStatus, setMatchingStatus] = useState("idle"); // idle, searching, found, failed
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("unknown"); // unknown, connected, disconnected

  const unsubscribeRef = useRef(null);
  const timeoutRef = useRef(null);
  const matchDataRef = useRef(null);
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef(null);
  const connectionCheckIntervalRef = useRef(null);
  const matchProcessingRef = useRef(false); // Prevent duplicate match processing
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  const { userInfo } = useAuth();
  const navigation = useNavigation(); // NEW - Get navigation object

  // Enhanced debug logging with better throttling
  const loggedMessages = useRef(new Set());
  const debugLog = useCallback(
    (action, data = {}, level = "info") => {
      const logKey = `${level}-${action}`;
      if (loggedMessages.current.has(logKey)) return;

      loggedMessages.current.add(logKey);
      setTimeout(() => loggedMessages.current.delete(logKey), 2000); // Throttle logging

      const timestamp = new Date().toISOString();
      const logData = {
        timestamp,
        hook: "useMatching",
        action,
        userId: userInfo?.uid || "unknown",
        currentIsMatching: isMatching,
        currentMatchingStatus: matchingStatus,
        connectionStatus,
        reconnectAttempts: reconnectAttemptsRef.current,
        ...data,
      };

      const logMessage = `🔍 [useMatching] ${action}`;

      switch (level) {
        case "error":
          console.error(logMessage, logData);
          break;
        case "warn":
          console.warn(logMessage, logData);
          break;
        default:
          console.log(logMessage, logData);
      }
    },
    [userInfo?.uid, isMatching, matchingStatus, connectionStatus]
  );

  // Enhanced connection monitoring
  const checkConnection = useCallback(async () => {
    try {
      const isConnected = await firestoreService.testConnection(); // Ensure this method exists in firestoreService
      const newStatus = isConnected ? "connected" : "disconnected";

      if (newStatus !== connectionStatus) {
        setConnectionStatus(newStatus);
        debugLog("connection_status_changed", {
          previousStatus: connectionStatus,
          newStatus,
        });

        // Reset reconnect attempts on successful connection
        if (newStatus === "connected") {
          reconnectAttemptsRef.current = 0;
        }
      }

      return isConnected;
    } catch (error) {
      debugLog("connection_check_error", { error: error.message }, "error");
      setConnectionStatus("disconnected");
      return false;
    }
  }, [connectionStatus, debugLog]);

  // Set up enhanced connection monitoring
  useEffect(() => {
    checkConnection(); // Initial check

    connectionCheckIntervalRef.current = setInterval(checkConnection, 15000); // Check every 15 seconds

    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
    };
  }, [checkConnection]);

  // Update ref when matchData changes
  useEffect(() => {
    matchDataRef.current = matchData;
    if (matchData) {
      debugLog("matchData_updated", { hasQueueDocId: !!matchData?.queueDocId });
    }
  }, [matchData, debugLog]);

  // Enhanced wait time calculation
  const calculateEstimatedWaitTime = useCallback(
    async (userType) => {
      debugLog("calculate_wait_time_start", { userType });
      try {
        const stats = await firestoreService.getQueueStats();
        const waitingCount = userType === "venter" ? stats.ventersWaiting : stats.listenersWaiting;
        const oppositeCount = userType === "venter" ? stats.listenersWaiting : stats.ventersWaiting;
        const activeSessions = stats.activeSessions || 0;

        let estimatedTime;
        if (oppositeCount > 0) {
          estimatedTime = "< 30 seconds";
        } else if (waitingCount < 3) {
          estimatedTime = activeSessions > 5 ? "1-2 minutes" : "2-4 minutes";
        } else if (waitingCount < 8) {
          estimatedTime = "3-5 minutes";
        } else {
          estimatedTime = "5+ minutes";
        }

        setEstimatedWaitTime(estimatedTime);
        debugLog("wait_time_calculated", {
          userType,
          waitingCount,
          oppositeCount,
          activeSessions,
          estimatedTime,
        });
      } catch (error) {
        debugLog("calculate_wait_time_error", { error: error.message }, "error");
        setEstimatedWaitTime("Unknown");
      }
    },
    [debugLog]
  );

  // Enhanced cleanup with better error handling
  const cleanupMatching = useCallback(async () => {
    debugLog("cleanup_start");

    // Clear all timeouts
    [timeoutRef, retryTimeoutRef].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });

    // Unsubscribe from Firestore listener
    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        debugLog("firestore_listener_unsubscribed");
      } catch (error) {
        debugLog("unsubscribe_error", { error: error.message }, "error");
      }
    }

    // Remove user from queue
    const currentMatchData = matchDataRef.current;
    if (currentMatchData?.queueDocId && userInfo?.uid) {
      try {
        await firestoreService.removeFromQueue(currentMatchData.queueDocId);
        debugLog("removed_from_queue_success", { queueDocId: currentMatchData.queueDocId });
      } catch (error) {
        debugLog("remove_from_queue_error", { error: error.message }, "error");
      }
    }

    // Reset states if component is still mounted
    if (isMountedRef.current) {
      setIsMatching(false);
      setMatchData(null);
      setMatchingStatus("idle");
      setEstimatedWaitTime(null);
      matchProcessingRef.current = false;
      reconnectAttemptsRef.current = 0;
      debugLog("matching_states_reset");
    }

    matchDataRef.current = null;
    debugLog("cleanup_completed");
  }, [userInfo?.uid, debugLog]);

  const stopMatching = useCallback(async () => {
    if (!isMountedRef.current) {
      debugLog("stop_matching_skipped_unmounted");
      return;
    }
    debugLog("stop_matching_start");
    setMatchingStatus("idle");
    await cleanupMatching();
    debugLog("stop_matching_completed");
  }, [cleanupMatching, debugLog]);

  // Enhanced match handling with duplicate prevention
  const handleMatchFound = useCallback(
    async (match, userType, ventText, selectedPlan) => {
      // Prevent duplicate processing
      if (matchProcessingRef.current) {
        debugLog("match_found_duplicate_prevented", { matchUserId: match.userId }, "warn");
        return;
      }

      matchProcessingRef.current = true;

      debugLog("match_found_start", {
        matchUserId: match.userId,
        userType,
        currentStatus: matchingStatus,
        connectionStatus,
      });

      // Validate state
      if (!isMountedRef.current || matchingStatus !== "searching") {
        debugLog(
          "match_found_aborted",
          {
            reason: !isMountedRef.current ? "component_unmounted" : `status_not_searching (${matchingStatus})`,
          },
          "warn"
        );
        matchProcessingRef.current = false;
        return;
      }

      // Check connection
      if (connectionStatus === "disconnected") {
        debugLog("match_found_aborted", { reason: "no_connection" }, "warn");
        Alert.alert("Connection Issue", "Unable to connect. Please check your internet connection.");
        await stopMatching();
        matchProcessingRef.current = false;
        return;
      }

      setMatchingStatus("found");

      try {
        const currentQueueData = matchDataRef.current;
        if (!currentQueueData || !currentQueueData.queueDocId) {
          throw new Error("No valid queue data available for session creation.");
        }

        debugLog("creating_session", {
          userType,
          venterQueueDoc: userType === "venter" ? currentQueueData.queueDocId : match.docId,
          listenerQueueDoc: userType === "listener" ? currentQueueData.queueDocId : match.docId,
        });

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

        debugLog("session_created_success", {
          sessionId: session.sessionId,
          channelName: session.channelName,
        });

        // Cleanup before navigation
        await cleanupMatching();

        // **MODIFIED for React Navigation**
        navigation.navigate("VoiceCall", {
          ventText: userType === "venter" ? ventText : match.ventText,
          plan: userType === "venter" ? selectedPlan : match.plan || "20-Min Vent",
          channelName: session.channelName,
          isHost: (userType === "venter").toString(),
          sessionId: session.sessionId,
        });
        debugLog("navigating_to_voice_call", { params: navigation.getState()?.routes[navigation.getState().routes.length -1]?.params }); // Log current route params for debugging

      } catch (error) {
        debugLog("match_processing_error", { error: error.message }, "error");

        if (isMountedRef.current) {
          setMatchingStatus("failed");

          let errorMessage = "Failed to connect with your match. Please try again.";
          let shouldRetry = false;

          if (error.message.includes("no longer available")) {
            errorMessage = "Your match is no longer available. Looking for another match...";
            shouldRetry = true;
          } else if (error.message.includes("permission-denied")) {
            errorMessage = "Permission denied. Please check your account status.";
          } else if (error.message.includes("unavailable")) {
            errorMessage = "Service temporarily unavailable. Please check your internet connection.";
            shouldRetry = true;
          }

          if (shouldRetry && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1;
            debugLog("auto_retry_match", { attempt: reconnectAttemptsRef.current });

            setTimeout(() => {
              if (isMountedRef.current && matchingStatus !== "idle") {
                matchProcessingRef.current = false;
                // Re-call startMatching to re-initiate the process
                // Ensure userType, ventText, selectedPlan are captured or passed from the original call
                // For simplicity, assuming they are available in scope or from a state
                Alert.alert("Reconnecting", "Attempting to find another match...");
                startMatching(userType, ventText, selectedPlan);
              }
            }, 3000);
            return;
          }

          Alert.alert("Connection Failed", errorMessage, [
            {
              text: "Try Again",
              onPress: () => {
                matchProcessingRef.current = false;
                startMatching(userType, ventText, selectedPlan); // Make sure these params persist
              },
            },
            { text: "Cancel", onPress: () => stopMatching(), style: "cancel" },
          ]);
        }
        await stopMatching(); // Ensure cleanup even if Alert is dismissed
      } finally {
        matchProcessingRef.current = false;
      }
    },
    [userInfo?.uid, matchingStatus, connectionStatus, cleanupMatching, stopMatching, debugLog, navigation] // Added navigation
  );

  // Enhanced matching start with better validation
  const startMatching = useCallback(
    async (userType, ventText = null, selectedPlan = null) => {
      debugLog("start_matching_begin", { userType, connectionStatus });

      // Check connection first
      const isConnected = await checkConnection();
      if (!isConnected) {
        Alert.alert("Connection Required", "Please check your internet connection and try again.", [{ text: "OK" }]);
        return false;
      }

      // Enhanced validation
      if (!userInfo?.uid) {
        debugLog("start_matching_failed", { reason: "no_user_id" }, "error");
        Alert.alert("Authentication Required", "Please sign in to continue.");
        return false;
      }

      if (isMatching) {
        debugLog("start_matching_failed", { reason: "already_matching" }, "warn");
        Alert.alert("Already Matching", "You are already in the matching queue.");
        return false;
      }

      // Validate venter input with better checks
      if (userType === "venter") {
        if (!ventText || ventText.trim().length === 0) {
          debugLog("start_matching_failed", { reason: "no_vent_text" }, "error");
          Alert.alert("Input Required", "Please provide a brief description of what you want to vent about.");
          return false;
        }
        if (ventText.trim().length < 10) {
          debugLog("start_matching_failed", { reason: "vent_text_too_short" }, "error");
          Alert.alert("Input Too Short", "Please provide a more detailed description (at least 10 characters).");
          return false;
        }
        if (!selectedPlan) {
          debugLog("start_matching_failed", { reason: "no_plan_selected" }, "error");
          Alert.alert("Plan Required", "Please select a plan for your vent session.");
          return false;
        }
      }

      // Clean slate
      await cleanupMatching();

      try {
        setIsMatching(true);
        setMatchingStatus("searching");
        setMatchData(null);
        matchDataRef.current = null;
        matchProcessingRef.current = false;
        reconnectAttemptsRef.current = 0;

        await calculateEstimatedWaitTime(userType);

        debugLog("adding_to_queue", { userType });
        let queueData;
        if (userType === "venter") {
          queueData = await firestoreService.addToQueue(userInfo.uid, "venter", ventText.trim(), selectedPlan);
        } else {
          queueData = await firestoreService.addToQueue(userInfo.uid, "listener");
        }

        debugLog("added_to_queue_success", { queueDocId: queueData?.queueDocId });
        setMatchData(queueData);
        matchDataRef.current = queueData;

        const oppositeType = userType === "venter" ? "listener" : "venter";

        // Enhanced listener with better error handling
        unsubscribeRef.current = firestoreService.listenToQueue(oppositeType, async (matches) => {
          debugLog("queue_listener_callback", {
            oppositeType,
            matchesFound: matches.length,
            currentStatus: matchingStatus,
            isMounted: isMountedRef.current,
            isProcessing: matchProcessingRef.current,
          });

          if (!isMountedRef.current || matchingStatus !== "searching" || matchProcessingRef.current) {
            debugLog(
              "listener_callback_skipped",
              {
                reason: !isMountedRef.current
                  ? "unmounted"
                  : matchingStatus !== "searching"
                  ? `status_not_searching (${matchingStatus})`
                  : "already_processing_match",
              },
              "warn"
            );
            return;
          }

          if (matches.length > 0) {
            const match = matches[0];
            debugLog("potential_match_found_in_listener", {
              matchUserId: match.userId,
              matchDocId: match.docId,
              hasVentText: !!match.ventText,
            });
            await handleMatchFound(match, userType, ventText, selectedPlan);
          } else {
            debugLog("no_matches_in_callback", { oppositeType });
          }
        });

        // Enhanced timeout with better messaging
        const timeoutDuration = 240000; // 4 minutes
        timeoutRef.current = setTimeout(async () => {
          if (isMountedRef.current && matchingStatus === "searching") {
            setMatchingStatus("failed");
            debugLog("no_match_timeout_reached");

            const stats = await firestoreService.getQueueStats().catch(() => null);
            const oppositeCount = stats
              ? userType === "venter"
                ? stats.listenersWaiting
                : stats.ventersWaiting
              : 0;

            let message = "We couldn't find a match right now. ";
            if (oppositeCount === 0) {
              message +=
                userType === "venter"
                  ? "No listeners are currently online. Try again later or switch to being a listener."
                  : "No venters are currently online. Try again later.";
            } else {
              message += "This could be due to network issues or high demand. Please try again.";
            }

            Alert.alert("No Match Found", message, [
              {
                text: "Try Again",
                onPress: () => {
                  retryTimeoutRef.current = setTimeout(() => {
                    startMatching(userType, ventText, selectedPlan);
                  }, 2000);
                },
              },
              { text: "Cancel", onPress: () => stopMatching(), style: "cancel" },
            ]);
          }
        }, timeoutDuration);

        debugLog("start_matching_success");
        return true;
      } catch (error) {
        debugLog("start_matching_error", { error: error.message, stack: error.stack }, "error");

        if (isMountedRef.current) {
          setMatchingStatus("failed");

          let errorMessage = `Failed to start matching: ${error.message}`;
          if (error.message.includes("permission-denied")) {
            errorMessage = "Permission denied. Please check your account status.";
          } else if (error.message.includes("unavailable")) {
            errorMessage = "Service temporarily unavailable. Please check your internet connection.";
          } else if (error.message.includes("quota-exceeded")) {
            errorMessage = "Service is currently at capacity. Please try again later.";
          }

          Alert.alert("Matching Error", errorMessage, [{ text: "OK", onPress: () => stopMatching() }]);
        }

        await stopMatching();
        return false;
      }
    },
    [
      userInfo?.uid,
      isMatching,
      matchingStatus,
      connectionStatus,
      checkConnection,
      cleanupMatching,
      calculateEstimatedWaitTime,
      handleMatchFound,
      stopMatching,
      debugLog,
    ]
  );

  // Component lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    debugLog("component_mounted");

    return () => {
      debugLog("component_unmounting");
      isMountedRef.current = false;
      cleanupMatching();
    };
  }, [cleanupMatching, debugLog]);

  return {
    isMatching,
    matchData,
    matchingStatus,
    estimatedWaitTime,
    connectionStatus,
    startMatching,
    stopMatching,
    checkConnection,
  };
};

export default useMatching;