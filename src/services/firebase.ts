import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

let appInstance: FirebaseApp | null = null
let authInstance: Auth | null = null
let firestoreInstance: Firestore | null = null

const getFirebaseConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
})

export const getFirebaseApp = () => {
  if (!appInstance) {
    appInstance = getApps().length
      ? getApp()
      : initializeApp(getFirebaseConfig())
  }
  return appInstance
}

export const getFirebaseDb = () => {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp())
  }
  return firestoreInstance
}

export const getFirebaseAuth = () => {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp())
  }
  return authInstance
}
