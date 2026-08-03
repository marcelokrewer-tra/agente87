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
  const apiKey = metaEnv.VITE_FIREBASE_API_KEY;
  const projectId = metaEnv.VITE_FIREBASE_PROJECT_ID;

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: metaEnv.VITE_FIREBASE_APP_ID || '',
    };
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
export const fetchPeriodsFromFirestore = async (): Promise<Array<{ id: string; year: number; month: number; recordsCount: number; updatedAt?: string }>> => {
  const db = getDb();
  const periodsCollection = collection(db, 'sales_periods');
  const snapshot = await getDocs(periodsCollection);
  
  const periods: Array<{ id: string; year: number; month: number; recordsCount: number; updatedAt?: string }> = [];
  snapshot.forEach((document) => {
    const data = document.data();
    periods.push({
      id: document.id, // ID is 'YYYY-MM'
      year: data.year,
      month: data.month,
      recordsCount: data.recordsCount || 0,
      updatedAt: data.updatedAt
    });
  });

  // Sort periods chronologically
  return periods.sort((a, b) => b.id.localeCompare(a.id));
};

// 7. Fetch records for a period from Firestore
export const fetchPeriodDataFromFirestore = async (year: number, month: number): Promise<SalesRecord[]> => {
  const db = getDb();
  const periodId = `${year}-${String(month).padStart(2, '0')}`;
  
  // A. Check main document 'sales_periods/{periodId}' directly
  try {
    const periodDocRef = doc(db, 'sales_periods', periodId);
    const periodDocSnap = await getDoc(periodDocRef);
    if (periodDocSnap.exists()) {
      const data = periodDocSnap.data();
      if (data) {
        if (Array.isArray(data.records) && data.records.length > 0) return data.records;
        if (Array.isArray(data.items) && data.items.length > 0) return data.items;
        if (Array.isArray(data.chunk) && data.chunk.length > 0) return data.chunk;
        if (Array.isArray(data.data) && data.data.length > 0) return data.data;
      }
    }
  } catch (err) {
    console.error(`Error checking period doc ${periodId}:`, err);
  }

  const allRecords: SalesRecord[] = [];

  // B. Check subcollection 'sales_periods/{periodId}/items'
  try {
    const itemsCollection = collection(db, 'sales_periods', periodId, 'items');
    const querySnapshot = await getDocs(itemsCollection);
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (data) {
        if (Array.isArray(data.chunk)) allRecords.push(...data.chunk);
        else if (Array.isArray(data.records)) allRecords.push(...data.records);
        else if (Array.isArray(data.items)) allRecords.push(...data.items);
      }
    });

    if (allRecords.length > 0) {
      return allRecords;
    }
  } catch (err) {
    console.error(`Error checking items subcollection for ${periodId}:`, err);
  }

  // C. Check subcollection 'sales_periods/{periodId}/records'
  try {
    const recordsCollection = collection(db, 'sales_periods', periodId, 'records');
    const querySnapshot = await getDocs(recordsCollection);
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (data) {
        if (Array.isArray(data.chunk)) allRecords.push(...data.chunk);
        else if (Array.isArray(data.records)) allRecords.push(...data.records);
        else if (Array.isArray(data.items)) allRecords.push(...data.items);
        else if (Array.isArray(data.all)) allRecords.push(...data.all);
      }
    });
  } catch (err) {
    console.error(`Error checking records subcollection for ${periodId}:`, err);
  }

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

// 10. Previews persistence (Firestore & LocalStorage)
export interface RepresentativePreview {
  repId: string;
  previaValue: number;
  vendaDiaPrevia: number;
}

export const fetchPreviewsFromFirestore = async (year: number, month: number): Promise<RepresentativePreview[]> => {
  try {
    const db = getDb();
    const periodId = `${year}-${String(month).padStart(2, '0')}`;
    const docRef = doc(db, 'sales_periods', periodId, 'previews', 'data');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().previews || [];
    }
  } catch (error) {
    console.error("Error fetching previews from Firestore:", error);
  }
  return [];
};

export const savePreviewsToFirestore = async (year: number, month: number, previews: RepresentativePreview[]): Promise<void> => {
  const db = getDb();
  const periodId = `${year}-${String(month).padStart(2, '0')}`;
  const docRef = doc(db, 'sales_periods', periodId, 'previews', 'data');
  await setDoc(docRef, {
    previews,
    updatedAt: new Date().toISOString()
  });
};

export interface PreviewsWithMeta {
  previews: RepresentativePreview[];
  updatedAt?: string;
}

export const fetchPreviewsWithMetaFromFirestore = async (year: number, month: number): Promise<PreviewsWithMeta> => {
  try {
    const db = getDb();
    const periodId = `${year}-${String(month).padStart(2, '0')}`;
    const docRef = doc(db, 'sales_periods', periodId, 'previews', 'data');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        previews: data.previews || [],
        updatedAt: data.updatedAt
      };
    }
  } catch (error) {
    console.error("Error fetching previews with meta from Firestore:", error);
  }
  return { previews: [] };
};

export const getLocalPreviews = (year: number, month: number): RepresentativePreview[] => {
  if (typeof window === 'undefined') return [];
  try {
    const periodId = `${year}-${String(month).padStart(2, '0')}`;
    const stored = localStorage.getItem(`tramontina_previews_${periodId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error reading local previews", e);
    return [];
  }
};

export const getLocalPreviewsWithMeta = (year: number, month: number): PreviewsWithMeta => {
  if (typeof window === 'undefined') return { previews: [] };
  try {
    const periodId = `${year}-${String(month).padStart(2, '0')}`;
    const stored = localStorage.getItem(`tramontina_previews_${periodId}`);
    const updatedAt = localStorage.getItem(`tramontina_previews_updated_${periodId}`) || undefined;
    return {
      previews: stored ? JSON.parse(stored) : [],
      updatedAt
    };
  } catch (e) {
    console.error("Error reading local previews with meta", e);
    return { previews: [] };
  }
};

export const saveLocalPreviews = (year: number, month: number, previews: RepresentativePreview[]): void => {
  if (typeof window === 'undefined') return;
  try {
    const periodId = `${year}-${String(month).padStart(2, '0')}`;
    localStorage.setItem(`tramontina_previews_${periodId}`, JSON.stringify(previews));
    localStorage.setItem(`tramontina_previews_updated_${periodId}`, new Date().toISOString());
  } catch (e) {
    console.error("Error saving local previews", e);
  }
};

// ---------------- Representative Names Persistence ----------------

export const fetchRepNamesFromFirestore = async (): Promise<Record<string, string>> => {
  const db = getDb();
  try {
    const docRef = doc(db, 'sales_config', 'representative_names');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().names || {};
    }
  } catch (error) {
    console.error("Error fetching representative names from Firestore:", error);
  }
  return {};
};

export const saveRepNamesToFirestore = async (names: Record<string, string>): Promise<void> => {
  const db = getDb();
  const docRef = doc(db, 'sales_config', 'representative_names');
  await setDoc(docRef, {
    names,
    updatedAt: new Date().toISOString()
  });
};

export const getLocalRepNames = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('tramontina_rep_names');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Error reading local representative names", e);
    return {};
  }
};

export const saveLocalRepNames = (names: Record<string, string>): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('tramontina_rep_names', JSON.stringify(names));
  } catch (e) {
    console.error("Error saving local representative names", e);
  }
};

// ---------------- Representative Locations Persistence ----------------

export const fetchRepLocationsFromFirestore = async (): Promise<Record<string, string>> => {
  const db = getDb();
  try {
    const docRef = doc(db, 'sales_config', 'representative_locations');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().locations || {};
    }
  } catch (error) {
    console.error("Error fetching representative locations from Firestore:", error);
  }
  return {};
};

export const saveRepLocationsToFirestore = async (locations: Record<string, string>): Promise<void> => {
  const db = getDb();
  const docRef = doc(db, 'sales_config', 'representative_locations');
  await setDoc(docRef, {
    locations,
    updatedAt: new Date().toISOString()
  });
};

export const getLocalRepLocations = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('tramontina_rep_locations');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Error reading local representative locations", e);
    return {};
  }
};

export const saveLocalRepLocations = (locations: Record<string, string>): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('tramontina_rep_locations', JSON.stringify(locations));
  } catch (e) {
    console.error("Error saving local representative locations", e);
  }
};

// ---------------- Physical Quotas Persistence in Firestore ----------------

export const fetchPhysicalQuotaPeriodsFromFirestore = async (): Promise<Array<{ id: string; year: number; month: number; recordsCount: number; updatedAt?: string }>> => {
  const db = getDb();
  const collectionRef = collection(db, 'physical_quota_periods');
  const snapshot = await getDocs(collectionRef);
  
  const periods: Array<{ id: string; year: number; month: number; recordsCount: number; updatedAt?: string }> = [];
  snapshot.forEach((document) => {
    const data = document.data();
    const periodId = document.id;
    let year = data.year;
    let month = data.month;
    if ((!year || !month) && periodId.includes('-')) {
      const parts = periodId.split('-');
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
    }
    if (year && month) {
      periods.push({
        id: periodId,
        year,
        month,
        recordsCount: data.recordsCount || 0,
        updatedAt: data.updatedAt
      });
    }
  });

  return periods.sort((a, b) => b.id.localeCompare(a.id));
};

export const fetchPhysicalQuotaPeriodDataFromFirestore = async (year: number, month: number): Promise<import('../types').PhysicalQuotaRecord[]> => {
  const db = getDb();
  const periodId = `${year}-${String(month).padStart(2, '0')}`;

  // Check main doc
  try {
    const docRef = doc(db, 'physical_quota_periods', periodId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && Array.isArray(data.records) && data.records.length > 0) {
        return data.records;
      }
    }
  } catch (e) {}

  // Check items subcollection
  const allRecords: import('../types').PhysicalQuotaRecord[] = [];
  try {
    const itemsCollection = collection(db, 'physical_quota_periods', periodId, 'items');
    const querySnapshot = await getDocs(itemsCollection);
    
    const chunksWithIndex: Array<{ index: number; items: import('../types').PhysicalQuotaRecord[] }> = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (data) {
        const idx = typeof data.index === 'number' ? data.index : 0;
        if (Array.isArray(data.chunk)) chunksWithIndex.push({ index: idx, items: data.chunk });
        else if (Array.isArray(data.records)) chunksWithIndex.push({ index: idx, items: data.records });
        else if (Array.isArray(data.items)) chunksWithIndex.push({ index: idx, items: data.items });
      }
    });
    if (chunksWithIndex.length > 0) {
      chunksWithIndex.sort((a, b) => a.index - b.index);
      chunksWithIndex.forEach(c => allRecords.push(...c.items));
      return allRecords;
    }
  } catch (err) {
    console.error(`Error checking physical quota items subcollection for ${periodId}:`, err);
  }

  return allRecords;
};

export const savePhysicalQuotaPeriodToFirestore = async (year: number, month: number, records: import('../types').PhysicalQuotaRecord[]): Promise<void> => {
  const db = getDb();
  const periodId = `${year}-${String(month).padStart(2, '0')}`;
  
  const periodDocRef = doc(db, 'physical_quota_periods', periodId);
  await setDoc(periodDocRef, {
    id: periodId,
    year,
    month,
    recordsCount: records.length,
    updatedAt: new Date().toISOString()
  });

  const CHUNK_SIZE = 150;
  const chunks: import('../types').PhysicalQuotaRecord[][] = [];
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    chunks.push(records.slice(i, i + CHUNK_SIZE));
  }

  const itemsCollection = collection(db, 'physical_quota_periods', periodId, 'items');
  const existingDocs = await getDocs(itemsCollection);
  
  const deleteBatch = writeBatch(db);
  existingDocs.forEach((docSnapshot) => {
    deleteBatch.delete(docSnapshot.ref);
  });
  await deleteBatch.commit();

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunkDocRef = doc(db, 'physical_quota_periods', periodId, 'items', `chunk_${idx}`);
    await setDoc(chunkDocRef, {
      chunk: chunks[idx],
      index: idx
    });
  }
};

export const deletePhysicalQuotaPeriodFromFirestore = async (year: number, month: number): Promise<void> => {
  const db = getDb();
  const periodId = `${year}-${String(month).padStart(2, '0')}`;
  
  const itemsCollection = collection(db, 'physical_quota_periods', periodId, 'items');
  const existingDocs = await getDocs(itemsCollection);
  
  const deleteBatch = writeBatch(db);
  existingDocs.forEach((docSnapshot) => {
    deleteBatch.delete(docSnapshot.ref);
  });
  await deleteBatch.commit();

  const periodDocRef = doc(db, 'physical_quota_periods', periodId);
  await deleteDoc(periodDocRef);
};


