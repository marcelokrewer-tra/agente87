import { SalesRecord } from '../types';
import { parseTSV, INITIAL_RAW_DATA } from '../rawData';

export interface PeriodInfo {
  id: string;
  year: number;
  month: number;
  recordsCount: number;
  updatedAt?: string;
}

// Key constants
const PERIODS_INDEX_KEY = 'tramontina_periods_index';
const PERIOD_DATA_PREFIX = 'tramontina_period_';

export const getLocalPeriodsIndex = (): PeriodInfo[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PERIODS_INDEX_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading periods index from localStorage", e);
  }

  // Initialize with default initial active period (June 2026)
  const defaultIndex: PeriodInfo[] = [
    { id: '2026-06', year: 2026, month: 6, recordsCount: parseTSV(INITIAL_RAW_DATA).length, updatedAt: new Date().toISOString() },
  ];
  try {
    localStorage.setItem(PERIODS_INDEX_KEY, JSON.stringify(defaultIndex));
  } catch (e) {
    console.error("Error saving default periods index to localStorage", e);
  }
  return defaultIndex;
};

export const saveLocalPeriod = (year: number, month: number, records: SalesRecord[]): void => {
  if (typeof window === 'undefined') return;
  const periodId = `${year}-${String(month).padStart(2, '0')}`;
  const periodKey = `${PERIOD_DATA_PREFIX}${year}_${month}`;

  try {
    localStorage.setItem(periodKey, JSON.stringify(records));
    
    // Update the index
    const index = getLocalPeriodsIndex();
    const filteredIndex = index.filter(p => p.id !== periodId);
    
    if (records.length > 0) {
      filteredIndex.push({
        id: periodId,
        year,
        month,
        recordsCount: records.length,
        updatedAt: new Date().toISOString()
      });
    }
    
    localStorage.setItem(PERIODS_INDEX_KEY, JSON.stringify(filteredIndex));
  } catch (e) {
    console.error("Error saving period to localStorage", e);
  }
};

export const getLocalPeriodData = (year: number, month: number): SalesRecord[] => {
  if (typeof window === 'undefined') return [];
  const periodKey = `${PERIOD_DATA_PREFIX}${year}_${month}`;

  try {
    const stored = localStorage.getItem(periodKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading period data from localStorage", e);
  }

  // Fallback for default seed period (June 2026)
  if (year === 2026 && month === 6) {
    const defaultRecords = parseTSV(INITIAL_RAW_DATA);
    try {
      localStorage.setItem(periodKey, JSON.stringify(defaultRecords));
    } catch (e) {}
    return defaultRecords;
  }

  return [];
};

export const deleteLocalPeriod = (year: number, month: number): void => {
  if (typeof window === 'undefined') return;
  const periodId = `${year}-${String(month).padStart(2, '0')}`;
  const periodKey = `${PERIOD_DATA_PREFIX}${year}_${month}`;

  try {
    localStorage.removeItem(periodKey);
    
    const index = getLocalPeriodsIndex();
    const updatedIndex = index.filter(p => p.id !== periodId);
    localStorage.setItem(PERIODS_INDEX_KEY, JSON.stringify(updatedIndex));
  } catch (e) {
    console.error("Error deleting period from localStorage", e);
  }
};

// ==================== DAILY SALES LOCAL STORAGE ====================
const DAILY_INDEX_KEY = 'tramontina_daily_sales_index';
const DAILY_DATA_PREFIX = 'tramontina_daily_';

export interface DailySnapshotInfo {
  id: string; // "YYYY-MM-DD"
  year: number;
  month: number;
  day: number;
  recordsCount: number;
  updatedAt?: string;
}

export const getLocalDailySalesIndex = (): DailySnapshotInfo[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(DAILY_INDEX_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading daily sales index from localStorage", e);
  }
  return [];
};

export const saveLocalDailySales = (year: number, month: number, day: number, records: SalesRecord[]): void => {
  if (typeof window === 'undefined') return;
  const dayId = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayKey = `${DAILY_DATA_PREFIX}${year}_${month}_${day}`;

  try {
    localStorage.setItem(dayKey, JSON.stringify(records));
    
    // Update the index
    const index = getLocalDailySalesIndex();
    const filteredIndex = index.filter(d => d.id !== dayId);
    
    if (records.length > 0) {
      filteredIndex.push({
        id: dayId,
        year,
        month,
        day,
        recordsCount: records.length,
        updatedAt: new Date().toISOString()
      });
    }
    
    // Sort descending
    filteredIndex.sort((a, b) => b.id.localeCompare(a.id));
    localStorage.setItem(DAILY_INDEX_KEY, JSON.stringify(filteredIndex));
  } catch (e) {
    console.error("Error saving daily sales to localStorage", e);
  }
};

export const getLocalDailySalesData = (year: number, month: number, day: number): SalesRecord[] => {
  if (typeof window === 'undefined') return [];
  const dayKey = `${DAILY_DATA_PREFIX}${year}_${month}_${day}`;

  try {
    const stored = localStorage.getItem(dayKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading daily sales data from localStorage", e);
  }
  return [];
};

export const deleteLocalDailySales = (year: number, month: number, day: number): void => {
  if (typeof window === 'undefined') return;
  const dayId = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayKey = `${DAILY_DATA_PREFIX}${year}_${month}_${day}`;

  try {
    localStorage.removeItem(dayKey);
    
    const index = getLocalDailySalesIndex();
    const updatedIndex = index.filter(d => d.id !== dayId);
    localStorage.setItem(DAILY_INDEX_KEY, JSON.stringify(updatedIndex));
  } catch (e) {
    console.error("Error deleting daily sales from localStorage", e);
  }
};

