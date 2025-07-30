import { useState, useEffect, useCallback, useRef } from "react";
import firestoreService from "../services/firestoreService";

let globalQueueState = {
  stats: {
    ventersWaiting: 0,
    listenersWaiting: 0,
    activeSessions: 0,
    totalUsers: 0,
  },
  lastUpdated: null,
  loading: false,
  error: null,
  intervalId: null,
};

const activeHookInstances = new Set();
const instanceCallbacks = new Map();

const useQueue = () => {
  const [queueStats, setQueueStats] = useState(globalQueueState.stats);
  const [loading, setLoading] = useState(globalQueueState.loading);
  const [error, setError] = useState(globalQueueState.error);
  const [lastUpdated, setLastUpdated] = useState(globalQueueState.lastUpdated);

  const isMountedRef = useRef(true);
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));

  const broadcastUpdate = useCallback((updates) => {
    instanceCallbacks.forEach((callback) => {
      try {
        callback(updates);
      } catch (error) {
        console.warn("Broadcast callback error:", error.message);
      }
    });
  }, []);

  const loadQueueStats = useCallback(async () => {
    if (!isMountedRef.current || globalQueueState.loading) return;

    globalQueueState.loading = true;
    globalQueueState.error = null;
    broadcastUpdate({ loading: true, error: null });

    try {
      const stats = await firestoreService.getQueueStats();

      const enhancedStats = {
        ...stats,
        totalUsers: stats.ventersWaiting + stats.listenersWaiting,
      };

      globalQueueState.stats = enhancedStats;
      globalQueueState.lastUpdated = new Date();
      globalQueueState.error = null;

      broadcastUpdate({
        stats: enhancedStats,
        lastUpdated: globalQueueState.lastUpdated,
        error: null,
        loading: false,
      });

    } catch (error) {
      console.error("Load queue stats error:", error.message);

      globalQueueState.error = error.message;
      broadcastUpdate({
        error: "Unable to load queue data",
        loading: false,
      });
    } finally {
      globalQueueState.loading = false;
    }
  }, [broadcastUpdate]);

  const refreshStats = useCallback(async () => {
    await loadQueueStats();
  }, [loadQueueStats]);

  const setupGlobalMonitoring = useCallback(() => {
    if (globalQueueState.intervalId) return;

    globalQueueState.intervalId = setInterval(() => {
      if (activeHookInstances.size > 0) {
        loadQueueStats();
      } else {
        clearInterval(globalQueueState.intervalId);
        globalQueueState.intervalId = null;
      }
    }, 30000); // Update every 30 seconds
  }, [loadQueueStats]);

  const getQueueStatusMessage = useCallback(() => {
    if (loading) return "Loading...";
    if (error) return "Unable to load queue information";

    const { ventersWaiting, listenersWaiting, activeSessions } = queueStats;
    const totalWaiting = ventersWaiting + listenersWaiting;

    if (totalWaiting === 0) {
      return activeSessions > 0 ? 
        `${activeSessions} active sessions. Join now!` :
        "No one waiting. Be the first!";
    }

    return `${totalWaiting} people waiting, ${activeSessions} active sessions`;
  }, [queueStats, loading, error]);

  const getMatchingProbability = useCallback((userType) => {
    if (loading || error) return "unknown";

    const { ventersWaiting, listenersWaiting } = queueStats;
    const oppositeCount = userType === "venter" ? listenersWaiting : ventersWaiting;

    if (oppositeCount === 0) return "low";
    if (oppositeCount >= 3) return "high";
    if (oppositeCount >= 1) return "medium";
    return "low";
  }, [queueStats, loading, error]);

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

  useEffect(() => {
    isMountedRef.current = true;
    activeHookInstances.add(instanceId.current);

    setQueueStats(globalQueueState.stats);
    setLastUpdated(globalQueueState.lastUpdated);
    setLoading(globalQueueState.loading);
    setError(globalQueueState.error);

    loadQueueStats();
    setupGlobalMonitoring();

    return () => {
      isMountedRef.current = false;
      activeHookInstances.delete(instanceId.current);

      if (activeHookInstances.size === 0) {
        if (globalQueueState.intervalId) {
          clearInterval(globalQueueState.intervalId);
          globalQueueState.intervalId = null;
        }
        
        globalQueueState.loading = false;
        globalQueueState.error = null;
      }
    };
  }, [loadQueueStats, setupGlobalMonitoring]);

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