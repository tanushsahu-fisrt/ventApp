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
        addedAt: Date.now(),
      }

      if (userType === "venter") {
        if (!ventText || ventText.trim().length === 0) {
          throw new Error("Venter must provide vent text")
        }
        if (!selectedPlan) {
          throw new Error("Venter must select a plan")
        }

        docData.ventText = ventText.trim()
        docData.plan = selectedPlan
      }

      const docRef = await addDoc(queueRef, docData)

      return {
        queueDocId: docRef.id,
        userId,
        userType,
        ventText: docData.ventText,
        plan: docData.plan,
      }
    } catch (error) {
      throw new Error(`Failed to join queue: ${error.message}`)
    }
  },

  async removeFromQueue(queueDocId) {
    try {
      if (!queueDocId) return

      const queueDocRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, queueDocId)
      const docSnap = await getDoc(queueDocRef)

      if (!docSnap.exists()) return

      await deleteDoc(queueDocRef)
    } catch (error) {
      console.warn("Remove from queue error:", error.message)
    }
  },

  listenToQueue(oppositeUserType, callback) {
    try {
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

            snapshot.forEach((doc) => {
              const data = doc.data()
              const match = {
                docId: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || new Date(data.createdAt),
              }
              matches.push(match)
            })

            callback(matches)
          } catch (error) {
            console.error("Snapshot processing error:", error.message)
            callback([])
          }
        },
        (error) => {
          console.error("Snapshot listener error:", error.message)
          Alert.alert("Queue Error", "Failed to get real-time updates for matching.")
          callback([])
        },
      )

      return unsubscribe
    } catch (error) {
      throw new Error(`Failed to set up matching: ${error.message}`)
    }
  },

  async createSession(venterId, listenerId, venterQueueDocId, listenerQueueDocId, ventText, plan) {
    try {
      const channelName = await generateChannelName()
      
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
        }

        transaction.set(sessionRef, newSession)

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

      return result
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`)
    }
  },

  async endSession(sessionId, durationSeconds, endType = "manual-ended") {
    const batch = writeBatch(db)

    try {
      const sessionDocRef = doc(db, FIREBASE_COLLECTIONS.SESSIONS, sessionId)
      const sessionDoc = await getDoc(sessionDocRef)

      if (!sessionDoc.exists()) return

      const sessionData = sessionDoc.data()

      const updateData = {
        endTime: serverTimestamp(),
        status: "ended",
        durationSeconds: Math.floor(durationSeconds || 0),
        endType: endType,
        endedAt: new Date().toISOString(),
      }

      batch.update(sessionDocRef, updateData)

      // Clean up queue documents
      if (sessionData.venterQueueDocId) {
        const venterQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, sessionData.venterQueueDocId)
        batch.delete(venterQueueRef)
      }

      if (sessionData.listenerQueueDocId) {
        const listenerQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, sessionData.listenerQueueDocId)
        batch.delete(listenerQueueRef)
      }

      await batch.commit()
    } catch (error) {
      throw new Error(`Failed to end session: ${error.message}`)
    }
  },

  async getQueueStats() {
    try {
      const queueRef = collection(db, FIREBASE_COLLECTIONS.QUEUE)
      const sessionsRef = collection(db, FIREBASE_COLLECTIONS.SESSIONS)

      const ventersQuery = query(queueRef, where("userType", "==", "venter"), where("status", "==", "waiting"))
      const listenersQuery = query(queueRef, where("userType", "==", "listener"), where("status", "==", "waiting"))
      const activeSessionsQuery = query(sessionsRef, where("status", "==", "active"))

      const [ventersSnapshot, listenersSnapshot, activeSessionsSnapshot] = await Promise.all([
        getDocs(ventersQuery),
        getDocs(listenersQuery),
        getDocs(activeSessionsQuery),
      ])

      return {
        ventersWaiting: ventersSnapshot.size,
        listenersWaiting: listenersSnapshot.size,
        activeSessions: activeSessionsSnapshot.size,
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      return {
        ventersWaiting: 0,
        listenersWaiting: 0,
        activeSessions: 0,
        lastUpdated: new Date().toISOString(),
        error: error.message,
      }
    }
  },

  async testConnection() {
    try {
      const testQuery = query(
        collection(db, FIREBASE_COLLECTIONS.QUEUE),
        limit(1)
      )
      
      await getDocs(testQuery)
      return true
    } catch (error) {
      return false
    }
  }
}

export default firestoreService