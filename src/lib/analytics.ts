import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs 
} from 'firebase/firestore';
import { getFirebaseConfig } from './firebase';

export interface AnalyticsEvent {
  id: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  type: 'session_start' | 'tab_view' | 'data_import' | 'presentation_export' | 'data_save' | 'custom_name_save' | 'location_save';
  details?: string; // name of the tab, UFs, rows count
  ip?: string;
  city?: string;
  region?: string;
  region_code?: string;
  country?: string;
  browser?: string;
  os?: string;
}

export interface AnalyticsStats {
  totalVisits: number;
  visitsByDay: Record<string, number>;
  visitsByRegion: Record<string, number>;
  visitsByCity: Record<string, number>;
  mostUsedFeatures: Record<string, number>;
  browsers: Record<string, number>;
  osList: Record<string, number>;
  recentEvents: AnalyticsEvent[];
}

// 1. Safe helper to get Firestore instance
const getAnalyticsDb = () => {
  const config = getFirebaseConfig();
  if (!config) return null;
  try {
    const apps = getApps();
    const app = apps.length === 0 ? initializeApp(config) : getApp();
    return getFirestore(app);
  } catch (e) {
    console.error("Failed to initialize Firebase for Analytics:", e);
    return null;
  }
};

// 2. Fetch Geo IP information with HTTPS support and timezone fallback
const mapRegionToCode = (regionName: string): string => {
  const clean = regionName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const states: Record<string, string> = {
    'acre': 'AC',
    'alagoas': 'AL',
    'amapa': 'AP',
    'amazonas': 'AM',
    'bahia': 'BA',
    'ceara': 'CE',
    'distrito federal': 'DF',
    'espirito santo': 'ES',
    'goias': 'GO',
    'maranhao': 'MA',
    'mato grosso': 'MT',
    'mato grosso do sul': 'MS',
    'minas gerais': 'MG',
    'para': 'PA',
    'paraiba': 'PB',
    'parana': 'PR',
    'pernambuco': 'PE',
    'piaui': 'PI',
    'rio de janeiro': 'RJ',
    'rio grande do norte': 'RN',
    'rio grande do sul': 'RS',
    'rondonia': 'RO',
    'roraima': 'RR',
    'santa catarina': 'SC',
    'sao paulo': 'SP',
    'sergipe': 'SE',
    'tocantins': 'TO'
  };
  return states[clean] || '';
};

export const fetchGeoInfo = async () => {
  // 1. Try freeipapi.com (No limits, supports HTTPS, very robust)
  try {
    const res = await fetch('https://freeipapi.com/api/json');
    if (res.ok) {
      const data = await res.json();
      const rName = data.regionName || 'Desconhecido';
      return {
        ip: data.ipAddress || 'Unknown',
        city: data.cityName || 'Desconhecido',
        region: rName,
        region_code: mapRegionToCode(rName),
        country: data.countryName || 'Brasil',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
  } catch (e) {
    console.warn("Failed to fetch geo-ip from freeipapi, trying backup...", e);
  }

  // 2. Backup: ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      return {
        ip: data.ip || 'Unknown',
        city: data.city || 'Desconhecido',
        region: data.region || 'Desconhecido',
        region_code: data.region_code || '',
        country: data.country_name || 'Brasil',
        timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
  } catch (e) {
    console.warn("Failed to fetch geo-ip from ipapi, falling back to timezone:", e);
  }

  // Fallback to time zone identification
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  let city = 'São Paulo';
  let region = 'São Paulo';
  let regionCode = 'SP';

  if (tz.includes('Sao_Paulo')) {
    city = 'São Paulo'; region = 'São Paulo'; regionCode = 'SP';
  } else if (tz.includes('Porto_Alegre')) {
    city = 'Porto Alegre'; region = 'Rio Grande do Sul'; regionCode = 'RS';
  } else if (tz.includes('Rio_de_Janeiro')) {
    city = 'Rio de Janeiro'; region = 'Rio de Janeiro'; regionCode = 'RJ';
  } else if (tz.includes('Manaus')) {
    city = 'Manaus'; region = 'Amazonas'; regionCode = 'AM';
  } else if (tz.includes('Fortaleza')) {
    city = 'Fortaleza'; region = 'Ceará'; regionCode = 'CE';
  } else if (tz.includes('Recife')) {
    city = 'Recife'; region = 'Pernambuco'; regionCode = 'PE';
  } else if (tz.includes('Cuiaba')) {
    city = 'Cuiabá'; region = 'Mato Grosso'; regionCode = 'MT';
  } else if (tz.includes('Belem')) {
    city = 'Belém'; region = 'Pará'; regionCode = 'PA';
  } else if (tz.includes('Brasilia')) {
    city = 'Brasília'; region = 'Distrito Federal'; regionCode = 'DF';
  } else if (tz.includes('Belo_Horizonte')) {
    city = 'Belo Horizonte'; region = 'Minas Gerais'; regionCode = 'MG';
  } else if (tz.includes('Salvador')) {
    city = 'Salvador'; region = 'Bahia'; regionCode = 'BA';
  } else if (tz.includes('Curitiba')) {
    city = 'Curitiba'; region = 'Paraná'; regionCode = 'PR';
  }

  return {
    ip: '127.0.0.1',
    city,
    region,
    region_code: regionCode,
    country: 'Brasil',
    timezone: tz
  };
};

// 3. Detect browser & OS
export const getBrowserAndOS = () => {
  const ua = typeof window !== 'undefined' ? navigator.userAgent : '';
  let browser = 'Outro';
  let os = 'Outro';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

  if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os };
};

// Cached geo information so we only request once per application lifetime
let cachedGeo: any = null;

// 4. Log an analytics event both locally and optionally to Firestore
export const logAnalyticsEvent = async (
  type: AnalyticsEvent['type'],
  details?: string
): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    // 1. Fetch geo if not cached
    if (!cachedGeo) {
      cachedGeo = await fetchGeoInfo();
    }

    const { browser, os } = getBrowserAndOS();
    const now = new Date();
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const event: AnalyticsEvent = {
      id: eventId,
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      type,
      details,
      ip: cachedGeo.ip,
      city: cachedGeo.city,
      region: cachedGeo.region,
      region_code: cachedGeo.region_code,
      country: cachedGeo.country,
      browser,
      os
    };

    // 2. Store in LocalStorage
    const localEventsStr = localStorage.getItem('tramontina_analytics_events');
    const localEvents: AnalyticsEvent[] = localEventsStr ? JSON.parse(localEventsStr) : [];
    
    // Cap local events at 500 records to prevent bloating localStorage
    localEvents.unshift(event);
    if (localEvents.length > 500) {
      localEvents.pop();
    }
    localStorage.setItem('tramontina_analytics_events', JSON.stringify(localEvents));

    // 3. Write to Firestore if connected
    const db = getAnalyticsDb();
    if (db) {
      const eventDocRef = doc(db, 'analytics_events', eventId);
      await setDoc(eventDocRef, event);
    }
  } catch (error) {
    console.error("Failed to log analytics event:", error);
  }
};

// 5. Check if session has been logged, if not, log session_start
export const logSessionIfNeeded = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    const sessionKey = 'tramontina_session_logged_v1';
    if (!sessionStorage.getItem(sessionKey)) {
      await logAnalyticsEvent('session_start', 'Iniciou nova sessão do sistema');
      sessionStorage.setItem(sessionKey, 'true');
    }
  } catch (e) {
    console.error("Failed to track session:", e);
  }
};

// 6. Retrieve and aggregate all events
export const fetchAnalyticsStats = async (): Promise<AnalyticsStats> => {
  // 1. Start with local storage events as base
  let allEvents: AnalyticsEvent[] = [];
  try {
    const localEventsStr = localStorage.getItem('tramontina_analytics_events');
    if (localEventsStr) {
      allEvents = JSON.parse(localEventsStr);
    }
  } catch (e) {
    console.error("Error parsing local analytics events", e);
  }

  // 2. Fetch from Firestore if available, and merge
  const db = getAnalyticsDb();
  if (db) {
    try {
      const eventsCollection = collection(db, 'analytics_events');
      const snapshot = await getDocs(eventsCollection);
      const firestoreEvents: AnalyticsEvent[] = [];
      snapshot.forEach((document) => {
        firestoreEvents.push(document.data() as AnalyticsEvent);
      });

      if (firestoreEvents.length > 0) {
        // Merge without duplicates based on event ID
        const eventMap = new Map<string, AnalyticsEvent>();
        allEvents.forEach(evt => eventMap.set(evt.id, evt));
        firestoreEvents.forEach(evt => eventMap.set(evt.id, evt));
        allEvents = Array.from(eventMap.values());
      }
    } catch (e) {
      console.warn("Failed to fetch cloud analytics events, using local data:", e);
    }
  }

  // Sort events from newest to oldest
  allEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // 3. Aggregate stats
  let totalVisits = 0;
  const visitsByDay: Record<string, number> = {};
  const visitsByRegion: Record<string, number> = {};
  const visitsByCity: Record<string, number> = {};
  const mostUsedFeatures: Record<string, number> = {};
  const browsers: Record<string, number> = {};
  const osList: Record<string, number> = {};

  allEvents.forEach((evt) => {
    // Visits aggregation (session_start)
    if (evt.type === 'session_start') {
      totalVisits++;
      visitsByDay[evt.date] = (visitsByDay[evt.date] || 0) + 1;
    }

    // Always aggregate regions, cities, browsers, OS from all events for accurate reach
    if (evt.region) {
      const rName = evt.region_code ? `${evt.region} (${evt.region_code})` : evt.region;
      visitsByRegion[rName] = (visitsByRegion[rName] || 0) + 1;
    }
    if (evt.city) {
      const fullCity = evt.region_code ? `${evt.city} - ${evt.region_code}` : evt.city;
      visitsByCity[fullCity] = (visitsByCity[fullCity] || 0) + 1;
    }

    if (evt.browser) {
      browsers[evt.browser] = (browsers[evt.browser] || 0) + 1;
    }
    if (evt.os) {
      osList[evt.os] = (osList[evt.os] || 0) + 1;
    }

    // Features / Actions tracking
    if (evt.type !== 'session_start') {
      let fKey = 'Outra Ação';
      if (evt.type === 'tab_view') {
        fKey = `Visualizou Aba: ${evt.details || 'Desconhecida'}`;
      } else if (evt.type === 'data_import') {
        fKey = `Importou Planilha (${evt.details || 'dados'})`;
      } else if (evt.type === 'presentation_export') {
        fKey = `Exportou Relatório PPT/PDF`;
      } else if (evt.type === 'data_save') {
        fKey = `Salvou Dados no Banco`;
      } else if (evt.type === 'custom_name_save') {
        fKey = `Cadastrou Nomes Customizados`;
      } else if (evt.type === 'location_save') {
        fKey = `Mapeou Estados/Localizações`;
      }
      mostUsedFeatures[fKey] = (mostUsedFeatures[fKey] || 0) + 1;
    }
  });

  return {
    totalVisits: Math.max(totalVisits, Object.values(visitsByDay).reduce((a, b) => a + b, 0)),
    visitsByDay,
    visitsByRegion,
    visitsByCity,
    mostUsedFeatures,
    browsers,
    osList,
    recentEvents: allEvents.slice(0, 25) // show 25 most recent events
  };
};
