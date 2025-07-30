import { initializeApp } from "firebase/app"
import { initializeAuth, getReactNativePersistence } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import AsyncStorage from "@react-native-async-storage/async-storage"

const firebaseConfig = {
  apiKey: "AIzaSyAmvY0OvsMwYRt41CloB1Nj6unXCDRtmRs",
  authDomain: "ventbox-73392.firebaseapp.com",
  projectId: "ventbox-73392",
  storageBucket: "ventbox-73392.firebasestorage.app",
  messagingSenderId: "73605309495",
  appId: "1:73605309495:web:ff2a5afaa0228a8b2c4bb2",
  measurementId: "G-32ZKTV93KL"
};

let app, auth, db

try {
  app = initializeApp(firebaseConfig)
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  })
  db = getFirestore(app)
  console.log("✅ Firebase initialized successfully")
} catch (error) {
  console.error("❌ Firebase initialization error:", error)
}

export { app, auth, db }

