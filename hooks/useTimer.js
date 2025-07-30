import { useState, useEffect, useRef, useCallback } from "react";

const useTimer = (initialDuration, onTimeUp) => {
  const [sessionTime, setSessionTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastTickRef = useRef(Date.now());
  const driftCorrectionRef = useRef(0);

  // Enhanced debug logging
  const debugLog = useCallback((action, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`⏱️ [useTimer] ${action}`, {
      timestamp,
      sessionTime,
      timeRemaining,
      isActive,
      isPaused,
      initialDuration,
      ...data,
    });
  }, [sessionTime, timeRemaining, isActive, isPaused, initialDuration]);

  
  const startTimer = useCallback(() => {
    if (isActive || !isMountedRef.current) {
      debugLog("start_timer_skipped", { 
        reason: isActive ? "already_active" : "component_unmounted" 
      });
      return;
    }

    debugLog("start_timer");
    setIsActive(true);
    setIsPaused(false);
    
    const now = Date.now();
    startTimeRef.current = now - (sessionTime * 1000) - pausedTimeRef.current;
    lastTickRef.current = now;
    driftCorrectionRef.current = 0;
  }, [isActive, sessionTime, debugLog]);

  // Enhanced pause functionality
  const pauseTimer = useCallback(() => {
    if (!isActive || isPaused || !isMountedRef.current) {
      debugLog("pause_timer_skipped", { 
        reason: !isActive ? "not_active" : isPaused ? "already_paused" : "component_unmounted" 
      });
      return;
    }

    debugLog("pause_timer");
    setIsPaused(true);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isActive, isPaused, debugLog]);

  // Enhanced resume functionality
  const resumeTimer = useCallback(() => {
    if (!isActive || !isPaused || !isMountedRef.current) {
      debugLog("resume_timer_skipped", { 
        reason: !isActive ? "not_active" : !isPaused ? "not_paused" : "component_unmounted" 
      });
      return;
    }

    debugLog("resume_timer");
    setIsPaused(false);
    
    const now = Date.now();
    lastTickRef.current = now;
  }, [isActive, isPaused, debugLog]);

  // Enhanced stop with cleanup
  const stopTimer = useCallback(() => {
    if (!isMountedRef.current) {
      debugLog("stop_timer_skipped", { reason: "component_unmounted" });
      return;
    }

    debugLog("stop_timer");
    setIsActive(false);
    setIsPaused(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Reset timing references
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    driftCorrectionRef.current = 0;
  }, [debugLog]);

  // Reset timer to initial state
  const resetTimer = useCallback(() => {
    debugLog("reset_timer");
    stopTimer();
    
    if (isMountedRef.current) {
      setSessionTime(0);
      setTimeRemaining(initialDuration);
    }
  }, [stopTimer, initialDuration, debugLog]);

  // Get formatted time strings
  const getFormattedTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getFormattedSessionTime = useCallback(() => {
    return getFormattedTime(sessionTime);
  }, [sessionTime, getFormattedTime]);

  const getFormattedTimeRemaining = useCallback(() => {
    return getFormattedTime(timeRemaining);
  }, [timeRemaining, getFormattedTime]);

  // Enhanced timer effect with drift correction
  useEffect(() => {
    if (isActive && !isPaused && isMountedRef.current) {
      intervalRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(intervalRef.current);
          return;
        }

        const now = Date.now();
        const expectedElapsed = Math.floor((now - startTimeRef.current) / 1000);
        
        // Drift correction - adjust for timing inaccuracies
        const actualElapsed = sessionTime;
        const drift = expectedElapsed - actualElapsed;
        
        if (Math.abs(drift) > 2) { // Correct significant drift (>2 seconds)
          driftCorrectionRef.current += drift;
          debugLog("drift_correction", { drift, expectedElapsed, actualElapsed });
        }

        const correctedElapsed = Math.max(0, expectedElapsed + driftCorrectionRef.current);
        const remaining = Math.max(0, initialDuration - correctedElapsed);

        setSessionTime(correctedElapsed);
        setTimeRemaining(remaining);

        // Check if time is up
        if (remaining === 0 && correctedElapsed > 0) {
          debugLog("timer_completed");
          stopTimer();
          
          // Call onTimeUp callback with error handling
          if (onTimeUp && typeof onTimeUp === 'function') {
            try {
              onTimeUp();
            } catch (error) {
              debugLog("onTimeUp_callback_error", { error: error.message });
            }
          }
        }

        lastTickRef.current = now;
      }, 1000);

      debugLog("interval_started");
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        debugLog("interval_cleared");
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isPaused, initialDuration, onTimeUp, stopTimer, sessionTime, debugLog]);

  // Component lifecycle management
  useEffect(() => {
    isMountedRef.current = true;
    debugLog("component_mounted");
    
    // Auto-start timer on mount
    startTimer();

    return () => {
      debugLog("component_unmounting");
      isMountedRef.current = false;
      stopTimer();
    };
  }, [startTimer, stopTimer, debugLog]);

  // Handle initialDuration changes
  useEffect(() => {
    if (initialDuration !== timeRemaining + sessionTime) {
      debugLog("initial_duration_changed", { 
        oldDuration: timeRemaining + sessionTime, 
        newDuration: initialDuration 
      });
      
      // Adjust timeRemaining based on new duration
      const newRemaining = Math.max(0, initialDuration - sessionTime);
      setTimeRemaining(newRemaining);
      
      // If time is already up with new duration, trigger completion
      if (newRemaining === 0 && sessionTime > 0) {
        stopTimer();
        if (onTimeUp && typeof onTimeUp === 'function') {
          try {
            onTimeUp();
          } catch (error) {
            debugLog("onTimeUp_callback_error_duration_change", { error: error.message });
          }
        }
      }
    }
  }, [initialDuration, timeRemaining, sessionTime, onTimeUp, stopTimer, debugLog]);

  // Progress calculation
  const progress = initialDuration > 0 ? (sessionTime / initialDuration) * 100 : 0;
  const isNearEnd = timeRemaining <= 60 && timeRemaining > 0; // Last minute warning
  const isOvertime = sessionTime > initialDuration;

  return {
    // Time values
    sessionTime,
    timeRemaining,
    progress: Math.min(100, Math.max(0, progress)),
    
    // Status flags
    isActive,
    isPaused,
    isNearEnd,
    isOvertime,
    
    // Control functions
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    
    // Formatted time strings
    getFormattedSessionTime,
    getFormattedTimeRemaining,
    getFormattedTime,
  };
};

export default useTimer;