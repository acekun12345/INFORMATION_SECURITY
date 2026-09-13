import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBPQNC_5o9yWpo54ZJkrqW4ZOEGkq6a9Tc",
  authDomain: "ccdi-student-services.firebaseapp.com",
  projectId: "ccdi-student-services",
  storageBucket: "ccdi-student-services.firebasestorage.app",
  messagingSenderId: "961415309561",
  appId: "1:961415309561:web:4f697e99ec805ea42fda28",
  measurementId: "G-341L02J220",
  databaseURL: "https://ccdi-student-services-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);