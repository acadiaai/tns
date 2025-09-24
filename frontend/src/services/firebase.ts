import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate configuration
const validateConfig = () => {
  const required = ['apiKey', 'authDomain', 'projectId'];
  const missing = required.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

  if (missing.length > 0) {
    console.error('Missing Firebase configuration:', missing);
    throw new Error(`Missing required Firebase configuration: ${missing.join(', ')}`);
  }
};

// Initialize Firebase only if configured
let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let analytics: ReturnType<typeof getAnalytics> | null = null;

try {
  validateConfig();
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Initialize Analytics only if supported (not in all environments)
  isSupported().then(supported => {
    if (supported && app) {
      analytics = getAnalytics(app);
    }
  });
} catch (error) {
  console.error('Firebase initialization error:', error);
  // App can still run without Firebase for development
}

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
// Request additional user info scopes
googleProvider.addScope('profile');
googleProvider.addScope('email');

export { app, auth, db, analytics, googleProvider };

// Type exports for better TypeScript support
export type { User } from 'firebase/auth';
export type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';