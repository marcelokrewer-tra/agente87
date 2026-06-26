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

  // If empty, initialize with default period (June 2026) so they see data on Vercel immediately!
  const defaultIndex: PeriodInfo[] = [
    { id: '2026-06', year: 2026, month: 6, recordsCount: parseTSV(INITIAL_RAW_DATA).length, updatedAt: new Date().toISOString() }
  ];
  try {
    localStorage.setItem(PERIODS_INDEX_KEY, JSON.stringify(defaultIndex));
    // Also save default period records
    const defaultRecords = parseTSV(INITIAL_RAW_DATA);
    localStorage.setItem(`${PERIOD_DATA_PREFIX}2026_6`, JSON.stringify(defaultRecords));
  } catch (e) {
    console.error("Error saving default period to localStorage", e);
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

  // Fallback for default period if not found
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
