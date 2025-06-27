// src/firebase/firebaseConfig.ts

import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// const firebaseConfig = {
//   apiKey: "AIzaSyCKWjBi60vexNKQWTQR4TF-PAHwTxh5gc0",
//   authDomain: "billsoftware-60e04.firebaseapp.com",
//   databaseURL: "https://billsoftware-60e04-default-rtdb.firebaseio.com/", // ✅ Correct URL
//   projectId: "billsoftware-60e04",
//   storageBucket: "billsoftware-60e04.appspot.com", // ✅ Fixed .app typo
//   messagingSenderId: "937597259605",
//   appId: "1:937597259605:web:8e41d40d5ec92aae87a9dc",
//   measurementId: "G-PX5YEVRPL8"
// };

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
getAnalytics(app); // optional

// Export services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
