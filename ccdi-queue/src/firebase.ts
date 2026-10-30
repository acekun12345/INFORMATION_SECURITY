import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

export const DEMO_MODE = import.meta.env.VITE_QUEUE_MODE !== 'firebase';
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const configurationError = !DEMO_MODE && Object.values(config).some(v => !v)
  ? 'Incomplete Firebase configuration. Fill all fields in .env.local and restart the dev server.' : null;
export const db = !DEMO_MODE && !configurationError ? getDatabase(getApps()[0] ?? initializeApp(config)) : null;
