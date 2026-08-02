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

// Physical Quotas Storage Keys & Helpers
const PHYSICAL_PERIODS_INDEX_KEY = 'tramontina_physical_periods_index';
const PHYSICAL_PERIOD_DATA_PREFIX = 'tramontina_physical_period_';

export const getLocalPhysicalQuotaPeriodsIndex = (): PeriodInfo[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PHYSICAL_PERIODS_INDEX_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading physical quota index from localStorage", e);
  }

  return [];
};

export const saveLocalPhysicalQuotaPeriod = (year: number, month: number, records: import('../types').PhysicalQuotaRecord[]): void => {
  if (typeof window === 'undefined') return;
  const periodId = `${year}-${String(month).padStart(2, '0')}`;
  const periodKey = `${PHYSICAL_PERIOD_DATA_PREFIX}${year}_${month}`;

  try {
    localStorage.setItem(periodKey, JSON.stringify(records));
    const index = getLocalPhysicalQuotaPeriodsIndex();
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

    localStorage.setItem(PHYSICAL_PERIODS_INDEX_KEY, JSON.stringify(filteredIndex));
  } catch (e) {
    console.error("Error saving physical quota period to localStorage", e);
  }
};

export const getLocalPhysicalQuotaPeriodData = (year: number, month: number): import('../types').PhysicalQuotaRecord[] => {
  if (typeof window === 'undefined') return [];
  const periodKey = `${PHYSICAL_PERIOD_DATA_PREFIX}${year}_${month}`;

  try {
    const stored = localStorage.getItem(periodKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading physical quota data from localStorage", e);
  }

  return [];
};

export const deleteLocalPhysicalQuotaPeriod = (year: number, month: number): void => {
  if (typeof window === 'undefined') return;
  const periodId = `${year}-${String(month).padStart(2, '0')}`;
  const periodKey = `${PHYSICAL_PERIOD_DATA_PREFIX}${year}_${month}`;

  try {
    localStorage.removeItem(periodKey);
    const index = getLocalPhysicalQuotaPeriodsIndex();
    const updatedIndex = index.filter(p => p.id !== periodId);
    localStorage.setItem(PHYSICAL_PERIODS_INDEX_KEY, JSON.stringify(updatedIndex));
  } catch (e) {
    console.error("Error deleting physical quota period from localStorage", e);
  }
};

