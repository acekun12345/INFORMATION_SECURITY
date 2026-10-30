import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

export const DEMO_MODE = import.meta.env.VITE_QUEUE_MODE !== 'firebase';
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBPQNC_5o9yWpo54ZJkrqW4ZOEGkq6a9Tc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ccdi-student-services.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://ccdi-student-services-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ccdi-student-services',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:961415309561:web:4f697e99ec805ea42fda28',
};
export const configurationError = !DEMO_MODE && Object.values(config).some(v => !v)
  ? 'Incomplete Firebase configuration. Fill all fields in .env.local and restart the dev server.' : null;
export const db = !DEMO_MODE && !configurationError ? getDatabase(getApps()[0] ?? initializeApp(config)) : null;
