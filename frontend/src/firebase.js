const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseReady = Object.values(config).every((value) => typeof value === 'string' && value.length > 0);
let databasePromise;

async function getDatabase() {
  if (!firebaseReady) return null;
  if (!databasePromise) {
    databasePromise = Promise.all([import('firebase/app'), import('firebase/firestore/lite')]).then(([appSdk, firestoreSdk]) => {
      const app = appSdk.getApps()[0] ?? appSdk.initializeApp(config);
      return firestoreSdk.getFirestore(app);
    });
  }
  return databasePromise;
}

export async function createSession(language) {
  const sessionId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const db = await getDatabase();
  if (!db) return { sessionId, saved: false };
  const firestore = await import('firebase/firestore/lite');
  await firestore.setDoc(firestore.doc(db, 'sessions', sessionId), {
    language,
    createdAt: firestore.serverTimestamp(),
    lastActivityAt: firestore.serverTimestamp(),
  });
  return { sessionId, saved: true };
}

export async function touchSession(sessionId) {
  const db = await getDatabase();
  if (!db || !sessionId) return;
  const firestore = await import('firebase/firestore/lite');
  await firestore.updateDoc(firestore.doc(db, 'sessions', sessionId), {
    lastActivityAt: firestore.serverTimestamp(),
  });
}
