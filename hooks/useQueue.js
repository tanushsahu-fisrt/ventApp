import { useState, useEffect, useCallback, useRef } from "react";
import firestoreService from "../services/firestoreService";

// Global singleton state for queue data with enhanced management
let globalQueueState = {
  stats: {
    ventersWaiting: 0,
    listenersWaiting: 0,
    activeSessions: 0,
    totalUsers: 0,
    averageWaitTime: 0,
  },
  lastUpdated: null,
  loading: false,
  error: null,
  intervalId: null,
  retryCount: 0,
  retryTimeoutId: null,
  lastSuccessfulFetch: null,
  consecutiveErrors: 0,
};

// Enhanced instance tracking
const activeHookInstances = new Set();
const instanceCallbacks = new Map(); // Store callbacks for each instance

const useQueue = () => {
  const [queueStats, setQueueStats] = useState(globalQueueState.stats);
  const [loading, setLoading] = useState(globalQueueState.loading);
  const [error, setError] = useState(globalQueueState.error);
  const [lastUpdated, setLastUpdated] = useState(globalQueueState.lastUpdated);

  const isMountedRef = useRef(true);
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));

  // Enhanced debug logging with better throttling
  const loggedMessages = useRef(new Set());
  const debugLog = useCallback(
    (action, data = {}, level = "info") => {
      const logKey = `${level}-${action}`;
      if (loggedMessages.current.has(logKey)) return;

      loggedMessages.current.add(logKey);
      setTimeout(() => loggedMessages.current.delete(logKey), 3000);

      const timestamp = new Date().toISOString();
      const logData = {
        timestamp,
        hook: "useQueue",
        instance: instanceId.current,
        action,
        globalLoading: globalQueueState.loading,
        globalError: globalQueueState.error?.substring(0, 100),
        retryCount: globalQueueState.retryCount,
        consecutiveErrors: globalQueueState.consecutiveErrors,
        activeInstances: activeHookInstances.size,
        ...data,
      };

      const logMessage = `📊 [useQueue-${instanceId.current}] ${action}`;

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
    []
  );

  // Broadcast updates to all active instances
  const broadcastUpdate = useCallback((updates) => {
    instanceCallbacks.forEach((callback, instanceId) => {
      try {
        callback(updates);
      } catch (error) {
        debugLog("broadcast_callback_error", { instanceId, error: error.message }, "error");
      }
    });
  }, [debugLog]);

  // Enhanced data fetching with better error handling
  const loadQueueStats = useCallback(
    async (isRetry = false, forceRefresh = false) => {
      if (!isMountedRef.current) {
        debugLog("load_stats_skipped", { reason: "component_unmounted" }, "warn");
        return;
      }

      // Skip if already loading and not a retry/force refresh
      if (globalQueueState.loading && !isRetry && !forceRefresh) {
        debugLog("load_stats_skipped", { reason: "already_loading" });
        return;
      }

      // Check if we have recent data and don't need to fetch
      const now = Date.now();
      const lastFetch = globalQueueState.lastSuccessfulFetch;
      const timeSinceLastFetch = lastFetch ? now - lastFetch : Infinity;
      
      if (!forceRefresh && !isRetry && timeSinceLastFetch < 15000 && globalQueueState.stats.totalUsers >= 0) {
        debugLog("load_stats_skipped", { reason: "recent_data_available", timeSinceLastFetch });
        return;
      }

      if (!isRetry && !globalQueueState.loading) {
        globalQueueState.loading = true;
        globalQueueState.error = null;
        broadcastUpdate({ loading: true, error: null });
        debugLog("global_loading_set");
      }

      debugLog("load_stats_start", { isRetry, forceRefresh, retryCount: globalQueueState.retryCount });

      try {
        const stats = await firestoreService.getQueueStats();
        debugLog("raw_stats_received", { stats });

        if (!isMountedRef.current) {
          debugLog("load_stats_aborted", { reason: "component_unmounted_after_fetch" }, "warn");
          return;
        }

        // Enhanced stats calculation
        const enhancedStats = {
          ...stats,
          totalUsers: stats.ventersWaiting + stats.listenersWaiting,
          averageWaitTime: calculateAverageWaitTime(stats),
          lastUpdated: stats.lastUpdated,
        };

        // Update global state
        globalQueueState.stats = enhancedStats;
        globalQueueState.lastUpdated = new Date();
        globalQueueState.error = null;
        globalQueueState.retryCount = 0;
        globalQueueState.consecutiveErrors = 0;
        globalQueueState.lastSuccessfulFetch = now;

        // Broadcast to all instances
        broadcastUpdate({
          stats: enhancedStats,
          lastUpdated: globalQueueState.lastUpdated,
          error: null,
          loading: false,
        });

        debugLog("stats_updated_success", { enhancedStats });

      } catch (error) {
        debugLog("load_stats_error", { error: error.message }, "error");

        if (!isMountedRef.current) {
          debugLog("error_handling_skipped", { reason: "component_unmounted" }, "warn");
          return;
        }

        globalQueueState.error = error.message;
        globalQueueState.retryCount += 1;
        globalQueueState.consecutiveErrors += 1;

        // Exponential backoff with jitter
        if (globalQueueState.retryCount <= 5) {
          const baseDelay = Math.min(1000 * Math.pow(2, globalQueueState.retryCount), 30000);
          const jitter = Math.random() * 1000;
          const retryDelay = baseDelay + jitter;

          debugLog("scheduling_retry", {
            retryAttempt: globalQueueState.retryCount,
            retryDelay: Math.round(retryDelay),
            maxRetries: 5,
          });

          if (globalQueueState.retryTimeoutId) {
            clearTimeout(globalQueueState.retryTimeoutId);
          }

          globalQueueState.retryTimeoutId = setTimeout(() => {
            debugLog("executing_retry", { retryAttempt: globalQueueState.retryCount });
            loadQueueStats(true);
          }, retryDelay);

        } else {
          debugLog("max_retries_reached", { maxRetries: 5 }, "error");
          
          // Use cached data if available, otherwise fallback
          const fallbackStats = globalQueueState.lastSuccessfulFetch ? 
            globalQueueState.stats : 
            {
              ventersWaiting: 0,
              listenersWaiting: 0,
              activeSessions: 0,
              totalUsers: 0,
              averageWaitTime: 0,
            };

          globalQueueState.stats = fallbackStats;
          broadcastUpdate({
            stats: fallbackStats,
            error: "Unable to load current queue data",
            loading: false,
          });
        }

      } finally {
        if (!isRetry && globalQueueState.retryCount === 0) {
          globalQueueState.loading = false;
          broadcastUpdate({ loading: false });
          debugLog("global_loading_cleared");
        } else if (globalQueueState.retryCount > 0 && !globalQueueState.retryTimeoutId) {
          globalQueueState.loading = false;
          broadcastUpdate({ loading: false });
          debugLog("global_loading_cleared_after_retries");
        }
      }
    },
    [debugLog, broadcastUpdate]
  );

  // Enhanced wait time calculation
  const calculateAverageWaitTime = useCallback((stats) => {
    const { ventersWaiting, listenersWaiting, activeSessions } = stats;
    
    // Base calculation on queue imbalance and activity
    const queueImbalance = Math.abs(ventersWaiting - listenersWaiting);
    const totalWaiting = ventersWaiting + listenersWaiting;
    const activityFactor = Math.max(1, activeSessions);
    
    if (totalWaiting === 0) return 0;
    
    // More sophisticated calculation
    let baseTime = 30; // Base 30 seconds
    
    if (queueImbalance > 5) {
      baseTime += queueImbalance * 10; // Add time for large imbalances
    }
    
    if (totalWaiting > 10) {
      baseTime += (totalWaiting - 10) * 5; // Add time for queue length
    }
    
    // Reduce time if there's high activity
    baseTime = Math.max(15, baseTime - (activityFactor * 2));
    
    return Math.min(baseTime, 300); // Cap at 5 minutes
  }, []);

  const refreshStats = useCallback(async () => {
    debugLog("manual_refresh_start");
    globalQueueState.retryCount = 0;
    globalQueueState.consecutiveErrors = 0;
    
    if (globalQueueState.retryTimeoutId) {
      clearTimeout(globalQueueState.retryTimeoutId);
      globalQueueState.retryTimeoutId = null;
    }
    
    await loadQueueStats(false, true); // Force refresh
    debugLog("manual_refresh_completed");
  }, [loadQueueStats, debugLog]);

  // Enhanced monitoring with adaptive intervals
  const setupGlobalMonitoring = useCallback(() => {
    if (globalQueueState.intervalId) {
      debugLog("global_interval_already_active");
      return;
    }

    debugLog("setting_up_global_interval");
    
    const getIntervalDelay = () => {
      // Adaptive interval based on error rate and activity
      if (globalQueueState.consecutiveErrors > 3) {
        return 60000; // 1 minute if many errors
      }
      
      const totalUsers = globalQueueState.stats.totalUsers || 0;
      if (totalUsers > 10) {
        return 20000; // 20 seconds if high activity
      }
      
      return 30000; // Default 30 seconds
    };

    const scheduleNext = () => {
      const delay = getIntervalDelay();
      globalQueueState.intervalId = setTimeout(() => {
        loadQueueStats(true).finally(() => {
          if (activeHookInstances.size > 0) {
            scheduleNext(); // Schedule next update
          } else {
            globalQueueState.intervalId = null;
          }
        });
      }, delay);
    };

    scheduleNext();
  }, [loadQueueStats, debugLog]);

  // Helper functions with better logic
  const getQueueStatusMessage = useCallback(() => {
    if (loading) return "Loading queue information...";
    if (error && !globalQueueState.lastSuccessfulFetch) return "Unable to load queue information";

    const { ventersWaiting, listenersWaiting, activeSessions } = queueStats;
    const totalWaiting = ventersWaiting + listenersWaiting;

    if (totalWaiting === 0) {
      return activeSessions > 0 ? 
        `${activeSessions} active sessions. Join the conversation!` :
        "No one is currently waiting. Be the first!";
    }

    if (ventersWaiting > listenersWaiting + 2) {
      return `${ventersWaiting} people need listeners. Great time to help!`;
    } else if (listenersWaiting > ventersWaiting + 2) {
      return `${listenersWaiting} listeners ready. Quick matching expected!`;
    } else {
      return `${totalWaiting} people waiting, ${activeSessions} active sessions`;
    }
  }, [queueStats, loading, error]);

  const getMatchingProbability = useCallback((userType) => {
    if (loading || (error && !globalQueueState.lastSuccessfulFetch)) return "unknown";

    const { ventersWaiting, listenersWaiting } = queueStats;
    const oppositeCount = userType === "venter" ? listenersWaiting : ventersWaiting;
    const sameCount = userType === "venter" ? ventersWaiting : listenersWaiting;

    if (oppositeCount === 0) return "low";
    if (oppositeCount >= sameCount + 3) return "high";
    if (oppositeCount >= 2) return "medium";
    return "low";
  }, [queueStats, loading, error]);

  // Instance callback registration
  useEffect(() => {
    const updateCallback = (updates) => {
      if (!isMountedRef.current) return;
      
      if (updates.stats !== undefined) setQueueStats(updates.stats);
      if (updates.loading !== undefined) setLoading(updates.loading);
      if (updates.error !== undefined) setError(updates.error);
      if (updates.lastUpdated !== undefined) setLastUpdated(updates.lastUpdated);
    };

    instanceCallbacks.set(instanceId.current, updateCallback);

    return () => {
      instanceCallbacks.delete(instanceId.current);
    };
  }, []);

  // Main lifecycle effect
  useEffect(() => {
    isMountedRef.current = true;
    activeHookInstances.add(instanceId.current);
    debugLog("component_mounted", { totalInstances: activeHookInstances.size });

    // Sync with global state immediately
    setQueueStats(globalQueueState.stats);
    setLastUpdated(globalQueueState.lastUpdated);
    setLoading(globalQueueState.loading);
    setError(globalQueueState.error);

    // Load data and setup monitoring
    loadQueueStats();
    setupGlobalMonitoring();

    return () => {
      debugLog("component_unmounting", { totalInstances: activeHookInstances.size - 1 });
      isMountedRef.current = false;
      activeHookInstances.delete(instanceId.current);

      // Cleanup global resources if no instances remain
      if (activeHookInstances.size === 0) {
        debugLog("all_instances_unmounted_cleaning_up");
        
        if (globalQueueState.intervalId) {
          clearTimeout(globalQueueState.intervalId);
          globalQueueState.intervalId = null;
        }
        
        if (globalQueueState.retryTimeoutId) {
          clearTimeout(globalQueueState.retryTimeoutId);
          globalQueueState.retryTimeoutId = null;
        }

        // Reset global state but preserve successful data
        if (!globalQueueState.lastSuccessfulFetch) {
          globalQueueState.stats = {
            ventersWaiting: 0,
            listenersWaiting: 0,
            activeSessions: 0,
            totalUsers: 0,
            averageWaitTime: 0,
          };
        }
        
        globalQueueState.lastUpdated = null;
        globalQueueState.loading = false;
        globalQueueState.error = null;
        globalQueueState.retryCount = 0;
        globalQueueState.consecutiveErrors = 0;
      }
    };
  }, [loadQueueStats, setupGlobalMonitoring, debugLog]);

  return {
    queueStats,
    loading,
    error,
    lastUpdated,
    refreshStats,
    getQueueStatusMessage,
    getMatchingProbability,
  };
};

export default useQueue;