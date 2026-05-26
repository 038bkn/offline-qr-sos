import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyDxnropRbJ1hmEUKqHbdK9PoFO_MQC77C0",
  authDomain: "sos-relay-app.firebaseapp.com",
  projectId: "sos-relay-app",
  storageBucket: "sos-relay-app.firebasestorage.app",
  messagingSenderId: "174076446908",
  appId: "1:174076446908:web:9093b16d9b6a155f4c28b9",
  measurementId: "G-F7EE6T30YV"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig)

// 使う機能（データベース、認証、アナリティクス）をエクスポート
export const fDB = getFirestore(app)
export const fAuth = getAuth(app)
export const analytics = getAnalytics(app)