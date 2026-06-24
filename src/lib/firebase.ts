import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  writeBatch 
} from 'firebase/firestore';
import { SalesRecord } from '../types';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'tramontina_firebase_config_v1';

// 1. Get Firebase configuration (Env variables, hardcoded fallback, or LocalStorage fallback)
export const getFirebaseConfig = (): FirebaseConfig | null => {
  // Check standard environment variables first
  const metaEnv = (import.meta as any).env || {};
  const envConfig: FirebaseConfig = {
    apiKey: metaEnv.VITE_FIREBASE_API_KEY || 'AIzaSyCd00KYTxhf4Gdw1tD8gR6GfQGl9gJxpyc',
    authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || 'agente87-7542b.firebaseapp.com',
    projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || 'agente87-7542b',
    storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || 'agente87-7542b.firebasestorage.app',
    messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '173046313571',
    appId: metaEnv.VITE_FIREBASE_APP_ID || '1:173046313571:web:b783d1ce49b27330ea3e56',
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  // Check LocalStorage fallback
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading firebase config from localStorage", e);
    }
  }

  return null;
};

// 2. Save Firebase configuration locally
export const saveFirebaseConfig = (config: FirebaseConfig): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error("Error saving firebase config to localStorage", e);
    }
  }
};

// 3. Clear Firebase configuration
export const clearFirebaseConfig = (): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
    } catch (e) {
      console.error("Error clearing firebase config", e);
    }
  }
};

// 4. Initialize Firestore safely
const getDb = () => {
  const config = getFirebaseConfig();
  if (!config) {
    throw new Error("Firebase não está configurado.");
  }

  const apps = getApps();
  const app = apps.length === 0 ? initializeApp(config) : getApp();
  return getFirestore(app);
};

// 5. Test connection
export const testFirebaseConnection = async (config: FirebaseConfig): Promise<boolean> => {
  try {
    const apps = getApps();
    // Use a separate/temp app initialization so we don't pollute current active app
    const tempAppName = `temp-test-${Date.now()}`;
    const testApp = initializeApp(config, tempAppName);
    const testDb = getFirestore(testApp);
    
    // Attempt a simple operation in a system metadata or dummy path
    const testDoc = doc(testDb, 'system_test', 'status');
    await getDoc(testDoc);
    return true;
  } catch (error) {
    console.error("Firebase connection test failed:", error);
    throw error;
  }
};

// 6. Fetch periods from Firestore
export const fetchPeriodsFromFirestore = async (): Promise<Array<{ id: string; year: number; month: number; recordsCount: number }>> => {
  const db = getDb();
  const periodsCollection = collection(db, 'sales_periods');
  const snapshot = await getDocs(periodsCollection);
  
  const periods: Array<{ id: string; year: number; month: number; recordsCount: number }> = [];
  snapshot.forEach((document) => {
    const data = document.data();
    periods.push({
      id: document.id, // ID is 'YYYY-MM'
      year: data.year,
      month: data.month,
      recordsCount: data.recordsCount || 0
    });
  });

  // Sort periods chronologically
  return periods.sort((a, b) => b.id.localeCompare(a.id));
};

// 7. Fetch records for a period from Firestore
export const fetchPeriodDataFromFirestore = async (year: number, month: number): Promise<SalesRecord[]> => {
  const db = getDb();
  const periodId = `${year}-${String(month).padStart(2, '0')}`;
  
  // We store the sales data in 'sales_periods/{periodId}/records/all' or chunked to stay under size limits.
  // To avoid size limitations per document (Firestore limit is 1MB), 
  // we save the records as array chunks or subdocuments if it is extremely large, 
  // or simple single doc for typical periods.
  // Let's store chunked documents in a subcollection 'items' inside 'sales_periods/{periodId}/items'
  const itemsCollection = collection(db, 'sales_periods', periodId, 'items');
  const querySnapshot = await getDocs(itemsCollection);
  
  const allRecords: SalesRecord[] = [];
  querySnapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    if (data && Array.isArray(data.chunk)) {
      allRecords.push(...data.chunk);
    }
  });

  return allRecords;
};

// 8. Save period to Firestore
export const savePeriodToFirestore = async (year: number, month: number, records: SalesRecord[]): Promise<void> => {
  const db = getDb();
  const periodId = `${year}-${String(month).padStart(2, '0')}`;
  
  // Create / Update the master period document
  const periodDocRef = doc(db, 'sales_periods', periodId);
  await setDoc(periodDocRef, {
    id: periodId,
    year,
    month,
    recordsCount: records.length,
    updatedAt: new Date().toISOString()
  });

  // Split records into chunks of 150 items to stay comfortably under the 1MB Firestore document limit
  const CHUNK_SIZE = 150;
  const chunks: SalesRecord[][] = [];
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    chunks.push(records.slice(i, i + CHUNK_SIZE));
  }

  // Clear previous subcollection documents first to avoid orphans if previous import was larger
  const itemsCollection = collection(db, 'sales_periods', periodId, 'items');
  const existingDocs = await getDocs(itemsCollection);
  
  const deleteBatch = writeBatch(db);
  existingDocs.forEach((docSnapshot) => {
    deleteBatch.delete(docSnapshot.ref);
  });
  await deleteBatch.commit();

  // Save new chunks
  for (let idx = 0; idx < chunks.length; idx++) {
    const chunkDocRef = doc(db, 'sales_periods', periodId, 'items', `chunk_${idx}`);
    await setDoc(chunkDocRef, {
      chunk: chunks[idx],
      index: idx
    });
  }
};

// 9. Delete period from Firestore
export const deletePeriodFromFirestore = async (year: number, month: number): Promise<void> => {
  const db = getDb();
  const periodId = `${year}-${String(month).padStart(2, '0')}`;
  
  // Delete subcollection documents first
  const itemsCollection = collection(db, 'sales_periods', periodId, 'items');
  const existingDocs = await getDocs(itemsCollection);
  
  const deleteBatch = writeBatch(db);
  existingDocs.forEach((docSnapshot) => {
    deleteBatch.delete(docSnapshot.ref);
  });
  await deleteBatch.commit();

  // Delete main period document
  const periodDocRef = doc(db, 'sales_periods', periodId);
  await deleteDoc(periodDocRef);
};
