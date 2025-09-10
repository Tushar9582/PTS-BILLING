import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCRSY_4YwNRmXmAzcHotrH7oR1sq2sADgY",
  authDomain: "billing-817ce.firebaseapp.com",
  databaseURL: "https://billing-817ce-default-rtdb.firebaseio.com",
  projectId: "billing-817ce",
  storageBucket: "billing-817ce.firebasestorage.app",
  messagingSenderId: "301424786030",
  appId: "1:301424786030:web:0f0a5a974f1d0c2fda447f",
  measurementId: "G-Y25G1KXSJJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Export services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});