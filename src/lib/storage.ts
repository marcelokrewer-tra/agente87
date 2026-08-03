import { SalesRecord } from '../types';
import { parseTSV, INITIAL_RAW_DATA, generateDefaultSalesForPeriod, generateDefaultPhysicalQuotas } from '../rawData';

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

// Generate default list of available sales periods (2025-01..12, 2026-01..06)
const getDefaultPeriodsList = (): PeriodInfo[] => {
  const list: PeriodInfo[] = [];
  const baseCount = parseTSV(INITIAL_RAW_DATA).length;
  // 2026: months 1..6
  for (let m = 6; m >= 1; m--) {
    const id = `2026-${String(m).padStart(2, '0')}`;
    list.push({ id, year: 2026, month: m, recordsCount: baseCount, updatedAt: new Date().toISOString() });
  }
  // 2025: months 1..12
  for (let m = 12; m >= 1; m--) {
    const id = `2025-${String(m).padStart(2, '0')}`;
    list.push({ id, year: 2025, month: m, recordsCount: baseCount, updatedAt: new Date().toISOString() });
  }
  return list;
};

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

  // Initialize with default historical periods (2025 and 2026)
  const defaultIndex = getDefaultPeriodsList();
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
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading period data from localStorage", e);
  }

  // Fallback seed ONLY for initial period June 2026 (2026-06)
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

const getDefaultPhysicalQuotaPeriodsList = (): PeriodInfo[] => {
  const list: PeriodInfo[] = [];
  const repCount = 28;
  for (let m = 6; m >= 1; m--) {
    list.push({ id: `2026-${String(m).padStart(2, '0')}`, year: 2026, month: m, recordsCount: repCount, updatedAt: new Date().toISOString() });
  }
  for (let m = 12; m >= 1; m--) {
    list.push({ id: `2025-${String(m).padStart(2, '0')}`, year: 2025, month: m, recordsCount: repCount, updatedAt: new Date().toISOString() });
  }
  return list;
};

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

  const defaultList = getDefaultPhysicalQuotaPeriodsList();
  try {
    localStorage.setItem(PHYSICAL_PERIODS_INDEX_KEY, JSON.stringify(defaultList));
  } catch (e) {}
  return defaultList;
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

  const defaultQuotas = generateDefaultPhysicalQuotas(year, month);
  if (defaultQuotas && defaultQuotas.length > 0) {
    try {
      localStorage.setItem(periodKey, JSON.stringify(defaultQuotas));
    } catch (e) {}
    return defaultQuotas;
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

