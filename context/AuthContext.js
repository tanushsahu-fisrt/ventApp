import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { signInAnonymously, onAuthStateChanged, signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../config/firebase.config";
import { doc, setDoc, getDoc } from "firebase/firestore";
const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth) {
      setError("Firebase Auth not available");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            setUser(firebaseUser);

            const userProfile = {
              uid: firebaseUser.uid,
              isAnonymous: firebaseUser.isAnonymous,
              displayName: firebaseUser.displayName || "Anonymous User",
              email: firebaseUser.email,
              createdAt: firebaseUser.metadata.creationTime,
              lastSignIn: firebaseUser.metadata.lastSignInTime,
            };

            setUserInfo(userProfile);
            await AsyncStorage.setItem(
              "ventbox_user_info",
              JSON.stringify(userProfile)
            );
          } else {
            setUser(null);
            setUserInfo(null);
            await AsyncStorage.removeItem("ventbox_user_info");
          }
        } catch (error) {
          console.error("Auth state change error:", error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      },
      (authError) => {
        console.error("Auth listener error:", authError);
        setError(authError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const signInAnonymous = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!auth) {
        throw new Error("Firebase Auth not available");
      }

      const result = await signInAnonymously(auth);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userDocRef);

      if (!userSnapshot.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          createdAt: new Date(),
          isAnonymous: true,
        });
        console.log(
          "Firestore user document created for anonymous user:",
          user.uid
        );
      } else {
        console.log("Firestore document already exists for user:", user.uid);
      }

      return user;
    } catch (error) {
      console.error("Anonymous sign in error:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      if (auth && user) {
        await signOut(auth);
      }
      await AsyncStorage.removeItem("ventbox_user_info");
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  }, [user]);

  const value = {
    user,
    userInfo,
    loading,
    error,
    signInAnonymous,
    signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
