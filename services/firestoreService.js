import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  runTransaction,
} from "firebase/firestore"
import { Alert } from "react-native"
import { app } from "../config/firebase.config"
import { FIREBASE_COLLECTIONS } from "../utils/constants"
import { generateChannelName } from "../config/agora.config"

const db = getFirestore(app)

// Enhanced debug logging for matchmaking issues
const debugLog = (action, data = {}, level = "info") => {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    service: "firestoreService",
    action,
    ...data,
  }

  const logMessage = `🔥 [Firestore] ${action}`

  switch (level) {
    case "error":
      console.error(logMessage, logData)
      break;
    case "warn":
      console.warn(logMessage, logData)
      break;
    default:
      console.log(logMessage, logData)
  }
}

const firestoreService = {
  db,

 
  async addToQueue(userId, userType, ventText = null, selectedPlan = null) {
    try {
      const queueRef = collection(db, FIREBASE_COLLECTIONS.QUEUE)

      const docData = {
        userId,
        userType,
        timestamp: serverTimestamp(),
        status: "waiting",
        createdAt: new Date().toISOString(),
        retryCount: 0,
        addedAt: Date.now(), // Add timestamp for better ordering
      }

      // Add venter-specific data
      if (userType === "venter") {
        if (!ventText || ventText.trim().length === 0) {
          throw new Error("Venter must provide vent text")
        }
        if (!selectedPlan) {
          throw new Error("Venter must select a plan")
        }

        docData.ventText = ventText.trim()
        docData.plan = selectedPlan
        docData.priority = "normal"
      }

      // Add listener-specific data
      if (userType === "listener") {
        docData.availability = "active"
        docData.sessionCount = 0
      }

      debugLog("adding_to_queue", { userId, userType, hasVentText: !!ventText })

      const docRef = await addDoc(queueRef, docData)
      
      debugLog("added_to_queue_success", { 
        queueDocId: docRef.id, 
        userId, 
        userType 
      })

     
      await this.triggerImmediateMatchCheck(userType)

      return {
        queueDocId: docRef.id,
        userId,
        userType,
        ventText: docData.ventText,
        plan: docData.plan,
      }
    } catch (error) {
      debugLog("add_to_queue_error", { error: error.message, userId, userType }, "error")
      throw new Error(`Failed to join queue: ${error.message}`)
    }
  },

  
  async triggerImmediateMatchCheck(userType) {
    try {
      const oppositeType = userType === "venter" ? "listener" : "venter"
      
      const oppositeQuery = query(
        collection(db, FIREBASE_COLLECTIONS.QUEUE),
        where("userType", "==", oppositeType),
        where("status", "==", "waiting"),
        orderBy("addedAt", "asc"),
        limit(1)
      )

      const snapshot = await getDocs(oppositeQuery)
      
      if (!snapshot.empty) {
        debugLog("immediate_match_available", { 
          userType, 
          oppositeType, 
          availableMatches: snapshot.size 
        })
       
        return true
      }
      
      debugLog("no_immediate_matches", { userType, oppositeType })
      return false
    } catch (error) {
      debugLog("immediate_match_check_error", { error: error.message }, "error")
      return false
    }
  },


  async removeFromQueue(queueDocId) {
    try {
      if (!queueDocId) {
        debugLog("remove_from_queue_skipped", { reason: "no_queue_doc_id" }, "warn")
        return
      }

      const queueDocRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, queueDocId)
      const docSnap = await getDoc(queueDocRef)

      if (!docSnap.exists()) {
        debugLog("remove_from_queue_skipped", { reason: "doc_not_found", queueDocId }, "warn")
        return
      }

      await deleteDoc(queueDocRef)
      debugLog("removed_from_queue_success", { queueDocId })
    } catch (error) {
      debugLog("remove_from_queue_error", { error: error.message, queueDocId }, "error")
      
    }
  },

  
  listenToQueue(oppositeUserType, callback) {
    try {
      debugLog("setting_up_queue_listener", { oppositeUserType })

      const q = query(
        collection(db, FIREBASE_COLLECTIONS.QUEUE),
        where("userType", "==", oppositeUserType),
        where("status", "==", "waiting"),
        orderBy("addedAt", "asc"), 
        limit(10),
      )

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            const matches = []
            let changeDetected = false

            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                changeDetected = true
                debugLog("new_match_detected", { 
                  docId: change.doc.id,
                  userType: change.doc.data().userType,
                  changeType: change.type
                })
              }
            })

            snapshot.forEach((doc) => {
              const data = doc.data()
              const match = {
                docId: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || new Date(data.createdAt),
              }
              matches.push(match)
            })

            debugLog("queue_snapshot_processed", { 
              oppositeUserType,
              totalMatches: matches.length,
              changeDetected
            })

            callback(matches)
          } catch (error) {
            debugLog("snapshot_processing_error", { error: error.message }, "error")
            callback([])
          }
        },
        (error) => {
          debugLog("snapshot_listener_error", { 
            error: error.message, 
            code: error.code,
            oppositeUserType 
          }, "error")

          let errorMessage = "Failed to get real-time updates for matching."
          if (error.code === "permission-denied") {
            errorMessage = "Permission denied. Please check your account status."
          } else if (error.code === "unavailable") {
            errorMessage = "Service temporarily unavailable. Please check your internet connection."
          } else if (error.code === "failed-precondition") {
            errorMessage = "Database index required. Please contact support."
          }

          Alert.alert("Queue Error", errorMessage)
          callback([])
        },
      )

      debugLog("queue_listener_setup_success", { oppositeUserType })
      return unsubscribe
    } catch (error) {
      debugLog("listen_to_queue_setup_error", { error: error.message, oppositeUserType }, "error")
      throw new Error(`Failed to set up matching: ${error.message}`)
    }
  },

 
  async createSession(venterId, listenerId, venterQueueDocId, listenerQueueDocId, ventText, plan) {
    try {
      debugLog("create_session_start", { 
        venterId, 
        listenerId, 
        venterQueueDocId, 
        listenerQueueDocId 
      })

      const channelName = await generateChannelName()
      
      // Use transaction for atomic session creation
      const result = await runTransaction(db, async (transaction) => {
       
        const venterQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, venterQueueDocId)
        const listenerQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, listenerQueueDocId)
        
        const venterDoc = await transaction.get(venterQueueRef)
        const listenerDoc = await transaction.get(listenerQueueRef)
        
        if (!venterDoc.exists() || venterDoc.data().status !== "waiting") {
          throw new Error("Venter no longer available")
        }
        
        if (!listenerDoc.exists() || listenerDoc.data().status !== "waiting") {
          throw new Error("Listener no longer available")
        }

        // Create session
        const sessionRef = doc(collection(db, FIREBASE_COLLECTIONS.SESSIONS))
        const timestamp = serverTimestamp()

        const newSession = {
          venterId,
          listenerId,
          ventText: ventText || "",
          plan: plan || "20-Min Vent",
          channelName,
          startTime: timestamp,
          endTime: null,
          status: "active",
          durationSeconds: 0,
          venterQueueDocId,
          listenerQueueDocId,
          createdAt: new Date().toISOString(),
          endType: null,
          sessionVersion: "1.0",
          platform: "react-native",
        }

        // Add session document
        transaction.set(sessionRef, newSession)

        // Update queue documents to matched status
        transaction.update(venterQueueRef, {
          status: "matched",
          sessionId: sessionRef.id,
          matchedAt: timestamp,
        })

        transaction.update(listenerQueueRef, {
          status: "matched",
          sessionId: sessionRef.id,
          matchedAt: timestamp,
        })

        return {
          sessionId: sessionRef.id,
          channelName,
          ...newSession,
          startTime: new Date(),
        }
      })

      debugLog("create_session_success", {
        sessionId: result.sessionId,
        channelName: result.channelName,
      })

      return result
    } catch (error) {
      debugLog("create_session_error", { 
        error: error.message, 
        code: error.code,
        venterId,
        listenerId 
      }, "error")
      throw new Error(`Failed to create session: ${error.message}`)
    }
  },

 
  async endSession(sessionId, durationSeconds, endType = "manual-ended") {
    const batch = writeBatch(db)

    try {
      const sessionDocRef = doc(db, FIREBASE_COLLECTIONS.SESSIONS, sessionId)
      const sessionDoc = await getDoc(sessionDocRef)

      if (!sessionDoc.exists()) {
        debugLog("end_session_skipped", { reason: "session_not_found", sessionId }, "warn")
        return
      }

      const sessionData = sessionDoc.data()

      // Update session document
      const updateData = {
        endTime: serverTimestamp(),
        status: "ended",
        durationSeconds: Math.floor(durationSeconds || 0),
        endType: endType,
        endedAt: new Date().toISOString(),
      }

      batch.update(sessionDocRef, updateData)

      // Clean up queue documents
      const cleanupPromises = []

      if (sessionData.venterQueueDocId) {
        const venterQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, sessionData.venterQueueDocId)
        cleanupPromises.push(
          getDoc(venterQueueRef)
            .then((doc) => {
              if (doc.exists() && doc.data().status === "matched") {
                batch.delete(venterQueueRef)
              }
            })
            .catch((e) => console.warn("Venter queue cleanup warning:", e.message)),
        )
      }

      if (sessionData.listenerQueueDocId) {
        const listenerQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, sessionData.listenerQueueDocId)
        cleanupPromises.push(
          getDoc(listenerQueueRef)
            .then((doc) => {
              if (doc.exists() && doc.data().status === "matched") {
                batch.delete(listenerQueueRef)
              }
            })
            .catch((e) => console.warn("Listener queue cleanup warning:", e.message)),
        )
      }

      // Wait for cleanup checks
      await Promise.all(cleanupPromises)

      // Commit all changes
      await batch.commit()

      debugLog("end_session_success", { sessionId, endType, durationSeconds })
    } catch (error) {
      debugLog("end_session_error", { error: error.message, code: error.code, sessionId }, "error")
      throw new Error(`Failed to end session: ${error.message}`)
    }
  },

  
  async getQueueStats() {
    try {
      const queueRef = collection(db, FIREBASE_COLLECTIONS.QUEUE)
      const sessionsRef = collection(db, FIREBASE_COLLECTIONS.SESSIONS)

      // Create queries
      const ventersQuery = query(queueRef, where("userType", "==", "venter"), where("status", "==", "waiting"))
      const listenersQuery = query(queueRef, where("userType", "==", "listener"), where("status", "==", "waiting"))
      const activeSessionsQuery = query(sessionsRef, where("status", "==", "active"))

      // Execute queries in parallel
      const [ventersSnapshot, listenersSnapshot, activeSessionsSnapshot] = await Promise.all([
        getDocs(ventersQuery),
        getDocs(listenersQuery),
        getDocs(activeSessionsQuery),
      ])

      const stats = {
        ventersWaiting: ventersSnapshot.size,
        listenersWaiting: listenersSnapshot.size,
        activeSessions: activeSessionsSnapshot.size,
        lastUpdated: new Date().toISOString(),
      }

      debugLog("queue_stats_retrieved", stats)
      return stats
    } catch (error) {
      debugLog("get_queue_stats_error", { error: error.message, code: error.code }, "error")

      // Return fallback stats instead of throwing
      return {
        ventersWaiting: 0,
        listenersWaiting: 0,
        activeSessions: 0,
        lastUpdated: new Date().toISOString(),
        error: error.message,
      }
    }
  },

  /**
   * Clean up stale queue entries (older than 10 minutes)
   */
  async cleanupStaleQueueEntries() {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
      const queueRef = collection(db, FIREBASE_COLLECTIONS.QUEUE)

      const staleQuery = query(
        queueRef,
        where("status", "==", "waiting"),
        where("createdAt", "<", tenMinutesAgo.toISOString()),
      )

      const staleSnapshot = await getDocs(staleQuery)

      if (staleSnapshot.size === 0) {
        return
      }

      debugLog("cleaning_stale_entries", { count: staleSnapshot.size })

      const batch = writeBatch(db)

      staleSnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()
      debugLog("stale_entries_cleaned", { count: staleSnapshot.size })
    } catch (error) {
      debugLog("cleanup_stale_entries_error", { error: error.message, code: error.code }, "error")
    }
  },

  /**
   * Test connection and permissions
   */
  async testConnection() {
    try {
      debugLog("testing_connection_start")
      
      // Test basic read access
      const testQuery = query(
        collection(db, FIREBASE_COLLECTIONS.QUEUE),
        limit(1)
      )
      
      await getDocs(testQuery)
      
      debugLog("connection_test_success")
      return true
    } catch (error) {
      debugLog("connection_test_failed", { 
        error: error.message, 
        code: error.code 
      }, "error")
      return false
    }
  }
}

export default firestoreService