const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseReady = Object.values(config).every((value) => typeof value === 'string' && value.length > 0);
let appPromise;
let userPromise;

async function getFirebase() {
  if (!firebaseReady) return null;
  if (!appPromise) {
    appPromise = Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore/lite')])
      .then(([appSdk, authSdk, storeSdk]) => {
        const app = appSdk.getApps()[0] ?? appSdk.initializeApp(config);
        return { app, auth: authSdk.getAuth(app), authSdk, storeSdk, db: storeSdk.getFirestore(app) };
      });
  }
  return appPromise;
}

export async function ensurePatientIdentity() {
  const firebase = await getFirebase();
  if (!firebase) return null;
  if (!userPromise) {
    userPromise = (async () => {
      const { auth, authSdk } = firebase;
      if (auth.currentUser) return auth.currentUser;
      return (await authSdk.signInAnonymously(auth)).user;
    })().catch((error) => {
      userPromise = null;
      if (error?.code === 'auth/admin-restricted-operation') {
        throw new Error('Firebase is blocking account creation for this project. Enable user account creation in Authentication settings and enable the Anonymous sign-in provider, then reload Arogya Voice.');
      }
      if (['auth/configuration-not-found', 'auth/operation-not-allowed'].includes(error?.code)) {
        throw new Error('Firebase Authentication is not configured for this project. Enable Authentication and the Anonymous sign-in provider in Firebase Console, then reload Arogya Voice.');
      }
      throw error;
    });
  }
  return userPromise;
}

export async function createSession(language) {
  const sessionId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const [firebase, user] = await Promise.all([getFirebase(), ensurePatientIdentity()]);
  if (!firebase || !user) return { sessionId, saved: false };
  const { storeSdk, db } = firebase;
  await storeSdk.setDoc(storeSdk.doc(db, 'sessions', sessionId), {
    ownerId: user.uid, language,
    createdAt: storeSdk.serverTimestamp(), lastActivityAt: storeSdk.serverTimestamp(),
  });
  return { sessionId, saved: true };
}

export async function touchSession(sessionId) {
  const firebase = await getFirebase();
  if (!firebase || !sessionId) return;
  const { storeSdk, db } = firebase;
  await storeSdk.updateDoc(storeSdk.doc(db, 'sessions', sessionId), { lastActivityAt: storeSdk.serverTimestamp() });
}

export async function savePrescription(prescription) {
  const [firebase, user] = await Promise.all([getFirebase(), ensurePatientIdentity()]);
  if (!firebase || !user) return { saved: false, id: null };
  if (prescription.status !== 'verified') throw new Error('Confirm the prescription details before saving.');
  const { storeSdk, db } = firebase;
  const reference = storeSdk.doc(storeSdk.collection(db, 'prescriptions'));
  await storeSdk.setDoc(reference, {
    ...prescription, ownerId: user.uid,
    createdAt: storeSdk.serverTimestamp(), updatedAt: storeSdk.serverTimestamp(),
  });
  return { saved: true, id: reference.id };
}

export async function listPrescriptions() {
  const [firebase, user] = await Promise.all([getFirebase(), ensurePatientIdentity()]);
  if (!firebase || !user) return { saved: false, items: [] };
  const { storeSdk, db } = firebase;
  const result = await storeSdk.getDocs(storeSdk.query(
    storeSdk.collection(db, 'prescriptions'), storeSdk.where('ownerId', '==', user.uid),
  ));
  return { saved: true, items: result.docs.map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)) };
}

export async function removePrescription(id) {
  const [firebase, user] = await Promise.all([getFirebase(), ensurePatientIdentity()]);
  if (!firebase || !user) return false;
  const { storeSdk, db } = firebase;
  await storeSdk.deleteDoc(storeSdk.doc(db, 'prescriptions', id));
  return true;
}
