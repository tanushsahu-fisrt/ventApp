import { useState, useEffect, useRef, useCallback } from "react";
import firestoreService from "../services/firestoreService";

let globalRoomState = {
  availableRooms: [],
  loading: false,
  error: null,
  lastUpdated: null,
  intervalId: null,
};

const activeHookInstances = new Set();
const instanceCallbacks = new Map();

const useRooms = () => {
  const [availableRooms, setAvailableRooms] = useState(globalRoomState.availableRooms);
  const [loading, setLoading] = useState(globalRoomState.loading);
  const [error, setError] = useState(globalRoomState.error);
  const [lastUpdated, setLastUpdated] = useState(globalRoomState.lastUpdated);

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

  const loadAvailableRooms = useCallback(async () => {
    if (!isMountedRef.current || globalRoomState.loading) return;

    globalRoomState.loading = true;
    globalRoomState.error = null;
    broadcastUpdate({ loading: true, error: null });

    try {
      const rooms = await firestoreService.getAvailableRooms();
      
      globalRoomState.availableRooms = rooms;
      globalRoomState.lastUpdated = new Date();
      globalRoomState.error = null;

      broadcastUpdate({
        availableRooms: rooms,
        lastUpdated: globalRoomState.lastUpdated,
        error: null,
        loading: false,
      });

    } catch (error) {
      console.error("Load available rooms error:", error.message);

      globalRoomState.error = error.message;
      broadcastUpdate({
        error: "Unable to load available rooms",
        loading: false,
      });
    } finally {
      globalRoomState.loading = false;
    }
  }, [broadcastUpdate]);

  const refreshRooms = useCallback(async () => {
    await loadAvailableRooms();
  }, [loadAvailableRooms]);

  const joinRoom = useCallback(async (roomId, listenerId) => {
    try {
      const result = await firestoreService.joinRoom(roomId, listenerId);
      await refreshRooms(); // Refresh to update room status
      return result;
    } catch (error) {
      throw new Error(`Failed to join room: ${error.message}`);
    }
  }, [refreshRooms]);

  const setupGlobalMonitoring = useCallback(() => {
    if (globalRoomState.intervalId) return;

    globalRoomState.intervalId = setInterval(() => {
      if (activeHookInstances.size > 0) {
        loadAvailableRooms();
      } else {
        clearInterval(globalRoomState.intervalId);
        globalRoomState.intervalId = null;
      }
    }, 15000); // Update every 15 seconds for rooms
  }, [loadAvailableRooms]);

  useEffect(() => {
    const updateCallback = (updates) => {
      if (!isMountedRef.current) return;
      
      if (updates.availableRooms !== undefined) setAvailableRooms(updates.availableRooms);
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

    // Set current global state
    setAvailableRooms(globalRoomState.availableRooms);
    setLastUpdated(globalRoomState.lastUpdated);
    setLoading(globalRoomState.loading);
    setError(globalRoomState.error);

    loadAvailableRooms();
    setupGlobalMonitoring();

    return () => {
      isMountedRef.current = false;
      activeHookInstances.delete(instanceId.current);

      if (activeHookInstances.size === 0) {
        if (globalRoomState.intervalId) {
          clearInterval(globalRoomState.intervalId);
          globalRoomState.intervalId = null;
        }
        
        globalRoomState.loading = false;
        globalRoomState.error = null;
      }
    };
  }, [loadAvailableRooms, setupGlobalMonitoring]);

  return {
    availableRooms,
    loading,
    error,
    lastUpdated,
    refreshRooms,
    joinRoom,
  };
};

export default useRooms;