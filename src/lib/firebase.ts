import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot, getDocFromServer, DocumentReference, CollectionReference } from 'firebase/firestore';

// Import the Firebase configuration as a fallback
import appletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || (appletConfig as any).databaseURL,
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Prioritize the provisioned database ID from the applet configuration file first
const firestoreDatabaseId = (appletConfig.firestoreDatabaseId && appletConfig.firestoreDatabaseId !== '(default)')
  ? appletConfig.firestoreDatabaseId
  : (import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined);
const finalDatabaseId = firestoreDatabaseId && firestoreDatabaseId !== '(default)' ? firestoreDatabaseId : undefined;

// Standard Firestore initialization with automatic transport negotiation
export const db = getFirestore(app, finalDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('https://www.googleapis.com/auth/calendar');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

let cachedAccessToken: string | null = null;
export const getCachedAccessToken = () => cachedAccessToken;
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Clear token on state change if logged out
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

// Auth Helpers
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential && credential.accessToken) {
    cachedAccessToken = credential.accessToken;
  }
  return result;
};
export const signUpWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const signInWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const updateAuthProfile = (displayName: string) => {
  if (auth.currentUser) {
    return updateProfile(auth.currentUser, { displayName });
  }
  return Promise.reject('No user logged in');
};
export const logout = () => signOut(auth);

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 8000, errorMsg: string = 'Operation timed out'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Error Handling Helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  // Suppress transient offline/network/unavailable errors from crashing the app
  const isOffline = errMessage.toLowerCase().includes('offline') || 
                    errMessage.toLowerCase().includes('unreachable') || 
                    errMessage.toLowerCase().includes('unavailable') || 
                    (error && typeof error === 'object' && 'code' in error && (error as any).code === 'unavailable');

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  if (isOffline) {
    console.warn('Firestore is offline or unreachable (non-fatal error):', JSON.stringify(errInfo));
    return; // Resolve without throwing
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Test with Retry
async function testConnection(retries = 3) {
  // Wait a moment for the network to stabilize in the sandbox environment
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  for (let i = 0; i < retries; i++) {
    try {
      // Use a background check that doesn't block UI if possible
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log('Firestore connection verified.');
      return;
    } catch (error: any) {
      if (i === retries - 1) {
        if (error.code === 'unavailable') {
          console.warn("Firestore is currently unreachable. The app will work in offline mode and sync when online.");
        } else {
          console.error("Firestore connectivity check failed:", error.code, error.message);
        }
      } else {
        // Wait longer between retries
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
}
testConnection();
