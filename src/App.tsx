import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { 
  INITIAL_RAW_DATA, 
  parseTSV 
} from './rawData';
import { 
  SalesRecord,
  getMappedGroupName,
  getBrasiliaDate
 } from './types';
import {
  getLocalPeriodsIndex,
  saveLocalPeriod,
  getLocalPeriodData,
  deleteLocalPeriod
} from './lib/storage';
import {
  getFirebaseConfig,
  fetchPeriodsFromFirestore,
  fetchPeriodDataFromFirestore,
  fetchPreviewsFromFirestore,
  savePreviewsToFirestore,
  getLocalPreviews,
  saveLocalPreviews,
  RepresentativePreview,
  fetchRepNamesFromFirestore,
  saveRepNamesToFirestore,
  getLocalRepNames,
  saveLocalRepNames,
  fetchRepLocationsFromFirestore,
  saveRepLocationsToFirestore,
  getLocalRepLocations,
  saveLocalRepLocations,
  fetchPreviewsWithMetaFromFirestore,
  getLocalPreviewsWithMeta,
  PreviewsWithMeta
} from './lib/firebase';
import { CustomMapBrazil } from './components/CustomMapBrazil';
import { BRAZIL_STATES } from './components/BrazilPaths';
import { FirebaseSetupModal } from './components/FirebaseSetupModal';
import { MetricCard } from './components/MetricCard';
import { KPIGauge } from './components/KPIGauge';
import { ImportDataTab } from './components/ImportDataTab';
import { DailySalesTab } from './components/DailySalesTab';
import { SellOutTab } from './components/SellOutTab';
import { PresentationTab } from './components/PresentationTab';
import { UserManagementTab, SystemUser, DEFAULT_USERS } from './components/UserManagementTab';
import { TramontinaLogo } from './components/TramontinaLogo';
import { generateSalesPresentation } from './presentation';
import { logAnalyticsEvent, logSessionIfNeeded } from './lib/analytics';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Target, 
  DollarSign, 
  Search, 
  Award, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3, 
  FileText, 
  X, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Download, 
  LayoutDashboard, 
  User, 
  UserCog,
  Filter, 
  ArrowUpDown, 
  PlusSquare, 
  Info,
  Building,
  Layers,
  LineChart,
  Grid,
  SlidersHorizontal,
  FileSpreadsheet,
  Calendar,
  CalendarDays,
  Database,
  RefreshCw,
  Sparkles,
  Lock,
  Trash2,
  Plus,
  UploadCloud,
  Check,
  Percent,
  Scale,
  ShoppingBag,
  Map as MapIcon,
  MapPin,
  Clock,
  Presentation,
  History,
  LogOut
} from 'lucide-react';

export const parseBrazilianNumber = (val: string | undefined): number => {
  if (!val) return 0;
  let cleaned = val.trim().replace(/\s/g, '').replace('R$', '');
  if (cleaned === "" || cleaned === "-" || cleaned === "Sem Grupo") return 0;

  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Both separators, e.g., 2.000.000,50
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Only comma, e.g., 19,90
    cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes('.')) {
    // Only dots, e.g., 2.000.000 or 19.90
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      if (/\.\d{3}$/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export const formatPreviewsDate = (isoString: string | null | undefined): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch (e) {
    return '';
  }
};

export default function App() {
  // System Users state loaded from localStorage or DEFAULT_USERS
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(() => {
    try {
      const saved = localStorage.getItem('kpi_system_users_v2');
      if (saved) {
        const parsed: SystemUser[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map(u => u.id));
        const missingDefaults = DEFAULT_USERS.filter(u => !existingIds.has(u.id));
        if (missingDefaults.length > 0) {
          const merged = [...parsed, ...missingDefaults];
          localStorage.setItem('kpi_system_users_v2', JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading saved users:', e);
    }
    return DEFAULT_USERS;
  });

  const handleUpdateSystemUsers = (updated: SystemUser[]) => {
    setSystemUsers(updated);
    try {
      localStorage.setItem('kpi_system_users_v2', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving users to storage:', e);
    }
  };

  // Authentication & Role states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('kpi_authenticated') === 'true';
  });
  const [userRole, setUserRole] = useState<'admin' | 'rep'>(() => {
    return (localStorage.getItem('kpi_user_role') as 'admin' | 'rep') || 'admin';
  });
  const [userRepId, setUserRepId] = useState<number | null>(() => {
    const saved = localStorage.getItem('kpi_user_rep_id');
    return saved ? Number(saved) : null;
  });
  const [userRepName, setUserRepName] = useState<string | null>(() => {
    return localStorage.getItem('kpi_user_rep_name') || null;
  });
  const [userAdminName, setUserAdminName] = useState<string | null>(() => {
    return localStorage.getItem('kpi_user_admin_name') || null;
  });
  const [userAdminTitle, setUserAdminTitle] = useState<string | null>(() => {
    return localStorage.getItem('kpi_user_admin_title') || null;
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = passwordInput.trim();

    const matchedUser = systemUsers.find(u => u.password === cleanPass);

    if (matchedUser) {
      if (matchedUser.isBlocked) {
        setAuthError(`Acesso bloqueado para o usuário ${matchedUser.name}. Entre em contato com o administrador.`);
        return;
      }

      // Record last login
      const updatedUsers = systemUsers.map(u => 
        u.id === matchedUser.id 
          ? { ...u, lastLogin: new Date().toISOString() } 
          : u
      );
      handleUpdateSystemUsers(updatedUsers);

      setIsAuthenticated(true);
      setUserRole(matchedUser.role);

      if (matchedUser.role === 'admin') {
        setUserRepId(null);
        setUserRepName(null);
        setUserAdminName(matchedUser.name);
        setUserAdminTitle(matchedUser.title);
        localStorage.setItem('kpi_authenticated', 'true');
        localStorage.setItem('kpi_user_role', 'admin');
        localStorage.setItem('kpi_user_admin_name', matchedUser.name);
        localStorage.setItem('kpi_user_admin_title', matchedUser.title);
        localStorage.removeItem('kpi_user_rep_id');
        localStorage.removeItem('kpi_user_rep_name');
      } else {
        const repId = matchedUser.repId || 437;
        setUserRepId(repId);
        setUserRepName(matchedUser.name);
        setUserAdminName(null);
        setUserAdminTitle(null);
        setSelectedRepIdFilter(repId);
        localStorage.setItem('kpi_authenticated', 'true');
        localStorage.setItem('kpi_user_role', 'rep');
        localStorage.setItem('kpi_user_rep_id', String(repId));
        localStorage.setItem('kpi_user_rep_name', matchedUser.name);
        localStorage.removeItem('kpi_user_admin_name');
        localStorage.removeItem('kpi_user_admin_title');
      }
      setAuthError('');
    } else {
      setAuthError('Senha incorreta.');
    }
  };

  const handleLogoff = () => {
    setIsAuthenticated(false);
    setUserRole('admin');
    setUserRepId(null);
    setUserRepName(null);
    setUserAdminName(null);
    setUserAdminTitle(null);
    setPasswordInput('');
    setAuthError('');
    localStorage.removeItem('kpi_authenticated');
    localStorage.removeItem('kpi_user_role');
    localStorage.removeItem('kpi_user_rep_id');
    localStorage.removeItem('kpi_user_rep_name');
    localStorage.removeItem('kpi_user_admin_name');
    localStorage.removeItem('kpi_user_admin_title');
  };

  // Global parsed Sales Records
  const [allRecords, setAllRecords] = useState<SalesRecord[]>([]);

  // Custom Representative Names Mapping State
  const [customRepNames, setCustomRepNames] = useState<Record<string, string>>(() => {
    return getLocalRepNames();
  });

  // Custom Representative Locations Mapping State
  const [customRepLocations, setCustomRepLocations] = useState<Record<string, string>>(() => {
    return getLocalRepLocations();
  });

  // Selected state on the Brazil map
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const bDate = getBrasiliaDate();
  const currentBYear = bDate.getFullYear();
  const currentBMonth = bDate.getMonth() + 1;

  // Month-to-month and server-side memory states
  const [selectedYear, setSelectedYear] = useState<number>(currentBYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentBMonth);
  const [isAccumulated, setIsAccumulated] = useState<boolean>(false);
  const [accumulateStartMonth, setAccumulateStartMonth] = useState<number>(1);
  const [accumulateEndMonth, setAccumulateEndMonth] = useState<number>(currentBMonth);

  const [tempYear, setTempYear] = useState<number>(currentBYear);
  const [tempMonth, setTempMonth] = useState<number>(currentBMonth);
  const [tempIsAccumulated, setTempIsAccumulated] = useState<boolean>(false);
  const [tempAccumulateStartMonth, setTempAccumulateStartMonth] = useState<number>(1);
  const [tempAccumulateEndMonth, setTempAccumulateEndMonth] = useState<number>(currentBMonth);
  const [availablePeriods, setAvailablePeriods] = useState<Array<{ id: string; year: number; month: number; recordsCount: number; updatedAt?: string }>>([]);
  const [isLoadingPeriod, setIsLoadingPeriod] = useState<boolean>(false);
  const [periodFetchError, setPeriodFetchError] = useState<string | null>(null);
  const [usingLocalStorageFallback, setUsingLocalStorageFallback] = useState<boolean>(false);
  const [hasSetInitialPeriod, setHasSetInitialPeriod] = useState<boolean>(false);

  // Helper to determine last update of current period (range-aware)
  const currentPeriodUpdateDate = useMemo(() => {
    const monthsToCheck = isAccumulated 
      ? Array.from({ length: Math.abs(accumulateEndMonth - accumulateStartMonth) + 1 }, (_, i) => Math.min(accumulateStartMonth, accumulateEndMonth) + i)
      : [selectedMonth];

    let latestDate: Date | null = null;
    monthsToCheck.forEach(m => {
      const periodId = `${selectedYear}-${String(m).padStart(2, '0')}`;
      const found = availablePeriods.find(p => p.id === periodId);
      if (found && found.updatedAt) {
        const date = new Date(found.updatedAt);
        if (!latestDate || date > latestDate) {
          latestDate = date;
        }
      }
    });
    return latestDate;
  }, [selectedYear, selectedMonth, isAccumulated, accumulateStartMonth, accumulateEndMonth, availablePeriods]);

  const formatUpdateDateTime = (dateStrOrDate: string | Date | undefined | null) => {
    if (!dateStrOrDate) return 'Sem atualizações registradas';
    const date = typeof dateStrOrDate === 'string' ? new Date(dateStrOrDate) : dateStrOrDate;
    if (isNaN(date.getTime())) return 'Sem atualizações registradas';
    
    // Format to Portuguese DD/MM/YYYY às HH:MM
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} às ${hours}:${minutes}h`;
  };

  const formatUpdateDateTimeCompact = (dateStrOrDate: string | Date | undefined | null) => {
    if (!dateStrOrDate) return 'Sem atualizações';
    const date = typeof dateStrOrDate === 'string' ? new Date(dateStrOrDate) : dateStrOrDate;
    if (isNaN(date.getTime())) return 'Sem atualizações';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month} às ${hours}:${minutes}`;
  };

  const getLatestPeriod = () => {
    const brasiliaDate = getBrasiliaDate();
    return { year: brasiliaDate.getFullYear(), month: brasiliaDate.getMonth() + 1 };
  };

  const selectLatestPeriod = (periods: Array<{ year: number; month: number }>) => {
    if (periods.length > 0 && !hasSetInitialPeriod) {
      const bDate = getBrasiliaDate();
      const currentYear = bDate.getFullYear();
      const currentMonth = bDate.getMonth() + 1;

      // Find if we have an exact match for the current month and year
      const currentPeriod = periods.find(p => p.year === currentYear && p.month === currentMonth);

      let targetPeriod;
      if (currentPeriod) {
        targetPeriod = currentPeriod;
      } else {
        // Find periods that are less than or equal to current month & year (past or present)
        const pastOrPresentPeriods = periods.filter(p => {
          if (p.year < currentYear) return true;
          if (p.year === currentYear && p.month <= currentMonth) return true;
          return false;
        });

        if (pastOrPresentPeriods.length > 0) {
          // Sort descending to get the latest past/present period
          const sorted = [...pastOrPresentPeriods].sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
          });
          targetPeriod = sorted[0];
        } else {
          // If only future periods exist, sort ascending to get the closest future period
          const sorted = [...periods].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
          });
          targetPeriod = sorted[0];
        }
      }

      setSelectedYear(targetPeriod.year);
      setSelectedMonth(targetPeriod.month);
      setTempYear(targetPeriod.year);
      setTempMonth(targetPeriod.month);
      setHasSetInitialPeriod(true);
    }
  };

  const isUpToFifthDay = useMemo(() => {
    const bDate = getBrasiliaDate();
    return bDate.getDate() <= 5;
  }, []);

  const handleShowPreviousMonthData = () => {
    setIsAccumulated(false);
    setTempIsAccumulated(false);
    const bDate = getBrasiliaDate();
    const currentYear = bDate.getFullYear();
    const currentMonth = bDate.getMonth() + 1;

    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = currentYear - 1;
    }

    const exactPrev = availablePeriods.find(p => p.year === prevYear && p.month === prevMonth);
    if (exactPrev) {
      setSelectedYear(exactPrev.year);
      setSelectedMonth(exactPrev.month);
      setTempYear(exactPrev.year);
      setTempMonth(exactPrev.month);
    } else {
      const priorPeriods = availablePeriods
        .filter(p => p.year < currentYear || (p.year === currentYear && p.month < currentMonth))
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return b.month - a.month;
        });

      if (priorPeriods.length > 0) {
        setSelectedYear(priorPeriods[0].year);
        setSelectedMonth(priorPeriods[0].month);
        setTempYear(priorPeriods[0].year);
        setTempMonth(priorPeriods[0].month);
      } else {
        setSelectedYear(prevYear);
        setSelectedMonth(prevMonth);
        setTempYear(prevYear);
        setTempMonth(prevMonth);
      }
    }
    setIsMobileFiltersExpanded(false);
  };

  const handleShowCurrentData = () => {
    setIsAccumulated(false);
    setTempIsAccumulated(false);
    const latest = getLatestPeriod();
    setSelectedYear(latest.year);
    setSelectedMonth(latest.month);
    setTempYear(latest.year);
    setTempMonth(latest.month);
    setIsMobileFiltersExpanded(false);
  };

  const handleApplyPeriodFilter = () => {
    setSelectedYear(tempYear);
    setSelectedMonth(tempMonth);
    setIsAccumulated(tempIsAccumulated);
    setAccumulateStartMonth(tempAccumulateStartMonth);
    setAccumulateEndMonth(tempAccumulateEndMonth);
    setIsMobileFiltersExpanded(false);
  };

  const isDisplayingCurrentData = useMemo(() => {
    const latest = getLatestPeriod();
    return selectedYear === latest.year && selectedMonth === latest.month;
  }, [selectedYear, selectedMonth, availablePeriods]);

  const downloadPreviousPeriodPreview = async (year: number, month: number) => {
    let prevs: RepresentativePreview[] = [];
    if (getFirebaseConfig()) {
      try {
        prevs = await fetchPreviewsFromFirestore(year, month);
      } catch (err) {
        console.error("Error loading previous previews from Firestore:", err);
      }
    }
    if (!prevs || prevs.length === 0) {
      prevs = getLocalPreviews(year, month);
    }

    if (prevs.length === 0) {
      alert(`Nenhuma expectativa de prévia encontrada salva para o período de ${month}/${year}.`);
      return;
    }

    // Generate CSV
    const headers = ['ID Representante', 'Vendas no Dia da Prévia', 'Expectativa (Prévia)'];
    const csvRows = [
      headers.join(';'),
      ...prevs.map(p => [
        p.repId,
        p.vendaDiaPrevia.toString().replace('.', ','),
        p.previaValue.toString().replace('.', ',')
      ].join(';'))
    ];

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Previa_Vendas_Tramontina_${year}_${String(month).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Firebase integration states
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);

  // Presentation date range filter modal states
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState<boolean>(false);
  const [presStartMonth, setPresStartMonth] = useState<number>(1);
  const [presEndMonth, setPresEndMonth] = useState<number>(selectedMonth);
  const [presentationProgressText, setPresentationProgressText] = useState<string>('');

  // Mobile filters expansion state
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState<boolean>(false);

  // Cloud active password protection states
  const [isCloudPasswordModalOpen, setIsCloudPasswordModalOpen] = useState<boolean>(false);
  const [cloudPasswordInput, setCloudPasswordInput] = useState<string>('');
  const [cloudPasswordError, setCloudPasswordError] = useState<string>('');

  const handleCloudButtonClick = () => {
    setCloudPasswordInput('');
    setCloudPasswordError('');
    setIsCloudPasswordModalOpen(true);
  };

  const handleCloudPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cloudPasswordInput === 'mak.0708') {
      setIsCloudPasswordModalOpen(false);
      setIsFirebaseModalOpen(true);
      setCloudPasswordInput('');
      setCloudPasswordError('');
    } else {
      setCloudPasswordError('Senha incorreta.');
    }
  };

  const checkFirebaseStatus = () => {
    setIsFirebaseConnected(getFirebaseConfig() !== null);
  };

  const fetchAvailablePeriods = async () => {
    let periods: Array<{ id: string; year: number; month: number; recordsCount: number }> = [];
    // 1. Prioritize Firebase Firestore if configured
    if (getFirebaseConfig()) {
      try {
        setIsLoadingPeriod(true);
        const data = await fetchPeriodsFromFirestore();
        setAvailablePeriods(data);
        periods = data;
        setUsingLocalStorageFallback(false);
      } catch (err) {
        console.error("Error fetching periods from Firestore, retrying local:", err);
      } finally {
        setIsLoadingPeriod(false);
      }
    }

    if (periods.length === 0) {
      // 2. Fallback to Express backend or LocalStorage
      try {
        const response = await fetch('/api/monthly-data');
        if (response.ok) {
          const data = await response.json();
          setAvailablePeriods(data);
          periods = data;
          setUsingLocalStorageFallback(false);
        } else {
          setUsingLocalStorageFallback(true);
          const data = getLocalPeriodsIndex();
          setAvailablePeriods(data);
          periods = data;
        }
      } catch (err) {
        console.warn("API unavailable, using localStorage:", err);
        setUsingLocalStorageFallback(true);
        const data = getLocalPeriodsIndex();
        setAvailablePeriods(data);
        periods = data;
      }
    }

    if (periods.length > 0) {
      selectLatestPeriod(periods);
    }
  };

  const fetchPreviewsData = async (year: number, months: number[]) => {
    let allPreviews: RepresentativePreview[] = [];
    let latestUpdatedAt: string | null = null;

    for (const m of months) {
      let monthPreviews: RepresentativePreview[] = [];
      let updatedAtStr: string | null = null;
      
      if (getFirebaseConfig()) {
        try {
          const data = await fetchPreviewsWithMetaFromFirestore(year, m);
          monthPreviews = data.previews;
          updatedAtStr = data.updatedAt || null;
        } catch (err) {
          console.error(`Firestore error loading previews for month ${m}, trying local fallback:`, err);
          const localData = getLocalPreviewsWithMeta(year, m);
          monthPreviews = localData.previews;
          updatedAtStr = localData.updatedAt || null;
        }
      } else {
        const localData = getLocalPreviewsWithMeta(year, m);
        monthPreviews = localData.previews;
        updatedAtStr = localData.updatedAt || null;
      }

      if (updatedAtStr) {
        if (!latestUpdatedAt || new Date(updatedAtStr) > new Date(latestUpdatedAt)) {
          latestUpdatedAt = updatedAtStr;
        }
      }

      // Aggregate previews
      monthPreviews.forEach(item => {
        const existing = allPreviews.find(p => p.repId.toString().trim() === item.repId.toString().trim());
        if (existing) {
          existing.previaValue += item.previaValue;
          existing.vendaDiaPrevia += item.vendaDiaPrevia;
        } else {
          allPreviews.push({
            repId: item.repId,
            previaValue: item.previaValue,
            vendaDiaPrevia: item.vendaDiaPrevia
          });
        }
      });
    }

    setPreviews(allPreviews);
    setPreviewsUpdatedAt(latestUpdatedAt);
  };

  const fetchPeriodData = async (year: number, month: number) => {
    setIsLoadingPeriod(true);
    setPeriodFetchError(null);

    const monthsToFetch: number[] = [];
    if (isAccumulated) {
      const start = Math.min(accumulateStartMonth, accumulateEndMonth);
      const end = Math.max(accumulateStartMonth, accumulateEndMonth);
      for (let m = start; m <= end; m++) {
        monthsToFetch.push(m);
      }
    } else {
      monthsToFetch.push(month);
    }
    
    // Load previews for these months
    fetchPreviewsData(year, monthsToFetch);

    // 1. Prioritize Firebase Firestore if configured
    if (getFirebaseConfig()) {
      try {
        const promises = monthsToFetch.map(m => fetchPeriodDataFromFirestore(year, m));
        const results = await Promise.all(promises);
        const combined = results.flat();
        setAllRecords(combined);
        setUsingLocalStorageFallback(false);
      } catch (err: any) {
        console.error("Firestore error loading period records:", err);
        setPeriodFetchError(`Erro Firestore: ${err.message || 'Verifique as regras do banco de dados.'}`);
        setAllRecords([]);
      } finally {
        setIsLoadingPeriod(false);
      }
      return;
    }

    // 2. Fallback to Express backend or LocalStorage
    try {
      const results = await Promise.all(monthsToFetch.map(async (m) => {
        try {
          const response = await fetch(`/api/monthly-data/${year}/${m}`);
          if (response.ok) {
            const data = await response.json();
            return data.records || [];
          }
        } catch (err) {
          console.warn(`Error fetching monthly data for ${year}/${m}, trying localStorage fallback`, err);
        }
        return getLocalPeriodData(year, m);
      }));
      const combined = results.flat();
      setAllRecords(combined);
      setUsingLocalStorageFallback(false);
    } catch (err: any) {
      console.warn("Error fetching period data, using localStorage fallback:", err);
      setUsingLocalStorageFallback(true);
      const combined = monthsToFetch.flatMap(m => getLocalPeriodData(year, m));
      setAllRecords(combined);
    } finally {
      setIsLoadingPeriod(false);
    }
  };

  const [prevYearRecords, setPrevYearRecords] = useState<SalesRecord[]>([]);
  const [isLoadingPrevYear, setIsLoadingPrevYear] = useState<boolean>(false);

  const fetchPrevYearPeriodData = async (currentYear: number, month: number) => {
    const prevYear = currentYear - 1;
    setIsLoadingPrevYear(true);

    const monthsToFetch: number[] = [];
    if (isAccumulated) {
      const start = Math.min(accumulateStartMonth, accumulateEndMonth);
      const end = Math.max(accumulateStartMonth, accumulateEndMonth);
      for (let m = start; m <= end; m++) {
        monthsToFetch.push(m);
      }
    } else {
      monthsToFetch.push(month);
    }

    if (getFirebaseConfig()) {
      try {
        const promises = monthsToFetch.map(m => fetchPeriodDataFromFirestore(prevYear, m));
        const results = await Promise.all(promises);
        setPrevYearRecords(results.flat());
      } catch (err: any) {
        console.error("Firestore error loading prev year period records:", err);
        setPrevYearRecords([]);
      } finally {
        setIsLoadingPrevYear(false);
      }
      return;
    }

    try {
      const results = await Promise.all(monthsToFetch.map(async (m) => {
        try {
          const response = await fetch(`/api/monthly-data/${prevYear}/${m}`);
          if (response.ok) {
            const data = await response.json();
            return data.records || [];
          }
        } catch (err) {
          // fallback silently
        }
        return getLocalPeriodData(prevYear, m);
      }));
      setPrevYearRecords(results.flat());
    } catch (err) {
      console.warn("Error fetching prev year period data, using localStorage fallback:", err);
      const combined = monthsToFetch.flatMap(m => getLocalPeriodData(prevYear, m));
      setPrevYearRecords(combined);
    } finally {
      setIsLoadingPrevYear(false);
    }
  };

  // Check Firebase on mount and load available periods
  useEffect(() => {
    checkFirebaseStatus();
    fetchAvailablePeriods();
    logSessionIfNeeded();
  }, []);

  // Re-fetch when Firebase status shifts or active period shifts
  useEffect(() => {
    fetchAvailablePeriods();
    fetchPeriodData(selectedYear, selectedMonth);
    fetchPrevYearPeriodData(selectedYear, selectedMonth);
    
    // Fetch custom representative names from Firestore
    const fetchNames = async () => {
      if (getFirebaseConfig()) {
        try {
          const names = await fetchRepNamesFromFirestore();
          if (names && Object.keys(names).length > 0) {
            setCustomRepNames(names);
            saveLocalRepNames(names);
          }
        } catch (err) {
          console.error("Error loading representative names from Firestore:", err);
        }
      }
    };

    // Fetch custom representative locations from Firestore
    const fetchLocations = async () => {
      if (getFirebaseConfig()) {
        try {
          const locations = await fetchRepLocationsFromFirestore();
          if (locations && Object.keys(locations).length > 0) {
            setCustomRepLocations(locations);
            saveLocalRepLocations(locations);
          }
        } catch (err) {
          console.error("Error loading representative locations from Firestore:", err);
        }
      }
    };

    fetchNames();
    fetchLocations();
  }, [isFirebaseConnected]);

  // Fetch period data when year, month or cumulative range changes
  useEffect(() => {
    fetchPeriodData(selectedYear, selectedMonth);
    fetchPrevYearPeriodData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, isAccumulated, accumulateStartMonth, accumulateEndMonth]);

  // Product Group mappings as requested by the user
  const PRODUCT_GROUP_MAPPING = {
    "Cut Geral Monet.": "Tramontina Cutelaria",
    "Garibaldi Master Mon": "Tramontina Master",
    "Garibaldi Pro Monet": "Tramontina Pro",
    "Sem Grupo": "Tramontina Multi"
  } as const;

  const ALLOWED_PRODUCT_GROUPS = [
    "Tramontina Pro",
    "Tramontina Master",
    "Tramontina Multi",
    "Tramontina Cutelaria"
  ] as const;
  
  // Dashboard Core Navigation Tabs
  const [activeTab, setActiveTab] = useState<'geral' | 'representantes' | 'comparativo' | 'vendas_dia' | 'sell_out' | 'detalhado' | 'apresentacao' | 'previa' | 'importar' | 'nomes' | 'vendas_estado' | 'localizacao' | 'usuarios'>('geral');
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [dailyPeriodTotals, setDailyPeriodTotals] = useState<any>(null);

  // States for growth comparison filtering and sorting
  const [growthSortField, setGrowthSortField] = useState<'taxaCrescimento' | 'diferencaVenda' | 'vendaAtual' | 'vendaAnterior' | 'repName'>('taxaCrescimento');
  const [growthSortDirection, setGrowthSortDirection] = useState<'asc' | 'desc'>('desc');
  const [growthFilter, setGrowthFilter] = useState<'all' | 'positive' | 'negative' | 'top10'>('all');

  // Log tab view analytics
  useEffect(() => {
    const tabNames: Record<string, string> = {
      geral: 'Panorama Geral',
      representantes: 'Análise de Representantes',
      comparativo: 'Comparativo YoY',
      vendas_dia: 'Vendas por Dia',
      sell_out: 'Análise Sell Out',
      detalhado: 'Explorador de Dados',
      apresentacao: 'Apresentação',
      previa: 'Configuração de Prévias',
      importar: 'Importação de Dados',
      nomes: 'Nomes de Representantes',
      vendas_estado: 'Vendas por Estado',
      localizacao: 'Localizações de Representantes',
      usuarios: 'Gerenciamento de Usuários'
    };
    logAnalyticsEvent('tab_view', tabNames[activeTab] || activeTab);
  }, [activeTab]);

  const [previews, setPreviews] = useState<RepresentativePreview[]>([]);
  const [previewsUpdatedAt, setPreviewsUpdatedAt] = useState<string | null>(null);
  const [isSavingPreviews, setIsSavingPreviews] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const handlePastePreviews = (text: string) => {
    const lines = text.split('\n');
    const newPreviews: RepresentativePreview[] = [];
    
    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(/\t|;|,(?!\d)/).map(p => p.trim());
      
      const lineLower = line.toLowerCase();
      if (
        lineLower.includes('nome do representante') ||
        lineLower.includes('nome do coordenador') ||
        lineLower.includes('código do representante') ||
        lineLower.includes('prévia ferramentas') ||
        lineLower.includes('prévia linha pro') ||
        lineLower.includes('prévia total') ||
        lineLower.includes('venda no dia da prévia') ||
        lineLower.includes('cód_representante') ||
        lineLower.includes('valor_expectativa') ||
        lineLower.includes('repid')
      ) {
        return;
      }
      
      if (parts.length >= 7) {
        // Col 0: Rep Name, Col 1: Coord Name, Col 2: Rep ID, Col 3: Ferramentas, Col 4: Linha Pro, Col 5: Total, Col 6: Venda Dia
        let repId = parts[2];
        if (!repId || !/^\d+$/.test(repId)) {
          const found = parts.find(p => /^\d+$/.test(p));
          if (found) repId = found;
        }
        
        const valFerramentas = parseBrazilianNumber(parts[3]) || 0;
        const valLinhaPro = parseBrazilianNumber(parts[4]) || 0;
        const valTotal = parseBrazilianNumber(parts[5]) || 0;
        const valVendaDia = parseBrazilianNumber(parts[6]) || 0;
        
        const previaValue = (valTotal > 0) ? valTotal : (valFerramentas + valLinhaPro);
        
        if (repId) {
          newPreviews.push({
            repId,
            previaValue,
            vendaDiaPrevia: valVendaDia
          });
        }
      } else if (parts.length === 6) {
        let repId = parts[2];
        let valFerramentas = 0;
        let valLinhaPro = 0;
        let valTotal = 0;
        let valVendaDia = 0;

        if (/^\d+$/.test(parts[2])) {
          repId = parts[2];
          valFerramentas = parseBrazilianNumber(parts[3]) || 0;
          valLinhaPro = parseBrazilianNumber(parts[4]) || 0;
          valVendaDia = parseBrazilianNumber(parts[5]) || 0;
        } else if (/^\d+$/.test(parts[1])) {
          repId = parts[1];
          valFerramentas = parseBrazilianNumber(parts[2]) || 0;
          valLinhaPro = parseBrazilianNumber(parts[3]) || 0;
          valTotal = parseBrazilianNumber(parts[4]) || 0;
          valVendaDia = parseBrazilianNumber(parts[5]) || 0;
        } else if (/^\d+$/.test(parts[0])) {
          repId = parts[0];
          valFerramentas = parseBrazilianNumber(parts[1]) || 0;
          valLinhaPro = parseBrazilianNumber(parts[2]) || 0;
          valTotal = parseBrazilianNumber(parts[3]) || 0;
          valVendaDia = parseBrazilianNumber(parts[4]) || 0;
        }

        const previaValue = (valTotal > 0) ? valTotal : (valFerramentas + valLinhaPro);
        if (repId) {
          newPreviews.push({
            repId,
            previaValue,
            vendaDiaPrevia: valVendaDia
          });
        }
      } else if (parts.length === 5) {
        let repId = parts[1];
        let valFerramentas = parseBrazilianNumber(parts[2]) || 0;
        let valLinhaPro = parseBrazilianNumber(parts[3]) || 0;
        let valVendaDia = parseBrazilianNumber(parts[4]) || 0;

        if (/^\d+$/.test(parts[0]) && !/^\d+$/.test(parts[1])) {
          repId = parts[0];
        } else if (!repId && parts[0]) {
          repId = parts[0];
        }

        if (repId) {
          newPreviews.push({
            repId,
            previaValue: valFerramentas + valLinhaPro,
            vendaDiaPrevia: valVendaDia
          });
        }
      } else if (parts.length === 4) {
        let repId = parts[0];
        if (!/^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
          repId = parts[1];
          const previaValue = parseBrazilianNumber(parts[2]) || 0;
          const vendaDiaPrevia = parseBrazilianNumber(parts[3]) || 0;
          newPreviews.push({ repId, previaValue, vendaDiaPrevia });
        } else {
          const valFerramentas = parseBrazilianNumber(parts[1]) || 0;
          const valLinhaPro = parseBrazilianNumber(parts[2]) || 0;
          const valVendaDia = parseBrazilianNumber(parts[3]) || 0;
          newPreviews.push({
            repId,
            previaValue: valFerramentas + valLinhaPro,
            vendaDiaPrevia: valVendaDia
          });
        }
      } else if (parts.length === 3) {
        const repId = parts[0];
        const previaValue = parseBrazilianNumber(parts[1]) || 0;
        const vendaDiaPrevia = parseBrazilianNumber(parts[2]) || 0;
        if (repId) {
          newPreviews.push({ repId, previaValue, vendaDiaPrevia });
        }
      } else if (parts.length === 2) {
        const repId = parts[0];
        const previaValue = parseBrazilianNumber(parts[1]) || 0;
        if (repId) {
          newPreviews.push({ repId, previaValue, vendaDiaPrevia: 0 });
        }
      }
    });
    
    if (newPreviews.length > 0) {
      setPreviews(prev => {
        const map = new Map<string, RepresentativePreview>();
        prev.forEach(p => map.set(p.repId, p));
        newPreviews.forEach(p => map.set(p.repId, p));
        return Array.from(map.values());
      });
      return true;
    }
    return false;
  };

  const handleExportPreviewExcelModel = () => {
    if (!repsAggregated || repsAggregated.length === 0) {
      alert('Nenhum representante encontrado no período selecionado.');
      return;
    }

    const excelRows = repsAggregated.map(rep => ({
      'Nome do Representante': rep.repName || '',
      'Nome do Coordenador': rep.coordName || '',
      'Código do Representante': rep.repId,
      'Prévia Ferramentas': '',
      'Prévia Linha Pro': '',
      'Prévia Total': '',
      'Venda no Dia da Prévia': rep.totalVendido || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    worksheet['!cols'] = [
      { wch: 38 },
      { wch: 30 },
      { wch: 24 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 26 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo de Prévia');

    const fileName = `Modelo_Previa_${selectedMonth}_${selectedYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    logAnalyticsEvent('excel_preview_export', `Modelo Excel baixado (${repsAggregated.length} reps)`);
  };

  const handlePasteRepNames = (text: string) => {
    const lines = text.split('\n');
    const newNames: Record<string, string> = {};
    let addedCount = 0;

    lines.forEach(line => {
      if (!line.trim()) return;
      
      // Split by tab, semicolon, pipe
      let parts = line.split(/\t|;|\|/);
      
      // Fallback: if split yielded only 1 part, check for "code - name" or "code name"
      if (parts.length < 2) {
        const hyphenMatch = line.match(/^(\d+)\s*[-–—]\s*(.+)$/);
        if (hyphenMatch) {
          parts = [hyphenMatch[1], hyphenMatch[2]];
        } else {
          const spaceMatch = line.trim().match(/^(\d+)\s+(.+)$/);
          if (spaceMatch) {
            parts = [spaceMatch[1], spaceMatch[2]];
          }
        }
      }

      if (parts.length >= 2) {
        const rawId = parts[0].trim();
        const rawName = parts[1].trim();

        // Skip headers
        if (rawId.toLowerCase().includes('representante') || rawId.toLowerCase().includes('código') || rawId.toLowerCase().includes('repid') || rawId.toLowerCase().includes('id')) {
          return;
        }

        const repId = parseInt(rawId);
        if (!isNaN(repId) && rawName) {
          newNames[repId.toString()] = rawName;
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      setCustomRepNames(prev => {
        const updated = { ...prev, ...newNames };
        return updated;
      });
      return true;
    }
    return false;
  };

  const handleSavePreviews = async () => {
    setIsSavingPreviews(true);
    setSaveSuccessMessage(null);
    try {
      if (getFirebaseConfig()) {
        await savePreviewsToFirestore(selectedYear, selectedMonth, previews);
      }
      saveLocalPreviews(selectedYear, selectedMonth, previews);
      const nowString = new Date().toISOString();
      setPreviewsUpdatedAt(nowString);
      setSaveSuccessMessage("Configurações de prévia salvas com sucesso!");
      logAnalyticsEvent('data_save', `Prévias de ${selectedMonth}/${selectedYear} (${previews.length} itens)`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Error saving previews:", err);
      alert("Erro ao salvar prévias: " + err.message);
    } finally {
      setIsSavingPreviews(false);
    }
  };

  const [isSavingNames, setIsSavingNames] = useState<boolean>(false);
  const [saveNamesSuccessMessage, setSaveNamesSuccessMessage] = useState<string | null>(null);

  const handleSaveRepNames = async (namesToSave = customRepNames) => {
    setIsSavingNames(true);
    setSaveNamesSuccessMessage(null);
    try {
      if (getFirebaseConfig()) {
        await saveRepNamesToFirestore(namesToSave);
      }
      saveLocalRepNames(namesToSave);
      setSaveNamesSuccessMessage("Nomes de representantes salvos com sucesso!");
      logAnalyticsEvent('custom_name_save', `${Object.keys(namesToSave).length} nomes customizados`);
      setTimeout(() => setSaveNamesSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error("Error saving representative names:", err);
      alert("Erro ao salvar nomes de representantes: " + err.message);
    } finally {
      setIsSavingNames(false);
    }
  };

  const [isSavingLocations, setIsSavingLocations] = useState<boolean>(false);
  const [saveLocationsSuccessMessage, setSaveLocationsSuccessMessage] = useState<string | null>(null);

  const handleSaveRepLocations = async (locationsToSave = customRepLocations) => {
    setIsSavingLocations(true);
    setSaveLocationsSuccessMessage(null);
    try {
      if (getFirebaseConfig()) {
        await saveRepLocationsToFirestore(locationsToSave);
      }
      saveLocalRepLocations(locationsToSave);
      setSaveLocationsSuccessMessage("Localizações de representantes salvas com sucesso!");
      logAnalyticsEvent('location_save', `${Object.keys(locationsToSave).length} estados mapeados`);
      setTimeout(() => setSaveLocationsSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error("Error saving representative locations:", err);
      alert("Erro ao salvar localizações de representantes: " + err.message);
    } finally {
      setIsSavingLocations(false);
    }
  };

  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState<boolean>(false);

  const handleExportPresentation = () => {
    setPresStartMonth(1);
    setPresEndMonth(selectedMonth);
    setPresentationProgressText('');
    setIsPresentationModalOpen(true);
  };

  const fetchRecordsForPresentation = async (year: number, startM: number, endM: number): Promise<any[]> => {
    const monthsToFetch: number[] = [];
    for (let m = startM; m <= endM; m++) {
      monthsToFetch.push(m);
    }
    
    const results = await Promise.all(monthsToFetch.map(async (m) => {
      let records: any[] = [];
      // Try Firestore if configured
      const config = getFirebaseConfig();
      if (config && config.apiKey) {
        try {
          const fsData = await fetchPeriodDataFromFirestore(year, m);
          if (fsData && fsData.length > 0) {
            records = fsData;
          }
        } catch (err) {
          console.warn(`Firestore load failed for ${year}/${m}:`, err);
        }
      }
      // Try server-side API
      if (records.length === 0) {
        try {
          const response = await fetch(`/api/monthly-data/${year}/${m}`);
          if (response.ok) {
            const data = await response.json();
            if (data.records && data.records.length > 0) {
              records = data.records;
            }
          }
        } catch (err) {
          console.warn(`API load failed for ${year}/${m}:`, err);
        }
      }
      // Try local fallback
      if (records.length === 0) {
        records = getLocalPeriodData(year, m);
      }

      // Attach month property to each record
      return records.map(r => ({ ...r, month: m }));
    }));

    return results.flat();
  };

  const handlePresentationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingPresentation(true);
    setPresentationProgressText('Preparando geração...');
    try {
      // 1. Fetch current year records in the range
      setPresentationProgressText(`Carregando dados de ${selectedYear}...`);
      const currentYearRecords = await fetchRecordsForPresentation(selectedYear, presStartMonth, presEndMonth);

      // 2. Fetch previous year records in the same range
      setPresentationProgressText(`Carregando dados de ${selectedYear - 1}...`);
      const previousYearRecords = await fetchRecordsForPresentation(selectedYear - 1, presStartMonth, presEndMonth);

      // 3. Generate presentation
      setPresentationProgressText('Gerando arquivo PowerPoint (.pptx)...');
      await generateSalesPresentation({
        currentYearRecords,
        previousYearRecords,
        customRepNames,
        customRepLocations,
        startMonth: presStartMonth,
        endMonth: presEndMonth,
        selectedYear
      });
      
      logAnalyticsEvent('presentation_export', `Período ${presStartMonth}/${selectedYear} a ${presEndMonth}/${selectedYear}`);
      setIsPresentationModalOpen(false);
    } catch (err: any) {
      console.error("Erro ao gerar apresentação de vendas:", err);
      alert("Erro ao gerar apresentação de vendas: " + err.message);
    } finally {
      setIsGeneratingPresentation(false);
      setPresentationProgressText('');
    }
  };

  const handlePasteRepLocations = (text: string) => {
    const lines = text.split('\n');
    const newLocs: Record<string, string> = {};
    let addedCount = 0;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      let parts = trimmedLine.split(/\t|;|\|/);

      if (parts.length < 2) {
        const hyphenMatch = trimmedLine.match(/^(\d+)\s*[-–—:]\s*([A-Za-z]{2})$/);
        if (hyphenMatch) {
          parts = [hyphenMatch[1], hyphenMatch[2]];
        } else {
          const spaceMatch = trimmedLine.match(/^(\d+)\s+([A-Za-z]{2})$/);
          if (spaceMatch) {
            parts = [spaceMatch[1], spaceMatch[2]];
          }
        }
      }

      if (parts.length >= 2) {
        const rawRepId = parts[0].trim();
        const rawState = parts[1].trim().toUpperCase();

        if (
          rawRepId.toLowerCase().includes('rep') || 
          rawRepId.toLowerCase().includes('cód') || 
          rawRepId.toLowerCase().includes('id') || 
          rawState.toLowerCase().includes('est') || 
          rawState.toLowerCase().includes('uf')
        ) {
          return;
        }

        const repIdNum = parseInt(rawRepId);
        if (!isNaN(repIdNum) && rawState.length === 2) {
          newLocs[repIdNum.toString()] = rawState;
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      setCustomRepLocations(prev => {
        const updated = { ...prev, ...newLocs };
        return updated;
      });
      return true;
    }
    return false;
  };
  
  // Filter States
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>('All');
  const [selectedProductGroups, setSelectedProductGroups] = useState<string[]>(['All']);
  const [selectedSalesTypes, setSelectedSalesTypes] = useState<string[]>(['CD', 'VP']);
  const [showPeriodFilter, setShowPeriodFilter] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedRepIdFilter, setSelectedRepIdFilter] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [namesSearchQuery, setNamesSearchQuery] = useState<string>('');
  const [progressThreshold, setProgressThreshold] = useState<string>('All'); // 'All', '100+', '75-99', 'under-75'
  const [showPreviewMetrics, setShowPreviewMetrics] = useState<boolean>(true);

  useEffect(() => {
    if (activeTab === 'previa' && (isAccumulated || !selectedProductGroups.includes('All'))) {
      setActiveTab('geral');
    }
  }, [selectedYear, selectedMonth, isAccumulated, selectedProductGroups, activeTab]);
  
  // Detailed Modal for Representative Product Group breakdown
  const [selectedRepDetailId, setSelectedRepDetailId] = useState<number | null>(null);

  // Pagination for detailed table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Sorting for detailed table
  const [sortField, setSortField] = useState<keyof SalesRecord>('pctVenda');
  const [sortAscending, setSortAscending] = useState<boolean>(false);

  // Reset all active filters
  const resetFilters = () => {
    setSelectedCoordinator('All');
    setSelectedProductGroups(['All']);
    setSelectedSalesTypes(['CD', 'VP']);
    setSearchText('');
    setProgressThreshold('All');
    setSelectedRepIdFilter(null);
    setShowSuggestions(false);
  };

  // Dynamic mapped records with customized representative names prioritized
  const resolvedRecords = useMemo(() => {
    // Pre-calculate the original non-PRO coordinator for each representative (if any exists)
    // to keep the proper relationship with their region coordinator when displaying PRO lines.
    const repToOrigCoord: Record<string, string> = {};
    allRecords.forEach(r => {
      const isPro = (r.groupName || '').toLowerCase().includes('pro');
      const isMarcelo = (r.coordName || '').toLowerCase().includes('marcelo') || (r.coordName || '').toLowerCase().includes('krewer');
      if (!isPro && !isMarcelo && r.coordName) {
        repToOrigCoord[r.repId.toString().trim()] = r.coordName;
      }
    });

    allRecords.forEach(r => {
      const key = r.repId.toString().trim();
      if (!repToOrigCoord[key] && r.coordName) {
        repToOrigCoord[key] = r.coordName;
      }
    });

    return allRecords
      .map(r => {
        let coordName = r.coordName;
        const originalCoordName = repToOrigCoord[r.repId.toString().trim()] || r.coordName || '';
        // If it is Tramontina Pro (Garibaldi Pro Monet), assign coordinator to "Marcelo Krewer"
        const isPro = (r.groupName || '').toLowerCase().includes('pro');
        if (isPro) {
          coordName = "Marcelo Krewer";
        }

        const customName = customRepNames[r.repId.toString().trim() || r.repId];
        return {
          ...r,
          originalCoordName,
          coordName,
          repName: customName || r.repName
        };
      });
  }, [allRecords, customRepNames]);

  // Extract distinct lists dynamically from database state to populate select menus
  const distinctCoordinators = useMemo(() => {
    const coords = new Set<string>();
    resolvedRecords.forEach(r => {
      if (r.coordName) coords.add(r.coordName);
    });
    const allowedCoords = ["Adriano Almeida", "Dionatan", "Juan Almeida", "Julio Warken"];
    return Array.from(coords)
      .filter(name => allowedCoords.includes(name))
      .sort();
  }, [resolvedRecords]);

  // Extract distinct product groups present in the data matching allowed filter options
  const distinctProductGroups = useMemo(() => {
    return Array.from(ALLOWED_PRODUCT_GROUPS);
  }, []);

  // Compute available representatives list for user management modal
  const availableRepsList = useMemo(() => {
    const map = new Map<number, { repId: number; repName: string; coordName?: string }>();
    resolvedRecords.forEach(r => {
      if (r.repId && !map.has(r.repId)) {
        map.set(r.repId, {
          repId: r.repId,
          repName: r.repName,
          coordName: r.coordName
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.repId - b.repId);
  }, [resolvedRecords]);

  // Compute filtered records based on interactive panel
  const filteredRecords = useMemo(() => {
    const isOnlyCD = selectedSalesTypes.includes('CD') && !selectedSalesTypes.includes('VP');
    const isOnlyVP = selectedSalesTypes.includes('VP') && !selectedSalesTypes.includes('CD');

    const result: SalesRecord[] = [];

    resolvedRecords.forEach(r => {
      // Coordinator filter (using original coordinator name to allow proper Pro/Master filtering)
      if (selectedCoordinator !== 'All') {
        const matchOriginal = r.originalCoordName.toLowerCase().trim() === selectedCoordinator.toLowerCase().trim() ||
                              r.originalCoordName.toLowerCase().trim().includes(selectedCoordinator.toLowerCase().trim().split(' ')[0]);
        if (!matchOriginal) return;
      }
      
      // Product Group filter
      if (!selectedProductGroups.includes('All')) {
        if (selectedProductGroups.length === 0) {
          return;
        }
        const mappedGroupName = getMappedGroupName(r.groupName);
        if (!selectedProductGroups.includes(mappedGroupName)) {
          return;
        }
      }

      // Sales Type Filter (CD / VP adaptation)
      let recordToAdd: SalesRecord = r;
      if (isOnlyCD) {
        if (r.quotaCD === 0 && r.valorVendaCD === 0 && r.faturadoCD === 0 && r.pendenteCD === 0) {
          return;
        }
        const qTotal = r.quotaCD;
        const vVenda = r.valorVendaCD;
        const fTotal = r.faturadoCD;
        const fEP = r.faturadoCD + r.pendenteCD;
        recordToAdd = {
          ...r,
          quotaTotal: qTotal,
          faturadoTotal: fTotal,
          faturadoEPendente: fEP,
          valorVendaTotal: vVenda,
          defasagem: vVenda - qTotal,
          pctVenda: qTotal > 0 ? (vVenda / qTotal) * 100 : 0,
          pctTotal: qTotal > 0 ? (fTotal / qTotal) * 100 : 0,
        };
      } else if (isOnlyVP) {
        if (r.quotaVP === 0 && r.valorVendaVP === 0 && r.faturadoVP === 0 && r.pendenteVP === 0) {
          return;
        }
        const qTotal = r.quotaVP;
        const vVenda = r.valorVendaVP;
        const fTotal = r.faturadoVP;
        const fEP = r.faturadoVP + r.pendenteVP;
        recordToAdd = {
          ...r,
          quotaTotal: qTotal,
          faturadoTotal: fTotal,
          faturadoEPendente: fEP,
          valorVendaTotal: vVenda,
          defasagem: vVenda - qTotal,
          pctVenda: qTotal > 0 ? (vVenda / qTotal) * 100 : 0,
          pctTotal: qTotal > 0 ? (fTotal / qTotal) * 100 : 0,
        };
      }
      
      // Representative exact ID filter / Role isolation
      if (userRole === 'rep' && userRepId !== null) {
        if (recordToAdd.repId !== userRepId) return;
      } else if (selectedRepIdFilter !== null) {
        if (recordToAdd.repId !== selectedRepIdFilter) return;
      } else {
        // Search matching (by rep name or ID)
        if (searchText.trim() !== '') {
          const query = searchText.toLowerCase();
          const matchName = recordToAdd.repName.toLowerCase().includes(query);
          const matchId = recordToAdd.repId.toString().includes(query);
          const matchGroup = recordToAdd.groupName.toLowerCase().includes(query);
          if (!matchName && !matchId && !matchGroup) return;
        }
      }

      // Achievement threshold filter
      if (progressThreshold !== 'All') {
        const rate = recordToAdd.quotaTotal > 0 ? (recordToAdd.valorVendaTotal / recordToAdd.quotaTotal) * 100 : 0;
        if (progressThreshold === '100+' && rate < 100) return;
        if (progressThreshold === '75-99' && (rate < 75 || rate >= 100)) return;
        if (progressThreshold === 'under-75' && rate >= 75) return;
      }

      // State filter (clicked on the map)
      if (selectedState) {
        const repState = customRepLocations[recordToAdd.repId.toString().trim() || recordToAdd.repId];
        if (repState !== selectedState) return;
      }

      result.push(recordToAdd);
    });

    return result;
  }, [resolvedRecords, selectedCoordinator, selectedProductGroups, selectedSalesTypes, searchText, selectedRepIdFilter, progressThreshold, selectedState, customRepLocations, userRole, userRepId]);

  // Dynamic Statistics computed from currently filtered subset
  const totals = useMemo(() => {
    let quotaCD = 0;
    let faturadoCD = 0;
    let quotaVP = 0;
    let faturadoVP = 0;
    let quotaTotal = 0;
    let faturadoTotal = 0;
    let pendenteCD = 0;
    let pendenteVP = 0;
    let faturadoEPendente = 0;
    let valorVendaCD = 0;
    let valorVendaVP = 0;
    let valorVendaTotal = 0;

    filteredRecords.forEach(r => {
      quotaCD += r.quotaCD;
      faturadoCD += r.faturadoCD;
      quotaVP += r.quotaVP;
      faturadoVP += r.faturadoVP;
      quotaTotal += r.quotaTotal;
      faturadoTotal += r.faturadoTotal;
      pendenteCD += r.pendenteCD;
      pendenteVP += r.pendenteVP;
      faturadoEPendente += r.faturadoEPendente;
      valorVendaCD += r.valorVendaCD;
      valorVendaVP += r.valorVendaVP;
      valorVendaTotal += r.valorVendaTotal;
    });

    const achCD = quotaCD > 0 ? (valorVendaCD / quotaCD) * 100 : 0;
    const achVP = quotaVP > 0 ? (valorVendaVP / quotaVP) * 100 : 0;
    const achTotal = quotaTotal > 0 ? (valorVendaTotal / quotaTotal) * 100 : 0;
    const achSale = quotaTotal > 0 ? (valorVendaTotal / quotaTotal) * 100 : 0;
    const defasagem = valorVendaTotal - quotaTotal;

    return {
      quotaCD,
      faturadoCD,
      quotaVP,
      faturadoVP,
      quotaTotal,
      faturadoTotal,
      pendenteCD,
      pendenteVP,
      faturadoEPendente,
      defasagem,
      valorVendaCD,
      valorVendaVP,
      valorVendaTotal,
      achCD,
      achVP,
      achTotal,
      achSale
    };
  }, [filteredRecords]);

  // Active statistics for display (switches to selected daily period when in Vendas por Dia)
  const activeTotals = useMemo(() => {
    if (activeTab === 'vendas_dia' && dailyPeriodTotals) {
      return dailyPeriodTotals;
    }
    return totals;
  }, [activeTab, dailyPeriodTotals, totals]);

  // Portuguese monetary layout formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDefasagem = (val: number) => {
    const formatted = formatCurrency(Math.abs(val));
    return (val < 0 ? '-' : val > 0 ? '+' : '') + formatted;
  };

  const formatPercent = (val: number) => {
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + '%';
  };

  // Group by Coordinator to visualize in overview charts
  const coordinatorPerformance = useMemo(() => {
    const groups: { [key: string]: { quota: number; faturado: number; name: string; reps: Set<number> } } = {};
    
    filteredRecords.forEach(r => {
      const cName = r.originalCoordName || r.coordName;
      if (!groups[cName]) {
        groups[cName] = { quota: 0, faturado: 0, name: cName, reps: new Set() };
      }
      groups[cName].quota += r.quotaTotal;
      groups[cName].faturado += r.valorVendaTotal;
      groups[cName].reps.add(r.repId);
    });

    return Object.values(groups)
      .map(g => ({
        name: g.name,
        quota: g.quota,
        faturado: g.faturado,
        repsCount: g.reps.size,
        percent: g.quota > 0 ? (g.faturado / g.quota) * 100 : 0,
        defasagem: g.faturado - g.quota
      }))
      .filter(g => {
        const nameLower = g.name.toLowerCase().trim();
        return nameLower !== "igor pedruzzi" && nameLower !== "marcelo krewer";
      })
      .sort((a,b) => b.faturado - a.faturado);
  }, [filteredRecords]);

  // Compute state statistics dynamically for the Brazil map view
  const stateStats = useMemo(() => {
    const stats: Record<string, { quota: number; sales: number; repsCount: number }> = {};
    
    // Initializer map for all 27 Brazilian states (pre-calculating repsCount)
    const stateUfs = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    stateUfs.forEach(uf => {
      // Find reps who belong to this state
      const repsInState = Object.keys(customRepLocations).filter(repId => {
        return customRepLocations[repId] === uf;
      });

      stats[uf] = {
        quota: 0,
        sales: 0,
        repsCount: repsInState.length
      };
    });

    // Aggregate quotas and sales from filteredRecords matching active filters
    filteredRecords.forEach(r => {
      const repState = customRepLocations[r.repId.toString().trim() || r.repId];
      if (repState && stats[repState]) {
        stats[repState].quota += r.quotaTotal;
        stats[repState].sales += r.valorVendaTotal;
      }
    });

    return stats;
  }, [filteredRecords, customRepLocations]);

  // Group by Product Group (using the mapped groupName) to build structural segmentation charts
  const enterpriseDonutData = useMemo(() => {
    const groups: { [key: string]: number } = {};
    let totalAll = 0;
    
    filteredRecords.forEach(r => {
      const mappedName = getMappedGroupName(r.groupName);
      if (!groups[mappedName]) groups[mappedName] = 0;
      groups[mappedName] += r.valorVendaTotal;
      totalAll += r.valorVendaTotal;
    });

    return ALLOWED_PRODUCT_GROUPS.map(name => {
      const val = groups[name] || 0;
      return {
        name,
        value: val,
        share: totalAll > 0 ? (val / totalAll) * 100 : 0
      };
    });
  }, [filteredRecords]);

  // Group by Representative for the ranking lists & grid
  const repsAggregated = useMemo(() => {
    const groups: { [key: number]: SalesRecord[] } = {};
    filteredRecords.forEach(r => {
      if (!groups[r.repId]) groups[r.repId] = [];
      groups[r.repId].push(r);
    });

    return Object.values(groups).map(records => {
      const first = records[0];
      let qTotal = 0;
      let fTotal = 0;
      let fCD = 0;
      let fVP = 0;
      let vVenda = 0;
      
      records.forEach(r => {
        qTotal += r.quotaTotal;
        fTotal += r.faturadoTotal;
        fCD += r.faturadoCD;
        fVP += r.faturadoVP;
        vVenda += r.valorVendaTotal;
      });

      const defasagemVal = vVenda - qTotal;

      return {
        repId: first.repId,
        repName: first.repName,
        coordName: first.originalCoordName || first.coordName,
        totalQuota: qTotal,
        totalFaturado: vVenda,
        totalFaturadoCD: fCD,
        totalFaturadoVP: fVP,
        totalVendido: vVenda,
        defasagem: defasagemVal,
        pctTotal: qTotal > 0 ? (vVenda / qTotal) * 100 : 0,
        pctVenda: qTotal > 0 ? (vVenda / qTotal) * 100 : 0,
        recordsCount: records.length,
        items: records
      };
    }).sort((a, b) => b.totalFaturado - a.totalFaturado);
  }, [filteredRecords]);

  // ----------------------------------------------------
  // PREVIOUS YEAR (YoY) DATA & GROWTH COMPARISON METRICS
  // ----------------------------------------------------
  const prevYearResolvedRecords = useMemo(() => {
    const repToOrigCoord: Record<string, string> = {};
    prevYearRecords.forEach(r => {
      const isPro = (r.groupName || '').toLowerCase().includes('pro');
      const isMarcelo = (r.coordName || '').toLowerCase().includes('marcelo') || (r.coordName || '').toLowerCase().includes('krewer');
      if (!isPro && !isMarcelo && r.coordName) {
        repToOrigCoord[r.repId.toString().trim()] = r.coordName;
      }
    });

    prevYearRecords.forEach(r => {
      const key = r.repId.toString().trim();
      if (!repToOrigCoord[key] && r.coordName) {
        repToOrigCoord[key] = r.coordName;
      }
    });

    return prevYearRecords.map(r => {
      let coordName = r.coordName;
      const originalCoordName = repToOrigCoord[r.repId.toString().trim()] || r.coordName || '';
      const isPro = (r.groupName || '').toLowerCase().includes('pro');
      if (isPro) {
        coordName = "Marcelo Krewer";
      }

      const customName = customRepNames[r.repId.toString().trim() || r.repId];
      return {
        ...r,
        originalCoordName,
        coordName,
        repName: customName || r.repName
      };
    });
  }, [prevYearRecords, customRepNames]);

  const prevYearFilteredRecords = useMemo(() => {
    const isOnlyCD = selectedSalesTypes.includes('CD') && !selectedSalesTypes.includes('VP');
    const isOnlyVP = selectedSalesTypes.includes('VP') && !selectedSalesTypes.includes('CD');

    const result: SalesRecord[] = [];

    prevYearResolvedRecords.forEach(r => {
      if (selectedCoordinator !== 'All') {
        const matchOriginal = r.originalCoordName.toLowerCase().trim() === selectedCoordinator.toLowerCase().trim() ||
                              r.originalCoordName.toLowerCase().trim().includes(selectedCoordinator.toLowerCase().trim().split(' ')[0]);
        if (!matchOriginal) return;
      }
      
      if (!selectedProductGroups.includes('All')) {
        if (selectedProductGroups.length === 0) return;
        const mappedGroupName = getMappedGroupName(r.groupName);
        if (!selectedProductGroups.includes(mappedGroupName)) return;
      }

      let recordToAdd: SalesRecord = r;
      if (isOnlyCD) {
        if (r.quotaCD === 0 && r.valorVendaCD === 0 && r.faturadoCD === 0 && r.pendenteCD === 0) return;
        recordToAdd = {
          ...r,
          quotaTotal: r.quotaCD,
          faturadoTotal: r.faturadoCD,
          valorVendaTotal: r.valorVendaCD,
        };
      } else if (isOnlyVP) {
        if (r.quotaVP === 0 && r.valorVendaVP === 0 && r.faturadoVP === 0 && r.pendenteVP === 0) return;
        recordToAdd = {
          ...r,
          quotaTotal: r.quotaVP,
          faturadoTotal: r.faturadoVP,
          valorVendaTotal: r.valorVendaVP,
        };
      }
      
      if (userRole === 'rep' && userRepId !== null) {
        if (recordToAdd.repId !== userRepId) return;
      } else if (selectedRepIdFilter !== null) {
        if (recordToAdd.repId !== selectedRepIdFilter) return;
      } else {
        if (searchText.trim() !== '') {
          const query = searchText.toLowerCase();
          const matchName = recordToAdd.repName.toLowerCase().includes(query);
          const matchId = recordToAdd.repId.toString().includes(query);
          const matchGroup = recordToAdd.groupName.toLowerCase().includes(query);
          if (!matchName && !matchId && !matchGroup) return;
        }
      }

      if (selectedState) {
        const repState = customRepLocations[recordToAdd.repId.toString().trim() || recordToAdd.repId];
        if (repState !== selectedState) return;
      }

      result.push(recordToAdd);
    });

    return result;
  }, [prevYearResolvedRecords, selectedCoordinator, selectedProductGroups, selectedSalesTypes, searchText, selectedRepIdFilter, selectedState, customRepLocations, userRole, userRepId]);

  const repsGrowthComparison = useMemo(() => {
    const prevMap = new Map<number, { repId: number; repName: string; coordName: string; totalVenda: number; totalQuota: number }>();
    prevYearFilteredRecords.forEach(r => {
      const existing = prevMap.get(r.repId);
      if (existing) {
        existing.totalVenda += r.valorVendaTotal;
        existing.totalQuota += r.quotaTotal;
      } else {
        prevMap.set(r.repId, {
          repId: r.repId,
          repName: r.repName,
          coordName: r.originalCoordName || r.coordName,
          totalVenda: r.valorVendaTotal,
          totalQuota: r.quotaTotal
        });
      }
    });

    const allRepIds = new Set<number>();
    // Only include representatives who have a name registered through "Importar nomes"
    repsAggregated.forEach(r => {
      const repKey = r.repId.toString().trim();
      if (customRepNames[repKey] && customRepNames[repKey].trim() !== '') {
        allRepIds.add(r.repId);
      }
    });
    prevMap.forEach((_, repId) => {
      const repKey = repId.toString().trim();
      if (customRepNames[repKey] && customRepNames[repKey].trim() !== '') {
        allRepIds.add(repId);
      }
    });

    const list: {
      repId: number;
      repName: string;
      coordName: string;
      vendaAtual: number;
      quotaAtual: number;
      vendaAnterior: number;
      quotaAnterior: number;
      diferencaVenda: number;
      taxaCrescimento: number;
      statusGrowth: 'high_growth' | 'growth' | 'stable' | 'decline' | 'new';
    }[] = [];

    allRepIds.forEach(repId => {
      const repKey = repId.toString().trim();
      const registeredName = customRepNames[repKey] || customRepNames[repId];
      if (!registeredName || !registeredName.trim()) return;

      const currentRep = repsAggregated.find(r => r.repId === repId);
      const prevRep = prevMap.get(repId);

      const repName = registeredName;
      const coordName = currentRep?.coordName || prevRep?.coordName || '-';

      const vendaAtual = currentRep?.totalFaturado || 0;
      const quotaAtual = currentRep?.totalQuota || 0;

      const vendaAnterior = prevRep?.totalVenda || 0;
      const quotaAnterior = prevRep?.totalQuota || 0;

      const diferencaVenda = vendaAtual - vendaAnterior;

      let taxaCrescimento = 0;
      let statusGrowth: 'high_growth' | 'growth' | 'stable' | 'decline' | 'new' = 'stable';

      if (vendaAnterior === 0) {
        if (vendaAtual > 0) {
          taxaCrescimento = 100;
          statusGrowth = 'new';
        } else {
          taxaCrescimento = 0;
          statusGrowth = 'stable';
        }
      } else {
        taxaCrescimento = ((vendaAtual - vendaAnterior) / Math.abs(vendaAnterior)) * 100;
        if (taxaCrescimento >= 10) statusGrowth = 'high_growth';
        else if (taxaCrescimento > 0) statusGrowth = 'growth';
        else if (taxaCrescimento === 0) statusGrowth = 'stable';
        else statusGrowth = 'decline';
      }

      list.push({
        repId,
        repName,
        coordName,
        vendaAtual,
        quotaAtual,
        vendaAnterior,
        quotaAnterior,
        diferencaVenda,
        taxaCrescimento,
        statusGrowth
      });
    });

    return list;
  }, [repsAggregated, prevYearFilteredRecords, customRepNames]);

  const growthTotals = useMemo(() => {
    let totalVendaAtual = 0;
    let totalVendaAnterior = 0;
    let repsCrescendo = 0;
    let repsQueda = 0;
    let repsNovos = 0;

    repsGrowthComparison.forEach(r => {
      totalVendaAtual += r.vendaAtual;
      totalVendaAnterior += r.vendaAnterior;
      if (r.statusGrowth === 'new') repsNovos++;
      else if (r.diferencaVenda > 0) repsCrescendo++;
      else if (r.diferencaVenda < 0) repsQueda++;
    });

    const diferencaGeral = totalVendaAtual - totalVendaAnterior;
    let taxaCrescimentoGeral = 0;
    if (totalVendaAnterior > 0) {
      taxaCrescimentoGeral = ((totalVendaAtual - totalVendaAnterior) / totalVendaAnterior) * 100;
    } else if (totalVendaAtual > 0) {
      taxaCrescimentoGeral = 100;
    }

    return {
      totalVendaAtual,
      totalVendaAnterior,
      diferencaGeral,
      taxaCrescimentoGeral,
      repsCrescendo,
      repsQueda,
      repsNovos,
      totalRepsCount: repsGrowthComparison.length
    };
  }, [repsGrowthComparison]);

  const sortedGrowthComparison = useMemo(() => {
    let filtered = [...repsGrowthComparison];

    if (growthFilter === 'positive') {
      filtered = filtered.filter(r => r.diferencaVenda > 0);
    } else if (growthFilter === 'negative') {
      filtered = filtered.filter(r => r.diferencaVenda < 0);
    } else if (growthFilter === 'top10') {
      filtered = filtered.sort((a, b) => b.diferencaVenda - a.diferencaVenda).slice(0, 10);
      return filtered;
    }

    return filtered.sort((a, b) => {
      let valA: any = a[growthSortField];
      let valB: any = b[growthSortField];

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return growthSortDirection === 'asc' ? cmp : -cmp;
      }

      return growthSortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [repsGrowthComparison, growthFilter, growthSortField, growthSortDirection]);

  // Performance by Product Group
  const productGroupPerformance = useMemo(() => {
    const groups: { [key: string]: { quota: number; faturado: number } } = {};
    filteredRecords.forEach(r => {
      const gName = getMappedGroupName(r.groupName);
      if (!groups[gName]) groups[gName] = { quota: 0, faturado: 0 };
      groups[gName].quota += r.quotaTotal;
      groups[gName].faturado += r.valorVendaTotal;
    });

    return ALLOWED_PRODUCT_GROUPS.map(group => {
      const val = groups[group] || { quota: 0, faturado: 0 };
      return {
        group,
        quota: val.quota,
        faturado: val.faturado,
        defasagem: val.faturado - val.quota,
        percent: val.quota > 0 ? (val.faturado / val.quota) * 100 : 0
      };
    });
  }, [filteredRecords]);

  // Find preview for each rep
  const repPreviewsMap = useMemo(() => {
    const map = new Map<string, { previaValue: number; vendaDiaPrevia: number }>();
    previews.forEach(p => {
      map.set(p.repId.toString().trim(), { previaValue: p.previaValue, vendaDiaPrevia: p.vendaDiaPrevia });
    });
    return map;
  }, [previews]);

  // Suggestions based on search input
  const searchSuggestions = useMemo(() => {
    if (searchText.trim() === '') return [];
    const query = searchText.toLowerCase();
    
    // Group unique reps from resolvedRecords
    const repsMap = new Map<number, { repId: number; repName: string }>();
    resolvedRecords.forEach(r => {
      // Apply coordinator filter if selected (using original coordinator name to allow proper Pro/Master filtering)
      if (selectedCoordinator !== 'All') {
        const matchOriginal = r.originalCoordName.toLowerCase().trim() === selectedCoordinator.toLowerCase().trim() ||
                              r.originalCoordName.toLowerCase().trim().includes(selectedCoordinator.toLowerCase().trim().split(' ')[0]);
        if (!matchOriginal) return;
      }
      // Apply state filter if selected
      if (selectedState) {
        const repState = customRepLocations[r.repId.toString().trim() || r.repId];
        if (repState !== selectedState) return;
      }
      
      const name = r.repName || '';
      const id = r.repId;
      if (name.toLowerCase().includes(query) || id.toString().includes(query)) {
        repsMap.set(id, { repId: id, repName: name });
      }
    });
    
    return Array.from(repsMap.values()).slice(0, 10);
  }, [resolvedRecords, searchText, selectedCoordinator, selectedState, customRepLocations]);

  // Global helpers for checking active filters on representatives
  const activeRepIds = useMemo(() => new Set(repsAggregated.map(r => r.repId.toString().trim())), [repsAggregated]);
  const hasAnyFilter = useMemo(() => {
    return selectedCoordinator !== 'All' || 
           searchText.trim() !== '' || 
           !selectedProductGroups.includes('All') || 
           !selectedSalesTypes.includes('CD') || 
           !selectedSalesTypes.includes('VP') || 
           progressThreshold !== 'All' || 
           selectedState !== null || 
           selectedRepIdFilter !== null;
  }, [selectedCoordinator, searchText, selectedProductGroups, selectedSalesTypes, progressThreshold, selectedState, selectedRepIdFilter]);

  // Preview totals based on mapped previews
  const previewTotals = useMemo(() => {
    let totalExpectativa = 0;
    let totalVendaDiaPrevia = 0;
    let totalPedidosNovos = 0;
    let matchedPreviewsCount = 0;

    if (!isAccumulated) {
      previews.forEach(p => {
        const pRepIdStr = p.repId.toString().trim();
        
        // When logged in as representative, strictly isolate to their own rep ID
        if (userRole === 'rep' && userRepId !== null) {
          if (pRepIdStr !== userRepId.toString().trim()) {
            return;
          }
        } else if (hasAnyFilter && !activeRepIds.has(pRepIdStr)) {
          // Admin with active filters: skip previews for non-matching reps
          return;
        }

        matchedPreviewsCount++;
        totalExpectativa += p.previaValue;
        totalVendaDiaPrevia += p.vendaDiaPrevia;

        const rep = repsAggregated.find(r => r.repId.toString().trim() === pRepIdStr);
        const currentSales = rep ? rep.totalVendido : 0;
        totalPedidosNovos += (currentSales - p.vendaDiaPrevia);
      });
    }

    const totalVendaAtual = totals.valorVendaTotal;
    const defasagemPrevia = totalVendaAtual - totalVendaDiaPrevia - totalExpectativa;
    const hasAnyPreview = !isAccumulated && (
      (userRole === 'rep' && userRepId !== null)
        ? matchedPreviewsCount > 0
        : (hasAnyFilter ? matchedPreviewsCount > 0 : previews.length > 0)
    );

    return {
      totalExpectativa,
      totalVendaDiaPrevia,
      totalVendaAtual,
      defasagemPrevia,
      totalPedidosNovos,
      hasAnyPreview
    };
  }, [previews, activeRepIds, hasAnyFilter, totals.valorVendaTotal, repsAggregated, isAccumulated, userRole, userRepId]);

  // Top 5 Stars of the team
  const topPerformers = useMemo(() => {
    return [...repsAggregated]
      .filter(r => r.totalQuota > 0)
      .sort((a, b) => b.pctTotal - a.pctTotal)
      .slice(0, 5);
  }, [repsAggregated]);

  // Highest Defasagem (needs attention)
  const interventionNeeded = useMemo(() => {
    return [...repsAggregated]
      .filter(r => r.defasagem < 0)
      .sort((a, b) => a.defasagem - b.defasagem) // highest negative first
      .slice(0, 5);
  }, [repsAggregated]);

  // Aggregate filteredRecords by representative (each repId appears only once)
  const aggregatedDetails = useMemo(() => {
    const groups: { [key: number]: SalesRecord[] } = {};
    filteredRecords.forEach(r => {
      if (!groups[r.repId]) groups[r.repId] = [];
      groups[r.repId].push(r);
    });

    return Object.values(groups).map(records => {
      const first = records[0];
      
      let quotaCD = 0;
      let faturadoCD = 0;
      let quotaVP = 0;
      let faturadoVP = 0;
      let quotaTotal = 0;
      let faturadoTotal = 0;
      let pendenteCD = 0;
      let pendenteVP = 0;
      let faturadoEPendente = 0;
      let valorVendaCD = 0;
      let valorVendaVP = 0;
      let valorVendaTotal = 0;

      records.forEach(r => {
        quotaCD += r.quotaCD;
        faturadoCD += r.faturadoCD;
        quotaVP += r.quotaVP;
        faturadoVP += r.faturadoVP;
        quotaTotal += r.quotaTotal;
        faturadoTotal += r.faturadoTotal;
        pendenteCD += r.pendenteCD;
        pendenteVP += r.pendenteVP;
        faturadoEPendente += r.faturadoEPendente;
        valorVendaCD += r.valorVendaCD;
        valorVendaVP += r.valorVendaVP;
        valorVendaTotal += r.valorVendaTotal;
      });

      const uniqueEmps = Array.from(new Set(records.map(r => r.emp))).filter(Boolean);
      const uniqueLinhas = Array.from(new Set(records.map(r => r.linha))).filter(Boolean);
      const uniqueGroups = Array.from(new Set(records.map(r => r.groupName))).filter(Boolean);

      const defasagemVal = valorVendaTotal - quotaTotal;

      const matchingPreview = previews.find(p => p.repId.toString().trim() === first.repId.toString().trim());
      const pValue = (!isAccumulated && matchingPreview) ? matchingPreview.previaValue : 0;
      const vDiaPrevia = (!isAccumulated && matchingPreview) ? matchingPreview.vendaDiaPrevia : 0;
      const pNovos = !isAccumulated ? valorVendaTotal - vDiaPrevia : 0;

      const agg: SalesRecord = {
        id: first.repId.toString(),
        age: first.age,
        repId: first.repId,
        repName: first.repName,
        coordId: first.coordId,
        coordName: first.originalCoordName || first.coordName,
        emp: uniqueEmps.join(', '),
        linha: uniqueLinhas.join(', '),
        groupId: first.groupId,
        groupName: uniqueGroups.join(', '),
        quotaCD,
        faturadoCD,
        pctCD: quotaCD > 0 ? (faturadoCD / quotaCD) * 100 : 0,
        quotaVP,
        faturadoVP,
        pctVP: quotaVP > 0 ? (faturadoVP / quotaVP) * 100 : 0,
        quotaTotal,
        faturadoTotal,
        pctTotal: quotaTotal > 0 ? (faturadoTotal / quotaTotal) * 100 : 0,
        pendenteCD,
        pendenteVP,
        faturadoEPendente,
        pctFaturadoEPendente: quotaTotal > 0 ? (faturadoEPendente / quotaTotal) * 100 : 0,
        defasagem: defasagemVal,
        valorVendaCD,
        valorVendaVP,
        valorVendaTotal,
        pctVenda: quotaTotal > 0 ? (valorVendaTotal / quotaTotal) * 100 : 0,
        previaValue: pValue,
        pedidosNovos: pNovos,
      };
      return agg;
    }).filter(r => r.quotaTotal > 0);
  }, [filteredRecords, previews, isAccumulated]);

  // Sorting logic for details table
  const sortedDetails = useMemo(() => {
    const sorted = [...aggregatedDetails];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        return sortAscending 
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      } else {
        return sortAscending
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });
    return sorted;
  }, [aggregatedDetails, sortField, sortAscending]);

  // Paginated Details list
  const currentDetailsPageData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedDetails.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedDetails, currentPage]);

  const totalPages = Math.ceil(sortedDetails.length / itemsPerPage);

  const toggleSort = (field: keyof SalesRecord) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
    setCurrentPage(1);
  };

  // Export current filtered rows to a downloadable CSV
  const exportToCSV = () => {
    const headers = isAccumulated
      ? [
          'Representante ID', 'Nome Representante', 'Coordenador', 'Grupo', 
          'Cota Total', 'Vendas Total', '% Venda', 'Defasagem'
        ]
      : [
          'Representante ID', 'Nome Representante', 'Coordenador', 'Grupo', 
          'Cota Total', 'Vendas Total', '% Venda', 'Defasagem', 'Prévia', 'Pedidos Novos'
        ];
    
    const csvRows = [
      headers.join(';'), // semicolon for Excel friendly portuguese locale parser
      ...sortedDetails.map(r => {
        const matchingPreview = previews.find(p => p.repId.toString().trim() === r.repId.toString().trim());
        const previaVal = (!isAccumulated && matchingPreview) ? matchingPreview.previaValue : 0;
        const vendaDiaPrevia = (!isAccumulated && matchingPreview) ? matchingPreview.vendaDiaPrevia : 0;
        const pedNovos = !isAccumulated ? r.valorVendaTotal - vendaDiaPrevia : 0;
        
        const rowCols = [
          r.repId,
          `"${r.repName.replace(/"/g, '""')}"`,
          `"${r.coordName.replace(/"/g, '""')}"`,
          `"${r.groupName.replace(/"/g, '""')}"`,
          r.quotaTotal.toString().replace('.', ','),
          r.valorVendaTotal.toString().replace('.', ','),
          (r.quotaTotal > 0 ? ((r.valorVendaTotal / r.quotaTotal) * 100).toFixed(1) : '0').replace('.', ','),
          r.defasagem.toString().replace('.', ',')
        ];

        if (!isAccumulated) {
          rowCols.push(previaVal.toString().replace('.', ','));
          rowCols.push(pedNovos.toString().replace('.', ','));
        }

        return rowCols.join(';');
      })
    ];

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KPI_Vendas_Tramontina_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export detailed table rows to a structured, printable PDF document
  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const periodTypeLabel = isAccumulated ? 'Acumulativo' : 'Mês Único';
    const periodStr = isAccumulated
      ? `${monthNames[accumulateStartMonth - 1]} a ${monthNames[accumulateEndMonth - 1]} / ${selectedYear}`
      : `${monthNames[selectedMonth - 1]} / ${selectedYear}`;

    // Filters summary string
    const filtersList: string[] = [];
    if (selectedCoordinator !== 'All') filtersList.push(`Coordenador: ${selectedCoordinator}`);
    if (!selectedProductGroups.includes('All')) filtersList.push(`Grupos: ${selectedProductGroups.join(', ')}`);
    if (selectedState) filtersList.push(`Estado: ${selectedState}`);
    if (userRole === 'rep' && (userRepName || userRepId)) {
      filtersList.push(`Rep. Logado: ${userRepName || `#${userRepId}`}`);
    } else if (selectedRepIdFilter) {
      filtersList.push(`Rep. ID: #${selectedRepIdFilter}`);
    } else if (searchText.trim()) {
      filtersList.push(`Filtro Busca: "${searchText}"`);
    }
    const filterSummaryStr = filtersList.length > 0 ? filtersList.join(' | ') : 'Nenhum filtro específico (Geral)';

    const nowStr = new Date().toLocaleString('pt-BR');

    // Split items into chunks of max 20 representatives per page
    const CHUNK_SIZE = 20;
    const itemsChunks: SalesRecord[][] = [];
    for (let i = 0; i < sortedDetails.length; i += CHUNK_SIZE) {
      itemsChunks.push(sortedDetails.slice(i, i + CHUNK_SIZE));
    }
    if (itemsChunks.length === 0) {
      itemsChunks.push([]);
    }

    const totalPages = itemsChunks.length;

    // Headers
    const headers = isAccumulated
      ? ['REP ID', 'Representante', 'Coordenador', 'Grupo', 'Cota Planejada', 'Vendas Total', '% Venda', 'Defasagem']
      : ['REP ID', 'Representante', 'Coordenador', 'Grupo', 'Cota Planejada', 'Vendas Total', '% Venda', 'Defasagem', 'Prévia', 'Pedidos Novos'];

    const defasagemColIndex = 7;

    itemsChunks.forEach((chunk, chunkIdx) => {
      if (chunkIdx > 0) {
        doc.addPage();
      }

      // 1. Top Header Banner (Tramontina Navy)
      doc.setFillColor(0, 26, 156); // #001A9C
      doc.rect(0, 0, 297, 10, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('TRAMONTINA - AGENTE 87', 12, 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Relatório Detalhado de Vendas', 285, 7, { align: 'right' });

      // 2. Metadata Box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(12, 12, 273, 10, 'F');
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.rect(12, 12, 273, 10, 'S');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`Tipo de Período: `, 15, 16);
      doc.setFont('helvetica', 'normal');
      doc.text(`${periodTypeLabel} (${periodStr})`, 38, 16);

      doc.setFont('helvetica', 'bold');
      doc.text(`Data de Emissão: `, 195, 16);
      doc.setFont('helvetica', 'normal');
      doc.text(nowStr, 220, 16);

      doc.setFont('helvetica', 'bold');
      doc.text(`Filtros Aplicados: `, 15, 20);
      doc.setFont('helvetica', 'normal');
      doc.text(filterSummaryStr.length > 90 ? filterSummaryStr.slice(0, 90) + '...' : filterSummaryStr, 38, 20);

      doc.setFont('helvetica', 'bold');
      doc.text(`Página: `, 195, 20);
      doc.setFont('helvetica', 'normal');
      doc.text(`${chunkIdx + 1} de ${totalPages} (${chunk.length} reps)`, 208, 20);

      // 3. Prepare Table Rows for Chunk
      const tableData = chunk.map(r => {
        const matchingPreview = previews.find(p => p.repId.toString().trim() === r.repId.toString().trim());
        const previaVal = (!isAccumulated && matchingPreview) ? matchingPreview.previaValue : 0;
        const vendaDiaPrevia = (!isAccumulated && matchingPreview) ? matchingPreview.vendaDiaPrevia : 0;
        const pedNovos = !isAccumulated ? r.valorVendaTotal - vendaDiaPrevia : 0;
        const pct = r.quotaTotal > 0 ? (r.valorVendaTotal / r.quotaTotal) * 100 : 0;

        const row = [
          r.repId.toString(),
          r.repName,
          r.coordName,
          r.groupName,
          formatCurrency(r.quotaTotal),
          formatCurrency(r.valorVendaTotal),
          `${pct.toFixed(1).replace('.', ',')}%`,
          formatDefasagem(r.defasagem)
        ];

        if (!isAccumulated) {
          row.push(formatCurrency(previaVal));
          row.push(formatCurrency(pedNovos));
        }

        return row;
      });

      // 4. Calculate adaptive padding to fill page nicely based on row count
      const dynamicPadding = chunk.length <= 10 ? 3.5 : (chunk.length <= 15 ? 2.8 : 2.2);

      // Generate autoTable for this page
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 24,
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        theme: 'striped',
        styles: {
          fontSize: 8.5,
          cellPadding: dynamicPadding,
          font: 'helvetica',
          textColor: [51, 65, 85],
          overflow: 'ellipsize'
        },
        headStyles: {
          fillColor: [15, 23, 42], // slate-900
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          cellPadding: Math.max(dynamicPadding, 2.4)
        },
        columnStyles: isAccumulated ? {
          0: { cellWidth: 18, fontStyle: 'bold' }, // REP ID
          1: { cellWidth: 60 }, // Representante
          2: { cellWidth: 48 }, // Coordenador
          3: { cellWidth: 40 }, // Grupo
          4: { halign: 'right', cellWidth: 30 }, // Cota Planejada
          5: { halign: 'right', cellWidth: 30 }, // Vendas Total
          6: { halign: 'right', cellWidth: 20, fontStyle: 'bold' }, // % Venda
          7: { halign: 'right', cellWidth: 27, fontStyle: 'bold' } // Defasagem
        } : {
          0: { cellWidth: 16, fontStyle: 'bold' }, // REP ID
          1: { cellWidth: 44 }, // Representante
          2: { cellWidth: 38 }, // Coordenador
          3: { cellWidth: 34 }, // Grupo
          4: { halign: 'right', cellWidth: 26 }, // Cota Planejada
          5: { halign: 'right', cellWidth: 26 }, // Vendas Total
          6: { halign: 'right', cellWidth: 18, fontStyle: 'bold' }, // % Venda
          7: { halign: 'right', cellWidth: 25, fontStyle: 'bold' }, // Defasagem
          8: { halign: 'right', cellWidth: 23 }, // Prévia
          9: { halign: 'right', cellWidth: 23, fontStyle: 'bold' } // Pedidos Novos
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const rowItem = chunk[data.row.index];
            if (rowItem) {
              if (data.column.index === defasagemColIndex) {
                if (rowItem.defasagem < 0) {
                  data.cell.styles.textColor = [220, 38, 38]; // Red
                  data.cell.styles.fontStyle = 'bold';
                } else {
                  data.cell.styles.textColor = [22, 163, 74]; // Green
                  data.cell.styles.fontStyle = 'bold';
                }
              }
              if (!isAccumulated && data.column.index === 9) {
                const matchingPreview = previews.find(p => p.repId.toString().trim() === rowItem.repId.toString().trim());
                const vendaDiaPrevia = matchingPreview ? matchingPreview.vendaDiaPrevia : 0;
                const pedNovos = rowItem.valorVendaTotal - vendaDiaPrevia;
                if (pedNovos < 0) {
                  data.cell.styles.textColor = [220, 38, 38];
                } else if (pedNovos > 0) {
                  data.cell.styles.textColor = [22, 163, 74];
                }
              }
            }
          }
        },
        margin: { left: 12, right: 12, top: 24, bottom: 5 }
      });

      // 5. Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Agente 87 - Tramontina | Relatório para Exportação e Impressão | Página ${chunkIdx + 1} de ${totalPages}`, 12, 203);
    });

    const periodFileSuffix = isAccumulated ? `Acumulado_${selectedYear}` : `${selectedMonth}_${selectedYear}`;
    doc.save(`Relatorio_Vendas_Tramontina_${periodFileSuffix}.pdf`);
  };

  // Export growth comparison table to PDF
  const exportGrowthToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const periodStr = isAccumulated
      ? `Acumulado: ${monthNames[accumulateStartMonth - 1]} a ${monthNames[accumulateEndMonth - 1]} (${selectedYear} vs ${selectedYear - 1})`
      : `Mês Único: ${monthNames[selectedMonth - 1]} (${selectedYear} vs ${selectedYear - 1})`;

    const nowStr = new Date().toLocaleString('pt-BR');

    // Split items into chunks of max 20 representatives per page
    const CHUNK_SIZE = 20;
    const itemsChunks: typeof sortedGrowthComparison[] = [];
    for (let i = 0; i < sortedGrowthComparison.length; i += CHUNK_SIZE) {
      itemsChunks.push(sortedGrowthComparison.slice(i, i + CHUNK_SIZE));
    }
    if (itemsChunks.length === 0) {
      itemsChunks.push([]);
    }

    const totalPages = itemsChunks.length;

    const headers = [
      'REP ID',
      'Representante',
      'Coordenador',
      `Vendas (${selectedYear - 1})`,
      `Vendas (${selectedYear})`,
      'Variação (R$)',
      'Taxa Crescimento (%)'
    ];

    itemsChunks.forEach((chunk, chunkIdx) => {
      if (chunkIdx > 0) {
        doc.addPage();
      }

      // 1. Top Header Banner
      doc.setFillColor(0, 26, 156); // Tramontina Navy
      doc.rect(0, 0, 297, 10, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('TRAMONTINA - RELATÓRIO DE CRESCIMENTO YoY', 12, 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(periodStr, 285, 7, { align: 'right' });

      // 2. Metadata Box
      doc.setFillColor(248, 250, 252);
      doc.rect(12, 12, 273, 10, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(12, 12, 273, 10, 'S');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Vendas Total ${selectedYear - 1}: ${formatCurrency(growthTotals.totalVendaAnterior)}`, 16, 18.5);
      doc.text(`Vendas Total ${selectedYear}: ${formatCurrency(growthTotals.totalVendaAtual)}`, 85, 18.5);
      
      const varColor = growthTotals.diferencaGeral >= 0 ? [22, 163, 74] : [220, 38, 38];
      doc.setTextColor(varColor[0], varColor[1], varColor[2]);
      doc.text(`Variação Líquida: ${growthTotals.diferencaGeral >= 0 ? '+' : ''}${formatCurrency(growthTotals.diferencaGeral)}`, 160, 18.5);
      doc.text(`Taxa Geral: ${growthTotals.taxaCrescimentoGeral >= 0 ? '+' : ''}${growthTotals.taxaCrescimentoGeral.toFixed(1)}%`, 235, 18.5);

      const tableData = chunk.map(r => {
        const taxStr = r.statusGrowth === 'new'
          ? '+100.0% (Novo)'
          : `${r.taxaCrescimento >= 0 ? '+' : ''}${r.taxaCrescimento.toFixed(1)}%`;

        return [
          `#${r.repId}`,
          r.repName,
          r.coordName,
          formatCurrency(r.vendaAnterior),
          formatCurrency(r.vendaAtual),
          `${r.diferencaVenda >= 0 ? '+' : ''}${formatCurrency(r.diferencaVenda)}`,
          taxStr
        ];
      });

      const dynamicPadding = chunk.length <= 10 ? 3.5 : (chunk.length <= 15 ? 2.8 : 2.2);

      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 24,
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        theme: 'striped',
        styles: {
          fontSize: 8.5,
          cellPadding: dynamicPadding,
          font: 'helvetica',
          textColor: [51, 65, 85],
          overflow: 'ellipsize'
        },
        headStyles: {
          fillColor: [0, 26, 156],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
          1: { halign: 'left', cellWidth: 60 },
          2: { halign: 'left', cellWidth: 50 },
          3: { halign: 'right', cellWidth: 38 },
          4: { halign: 'right', cellWidth: 38 },
          5: { halign: 'right', cellWidth: 37, fontStyle: 'bold' },
          6: { halign: 'center', cellWidth: 30, fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const rowItem = chunk[data.row.index];
            if (rowItem) {
              // Color variation column (R$)
              if (data.column.index === 5) {
                if (rowItem.diferencaVenda < 0) {
                  data.cell.styles.textColor = [220, 38, 38]; // Red
                } else if (rowItem.diferencaVenda > 0) {
                  data.cell.styles.textColor = [22, 163, 74]; // Green
                }
              }
              // Color growth rate column (%)
              if (data.column.index === 6) {
                if (rowItem.statusGrowth === 'new' || rowItem.taxaCrescimento > 0) {
                  data.cell.styles.textColor = [22, 163, 74];
                } else if (rowItem.taxaCrescimento < 0) {
                  data.cell.styles.textColor = [220, 38, 38];
                }
              }
            }
          }
        },
        margin: { left: 12, right: 12, top: 24, bottom: 5 }
      });

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Agente 87 - Tramontina | Relatório de Crescimento YoY | Gerado em ${nowStr} | Página ${chunkIdx + 1} de ${totalPages}`, 12, 203);
    });

    doc.save(`comparativo_crescimento_${selectedYear}_vs_${selectedYear - 1}.pdf`);
  };

  // Export growth comparison data to CSV
  const exportGrowthToCSV = () => {
    const headers = ['REP ID', 'Representante', 'Coordenador', `Vendas ${selectedYear - 1}`, `Vendas ${selectedYear}`, 'Variação R$', 'Taxa Crescimento %'];
    const rows = sortedGrowthComparison.map(r => [
      r.repId,
      `"${r.repName.replace(/"/g, '""')}"`,
      `"${r.coordName.replace(/"/g, '""')}"`,
      r.vendaAnterior.toFixed(2).replace('.', ','),
      r.vendaAtual.toFixed(2).replace('.', ','),
      r.diferencaVenda.toFixed(2).replace('.', ','),
      (r.statusGrowth === 'new' ? '100,0' : r.taxaCrescimento.toFixed(2).replace('.', ','))
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `comparativo_crescimento_${selectedYear}_vs_${selectedYear - 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export representative sales percentage to a high-quality JPEG image
  const exportPctVendasToJPG = () => {
    const periodText = isAccumulated
      ? `Período: ${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][accumulateStartMonth - 1]} a ${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][accumulateEndMonth - 1]} / ${selectedYear}`
      : `Período: ${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][selectedMonth - 1]} / ${selectedYear}`;

    const width = 800;
    const headerHeight = 120;
    const columnHeaderHeight = 40;
    const rowHeight = 35;
    const footerHeight = 60;
    const rows = sortedDetails;
    const totalRows = rows.length;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = headerHeight + columnHeaderHeight + (totalRows * rowHeight) + footerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, canvas.height);

    // 2. Draw Header Blue bar
    ctx.fillStyle = '#001A9C';
    ctx.fillRect(0, 0, width, headerHeight);

    // 3. Draw Header Title and branding
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Agente 87 - Ferramentas', width - 40, 45);

    ctx.fillStyle = '#93C5FD'; // Light blue 300
    ctx.font = 'bold 11px Arial, Helvetica, sans-serif';
    ctx.fillText('RELATÓRIO DE PERCENTUAL DE VENDAS', width - 40, 70);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial, Helvetica, sans-serif';
    ctx.fillText(periodText, width - 40, 92);

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 133.33 20" width="133.33" height="20">
      <polygon fill="#FFFFFF" points="4.06 0 0 3.41 0 4.2 10.52 4.2 6.9 7.17 6.9 20 7.7 20 12.16 16.25 12.16 4.2 16.33 4.2 20.39 .79 20.39 0 4.06 0"/>
      <path fill="#FFFFFF" d="M28.16,6.44h-3.27v-2.24h8.99v2.24h-3.27v9.8h-2.45V6.44ZM35.23,4.2h4.7c2.98,0,4.46,1.42,4.46,3.82,0,1.75-1.35,3.34-3.6,3.58l3.43,4.64h-2.86l-3.35-4.6h-.33v4.6h-2.45V4.2ZM41.85,8.03c0-1.18-.78-1.71-2.17-1.71h-2v3.74h1.59c1.72,0,2.57-.53,2.57-2.03ZM49.86,4.2h1.23l5.03,12.04h-2.58l-.78-2.03h-4.58l-.78,2.03h-2.53l4.99-12.04ZM52.07,12.38l-1.51-4.07h-.16l-1.51,4.07h3.19ZM56.93,4.2h2.53l3.52,7.04h.08l3.64-7.04h2.49v12.04h-2.45v-6.83h-.16l-3.39,5.94h-.45l-3.19-5.94h-.16v6.83h-2.45V4.2ZM70.63,10.27c0-3.86,2.66-6.27,6.09-6.27s5.97,2.4,5.97,6.22-2.66,6.22-6.05,6.22-6.01-2.4-6.01-6.18ZM80.07,10.23c0-2.32-1.43-3.95-3.39-3.95s-3.43,1.63-3.43,3.95,1.43,3.95,3.43,3.95,3.39-1.63,3.39-3.95ZM84.11,4.2h1.23l6.34,7h.16v-7h2.45v12.04h-1.23l-6.34-7h-.16v7h-2.45V4.2ZM99.16,6.44h-3.27v-2.24h8.99v2.24h-3.27v9.8h-2.45V6.44ZM106.39,4.2h2.45v12.04h-2.45V4.2ZM111.13,4.2h1.47l6.09,7h.16v-7h2.45v12.04h-1.47l-6.09-7h-.16v7h-2.45V4.2ZM127.07,4.2h1.23l5.03,12.04h-2.57l-.78-2.03h-4.58l-.78,2.03h-2.53l4.99-12.04ZM129.28,12.38l-1.51-4.07h-.16l-1.51,4.07h3.19Z"/>
    </svg>`;

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const finishDrawing = () => {
      // 5. Draw Column Headers Row
      const colY = headerHeight;
      ctx.fillStyle = '#F1F5F9'; // Slate 100 background
      ctx.fillRect(0, colY, width, columnHeaderHeight);

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, colY + columnHeaderHeight);
      ctx.lineTo(width, colY + columnHeaderHeight);
      ctx.stroke();

      ctx.fillStyle = '#475569'; // Slate 600
      ctx.font = 'bold 11px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('REP ID', 40, colY + 24);
      ctx.fillText('REPRESENTANTE', 110, colY + 24);
      ctx.fillText('DESEMPENHO GRÁFICO', 480, colY + 24);
      ctx.textAlign = 'right';
      ctx.fillText('% VENDA', width - 40, colY + 24);

      // 6. Draw Table Rows
      for (let i = 0; i < totalRows; i++) {
        const r = rows[i];
        const rowY = headerHeight + columnHeaderHeight + (i * rowHeight);

        // Background
        ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        ctx.fillRect(0, rowY, width, rowHeight);

        // Row border
        ctx.strokeStyle = '#F1F5F9';
        ctx.beginPath();
        ctx.moveTo(0, rowY + rowHeight);
        ctx.lineTo(width, rowY + rowHeight);
        ctx.stroke();

        // Rep ID
        ctx.fillStyle = '#0F172A'; // Slate 900
        ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(r.repId.toString(), 40, rowY + 22);

        // Rep Name
        ctx.fillStyle = '#334155'; // Slate 700
        ctx.font = '12px Arial, Helvetica, sans-serif';
        const originalRep = allRecords.find(x => x.repId === r.repId);
        let displayName = originalRep ? originalRep.repName : r.repName;
        if (displayName.length > 40) {
          displayName = displayName.substring(0, 38) + '...';
        }
        ctx.fillText(displayName, 110, rowY + 22);

        // Progress bar visual representation of pctVenda
        const pctVal = r.pctVenda;
        const barX = 480;
        const barY = rowY + 14;
        const barW = 200;
        const barH = 8;

        // Progress bar background (gray track)
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(barX, barY, barW, barH);

        // Progress bar fill
        let pctColor = '#001A9C'; // Tramontina Blue
        if (pctVal >= 100) {
          pctColor = '#16A34A'; // Green 600
        } else if (pctVal < 70) {
          pctColor = '#DC2626'; // Red 600
        } else {
          pctColor = '#001A9C'; // Blue
        }

        ctx.fillStyle = pctColor;
        const fillW = Math.min(barW, Math.max(0, (pctVal / 100) * barW));
        ctx.fillRect(barX, barY, fillW, barH);

        // Textual Percentage Value
        ctx.fillStyle = pctColor;
        ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${pctVal.toFixed(1)}%`, width - 40, rowY + 22);
      }

      // 7. Draw Footer
      const footerY = canvas.height - footerHeight;
      ctx.fillStyle = '#F8FAFC'; // Slate 50
      ctx.fillRect(0, footerY, width, footerHeight);

      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(0, footerY);
      ctx.lineTo(width, footerY);
      ctx.stroke();

      ctx.fillStyle = '#64748B'; // Slate 500
      ctx.font = '9px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Gerado via Agente 87 - Performance de Representantes Tramontina Ferramentas', width / 2, footerY + 25);
      ctx.fillText(`Data de Exportação: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, width / 2, footerY + 40);

      // 8. Download
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `Exportacao_Percentual_Vendas_${new Date().toISOString().slice(0,10)}.jpg`;
          link.click();
          URL.revokeObjectURL(downloadUrl);
        }
      }, 'image/jpeg', 0.95);
    };

    img.onload = () => {
      ctx.drawImage(img, 40, 32, 160, 24);
      URL.revokeObjectURL(url);
      finishDrawing();
    };

    img.onerror = () => {
      // Draw text as fallback if SVG image fails
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('TRAMONTINA', 40, 48);
      
      URL.revokeObjectURL(url);
      finishDrawing();
    };

    img.src = url;
  };

  // Find the selected representative for the detailed group-split modal
  const repDetailData = useMemo(() => {
    if (selectedRepDetailId === null) return null;
    const items = filteredRecords.filter(r => r.repId === selectedRepDetailId);
    if (!items.length) return null;
    
    let quota = 0;
    let faturado = 0;
    let valorVenda = 0;
    
    items.forEach(i => {
      quota += i.quotaTotal;
      faturado += i.faturadoTotal;
      valorVenda += i.valorVendaTotal;
    });

    const defasagem = valorVenda - quota;

    // Aggregate by mapped product group
    const aggregatedByGroup: { [key: string]: { mappedGroupName: string; quotaTotal: number; valorVendaTotal: number; defasagem: number } } = {};
    
    items.forEach(r => {
      const mappedGroupName = getMappedGroupName(r.groupName);
      if (!aggregatedByGroup[mappedGroupName]) {
        aggregatedByGroup[mappedGroupName] = {
          mappedGroupName,
          quotaTotal: 0,
          valorVendaTotal: 0,
          defasagem: 0
        };
      }
      aggregatedByGroup[mappedGroupName].quotaTotal += r.quotaTotal;
      aggregatedByGroup[mappedGroupName].valorVendaTotal += r.valorVendaTotal;
      aggregatedByGroup[mappedGroupName].defasagem += r.defasagem;
    });

    const aggregatedRows = ALLOWED_PRODUCT_GROUPS
      .map(gName => aggregatedByGroup[gName])
      .filter(Boolean);

    return {
      repId: selectedRepDetailId,
      repName: items[0].repName,
      coordName: items[0].originalCoordName || items[0].coordName,
      quota,
      faturado: valorVenda,
      defasagem,
      valorVenda,
      percent: quota > 0 ? (valorVenda / quota) * 100 : 0,
      rows: aggregatedRows
    };
  }, [filteredRecords, selectedRepDetailId]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-y-auto">
        {/* Decorative background elements - fully non-interactive and styled cleanly */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-100 pointer-events-none z-0" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[280px] h-[280px] sm:w-[500px] sm:h-[500px] bg-[#001A9C]/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-1/4 -right-1/4 w-[300px] h-[300px] bg-slate-200/40 rounded-full blur-[100px] pointer-events-none z-0" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-sm bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl space-y-6 sm:space-y-8"
        >
          {/* Logo and Brand */}
          <div className="text-center space-y-3">
            <div className="mx-auto flex items-center justify-center">
              <svg viewBox="0 0 20.39 20" className="w-12 h-12 text-[#001A9C]" fill="currentColor">
                <polygon points="4.06 0 0 3.41 0 4.2 10.52 4.2 6.9 7.17 6.9 20 7.7 20 12.16 16.25 12.16 4.2 16.33 4.2 20.39 .79 20.39 0 4.06 0" />
              </svg>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Agente 87 - Ferramentas</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Acesso Restrito • Digite a senha do Administrador ou do Representante</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} autoComplete="off" className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center" htmlFor="main_access_password">
                Senha de Acesso
              </label>
              <input
                id="main_access_password"
                name="main_access_password"
                type="password"
                value={passwordInput}
                autoComplete="new-password"
                data-lpignore="true"
                spellCheck={false}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (authError) setAuthError('');
                }}
                placeholder="Digite sua senha"
                className="w-full tracking-wider text-center text-sm font-bold py-3 px-4 bg-slate-50 border border-slate-200 focus:border-[#001A9C] focus:bg-white rounded-xl sm:rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#001A9C]/5 transition-all font-sans"
                autoFocus
              />
              {authError && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-rose-600 font-bold text-center mt-2"
                >
                  {authError}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#001A9C] hover:bg-blue-800 active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-[#001A9C]/10 hover:shadow-[#001A9C]/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Acessar Painel</span>
            </button>
          </form>

          {/* Notice footer */}
          <p className="text-[10px] text-slate-450 text-center font-medium leading-relaxed">
            Este painel contém informações de vendas confidenciais.<br />
            Se você não tiver acesso autorizado, por favor feche esta aba.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-12 antialiased border-8 border-slate-900">
      {/* Dynamic Sub-Record modal drawer */}
      <AnimatePresence>
        {repDetailData && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRepDetailId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 180 }}
              className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-100"
            >
              {/* Drawer header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-600">ID: #{repDetailData.repId}</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5 truncate max-w-sm">{repDetailData.repName}</h3>
                  <p className="text-xs text-slate-500 font-medium">Coordenador(a): <strong className="text-slate-700">{repDetailData.coordName}</strong></p>
                </div>
                <button 
                  onClick={() => setSelectedRepDetailId(null)}
                  className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer stats overview */}
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-xs">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cota Acumulada</span>
                  <span className="block text-sm font-bold text-slate-800 mt-1">{formatCurrency(repDetailData.quota)}</span>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-xs">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Vendas Total</span>
                  <span className="block text-sm font-bold text-slate-800 mt-1">{formatCurrency(repDetailData.faturado)}</span>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-xs">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Defasagem</span>
                  <span className={`block text-sm font-bold mt-1 ${repDetailData.defasagem >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {repDetailData.defasagem >= 0 ? '+' : ''}{formatCurrency(repDetailData.defasagem)}
                  </span>
                </div>
              </div>

              {/* Drawer YoY growth comparison banner */}
              {(() => {
                const repGrowth = repsGrowthComparison.find(g => g.repId === repDetailData.repId);
                if (!repGrowth) return null;

                return (
                  <div className="mx-6 mt-4 p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-xs border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        Crescimento YoY ({selectedYear} vs {selectedYear - 1})
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        repGrowth.statusGrowth === 'new' || repGrowth.taxaCrescimento > 0
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : repGrowth.taxaCrescimento < 0
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-700 text-slate-300 border-slate-600'
                      }`}>
                        {repGrowth.statusGrowth === 'new'
                          ? '+100% (Novo Representante)'
                          : `${repGrowth.taxaCrescimento >= 0 ? '+' : ''}${repGrowth.taxaCrescimento.toFixed(1)}%`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80 text-xs">
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium">Vendas {selectedYear - 1}</span>
                        <span className="block font-bold text-slate-200 mt-0.5">{formatCurrency(repGrowth.vendaAnterior)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium">Vendas {selectedYear}</span>
                        <span className="block font-bold text-white mt-0.5">{formatCurrency(repGrowth.vendaAtual)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium">Variação R$</span>
                        <span className={`block font-bold mt-0.5 ${repGrowth.diferencaVenda >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {repGrowth.diferencaVenda >= 0 ? '+' : ''}{formatCurrency(repGrowth.diferencaVenda)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Drawer detailed list of groups */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Divisão de Cotas por Grupo ({repDetailData.rows.length})
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    % Venda: {formatPercent(repDetailData.percent)}
                  </span>
                </div>

                <div className="space-y-3.5">
                  {repDetailData.rows.map((row, idx) => {
                    const rowAch = row.quotaTotal > 0 ? (row.valorVendaTotal / row.quotaTotal) * 100 : 0;
                    return (
                      <div key={idx} className="p-4 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{row.mappedGroupName}</h4>
                          </div>
                          <span className={`text-xs font-extrabold ${rowAch >= 100 ? 'text-emerald-600' : rowAch >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {rowAch.toFixed(1)}%
                          </span>
                        </div>

                        {/* Visual progression track line */}
                        <div className="space-y-1">
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                rowAch >= 100 ? 'bg-emerald-500' : rowAch >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(rowAch, 100)}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between items-center text-[11px] text-slate-500">
                            <span>Quo: <strong>{formatCurrency(row.quotaTotal)}</strong></span>
                            <span>Vnd: <strong className="text-slate-800">{formatCurrency(row.valorVendaTotal)}</strong></span>
                            <span>Def: <strong className={row.defasagem >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{formatCurrency(row.defasagem)}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-4 lg:pt-8 grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        
        {/* LEFT COMPACT FILTER CONTROLS SIDEBAR */}
        <section className="lg:col-span-1 space-y-3 lg:space-y-5 lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="bg-white border border-slate-200 p-3.5 lg:p-5 rounded-2xl shadow-sm space-y-3.5 lg:space-y-6 text-slate-700">
            {/* Logo area with top right Logoff button */}
            <div className="pb-3 border-b border-slate-150 flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    setActiveTab('geral');
                    resetFilters();
                    handleShowCurrentData();
                  }}
                  className="flex items-center justify-start focus:outline-none cursor-pointer group transition-all text-left"
                  title="Ir para a Home do Painel"
                >
                  <TramontinaLogo className="h-5 w-auto text-[#001A9C] group-hover:scale-102 transition-transform" fillColor="#001A9C" />
                </button>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-450">
                  Agente 87 {userRole === 'rep' ? `• Rep. ${userRepName || `#${userRepId}`}` : `• Admin${userAdminName && userAdminName !== 'Geral' ? ` (${userAdminName})` : ''}`}
                </span>
              </div>

              {/* Logoff Button in Top Right Corner */}
              <button
                type="button"
                onClick={handleLogoff}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-3xs shrink-0"
                title="Fazer Logoff do sistema"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Sair</span>
              </button>
            </div>

            {/* Compact and discrete last update info without balloon/icons */}
            <div className="text-[11px] font-medium text-slate-500 pb-1.5 border-b border-slate-100 space-y-1">
              <div>
                Período: <strong className="text-slate-800 font-extrabold">
                  {isAccumulated 
                    ? `${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][accumulateStartMonth - 1]} a ${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][accumulateEndMonth - 1]} / ${selectedYear}`
                    : `${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][selectedMonth - 1]} / ${selectedYear}`
                  }
                </strong>
              </div>
              <div>
                Última atualização: <strong className="text-slate-800 font-extrabold">{currentPeriodUpdateDate ? formatUpdateDateTimeCompact(currentPeriodUpdateDate) : 'Sem envio'}</strong>
              </div>
            </div>

            {/* Mobile Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileFiltersExpanded(!isMobileFiltersExpanded)}
              className="w-full lg:hidden py-1.5 px-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition-all cursor-pointer shadow-3xs"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#001A9C]" />
                <span className="font-extrabold text-[#001A9C]">Filtros</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-[#001A9C]/10 text-[#001A9C] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                  {isMobileFiltersExpanded ? 'Minimizar' : 'Expandir'}
                </span>
                {isMobileFiltersExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>

            {/* Mobile Quick Action Buttons (visible up to 5th day of month without expanding filters) */}
            {isUpToFifthDay && (
              <div className="flex flex-col gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={handleShowPreviousMonthData}
                  className="w-full py-1.5 px-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs group"
                  title="Visualizar KPIs de venda do último arquivo enviado do mês anterior"
                >
                  <History className="w-3.5 h-3.5 text-white group-hover:-translate-x-0.5 transition-transform" />
                  <span>Mostrar mês anterior</span>
                </button>

                <button
                  type="button"
                  onClick={handleShowCurrentData}
                  className="w-full py-1.5 px-3 bg-blue-50/50 hover:bg-[#001A9C]/10 text-[#001A9C] border border-[#001A9C]/10 hover:border-[#001A9C]/20 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs group"
                  title="Voltar para o último período com dados (mês ativo)"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#001A9C] group-hover:translate-y-[-1px] transition-transform" />
                  <span>Mostrar dados atuais</span>
                </button>
              </div>
            )}

            {/* Wrapped filters block - collapsible on mobile, always visible on large screens */}
            <div className={`space-y-4 lg:space-y-6 lg:block ${isMobileFiltersExpanded ? 'block' : 'hidden'}`}>
              {/* Seleção de Período (Mês / Ano) */}
            <div className="space-y-2.5 lg:space-y-3.5 pb-3 lg:pb-4 border-b border-slate-150">
              {/* Botão Mostrar mês anterior (Desktop) */}
              {isUpToFifthDay && (
                <button
                  type="button"
                  onClick={handleShowPreviousMonthData}
                  className="w-full hidden lg:flex py-1.5 px-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-extrabold transition-all items-center justify-center gap-1.5 cursor-pointer shadow-3xs group"
                  title="Visualizar KPIs de venda do último arquivo enviado do mês anterior"
                >
                  <History className="w-3.5 h-3.5 text-white group-hover:-translate-x-0.5 transition-transform" />
                  <span>Mostrar mês anterior</span>
                </button>
              )}

              {/* Botão Mostrar Dados Atuais */}
              <button
                type="button"
                onClick={handleShowCurrentData}
                className={`w-full py-1.5 px-3 bg-blue-50/50 hover:bg-[#001A9C]/10 text-[#001A9C] border border-[#001A9C]/10 hover:border-[#001A9C]/20 rounded-xl text-xs font-extrabold transition-all items-center justify-center gap-1.5 cursor-pointer shadow-3xs group ${
                  isUpToFifthDay ? 'hidden lg:flex' : 'flex'
                }`}
                title="Voltar para o último período com dados (mês ativo)"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#001A9C] group-hover:translate-y-[-1px] transition-transform" />
                <span>Mostrar dados atuais</span>
              </button>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowPeriodFilter(!showPeriodFilter)}
                  className={`w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    showPeriodFilter 
                      ? 'bg-blue-50/70 border-[#001A9C]/30 shadow-2xs' 
                      : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      showPeriodFilter ? 'bg-[#001A9C] text-white' : 'bg-slate-200/70 text-slate-600 group-hover:bg-slate-300/60'
                    }`}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 block">Analisar por Período</span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        {showPeriodFilter ? 'Escolha mês, ano ou acumulado' : 'Clique para personalizar período'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isLoadingPeriod && (
                      <RefreshCw className="w-3.5 h-3.5 text-[#001A9C] animate-spin" />
                    )}
                    {showPeriodFilter ? (
                      <ChevronUp className="w-4 h-4 text-[#001A9C]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    )}
                  </div>
                </button>
              </div>
              
              {showPeriodFilter && (
                <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200 shadow-3xs space-y-3 animate-fade-in mt-1.5">
                  {/* Segmented Control: Mês Único vs Acumulado */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Tipo de Análise</span>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/60 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setTempIsAccumulated(false);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                          !tempIsAccumulated
                            ? 'bg-white text-[#001A9C] shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Mês Único
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTempIsAccumulated(true);
                          setTempAccumulateStartMonth(1);
                          setTempAccumulateEndMonth(tempMonth);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                          tempIsAccumulated
                            ? 'bg-white text-[#001A9C] shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Acumulado
                      </button>
                    </div>
                  </div>

                  {tempIsAccumulated ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Ano de Análise</span>
                        <select
                          value={tempYear}
                          onChange={(e) => {
                            setTempYear(parseInt(e.target.value));
                          }}
                          className="w-full text-xs bg-white border border-slate-200 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-800 font-bold cursor-pointer"
                        >
                          {[2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Mês Inicial (De)</span>
                          <select
                            value={tempAccumulateStartMonth}
                            onChange={(e) => {
                              setTempAccumulateStartMonth(parseInt(e.target.value));
                            }}
                            className="w-full text-xs bg-white border border-slate-200 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-800 font-bold cursor-pointer"
                          >
                            {[
                              { value: 1, label: 'Jan' },
                              { value: 2, label: 'Fev' },
                              { value: 3, label: 'Mar' },
                              { value: 4, label: 'Abr' },
                              { value: 5, label: 'Mai' },
                              { value: 6, label: 'Jun' },
                              { value: 7, label: 'Jul' },
                              { value: 8, label: 'Ago' },
                              { value: 9, label: 'Set' },
                              { value: 10, label: 'Out' },
                              { value: 11, label: 'Nov' },
                              { value: 12, label: 'Dez' }
                            ].map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Mês Final (Até)</span>
                          <select
                            value={tempAccumulateEndMonth}
                            onChange={(e) => {
                              setTempAccumulateEndMonth(parseInt(e.target.value));
                            }}
                            className="w-full text-xs bg-white border border-slate-200 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-800 font-bold cursor-pointer"
                          >
                            {[
                              { value: 1, label: 'Jan' },
                              { value: 2, label: 'Fev' },
                              { value: 3, label: 'Mar' },
                              { value: 4, label: 'Abr' },
                              { value: 5, label: 'Mai' },
                              { value: 6, label: 'Jun' },
                              { value: 7, label: 'Jul' },
                              { value: 8, label: 'Ago' },
                              { value: 9, label: 'Set' },
                              { value: 10, label: 'Out' },
                              { value: 11, label: 'Nov' },
                              { value: 12, label: 'Dez' }
                            ].map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Mês</span>
                        <select
                          value={tempMonth}
                          onChange={(e) => {
                            setTempMonth(parseInt(e.target.value));
                          }}
                          className="w-full text-xs bg-white border border-slate-200 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-800 font-bold cursor-pointer"
                        >
                          {[
                            { value: 1, label: 'Janeiro' },
                            { value: 2, label: 'Fevereiro' },
                            { value: 3, label: 'Março' },
                            { value: 4, label: 'Abril' },
                            { value: 5, label: 'Maio' },
                            { value: 6, label: 'Junho' },
                            { value: 7, label: 'Julho' },
                            { value: 8, label: 'Agosto' },
                            { value: 9, label: 'Setembro' },
                            { value: 10, label: 'Outubro' },
                            { value: 11, label: 'Novembro' },
                            { value: 12, label: 'Dezembro' }
                          ].map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Ano</span>
                        <select
                          value={tempYear}
                          onChange={(e) => {
                            setTempYear(parseInt(e.target.value));
                          }}
                          className="w-full text-xs bg-white border border-slate-200 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-800 font-bold cursor-pointer"
                        >
                          {[2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Apply Period Filter Button */}
                  <button
                    type="button"
                    onClick={handleApplyPeriodFilter}
                    className="w-full mt-2 py-2 px-3 bg-[#001A9C] hover:bg-[#00147a] text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs active:scale-[0.99]"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Aplicar Filtro de Período</span>
                  </button>
                </div>
              )}


            </div>

            {/* Keyword / Representative Search */}
            <div className="space-y-1.5">
              {userRole === 'rep' ? (
                <div className="bg-blue-50/80 border border-blue-200/80 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#001A9C] text-white rounded-lg">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-800/70 block">Representante Ativo</span>
                      <span className="text-xs font-black text-slate-900 block">#{userRepId} - {userRepName}</span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-blue-100 text-[#001A9C] font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                    Seus Dados
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar representante..."
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setCurrentPage(1);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-800 text-xs placeholder-slate-400 font-medium transition-all"
                  />

                  {showSuggestions && searchText.trim() !== '' && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto py-1.5 divide-y divide-slate-50 animate-fade-in">
                      {searchSuggestions.map(rep => (
                        <button
                          key={rep.repId}
                          type="button"
                          onMouseDown={() => {
                            setSelectedRepIdFilter(rep.repId);
                            setSearchText(rep.repName);
                            setShowSuggestions(false);
                            setIsMobileFiltersExpanded(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 flex flex-col cursor-pointer transition-colors"
                        >
                          <span className="text-xs font-bold text-slate-800 truncate">{rep.repName}</span>
                          <span className="text-[10px] text-slate-400 font-semibold font-mono">Código: #{rep.repId}</span>
                        </button>
                      ))}
                      {searchSuggestions.length === 0 && (
                        <div className="px-3 py-3 text-center text-slate-400 text-xs">
                          Nenhum representante encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Coordinator Selector List */}
            {userRole === 'admin' && (
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Coordenador</label>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCoordinator('All');
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer truncate ${
                      selectedCoordinator === 'All'
                        ? 'bg-[#001A9C] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedCoordinator === 'All' ? 'bg-white' : 'bg-slate-300'}`} />
                    <span className="truncate">Todos</span>
                  </button>
                  {distinctCoordinators.map(c => {
                    const firstName = c.trim().split(/\s+/)[0];
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setSelectedCoordinator(c);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer truncate ${
                          selectedCoordinator === c
                            ? 'bg-[#001A9C] text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                        title={c}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedCoordinator === c ? 'bg-white' : 'bg-[#001A9C]'}`} />
                        <span className="truncate">
                          <span className="lg:hidden">{firstName}</span>
                          <span className="hidden lg:inline">{c}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Group Filter (Grupo de Produtos) Checkboxes */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Grupo de Produtos</label>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
                {/* "Todos" Checkbox */}
                <label className="col-span-2 lg:col-span-1 flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedProductGroups.includes('All')}
                    onChange={() => {
                      if (selectedProductGroups.includes('All')) {
                        setSelectedProductGroups([]);
                      } else {
                        setSelectedProductGroups(['All']);
                      }
                      setCurrentPage(1);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-[#001A9C] focus:ring-[#001A9C]/20 cursor-pointer accent-[#001A9C]"
                  />
                  <span>Todos</span>
                </label>

                {/* Individual dynamic allowed groups as checkboxes */}
                {distinctProductGroups.map(g => {
                  const isChecked = selectedProductGroups.includes('All') || selectedProductGroups.includes(g);
                  const shortName = g.replace(/^Tramontina\s+/i, '');
                  return (
                    <label key={g} className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          let updated: string[];
                          if (selectedProductGroups.includes('All')) {
                            updated = distinctProductGroups.filter(item => item !== g);
                          } else if (selectedProductGroups.includes(g)) {
                            updated = selectedProductGroups.filter(item => item !== g);
                          } else {
                            updated = [...selectedProductGroups, g];
                          }

                          if (updated.length === distinctProductGroups.length) {
                            updated = ['All'];
                          }
                          setSelectedProductGroups(updated);
                          setCurrentPage(1);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-[#001A9C] focus:ring-[#001A9C]/20 cursor-pointer accent-[#001A9C]"
                      />
                      <span className="truncate">
                        <span className="lg:hidden">{shortName}</span>
                        <span className="hidden lg:inline">{g}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Sales Type Filter (Tipo de Venda: CD e VP) */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Tipo de Venda</label>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                {/* "CD" Checkbox */}
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedSalesTypes.includes('CD')}
                    onChange={() => {
                      let updated = [...selectedSalesTypes];
                      if (updated.includes('CD')) {
                        updated = updated.filter(s => s !== 'CD');
                      } else {
                        updated.push('CD');
                      }
                      if (updated.length === 0) {
                        updated = ['CD', 'VP'];
                      }
                      setSelectedSalesTypes(updated);
                      setCurrentPage(1);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-[#001A9C] focus:ring-[#001A9C]/20 cursor-pointer accent-[#001A9C]"
                  />
                  <span>Venda CD</span>
                </label>

                {/* "VP" Checkbox */}
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedSalesTypes.includes('VP')}
                    onChange={() => {
                      let updated = [...selectedSalesTypes];
                      if (updated.includes('VP')) {
                        updated = updated.filter(s => s !== 'VP');
                      } else {
                        updated.push('VP');
                      }
                      if (updated.length === 0) {
                        updated = ['CD', 'VP'];
                      }
                      setSelectedSalesTypes(updated);
                      setCurrentPage(1);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-[#001A9C] focus:ring-[#001A9C]/20 cursor-pointer accent-[#001A9C]"
                  />
                  <span>Venda VP</span>
                </label>
              </div>
            </div>

            {/* Achievement Rate Filter - Hidden on Mobile */}
            <div className="hidden lg:block space-y-2 border-t border-slate-100 pt-3">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Desempenho (% Total)</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'All', label: 'Todos' },
                  { id: '100+', label: 'Meta 100%+' },
                  { id: '75-99', label: '75-99%' },
                  { id: 'under-75', label: 'Abaixo 75%' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setProgressThreshold(opt.id);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                      progressThreshold === opt.id 
                        ? 'bg-[#001A9C] border-[#001A9C] text-white font-bold shadow-xs' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter stats footer - Hidden on Mobile */}
            <div className="pt-3 border-t border-slate-100 hidden lg:flex items-center justify-between text-xs text-slate-450 font-bold">
              <span>Registros filtrados:</span>
              <strong className="text-slate-800 text-xs font-sans font-extrabold">{filteredRecords.length} / {allRecords.length}</strong>
            </div>

            {/* Mobile "Filtrar" action button at the bottom */}
            <div className="pt-3 border-t border-slate-100 lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileFiltersExpanded(false)}
                className="w-full py-2.5 px-4 bg-[#001A9C] hover:bg-[#00147a] active:bg-[#000f60] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Filter className="w-4 h-4" />
                <span>Filtrar</span>
              </button>
            </div>
            </div>
          </div>
        </section>

        {/* RIGHT METRICS GRID AND TABBED CONTROLLERS */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Bento row of Core metrics cards (Filtered live) */}
          {allRecords.length > 0 && activeTab !== 'sell_out' && (
            <>
              {selectedRepIdFilter !== null && (
                <div className="bg-emerald-50/70 border border-emerald-150 p-3.5 rounded-2xl flex items-center justify-between shadow-3xs animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Representante</span>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">
                        {(() => {
                          const rep = resolvedRecords.find(r => r.repId === selectedRepIdFilter);
                          return rep ? `${rep.repName} (Cód: ${rep.repId})` : `Cód: ${selectedRepIdFilter}`;
                        })()}
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRepIdFilter(null);
                      setSearchText('');
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-emerald-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                  >
                    <span>Limpar filtro</span>
                  </button>
                </div>
              )}

              {selectedState && (
                <div className="bg-indigo-50/70 border border-indigo-150 p-3.5 rounded-2xl flex items-center justify-between shadow-3xs animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#001A9C]/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-[#001A9C]" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Filtro de Estado Ativo</span>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">
                        {BRAZIL_STATES.find(s => s.uf === selectedState)?.name || selectedState} ({selectedState})
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedState(null)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[#001A9C] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                  >
                    <span>Limpar Filtro de Estado</span>
                  </button>
                </div>
              )}

              {(!selectedSalesTypes.includes('CD') || !selectedSalesTypes.includes('VP')) && (
                <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl flex items-center justify-between shadow-3xs animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Filter className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-600/80 tracking-wider">Filtro de Tipo de Venda</span>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">
                        Exibindo apenas: {selectedSalesTypes.includes('CD') ? 'Venda CD' : 'Venda VP'}
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSalesTypes(['CD', 'VP'])}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-amber-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                  >
                    <span>Exibir Ambos</span>
                  </button>
                </div>
              )}

              {/* METRIC CARDS GRID ACCORDING TO SELECTED SALES TYPE */}
              {selectedSalesTypes.includes('CD') && selectedSalesTypes.includes('VP') ? (
                <div className="space-y-4">
                  {/* SECTION 1: TOTAL GERAL */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                    <MetricCard
                      title="Cota Total"
                      value={formatCurrency(activeTotals.quotaTotal)}
                      icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
                      accentColor="blue"
                    />
                    <MetricCard
                      title="Vendas Total"
                      value={formatCurrency(activeTotals.valorVendaTotal)}
                      icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
                      accentColor="blue"
                    />
                    <MetricCard
                      title="% Vendas Total"
                      value={formatPercent(activeTotals.achTotal)}
                      icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
                      accentColor="blue"
                    />
                    <MetricCard
                      title="Defasagem Total"
                      value={formatDefasagem(activeTotals.defasagem)}
                      icon={activeTotals.defasagem >= 0 ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
                      accentColor={activeTotals.defasagem >= 0 ? "emerald" : "rose"}
                      valueClassName={activeTotals.defasagem >= 0 ? "text-emerald-600" : "text-rose-600"}
                    />
                  </div>

                  {/* SECTION 2: CANAL CD */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                    <MetricCard
                      title="Cota CD"
                      value={formatCurrency(activeTotals.quotaCD)}
                      icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
                      accentColor="purple"
                    />
                    <MetricCard
                      title="Vendas CD"
                      value={formatCurrency(activeTotals.valorVendaCD)}
                      icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
                      accentColor="purple"
                    />
                    <MetricCard
                      title="% Vendas CD"
                      value={formatPercent(activeTotals.achCD)}
                      icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
                      accentColor="purple"
                    />
                    <MetricCard
                      title="Defasagem CD"
                      value={formatDefasagem(activeTotals.valorVendaCD - activeTotals.quotaCD)}
                      icon={(activeTotals.valorVendaCD - activeTotals.quotaCD) >= 0 ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
                      accentColor={(activeTotals.valorVendaCD - activeTotals.quotaCD) >= 0 ? "emerald" : "rose"}
                      valueClassName={(activeTotals.valorVendaCD - activeTotals.quotaCD) >= 0 ? "text-emerald-600" : "text-rose-600"}
                    />
                  </div>

                  {/* SECTION 3: CANAL VP */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                    <MetricCard
                      title="Cota VP"
                      value={formatCurrency(activeTotals.quotaVP)}
                      icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />}
                      accentColor="teal"
                    />
                    <MetricCard
                      title="Vendas VP"
                      value={formatCurrency(activeTotals.valorVendaVP)}
                      icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />}
                      accentColor="teal"
                    />
                    <MetricCard
                      title="% Vendas VP"
                      value={formatPercent(activeTotals.achVP)}
                      icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />}
                      accentColor="teal"
                    />
                    <MetricCard
                      title="Defasagem VP"
                      value={formatDefasagem(activeTotals.valorVendaVP - activeTotals.quotaVP)}
                      icon={(activeTotals.valorVendaVP - activeTotals.quotaVP) >= 0 ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
                      accentColor={(activeTotals.valorVendaVP - activeTotals.quotaVP) >= 0 ? "emerald" : "rose"}
                      valueClassName={(activeTotals.valorVendaVP - activeTotals.quotaVP) >= 0 ? "text-emerald-600" : "text-rose-600"}
                    />
                  </div>
                </div>
              ) : selectedSalesTypes.includes('CD') ? (
                /* ONLY CD SELECTED */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                  <MetricCard
                    title="Cota CD"
                    value={formatCurrency(activeTotals.quotaCD)}
                    icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
                    accentColor="purple"
                  />
                  <MetricCard
                    title="Vendas CD"
                    value={formatCurrency(activeTotals.valorVendaCD)}
                    icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
                    accentColor="purple"
                  />
                  <MetricCard
                    title="% Vendas CD"
                    value={formatPercent(activeTotals.achCD)}
                    icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
                    accentColor="purple"
                  />
                  <MetricCard
                    title="Defasagem CD"
                    value={formatDefasagem(activeTotals.valorVendaCD - activeTotals.quotaCD)}
                    icon={(activeTotals.valorVendaCD - activeTotals.quotaCD) >= 0 ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
                    accentColor={(activeTotals.valorVendaCD - activeTotals.quotaCD) >= 0 ? "emerald" : "rose"}
                    valueClassName={(activeTotals.valorVendaCD - activeTotals.quotaCD) >= 0 ? "text-emerald-600" : "text-rose-600"}
                  />
                </div>
              ) : (
                /* ONLY VP SELECTED */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                  <MetricCard
                    title="Cota VP"
                    value={formatCurrency(activeTotals.quotaVP)}
                    icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />}
                    accentColor="teal"
                  />
                  <MetricCard
                    title="Vendas VP"
                    value={formatCurrency(activeTotals.valorVendaVP)}
                    icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />}
                    accentColor="teal"
                  />
                  <MetricCard
                    title="% Vendas VP"
                    value={formatPercent(activeTotals.achVP)}
                    icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />}
                    accentColor="teal"
                  />
                  <MetricCard
                    title="Defasagem VP"
                    value={formatDefasagem(activeTotals.valorVendaVP - activeTotals.quotaVP)}
                    icon={(activeTotals.valorVendaVP - activeTotals.quotaVP) >= 0 ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
                    accentColor={(activeTotals.valorVendaVP - activeTotals.quotaVP) >= 0 ? "emerald" : "rose"}
                    valueClassName={(activeTotals.valorVendaVP - activeTotals.quotaVP) >= 0 ? "text-emerald-600" : "text-rose-600"}
                  />
                </div>
              )}

              {/* PREVIEW METRICS SECTION */}
              {!isAccumulated && selectedProductGroups.includes('All') && previewTotals.hasAnyPreview && (
                <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50/60 to-blue-50/50 border border-indigo-200/70 rounded-2xl p-3.5 sm:p-5 space-y-3.5 shadow-2xs transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[#001A9C] text-white rounded-xl shadow-2xs shrink-0 flex items-center justify-center">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                            Análise de Prévia de Vendas
                          </h3>
                          <span className="text-[9px] bg-indigo-100/80 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full font-extrabold uppercase">
                            Ativa
                          </span>
                        </div>
                        {previewsUpdatedAt && (
                          <p className="text-[10.5px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span>Enviada em <strong className="text-slate-700">{formatPreviewsDate(previewsUpdatedAt)}</strong></span>
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPreviewMetrics(!showPreviewMetrics)}
                      className="text-xs font-extrabold text-[#001A9C] hover:bg-[#001A9C]/10 px-3 py-1.5 rounded-xl border border-[#001A9C]/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
                    >
                      {showPreviewMetrics ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Ocultar Prévia</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Ver Prévia ({formatCurrency(previewTotals.totalExpectativa)})</span>
                        </>
                      )}
                    </button>
                  </div>

                  {showPreviewMetrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 pt-0.5">
                      {/* Card 1: Prévia (Expectativa) */}
                      <MetricCard
                        title="Expectativa Prévia"
                        value={formatCurrency(previewTotals.totalExpectativa)}
                        icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
                        accentColor="indigo"
                      />

                      {/* Card 2: Vendas no Dia da Prévia */}
                      <MetricCard
                        title="Vendas na Prévia"
                        value={formatCurrency(previewTotals.totalVendaDiaPrevia)}
                        icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
                        accentColor="blue"
                      />

                      {/* Card 3: Defasagem da Prévia */}
                      <MetricCard
                        title="Defasagem Prévia"
                        value={formatDefasagem(previewTotals.defasagemPrevia)}
                        icon={previewTotals.defasagemPrevia >= 0 ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
                        accentColor={previewTotals.defasagemPrevia >= 0 ? "emerald" : "rose"}
                        valueClassName={previewTotals.defasagemPrevia >= 0 ? "text-emerald-600" : "text-rose-600"}
                      />

                      {/* Card 4: Pedidos Novos */}
                      <MetricCard
                        title="Pedidos Novos"
                        value={formatCurrency(previewTotals.totalPedidosNovos)}
                        icon={<Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
                        accentColor="indigo"
                        valueClassName={previewTotals.totalPedidosNovos >= 0 ? "text-slate-900" : "text-rose-600"}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
 
          {/* Navigation controller layout bar */}
          {userRole === 'admin' && (
            <div className="bg-white border border-slate-100 p-2 rounded-2xl shadow-xs flex flex-wrap gap-2 items-center">
              {[
                { id: 'geral', label: 'Geral', icon: <LayoutDashboard className="w-4 h-4" /> },
                { id: 'representantes', label: 'Representantes', icon: <User className="w-4 h-4" /> },
                { id: 'comparativo', label: 'Comparativo YoY', icon: <TrendingUp className="w-4 h-4 text-emerald-600" /> },
                { id: 'sell_out', label: 'Análise Sell Out', icon: <ShoppingBag className="w-4 h-4 text-amber-600" /> },
                { id: 'vendas_dia', label: 'Vendas por Dia', icon: <CalendarDays className="w-4 h-4 text-sky-600" /> },
                { id: 'vendas_estado', label: 'Regiões', icon: <MapIcon className="w-4 h-4" /> },
                { id: 'detalhado', label: 'Tabela Detalhada', icon: <FileText className="w-4 h-4" /> },
                { id: 'apresentacao', label: 'Apresentação', icon: <Presentation className="w-4 h-4 text-purple-600" /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsImportDropdownOpen(false);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
                    activeTab === tab.id 
                      ? 'text-slate-900 bg-slate-950/[0.04] border border-slate-950/[0.02] font-extrabold shadow-2xs' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}

              {/* Import Information Dropdown Menu (Admin Only) */}
              <div className="relative">
                <button
                  onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    ['previa', 'importar', 'nomes', 'localizacao'].includes(activeTab)
                      ? 'text-slate-900 bg-slate-950/[0.04] border-slate-950/[0.05] font-extrabold shadow-2xs' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <UploadCloud className="w-4 h-4 text-indigo-500" />
                  <span>Importar Informações</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isImportDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isImportDropdownOpen && (
                  <>
                    {/* Overlay background to dismiss the dropdown when clicking outside */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsImportDropdownOpen(false)} 
                    />
                    <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 origin-top-left">
                      {[
                        { id: 'importar', label: 'Importar Dados de Vendas', icon: <FileSpreadsheet className="w-4 h-4 text-indigo-500" /> },
                        ...(!isAccumulated ? [{ id: 'previa', label: 'Importar Prévia', icon: <Target className="w-4 h-4 text-indigo-600" /> }] : []),
                        { id: 'nomes', label: 'Importar Nomes', icon: <UserCog className="w-4 h-4 text-emerald-500" /> },
                        { id: 'localizacao', label: 'Importar Localização', icon: <MapPin className="w-4 h-4 text-rose-500" /> }
                      ].map(subTab => (
                        <button
                          key={subTab.id}
                          onClick={() => {
                            setActiveTab(subTab.id as any);
                            setIsImportDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-2.5 hover:bg-slate-50 ${
                            activeTab === subTab.id 
                              ? 'text-slate-900 bg-slate-950/[0.02]' 
                              : 'text-slate-600 font-medium'
                          }`}
                        >
                          {subTab.icon}
                          <span>{subTab.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* User Management Tab (Admin Only) */}
              <button
                onClick={() => {
                  setActiveTab('usuarios');
                  setIsImportDropdownOpen(false);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  activeTab === 'usuarios'
                    ? 'text-slate-900 bg-slate-950/[0.04] border-slate-950/[0.05] font-extrabold shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <UserCog className="w-4 h-4 text-[#001A9C]" />
                <span>Gerenciar Usuários</span>
              </button>
            </div>
          )}

          {/* EMPTY STATE IF NO DATA IN ACTIVE PERIOD */}
          {allRecords.length === 0 && !['previa', 'importar', 'nomes', 'localizacao', 'usuarios', 'vendas_dia', 'sell_out', 'apresentacao'].includes(activeTab) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-center max-w-xl mx-auto my-12 space-y-6"
            >
              <div className="mx-auto w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                <Database className="w-8 h-8 text-[#001A9C]" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-800">Sem dados na memória pública</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Atualmente não existem registros de auditoria de performance de vendas salvos para o período de 
                  <strong> {selectedMonth}/{selectedYear}</strong> na memória compartilhada do servidor.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button
                  onClick={() => setActiveTab('importar')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#001A9C] hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Ir para Importação (Excel)
                </button>
                
                <button
                  onClick={async () => {
                    setIsLoadingPeriod(true);
                    try {
                      const response = await fetch('/api/monthly-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          year: selectedYear,
                          month: selectedMonth,
                          records: parseTSV(INITIAL_RAW_DATA)
                        })
                      });
                      if (response.ok) {
                        fetchAvailablePeriods();
                        fetchPeriodData(selectedYear, selectedMonth);
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsLoadingPeriod(false);
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-200 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-sky-500" />
                  Carregar Dados de Exemplo
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 1: PANORAMA GERAL SECTION */}
          {activeTab === 'geral' && allRecords.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Primary Charts layout split */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Visual Coordinator / Product Group Bar chart inside standard container */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm md:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-55 pb-2">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <LineChart className="w-4.5 h-4.5 text-indigo-500" />
                      {userRole === 'rep' ? 'Desempenho por Grupo de Produtos (CD + VP)' : 'Metas por Coordenador (CD + VP)'}
                    </h3>
                  </div>

                  <div className="space-y-4 pt-1">
                    {(userRole === 'rep' ? productGroupPerformance : coordinatorPerformance).map((item, idx) => {
                      const itemName = 'group' in item ? item.group : item.name;
                      const subLabel = 'repsCount' in item ? `(${item.repsCount} reps)` : '';
                      const defasagemColor = item.percent >= 100 
                        ? 'text-emerald-600' 
                        : item.percent >= 75 
                        ? 'text-amber-600' 
                        : 'text-rose-600';

                      return (
                        <div 
                          key={itemName} 
                          className={`space-y-1.5 group ${userRole === 'admin' ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (userRole === 'admin' && 'name' in item) {
                              setSelectedCoordinator(item.name);
                            }
                          }}
                        >
                          <div className="flex justify-between items-start sm:items-center text-xs gap-2">
                            <span className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors flex items-center gap-1 flex-wrap">
                              <span className="text-slate-300 font-bold">#{idx+1}</span>
                              {itemName}
                              {subLabel && <span className="text-[10px] text-slate-400 font-normal">{subLabel}</span>}
                            </span>
                            <div className="text-right shrink-0">
                              <span className="font-extrabold text-slate-900">{formatPercent(item.percent)}</span>
                              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-end gap-1.5 flex-wrap">
                                <span>Venda: <strong className="font-bold text-slate-700">{formatCurrency(item.faturado)}</strong></span>
                                <span className="text-slate-300">•</span>
                                <span>Defasagem: <strong className={`font-extrabold ${defasagemColor}`}>{formatDefasagem(item.defasagem)}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percent >= 100 ? 100 : item.percent}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                item.percent >= 100 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                                : item.percent >= 75 ? 'bg-amber-500' 
                                : 'bg-rose-500'
                              }`}
                            />
                            {item.percent > 100 && (
                              <div className="absolute right-2 top-0 bottom-0 flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {(userRole === 'rep' ? productGroupPerformance : coordinatorPerformance).length === 0 && (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        {userRole === 'rep' ? 'Nenhum grupo de produtos encontrado.' : 'Nenhum coordenador correspondente aos filtros.'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub company branch Share indicators (EMP segmenting list) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Layers className="w-4.5 h-4.5 text-indigo-500" />
                      Vendas por Grupo de Produtos
                    </h3>
                  </div>

                  <div className="space-y-3.5 pt-2">
                    {enterpriseDonutData.map((ent, idx) => {
                      const colorClass = [
                        'bg-slate-800', 'bg-indigo-600', 'bg-emerald-500', 
                        'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-purple-500'
                      ][idx % 7];

                      const borderClass = [
                        'border-slate-800', 'border-indigo-600', 'border-emerald-500', 
                        'border-amber-500', 'border-rose-500', 'border-sky-500', 'border-purple-500'
                      ][idx % 7];

                      return (
                        <div key={ent.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100/50 hover:shadow-xs transition-shadow">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3 h-3 rounded-full ${colorClass}`} />
                            <div>
                              <span className="font-extrabold text-xs text-slate-800 uppercase block tracking-wider">{ent.name}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{formatCurrency(ent.value)}</span>
                            </div>
                          </div>
                          
                          <span className={`text-xs font-black font-sans px-2.5 py-1 bg-white border-2 rounded-full text-slate-900 shadow-3xs ${borderClass}`}>
                            {ent.share.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}

                    {enterpriseDonutData.length === 0 && (
                      <div className="py-8 text-center text-slate-400 text-xs">Sem dados.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Rankings list: Stars podium & Deficit review block (Admin Only) */}
              {userRole === 'admin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Rank 1: Star representatives and high-achievers */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <Award className="w-5 h-5 text-emerald-500" />
                        Top 5 Representantes
                      </h3>
                      <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full uppercase">Heaters</span>
                    </div>

                    <div className="space-y-3.5">
                      {topPerformers.map((rep, idx) => {
                        const medalColor = [
                          'text-amber-500 bg-amber-50 border-amber-100', // Gold
                          'text-slate-500 bg-slate-50 border-slate-100', // Silver
                          'text-amber-700 bg-amber-50/50 border-amber-100/50', // Bronze
                          'text-slate-400 bg-slate-50/40 border-slate-100/40',
                          'text-slate-400 bg-slate-50/40 border-slate-100/40'
                        ][idx] || 'text-slate-400';

                        return (
                          <div 
                            key={rep.repId} 
                            onClick={() => setSelectedRepDetailId(rep.repId)}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100/80 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-lg border flex items-center justify-center font-extrabold text-sm ${medalColor}`}>
                                {idx + 1}
                              </span>
                              <div>
                                <h4 className="font-bold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors truncate max-w-[180px]">
                                  {rep.repName}
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Coordenador: {rep.coordName}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-extrabold text-emerald-600 block">{formatPercent(rep.pctTotal)}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Venda: {formatCurrency(rep.totalFaturado)}</span>
                            </div>
                          </div>
                        );
                      })}

                      {topPerformers.length === 0 && (
                        <div className="py-8 text-center text-slate-400 text-xs">Nenhum representante excede a meta sob este filtro.</div>
                      )}
                    </div>
                  </div>

                  {/* Rank 2: Defasagem warning panel */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <ShieldAlert className="w-5 h-5 text-rose-500" />
                        Maior Defasagem
                      </h3>
                      <span className="text-[10px] font-extrabold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full uppercase">Déficit</span>
                    </div>

                    <div className="space-y-3.5">
                      {interventionNeeded.map((rep, idx) => (
                        <div 
                          key={rep.repId} 
                          onClick={() => setSelectedRepDetailId(rep.repId)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100/80 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center font-extrabold text-sm text-rose-600">
                              !
                            </span>
                            <div>
                              <h4 className="font-bold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors truncate max-w-[180px]">
                                {rep.repName}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Coordenador: {rep.coordName}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-extrabold text-rose-600 block">{formatCurrency(rep.defasagem)}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Atingido: {formatPercent(rep.pctTotal)}</span>
                          </div>
                        </div>
                      ))}

                      {interventionNeeded.length === 0 && (
                        <div className="py-8 text-center text-slate-500 text-xs text-emerald-600 font-extrabold">🎉 Excelente! Nenhum representante está com saldo deficitário/defasagem sob este filtro.</div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: DETAILED REPRESENTATIVES VIEW */}
          {activeTab === 'representantes' && allRecords.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Grid className="w-5 h-5 text-indigo-500" />
                    Lista de Representantes Comercial ({repsAggregated.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Painel geral categorizado por carteira de compras acumulada.</p>
                </div>
              </div>

              {/* Grid block of representative summary widgets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {repsAggregated.map(rep => {
                  const statusColor = rep.pctTotal >= 100 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : rep.pctTotal >= 75 
                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200';

                  const badgeLabel = rep.pctTotal >= 100 
                    ? 'Clube 100%+' 
                    : rep.pctTotal >= 75 
                    ? 'Em Meta' 
                    : 'Abaixo do Planejado';

                  return (
                    <div 
                      key={rep.repId}
                      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4 group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">REP: #{rep.repId}</span>
                          <h4 className="font-bold text-slate-950 text-sm tracking-tight leading-snug group-hover:text-indigo-650 transition-colors">
                            {rep.repName}
                          </h4>
                          <span className="text-xs text-slate-400 font-medium">Coordenador: <strong className="text-slate-600">{rep.coordName}</strong></span>
                        </div>
                        
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                          {badgeLabel}
                        </span>
                      </div>

                      {/* Side by side stats breakdown */}
                      <div className="grid grid-cols-3 gap-2.5 py-2.5 border-y border-slate-50 text-xs">
                        <div className="space-y-1">
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Cota Planejada</span>
                          <span className="block font-bold text-slate-700">{formatCurrency(rep.totalQuota)}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Vendas CD / VP</span>
                          <span className="block font-bold text-slate-900">{formatCurrency(rep.totalFaturado)}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Defasagem Líq.</span>
                          <span className={`block font-bold ${rep.defasagem >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {formatCurrency(rep.defasagem)}
                          </span>
                        </div>
                      </div>

                      {/* YoY Growth indicator badge */}
                      {(() => {
                        const repGrowth = repsGrowthComparison.find(g => g.repId === rep.repId);
                        if (!repGrowth) return null;
                        return (
                          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/80 rounded-xl border border-slate-150/70 text-[11px]">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>Crescimento vs. {selectedYear - 1}:</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                              repGrowth.statusGrowth === 'new' || repGrowth.taxaCrescimento > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : repGrowth.taxaCrescimento < 0
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {repGrowth.statusGrowth === 'new' 
                                ? '+100% (Novo)' 
                                : `${repGrowth.taxaCrescimento >= 0 ? '+' : ''}${repGrowth.taxaCrescimento.toFixed(1)}% (${formatCurrency(repGrowth.diferencaVenda)})`}
                            </span>
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-3 flex-1 max-w-[200px]">
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                rep.pctTotal >= 100 ? 'bg-emerald-500' : rep.pctTotal >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(rep.pctTotal, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-extrabold text-slate-800">{rep.pctTotal.toFixed(1)}%</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedRepDetailId(rep.repId)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                        >
                          Detalhar Cotas
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {repsAggregated.length === 0 && (
                  <div className="py-12 text-center text-slate-400 col-span-2 bg-white rounded-2xl border border-slate-100">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Nenhum representante encontrado sob as qualificações de filtro ativas.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: GROWTH COMPARISON DASHBOARD (YoY) */}
          {activeTab === 'comparativo' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Warning banner if no prev year records are loaded */}
              {prevYearRecords.length === 0 && !isLoadingPrevYear && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-800 text-xs font-medium">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>
                      <strong>Atenção:</strong> Não foram encontrados registros salvos para o ano anterior ({selectedYear - 1}) no período selecionado. Para calcular o crescimento real, certifique-se de importar ou selecionar dados de {selectedYear - 1}.
                    </span>
                  </div>
                </div>
              )}

              {/* Overview Metric Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <MetricCard
                  title={`Vendas Total (${selectedYear - 1})`}
                  value={formatCurrency(growthTotals.totalVendaAnterior)}
                  icon={<History className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />}
                  accentColor="slate"
                />
                <MetricCard
                  title={`Vendas Total (${selectedYear})`}
                  value={formatCurrency(growthTotals.totalVendaAtual)}
                  icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
                  accentColor="blue"
                />
                <MetricCard
                  title="Variação em Valor (R$)"
                  value={`${growthTotals.diferencaGeral >= 0 ? '+' : ''}${formatCurrency(growthTotals.diferencaGeral)}`}
                  icon={growthTotals.diferencaGeral >= 0 ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
                  accentColor={growthTotals.diferencaGeral >= 0 ? "emerald" : "rose"}
                  valueClassName={growthTotals.diferencaGeral >= 0 ? "text-emerald-600" : "text-rose-600"}
                />
                <MetricCard
                  title="Taxa de Crescimento Geral"
                  value={`${growthTotals.taxaCrescimentoGeral >= 0 ? '+' : ''}${growthTotals.taxaCrescimentoGeral.toFixed(1)}%`}
                  icon={<Percent className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
                  accentColor="indigo"
                  valueClassName={growthTotals.taxaCrescimentoGeral >= 0 ? "text-emerald-600" : "text-rose-600"}
                />
              </div>

              {/* Filter and Quick Action bar for comparison */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
                {/* Quick filter buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    Filtros:
                  </span>
                  {[
                    { id: 'all', label: `Cadastrados (${growthTotals.totalRepsCount})` },
                    { id: 'positive', label: `Em Crescimento (${growthTotals.repsCrescendo})` },
                    { id: 'negative', label: `Em Queda (${growthTotals.repsQueda})` },
                    { id: 'top10', label: 'Top 10 Maior Crescimento R$' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setGrowthFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        growthFilter === f.id
                          ? 'bg-slate-900 text-white shadow-3xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Sorting controls and Export actions */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">Ordenar por:</span>
                    <select
                      value={growthSortField}
                      onChange={(e) => setGrowthSortField(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="taxaCrescimento">Taxa de Crescimento (%)</option>
                      <option value="diferencaVenda">Variação Absoluta (R$)</option>
                      <option value="vendaAtual">Vendas {selectedYear}</option>
                      <option value="vendaAnterior">Vendas {selectedYear - 1}</option>
                      <option value="repName">Nome do Representante</option>
                    </select>
                    <button
                      onClick={() => setGrowthSortDirection(growthSortDirection === 'asc' ? 'desc' : 'asc')}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                      title="Inverter direção de ordenação"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                  <button
                    onClick={exportGrowthToPDF}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={exportGrowthToCSV}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Main Growth Comparison Table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 w-20 text-center">REP ID</th>
                        <th className="py-3.5 px-4">Representante Comercial</th>
                        <th className="py-3.5 px-4">Coordenador</th>
                        <th className="py-3.5 px-4 text-right">Vendas {selectedYear - 1}</th>
                        <th className="py-3.5 px-4 text-right">Vendas {selectedYear}</th>
                        <th className="py-3.5 px-4 text-right">Variação Líquida (R$)</th>
                        <th className="py-3.5 px-4 text-center">Taxa de Crescimento %</th>
                        <th className="py-3.5 px-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {sortedGrowthComparison.map((rep) => {
                        const isPositive = rep.diferencaVenda > 0;
                        const isNegative = rep.diferencaVenda < 0;

                        return (
                          <tr 
                            key={rep.repId}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-center text-slate-500">
                              #{rep.repId}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {rep.repName}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-medium">
                              {rep.coordName}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                              {formatCurrency(rep.vendaAnterior)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(rep.vendaAtual)}
                            </td>
                            <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                              isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-slate-500'
                            }`}>
                              {isPositive ? '+' : ''}{formatCurrency(rep.diferencaVenda)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border ${
                                rep.statusGrowth === 'new'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isPositive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isNegative
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {isPositive ? (
                                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                                ) : isNegative ? (
                                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                                ) : null}
                                {rep.statusGrowth === 'new' 
                                  ? '+100% (Novo)' 
                                  : `${rep.taxaCrescimento >= 0 ? '+' : ''}${rep.taxaCrescimento.toFixed(1)}%`}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => setSelectedRepDetailId(rep.repId)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Ver Detalhes
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {sortedGrowthComparison.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            {Object.keys(customRepNames).length === 0
                              ? "Nenhum representante cadastrado via 'Importar nomes'. Acesse a aba 'Importar nomes' para cadastrar os representantes e visualizar o comparativo YoY."
                              : "Nenhum representante cadastrado encontrado sob os filtros selecionados."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: VENDAS POR DIA (DAILY SALES ANALYTICS & MEMORY) */}
          {activeTab === 'vendas_dia' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <DailySalesTab
                selectedCoordinator={selectedCoordinator}
                selectedProductGroups={selectedProductGroups}
                selectedSalesTypes={selectedSalesTypes}
                progressThreshold={progressThreshold}
                searchText={searchText}
                selectedRepIdFilter={selectedRepIdFilter}
                selectedState={selectedState}
                customRepNames={customRepNames}
                customRepLocations={customRepLocations}
                userRole={userRole}
                userRepId={userRepId}
                allRecords={allRecords}
                onPeriodTotalsChange={setDailyPeriodTotals}
                onOpenImport={() => {
                  setActiveTab('importar');
                  setIsImportDropdownOpen(false);
                }}
              />
            </motion.div>
          )}

          {/* TAB: ANÁLISE DE SELL OUT (CLIENT EVOLUTION & YOY GROWTH) */}
          {activeTab === 'sell_out' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <SellOutTab
                selectedCoordinator={selectedCoordinator}
                selectedProductGroups={selectedProductGroups}
                searchText={searchText}
                userRole={userRole}
              />
            </motion.div>
          )}

          {/* TAB 4: PRISTINE FILTERABLE TABLE DATA EXPLORER */}
          {activeTab === 'detalhado' && allRecords.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                
                {/* Header row in explorer */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#001A9C]">
                        Agente 87 - Ferramentas
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mt-0.5">Registros de Vendas Detalhados</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Mostrando {sortedDetails.length} linhas de representantes ativos. Clique nos cabeçalhos para ordenar.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                    <button
                      onClick={exportToPDF}
                      className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      title="Exportar tabela formatada em PDF para impressão (máx. 20 representantes por página)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Exportar PDF
                    </button>

                    <button
                      onClick={exportToCSV}
                      className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      title="Exportar dados em formato CSV para Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Exportar CSV
                    </button>

                    <button
                      onClick={exportPctVendasToJPG}
                      className="flex items-center gap-1.5 bg-[#001A9C] hover:bg-[#00147a] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      title="Exportar imagem de % de Vendas"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exportar % Vendas
                    </button>
                  </div>
                </div>

                {/* Table block */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs select-none">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-450 uppercase tracking-wider font-bold">
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleSort('repId')}>
                          <span className="flex items-center gap-1">REP ID <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleSort('repName')}>
                          <span className="flex items-center gap-1">Representante <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleSort('coordName')}>
                          <span className="flex items-center gap-1">Coordenador <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('quotaTotal')}>
                          <span className="flex items-center gap-1 justify-end">Cota Planejada <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('valorVendaTotal')}>
                          <span className="flex items-center gap-1 justify-end">Vendas <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('pctVenda')}>
                          <span className="flex items-center gap-1 justify-end">% Venda <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('defasagem')}>
                          <span className="flex items-center gap-1 justify-end">Defasagem <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        {!isAccumulated && (
                          <>
                            <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('previaValue')}>
                              <span className="flex items-center gap-1 justify-end">Prévia <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                            </th>
                            <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('pedidosNovos')}>
                              <span className="flex items-center gap-1 justify-end">Pedidos Novos <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {currentDetailsPageData.map((row) => {
                        const rowRate = row.quotaTotal > 0 ? (row.valorVendaTotal / row.quotaTotal) * 100 : 0;
                        const rowRateColor = rowRate >= 100 
                          ? 'text-emerald-600 font-extrabold' 
                          : rowRate >= 75 
                          ? 'text-amber-600 font-bold' 
                          : 'text-rose-500 font-semibold';

                        return (
                          <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors font-medium">
                            <td className="py-3 px-3 font-semibold text-slate-600">#{row.repId}</td>
                            <td 
                              className="py-3 px-3 font-bold text-slate-900 truncate max-w-[150px] cursor-pointer hover:text-indigo-600 hover:underline"
                              onClick={() => setSelectedRepDetailId(row.repId)}
                            >
                              {row.repName}
                            </td>
                            <td className="py-3 px-3 text-slate-500">{row.coordName}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600">{formatCurrency(row.quotaTotal)}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-800">{formatCurrency(row.valorVendaTotal)}</td>
                            <td className={`py-3 px-3 text-right font-mono ${rowRateColor}`}>
                              {formatPercent(rowRate)}
                            </td>
                            <td className={`py-3 px-3 text-right font-mono font-bold ${row.defasagem >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                              {formatCurrency(row.defasagem)}
                            </td>
                            {!isAccumulated && (
                              <>
                                <td className="py-3 px-3 text-right font-mono text-slate-600">
                                  {formatCurrency(row.previaValue || 0)}
                                </td>
                                <td className={`py-3 px-3 text-right font-mono font-bold ${(row.pedidosNovos ?? 0) >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                  {formatCurrency(row.pedidosNovos || 0)}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}

                      {currentDetailsPageData.length === 0 && (
                        <tr>
                          <td colSpan={isAccumulated ? 7 : 9} className="py-8 text-center text-slate-400">Nenhum registro corresponde aos filtros atuais.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table pagination tracker */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-55 flex-wrap gap-3 text-xs">
                    <span className="text-slate-400 font-medium">
                      Página <strong className="text-slate-700">{currentPage}</strong> de <strong className="text-slate-700">{totalPages}</strong> ({sortedDetails.length} linhas filtradas)
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-605 border border-slate-205 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      >
                        Anterior
                      </button>
                      
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                        // Sliding window logic for page buttons centered around current page
                        let pageNum = index + 1;
                        if (currentPage > 3 && totalPages > 5) {
                          pageNum = currentPage - 3 + index;
                          if (pageNum + (4 - index) > totalPages) {
                            pageNum = totalPages - 4 + index;
                          }
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              currentPage === pageNum 
                                ? 'bg-slate-900 border-slate-900 text-white font-extrabold shadow-xs' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      >
                        Próximo
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}

          {/* TAB: APRESENTAÇÃO */}
          {activeTab === 'apresentacao' && (
            <PresentationTab
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              isAccumulated={isAccumulated}
              accumulateStartMonth={accumulateStartMonth}
              accumulateEndMonth={accumulateEndMonth}
              filteredRecords={filteredRecords}
              allRecords={allRecords}
              prevYearRecords={prevYearRecords}
              prevYearFilteredRecords={prevYearFilteredRecords}
              isLoadingPrevYear={isLoadingPrevYear}
              selectedCoordinator={selectedCoordinator}
              selectedProductGroups={selectedProductGroups}
              selectedSalesTypes={selectedSalesTypes}
              selectedState={selectedState}
              selectedRepIdFilter={selectedRepIdFilter}
              searchText={searchText}
              customRepNames={customRepNames}
              customRepLocations={customRepLocations}
              userRole={userRole}
              userRepId={userRepId}
            />
          )}

          {/* TAB 4.5: CONFIGURE PREVIEW EXPECTATIONS */}
          {activeTab === 'previa' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-500" />
                      Importar Prévia ({selectedMonth}/{selectedYear})
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Configure a expectativa (previsão) e as vendas do dia da prévia por representante comercial.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleExportPreviewExcelModel}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:shadow-md"
                      title="Gera arquivo Excel com representantes, códigos, colunas vazias para prévias e total de vendas do dia preenchido"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                      <span>Gerar Excel de Modelo para Prévia</span>
                    </button>

                    <button
                      onClick={handleSavePreviews}
                      disabled={isSavingPreviews}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Database className="w-4 h-4" />
                      {isSavingPreviews ? 'Salvando...' : 'Salvar Dados Permanente'}
                    </button>
                  </div>
                </div>

                {saveSuccessMessage && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-emerald-800 text-xs font-bold animate-fade-in">
                    {saveSuccessMessage}
                  </div>
                )}

                {/* Grid for Quick manual insert or Excel Paste */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  
                  {/* Left block: Excel Paste area */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
                          Colar do Excel (Importação Rápida)
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Copie e cole dados do Excel. Você pode usar a planilha de modelo gerada!
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleExportPreviewExcelModel}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200/80 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Baixar Planilha Excel</span>
                      </button>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-950 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                        <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Colunas da Planilha Excel Exportada:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px] font-medium text-emerald-850 pt-0.5">
                        <span>• <b>Nome do Representante</b></span>
                        <span>• <b>Nome do Coordenador</b></span>
                        <span>• <b>Código do Representante</b></span>
                        <span>• <b>Prévia Ferramentas</b> (vazia)</span>
                        <span>• <b>Prévia Linha Pro</b> (vazia)</span>
                        <span>• <b>Prévia Total</b> (vazia)</span>
                        <span className="sm:col-span-2">• <b>Venda no Dia da Prévia</b> (total de vendas preenchido)</span>
                      </div>
                    </div>

                    <textarea
                      placeholder="Cole aqui as linhas copiadas do Excel..."
                      rows={5}
                      className="w-full text-xs font-mono p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-300"
                      id="tsv_preview_input"
                    />

                    <button
                      onClick={() => {
                        const el = document.getElementById('tsv_preview_input') as HTMLTextAreaElement;
                        if (el && el.value.trim()) {
                          const parsed = handlePastePreviews(el.value);
                          if (parsed) {
                            el.value = '';
                            alert('Dados colados com sucesso! Não esqueça de clicar em "Salvar Dados Permanente" para gravar.');
                          } else {
                            alert('Nenhum dado válido encontrado. Verifique a formatação das colunas.');
                          }
                        } else {
                          alert('Por favor, cole algum dado no campo de texto.');
                        }
                      }}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                      Processar e Mesclar Dados
                    </button>
                  </div>

                  {/* Right block: Manual entry form */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <PlusSquare className="w-4.5 h-4.5 text-indigo-500" />
                        Inserir/Atualizar Manualmente
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Adicione ou altere individualmente a expectativa de um representante para este período.
                      </p>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const repId = (form.elements.namedItem('repId') as HTMLSelectElement).value;
                      const previaValueRaw = (form.elements.namedItem('previaValue') as HTMLInputElement).value;
                      const vendaDiaPreviaRaw = (form.elements.namedItem('vendaDiaPrevia') as HTMLInputElement).value;
                      
                      if (!repId) {
                        alert('Selecione um representante.');
                        return;
                      }

                      const valPrevia = parseBrazilianNumber(previaValueRaw) || 0;
                      const valVendaDia = parseBrazilianNumber(vendaDiaPreviaRaw) || 0;

                      setPreviews(prev => {
                        const map = new Map<string, RepresentativePreview>();
                        prev.forEach(p => map.set(p.repId, p));
                        map.set(repId, { repId, previaValue: valPrevia, vendaDiaPrevia: valVendaDia });
                        return Array.from(map.values());
                      });

                      form.reset();
                      alert('Representante adicionado/atualizado na lista temporária! Não esqueça de clicar em "Salvar Dados Permanente".');
                    }} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Representante</label>
                        <select
                          name="repId"
                          required
                          className="w-full text-xs bg-white border border-slate-200 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold cursor-pointer"
                        >
                          <option value="">Selecione...</option>
                          {repsAggregated.map(r => (
                            <option key={r.repId} value={r.repId}>
                              #{r.repId} - {r.repName} ({r.coordName})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expectativa (R$)</label>
                          <input
                            type="text"
                            name="previaValue"
                            placeholder="Ex: 2.000.000,00"
                            required
                            className="w-full text-xs bg-white border border-slate-200 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Venda no Dia (R$)</label>
                          <input
                            type="text"
                            name="vendaDiaPrevia"
                            placeholder="Ex: 19,90"
                            required
                            className="w-full text-xs bg-white border border-slate-200 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                      >
                        Confirmar Item
                      </button>
                    </form>
                  </div>
                </div>

                {/* Table listing current configurations */}
                <div className="pt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">
                      Lista de Expectativas Atual ({previews.filter(prev => !hasAnyFilter || activeRepIds.has(prev.repId.toString().trim())).length} de {previews.length})
                    </h4>
                    {previews.length > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Tem certeza que deseja limpar todas as configurações de prévia para este período?')) {
                            setPreviews([]);
                            try {
                              if (getFirebaseConfig()) {
                                await savePreviewsToFirestore(selectedYear, selectedMonth, []);
                              }
                              saveLocalPreviews(selectedYear, selectedMonth, []);
                              const nowString = new Date().toISOString();
                              setPreviewsUpdatedAt(nowString);
                              setSaveSuccessMessage("Todas as prévias foram removidas e salvas com sucesso!");
                              setTimeout(() => setSaveSuccessMessage(null), 3000);
                              logAnalyticsEvent('data_save', `Prévias limpas de ${selectedMonth}/${selectedYear}`);
                            } catch (err: any) {
                              console.error("Erro ao limpar prévias:", err);
                              alert("Prévias limpas na tela, mas houve erro ao salvar no banco: " + err.message);
                            }
                          }
                        }}
                        className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer border border-rose-200 shadow-2xs hover:shadow-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Limpar Todos</span>
                      </button>
                    )}
                  </div>

                  {previews.length > 0 ? (
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse bg-white">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <th className="py-3 px-4">Representante</th>
                            <th className="py-3 px-4 text-right">Expectativa (Prévia)</th>
                            <th className="py-3 px-4 text-right">Venda Dia da Prévia</th>
                            <th className="py-3 px-4 text-right">Venda Atual</th>
                            <th className="py-3 px-4 text-right">Defasagem Calculada</th>
                            <th className="py-3 px-4 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-slate-100">
                          {previews.filter(prev => !hasAnyFilter || activeRepIds.has(prev.repId.toString().trim())).map((prev) => {
                            const matchingRep = repsAggregated.find(r => r.repId.toString().trim() === prev.repId.toString().trim());
                            const repName = matchingRep ? matchingRep.repName : "Inexistente no período";
                            const coordName = matchingRep ? matchingRep.coordName : "";
                            const vendaAtual = matchingRep ? matchingRep.totalVendido : 0;
                            const defasagem = vendaAtual - prev.vendaDiaPrevia - prev.previaValue;

                            return (
                              <tr key={prev.repId} className="hover:bg-slate-50/50">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-800">#{prev.repId}</div>
                                  <div className="text-[10px] text-slate-400 font-medium">{repName} {coordName && `(${coordName})`}</div>
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-700">
                                  {formatCurrency(prev.previaValue)}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-700">
                                  {formatCurrency(prev.vendaDiaPrevia)}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-indigo-650">
                                  {formatCurrency(vendaAtual)}
                                </td>
                                <td className={`py-3 px-4 text-right font-black ${defasagem >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formatDefasagem(defasagem)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => {
                                      const updated = previews.filter(item => item.repId.toString().trim() !== prev.repId.toString().trim());
                                      setPreviews(updated);
                                      try {
                                        if (getFirebaseConfig()) {
                                          savePreviewsToFirestore(selectedYear, selectedMonth, updated);
                                        }
                                        saveLocalPreviews(selectedYear, selectedMonth, updated);
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }}
                                    className="p-1 text-rose-500 hover:text-rose-700 rounded transition-colors cursor-pointer"
                                    title="Remover"
                                  >
                                    <X className="w-4 h-4 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {previews.filter(prev => !hasAnyFilter || activeRepIds.has(prev.repId.toString().trim())).length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400 font-medium animate-fade-in">
                                Nenhum representante com expectativa configurada para o filtro ou estado selecionado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                      Nenhuma expectativa de prévia configurada para este período. Use os painéis acima para colar dados do Excel ou inserir manualmente.
                    </div>
                  )}
                </div>

                {/* Previous Periods Previews Download Section */}
                <div className="pt-6 border-t border-slate-100 mt-6 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Download className="w-4.5 h-4.5 text-[#001A9C]" />
                      Prévias de Períodos Anteriores (Histórico)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Faça o download do histórico de expectativas de prévia de outros períodos de análise que já foram concluídos.
                    </p>
                  </div>

                  {availablePeriods.filter(p => !(p.year === selectedYear && p.month === selectedMonth)).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {availablePeriods
                        .filter(p => !(p.year === selectedYear && p.month === selectedMonth))
                        .map(p => {
                          const monthLabel = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][p.month - 1] || p.month;
                          return (
                            <div key={p.id} className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 rounded-xl transition-all flex items-center justify-between gap-3 group">
                              <div>
                                <span className="block font-bold text-slate-800 text-xs">{monthLabel} / {p.year}</span>
                                <span className="block text-[10px] text-slate-450 mt-0.5 font-semibold">Registro de vendas: {p.recordsCount} linhas</span>
                              </div>
                              <button
                                onClick={() => downloadPreviousPeriodPreview(p.year, p.month)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-[#001A9C] text-[#001A9C] hover:text-white border border-[#001A9C]/10 hover:border-transparent rounded-lg text-[11px] font-bold transition-all shadow-3xs cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>CSV</span>
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs">
                      Não existem outros períodos de análise registrados no sistema além do atual.
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 5: IMPORT/COULD EXCEL SHEET INTERACTIVE PASTE */}
          {activeTab === 'importar' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ImportDataTab 
                currentRecordsCount={allRecords.length}
                initialYear={selectedYear}
                initialMonth={selectedMonth}
                availablePeriods={availablePeriods}
                onRefreshPeriods={fetchAvailablePeriods}
                onDataSaved={(year, month, records) => {
                  fetchAvailablePeriods();
                  setSelectedYear(year);
                  setSelectedMonth(month);
                  setTempYear(year);
                  setTempMonth(month);
                  setTempIsAccumulated(false);
                  setIsAccumulated(false);
                  setAllRecords(records);
                  setActiveTab('geral');
                  resetFilters();
                  setCurrentPage(1);
                }}
              />
            </motion.div>
          )}

          {/* TAB 6: IMPORT REPRESENTATIVE NAMES OVERRIDES */}
          {activeTab === 'nomes' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header Info Banner */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-[#001A9C]" />
                    Importar e Mapear Nomes de Representantes
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                    Este menu permite mapear códigos de representantes para nomes personalizados legíveis.
                    Ao salvar os nomes aqui, o portal dará prioridade absoluta para exibir o nome personalizado
                    em todos os painéis, filtros, tabelas e relatórios (substituindo o nome bruto presente na planilha de vendas).
                  </p>
                </div>
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl px-4 py-3 text-center shrink-0">
                  <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Mapeamentos Ativos</div>
                  <div className="text-2xl font-black text-indigo-650">{Object.keys(customRepNames).length}</div>
                </div>
              </div>

              {/* Grid content split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left side inputs: Paste & Single entry */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Paste from Excel card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Copiar & Colar do Excel</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Copie duas colunas da sua planilha (primeira com o <strong className="text-slate-600">Código ID</strong>, segunda com o <strong className="text-slate-600">Nome</strong>) e cole no campo abaixo.
                      </p>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const text = (form.elements.namedItem('pasteArea') as HTMLTextAreaElement).value;
                      if (!text.trim()) {
                        alert('Por favor, cole algum texto antes de continuar.');
                        return;
                      }
                      const success = handlePasteRepNames(text);
                      if (success) {
                        form.reset();
                        alert('Nomes carregados e adicionados na visualização temporária! Lembre-se de clicar em "Salvar Dados Permanente" para gravar.');
                      } else {
                        alert('Não foi possível processar nenhum nome. Certifique-se de que copiou pelo menos duas colunas.');
                      }
                    }} className="space-y-3">
                      <textarea
                        name="pasteArea"
                        required
                        placeholder={`1048\tJoão da Silva\n2015\tMaria Souza`}
                        rows={8}
                        className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 placeholder:text-slate-400"
                      />
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#001A9C] hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Carregar e Mapear Nomes</span>
                      </button>
                    </form>
                  </div>

                  {/* Add manual entry card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Mapear Individualmente</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Adicione ou altere o nome de um único representante diretamente.
                      </p>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const repIdRaw = (form.elements.namedItem('manualRepId') as HTMLInputElement).value.trim();
                      const repName = (form.elements.namedItem('manualRepName') as HTMLInputElement).value.trim();
                      
                      const repId = parseInt(repIdRaw);
                      if (isNaN(repId) || !repName) {
                        alert('Informe um Código de Representante numérico válido e um Nome.');
                        return;
                      }

                      setCustomRepNames(prev => ({
                        ...prev,
                        [repId.toString()]: repName
                      }));

                      form.reset();
                      alert(`Representante #${repId} mapeado temporariamente! Salve as alterações para guardar permanentemente.`);
                    }} className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID/Código</label>
                          <input
                            type="number"
                            name="manualRepId"
                            required
                            placeholder="Ex: 1048"
                            className="w-full text-xs bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome do Representante</label>
                          <input
                            type="text"
                            name="manualRepName"
                            required
                            placeholder="Ex: João Silva S/A"
                            className="w-full text-xs bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold"
                          />
                        </div>
                      </div>
                      
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-250 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar Overwrite</span>
                      </button>
                    </form>
                  </div>

                </div>

                {/* Right side panel: Search & Active overrides table */}
                <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Mapeamentos Cadastrados</h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Gerencie a lista de nomes que estão sendo aplicados em substituição.
                        </p>
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Pesquisar mapeamento..."
                          value={namesSearchQuery}
                          onChange={(e) => setNamesSearchQuery(e.target.value)}
                          className="w-full text-xs pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/15 text-slate-700"
                        />
                      </div>
                    </div>

                    {/* Table list */}
                    {Object.keys(customRepNames).length > 0 ? (
                      <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              <th className="py-2.5 px-4 w-1/4">Código ID</th>
                              <th className="py-2.5 px-4 w-2/4">Nome Personalizado</th>
                              <th className="py-2.5 px-4 text-center w-1/4">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs divide-y divide-slate-100">
                            {(Object.entries(customRepNames) as [string, string][])
                              .filter(([id, name]) => {
                                const q = namesSearchQuery.toLowerCase();
                                return id.includes(q) || name.toLowerCase().includes(q);
                              })
                              .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                              .map(([id, name]) => (
                                <tr key={id} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-4 font-mono font-bold text-slate-500">#{id}</td>
                                  <td className="py-2 px-4 font-semibold text-slate-800">{name}</td>
                                  <td className="py-2 px-4 text-center">
                                    <button
                                      onClick={() => {
                                        setCustomRepNames(prev => {
                                          const updated = { ...prev };
                                          delete updated[id];
                                          return updated;
                                        });
                                      }}
                                      className="p-1 text-rose-500 hover:text-rose-700 rounded transition-colors cursor-pointer inline-flex items-center animate-none"
                                      title="Excluir Overwrite"
                                    >
                                      <Trash2 className="w-4 h-4 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            {(Object.entries(customRepNames) as [string, string][]).filter(([id, name]) => {
                              const q = namesSearchQuery.toLowerCase();
                              return id.includes(q) || name.toLowerCase().includes(q);
                            }).length === 0 && (
                              <tr>
                                <td colSpan={3} className="py-6 px-4 text-center text-slate-400 font-medium italic">
                                  Nenhum mapeamento correspondente à busca.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-200 rounded-xl py-12 px-6 text-center text-slate-400 text-xs space-y-2">
                        <p>Nenhum nome de representante personalizado cadastrado ainda.</p>
                        <p className="text-[10px] text-slate-400 font-normal">Use o formulário ou a área de colar para carregar nomes oficiais.</p>
                      </div>
                    )}
                  </div>

                  {/* Actions footer inside right card */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                    <div>
                      {saveNamesSuccessMessage ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                          <Check className="w-4 h-4" />
                          <span>{saveNamesSuccessMessage}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {getFirebaseConfig() ? "✓ Sincronizado com Nuvem Firestore" : "⚠ Salvo apenas no seu navegador local"}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2.5">
                      {Object.keys(customRepNames).length > 0 && (
                        <button
                          onClick={() => {
                            if (confirm('Tem certeza que deseja limpar TODOS os mapeamentos de nomes?')) {
                              setCustomRepNames({});
                            }
                          }}
                          className="px-4 py-2 text-rose-600 hover:text-rose-750 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Limpar Todos
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleSaveRepNames()}
                        disabled={isSavingNames}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSavingNames ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Gravando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvar Dados Permanente</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 7: SALES BY STATE MAP AND DETAILS */}
          {activeTab === 'vendas_estado' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Main Split: Map on Left, Selected State Stats on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Side: Map of Brazil */}
                <div className="lg:col-span-7 flex flex-col">
                  <CustomMapBrazil
                    selectedState={selectedState}
                    onStateSelect={setSelectedState}
                    stateStats={stateStats}
                  />
                </div>

                {/* Right Side: Selected State Stats overview cards */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Métricas Regionais</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Análise de vendas e carteira de clientes ativos do estado selecionado.
                      </p>
                    </div>

                    {selectedState ? (
                      (() => {
                        const stats = stateStats[selectedState] || { quota: 0, sales: 0, repsCount: 0 };
                        const percent = stats.quota > 0 ? (stats.sales / stats.quota) * 100 : stats.sales > 0 ? 100 : 0;
                        const stateName = BRAZIL_STATES.find(s => s.uf === selectedState)?.name || selectedState;
                        const isUnderQuota = stats.quota > 0 && percent < 100;

                        return (
                          <div className="space-y-5">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-black text-slate-900">{stateName}</span>
                              <span className="bg-[#001A9C] text-white px-2.5 py-1 rounded-xl text-xs font-extrabold uppercase shadow-sm">
                                {selectedState}
                              </span>
                            </div>

                            {/* Stat block */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vendas Realizadas</span>
                                <span className="text-sm font-extrabold text-slate-800 block mt-1">{formatCurrency(stats.sales)}</span>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cota Planejada</span>
                                <span className="text-sm font-extrabold text-slate-800 block mt-1">{formatCurrency(stats.quota)}</span>
                              </div>
                            </div>

                            {/* Achievement meter */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                                <span>% Venda</span>
                                <span className={percent >= 100 ? 'text-emerald-600' : percent >= 75 ? 'text-yellow-600' : 'text-rose-600'}>
                                  {percent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    percent >= 100 ? 'bg-emerald-500' : percent >= 75 ? 'bg-yellow-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(percent, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Defasagem alert */}
                            <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                              percent >= 100 
                                ? 'bg-emerald-50 border-emerald-150 text-emerald-800'
                                : percent >= 75
                                ? 'bg-amber-50 border-amber-150 text-amber-800'
                                : 'bg-rose-50 border-rose-150 text-rose-800'
                            }`}>
                              <span className="font-extrabold block mb-1">
                                {percent >= 100 ? "✓ Meta Bateu com Sucesso" : percent >= 75 ? "⚠ Meta em Alerta" : "✕ Margem de Defasagem Elevada"}
                              </span>
                              {isUnderQuota ? (
                                <>A defasagem de vendas (Vendas - Cota) registrada em {selectedState} é de <strong className="font-black">{formatDefasagem(stats.sales - stats.quota)}</strong> para atingir os 100% planejados.</>
                              ) : stats.quota === 0 && stats.sales === 0 ? (
                                <>Não foram encontradas metas planejadas ou vendas ativas registradas para representantes deste estado neste período.</>
                              ) : (
                                <>Excelente resultado! A defasagem (Vendas - Cota) registrada em {selectedState} é de <strong className="font-black">{formatDefasagem(stats.sales - stats.quota)}</strong>.</>
                              )}
                            </div>

                            {/* Quick specs */}
                            <div className="divide-y divide-slate-100 text-xs">
                              <div className="py-2.5 flex justify-between">
                                <span className="text-slate-500">Representantes ativos no estado:</span>
                                <span className="font-bold text-slate-800">{stats.repsCount}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-12 text-center text-slate-400 italic text-xs space-y-2">
                        <MapIcon className="w-8 h-8 mx-auto text-slate-300" />
                        <p>Nenhum estado selecionado no mapa.</p>
                        <p className="text-[10px] text-slate-400 font-normal">Clique em qualquer estado colorido para analisar as métricas e ver a defasagem regional.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Mapeamentos de localizações ativos: {Object.keys(customRepLocations).length}</span>
                    <button
                      onClick={() => {
                        setSelectedState(null);
                      }}
                      disabled={!selectedState}
                      className="text-[#001A9C] hover:underline font-bold disabled:text-slate-300 disabled:no-underline"
                    >
                      Limpar filtro
                    </button>
                  </div>

                </div>

              </div>

              {/* Bottom Row: List of Representatives below the map */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-5 h-5 text-[#001A9C]" />
                      Representantes Ativos {selectedState ? `em ${selectedState}` : '(Lista Geral)'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedState 
                        ? `Mostrando representantes com atendimento mapeado exclusivamente para o estado de ${BRAZIL_STATES.find(s => s.uf === selectedState)?.name || selectedState}.` 
                        : "Mostrando todos os representantes com atendimento mapeado. Clique em uma UF do representante para destacar o mapa correspondente."
                      }
                    </p>
                  </div>
                  {selectedState && (
                    <button
                      onClick={() => setSelectedState(null)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      Ver Todos Estados
                    </button>
                  )}
                </div>

                {/* Table representation */}
                {(() => {
                  const filteredReps = repsAggregated.filter(rep => {
                    const repState = customRepLocations[rep.repId.toString().trim() || rep.repId];
                    if (selectedState) {
                      return repState === selectedState;
                    }
                    return true;
                  });

                  if (filteredReps.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400 italic text-xs space-y-1">
                        <p>Nenhum representante comercial encontrado para os filtros ativos.</p>
                        <p className="text-[10px] text-slate-400 font-normal">Verifique se as localizações dos representantes foram associadas na aba "Importar Localização".</p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <th className="py-3 px-4">ID</th>
                            <th className="py-3 px-4">Representante</th>
                            <th className="py-3 px-4 text-center">Estado (UF)</th>
                            <th className="py-3 px-4">Coordenador</th>
                            <th className="py-3 px-4 text-right">Meta/Cota Total</th>
                            <th className="py-3 px-4 text-right">Vendido CD+VP</th>
                            <th className="py-3 px-4 text-center">% Venda</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-slate-150 font-medium">
                          {filteredReps.map(rep => {
                            const repState = customRepLocations[rep.repId.toString().trim() || rep.repId] || null;
                            const statusColor = rep.pctTotal >= 100 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-150' 
                              : rep.pctTotal >= 75 
                              ? 'bg-amber-50 text-amber-800 border-amber-150' 
                              : rep.totalQuota === 0
                              ? 'bg-slate-50 text-slate-600 border-slate-150'
                              : 'bg-rose-50 text-rose-800 border-rose-150';

                            return (
                              <tr key={rep.repId} className="hover:bg-slate-50/55 transition-colors">
                                <td className="py-3 px-4 font-mono text-slate-500 font-bold">#{rep.repId}</td>
                                <td className="py-3 px-4 font-bold text-slate-800">
                                  {rep.repName}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {repState ? (
                                    <button
                                      onClick={() => setSelectedState(repState)}
                                      className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase border cursor-pointer hover:scale-105 transition-transform ${
                                        selectedState === repState 
                                          ? 'bg-[#001A9C] text-white border-[#001A9C]' 
                                          : 'bg-indigo-50/50 text-[#001A9C] border-indigo-200 hover:bg-indigo-100'
                                      }`}
                                      title="Filtrar por este estado no mapa"
                                    >
                                      {repState}
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Não Mapeado</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-slate-600">{rep.coordName}</td>
                                <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(rep.totalQuota)}</td>
                                <td className="py-3 px-4 text-right text-slate-900 font-bold">{formatCurrency(rep.totalFaturado)}</td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${statusColor}`}>
                                      {rep.totalQuota > 0 ? `${rep.pctTotal.toFixed(1)}%` : 'Sem Cota'}
                                    </span>
                                    {rep.totalQuota > 0 && (
                                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                        <div 
                                          className={`h-full rounded-full ${
                                            rep.pctTotal >= 100 ? 'bg-emerald-500' : rep.pctTotal >= 75 ? 'bg-yellow-500' : 'bg-rose-500'
                                          }`}
                                          style={{ width: `${Math.min(rep.pctTotal, 100)}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

              </div>
            </motion.div>
          )}

          {/* TAB 8: IMPORT REPRESENTATIVE LOCATIONS OVERRIDES */}
          {activeTab === 'localizacao' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header Info Banner */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#001A9C]" />
                    Importar e Mapear Localizações de Representantes
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                    Este menu associa códigos de representantes a estados específicos do Brasil (UFs).
                    Esses dados são persistidos na nuvem de forma permanente para preencher a visualização do mapa "Regiões".
                  </p>
                </div>
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl px-4 py-3 text-center shrink-0">
                  <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Mapeamentos Ativos</div>
                  <div className="text-2xl font-black text-indigo-650">{Object.keys(customRepLocations).length}</div>
                </div>
              </div>

              {/* Grid content split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left side panel: Paste spreadsheet / Manual insert */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Paste Clipboard block */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Área de Importação de Planilha</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Copie as colunas de "Representante ID" e "Estado UF" do Excel e cole no campo abaixo.
                      </p>
                    </div>

                    <textarea
                      placeholder={`Cole aqui no formato:\n1048\tSP\n1123\tRJ\n1205\tRS`}
                      rows={8}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/15 text-xs font-mono placeholder-slate-400 text-slate-700 leading-relaxed"
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('Text');
                        const success = handlePasteRepLocations(text);
                        if (success) {
                          alert('As localizações foram analisadas com sucesso! Clique em "Salvar Dados Permanente" abaixo para salvar.');
                        } else {
                          alert('Não foi possível identificar colunas compatíveis. Tente copiar diretamente duas colunas do Excel.');
                        }
                      }}
                    />

                    <div className="text-[10px] text-slate-400 leading-relaxed">
                      💡 <strong>Dica de Estrutura:</strong> Você pode copiar duas colunas diretamente de uma planilha do Excel. O importador aceita tabulações, ponto e vírgulas, ou espaços como delimitadores.
                    </div>
                  </div>

                  {/* Manual Single Mapping Form */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Cadastro Individual</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Adicione ou edite uma associação de localização manualmente.
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const rId = (form.elements.namedItem('manualRepId') as HTMLInputElement).value.trim();
                        const rState = (form.elements.namedItem('manualRepState') as HTMLSelectElement).value.trim();
                        
                        if (rId && rState) {
                          setCustomRepLocations(prev => ({
                            ...prev,
                            [rId]: rState
                          }));
                          form.reset();
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID Representante</label>
                          <input
                            type="text"
                            name="manualRepId"
                            required
                            placeholder="Ex: 1048"
                            className="w-full text-xs bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado (UF)</label>
                          <select
                            name="manualRepState"
                            required
                            className="w-full text-xs bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            {[
                              'AL', 'BA', 'CE', 'PB', 'PE', 'PI', 'RN', 'SE'
                            ].map(uf => (
                              <option key={uf} value={uf}>{uf}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-250 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar Overwrite</span>
                      </button>
                    </form>
                  </div>

                </div>

                {/* Right side panel: Search & Active location overrides table */}
                <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Localizações Cadastradas</h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Gerencie as localizações associadas aos representantes.
                        </p>
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Pesquisar mapeamento..."
                          value={namesSearchQuery}
                          onChange={(e) => setNamesSearchQuery(e.target.value)}
                          className="w-full text-xs pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/15 text-slate-700"
                        />
                      </div>
                    </div>

                    {/* Table list */}
                    {Object.keys(customRepLocations).length > 0 ? (
                      <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              <th className="py-2.5 px-4 w-1/4">Código ID</th>
                              <th className="py-2.5 px-4 w-2/4">Representante Comercial</th>
                              <th className="py-2.5 px-4 text-center w-1/4">Estado (UF)</th>
                              <th className="py-2.5 px-4 text-center w-1/4">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs divide-y divide-slate-100">
                            {(Object.entries(customRepLocations) as [string, string][])
                              .filter(([id, state]) => {
                                const q = namesSearchQuery.toLowerCase();
                                const repName = (customRepNames[id] || `Representante #${id}`).toLowerCase();
                                return id.includes(q) || state.toLowerCase().includes(q) || repName.includes(q);
                              })
                              .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                              .map(([id, state]) => (
                                <tr key={id} className="hover:bg-slate-50/55">
                                  <td className="py-2 px-4 font-mono font-bold text-slate-500">#{id}</td>
                                  <td className="py-2 px-4 font-semibold text-slate-800">
                                    {customRepNames[id] || (
                                      <span className="text-slate-400 font-normal italic">Nome não mapeado (ID: {id})</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    <span className="bg-indigo-50 text-[#001A9C] border border-indigo-150 text-[10px] font-extrabold px-2 py-0.5 rounded">
                                      {state}
                                    </span>
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCustomRepLocations(prev => {
                                          const updated = { ...prev };
                                          delete updated[id];
                                          return updated;
                                        });
                                      }}
                                      className="p-1 text-rose-500 hover:text-rose-750 rounded transition-colors cursor-pointer inline-flex items-center"
                                      title="Excluir Mapeamento"
                                    >
                                      <Trash2 className="w-4 h-4 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            {(Object.entries(customRepLocations) as [string, string][]).filter(([id, state]) => {
                              const q = namesSearchQuery.toLowerCase();
                              const repName = (customRepNames[id] || `Representante #${id}`).toLowerCase();
                              return id.includes(q) || state.toLowerCase().includes(q) || repName.includes(q);
                            }).length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-6 px-4 text-center text-slate-400 font-medium italic">
                                  Nenhum mapeamento correspondente à busca.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-200 rounded-xl py-12 px-6 text-center text-slate-400 text-xs space-y-2">
                        <p>Nenhuma localização mapeada ainda.</p>
                        <p className="text-[10px] text-slate-400 font-normal">Use a caixa de colagem ou o formulário para associar representantes a estados.</p>
                      </div>
                    )}
                  </div>

                  {/* Actions footer inside right card */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                    <div>
                      {saveLocationsSuccessMessage ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                          <Check className="w-4 h-4" />
                          <span>{saveLocationsSuccessMessage}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {getFirebaseConfig() ? "✓ Sincronizado com Nuvem Firestore" : "⚠ Salvo apenas no seu navegador local"}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2.5">
                      {Object.keys(customRepLocations).length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja limpar TODOS os mapeamentos de localização?')) {
                              setCustomRepLocations({});
                            }
                          }}
                          className="px-4 py-2 text-rose-600 hover:text-rose-750 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Limpar Todos
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => handleSaveRepLocations()}
                        disabled={isSavingLocations}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSavingLocations ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Gravando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvar Dados Permanente</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 9: USER MANAGEMENT */}
          {activeTab === 'usuarios' && userRole === 'admin' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <UserManagementTab
                users={systemUsers}
                onUpdateUsers={handleUpdateSystemUsers}
                availableReps={availableRepsList}
                customRepNames={customRepNames}
              />
            </motion.div>
          )}

        </section>

      </main>

      {/* Floating detail status notice */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 mt-12 text-center pb-8 space-y-6">
        {/* Database Status Block - Centralized */}
        <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-6 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl shadow-3xs text-xs font-bold text-slate-600 max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-400 uppercase text-[10px] tracking-wider">Status:</span>
            {allRecords.length > 0 ? (
              <span className="text-emerald-600 flex items-center gap-1.5 font-extrabold whitespace-nowrap">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                Ativo ({allRecords.length} reg)
              </span>
            ) : (
              <span className="text-amber-500 flex items-center gap-1.5 font-extrabold whitespace-nowrap" title="Sem dados salvos no banco">
                <span className="w-2 h-2 bg-amber-400 rounded-full shrink-0" />
                Sem dados salvos
              </span>
            )}
          </div>

          <div className="hidden sm:block h-3.5 w-px bg-slate-200 shrink-0" />

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-400 uppercase text-[10px] tracking-wider">Armazenamento:</span>
            {usingLocalStorageFallback ? (
              <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap" title="Ambiente estático. Os dados são guardados apenas no seu navegador.">
                Navegador (Vercel)
              </span>
            ) : (
              <span className="text-[#001A9C] bg-blue-50 px-2 py-0.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap" title="Servidor ativo. Os dados estão salvos na nuvem compartilhada.">
                Servidor Cloud
              </span>
            )}
          </div>

          <div className="hidden sm:block h-3.5 w-px bg-slate-200 shrink-0" />

          <div className="flex items-center shrink-0">
            {isFirebaseConnected ? (
              <button
                type="button"
                onClick={handleCloudButtonClick}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 text-[10px] font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer border border-emerald-150 transition-all shadow-3xs whitespace-nowrap shrink-0"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                Banco Cloud Ativo 🟢
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCloudButtonClick}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-800 text-[10px] font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer border border-indigo-150 transition-all shadow-3xs whitespace-nowrap shrink-0"
              >
                <Database className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                Conectar Firebase Cloud
              </button>
            )}
          </div>
        </div>

        <AnalyticsDashboard isFirebaseConnected={isFirebaseConnected} />

        <p className="text-xs text-slate-400 font-medium">© 2026 Tramontina S/A. Todos os direitos reservados. Sistema interno de performance de representantes.</p>
      </footer>

      {/* Cloud active password verification modal */}
      <AnimatePresence>
        {isCloudPasswordModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Acesso ao Banco Cloud</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Digite a senha para prosseguir</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCloudPasswordModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCloudPasswordSubmit} autoComplete="off" className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block" htmlFor="cloud_db_password">
                    Senha de Acesso
                  </label>
                  <input
                    id="cloud_db_password"
                    name="cloud_db_password"
                    type="password"
                    required
                    value={cloudPasswordInput}
                    autoComplete="new-password"
                    data-lpignore="true"
                    spellCheck={false}
                    onChange={(e) => {
                      setCloudPasswordInput(e.target.value);
                      if (cloudPasswordError) setCloudPasswordError('');
                    }}
                    placeholder="Digite a senha do banco"
                    className="w-full text-xs bg-slate-50 border border-slate-200 py-2.5 px-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/15 focus:border-[#001A9C]/30 text-slate-800 font-semibold transition-all"
                    autoFocus
                  />
                  {cloudPasswordError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-rose-500 font-bold"
                    >
                      {cloudPasswordError}
                    </motion.p>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCloudPasswordModalOpen(false)}
                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200 cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#001A9C] hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer text-center"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FirebaseSetupModal 
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        onConnectionStatusChange={checkFirebaseStatus}
      />

      {/* Date range filter modal for presentation generation */}
      <AnimatePresence>
        {isPresentationModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <Presentation className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Exportar Apresentação</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Selecione o período de consolidação dos dados</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isGeneratingPresentation}
                  onClick={() => setIsPresentationModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress/Form Content */}
              {isGeneratingPresentation ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-700">{presentationProgressText || 'Gerando apresentação...'}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Isso pode levar alguns segundos dependendo do volume de dados.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePresentationSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Mês Inicial
                      </label>
                      <select
                        value={presStartMonth}
                        onChange={(e) => setPresStartMonth(Number(e.target.value))}
                        className="w-full text-xs bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/15 focus:border-[#001A9C]/30 text-slate-800 font-semibold cursor-pointer"
                      >
                        {[
                          { value: 1, name: "Janeiro" },
                          { value: 2, name: "Fevereiro" },
                          { value: 3, name: "Março" },
                          { value: 4, name: "Abril" },
                          { value: 5, name: "Maio" },
                          { value: 6, name: "Junho" },
                          { value: 7, name: "Julho" },
                          { value: 8, name: "Agosto" },
                          { value: 9, name: "Setembro" },
                          { value: 10, name: "Outubro" },
                          { value: 11, name: "Novembro" },
                          { value: 12, name: "Dezembro" }
                        ].map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Mês Final
                      </label>
                      <select
                        value={presEndMonth}
                        onChange={(e) => setPresEndMonth(Number(e.target.value))}
                        className="w-full text-xs bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/15 focus:border-[#001A9C]/30 text-slate-800 font-semibold cursor-pointer"
                      >
                        {[
                          { value: 1, name: "Janeiro" },
                          { value: 2, name: "Fevereiro" },
                          { value: 3, name: "Março" },
                          { value: 4, name: "Abril" },
                          { value: 5, name: "Maio" },
                          { value: 6, name: "Junho" },
                          { value: 7, name: "Julho" },
                          { value: 8, name: "Agosto" },
                          { value: 9, name: "Setembro" },
                          { value: 10, name: "Outubro" },
                          { value: 11, name: "Novembro" },
                          { value: 12, name: "Dezembro" }
                        ].map((m) => (
                          <option key={m.value} value={m.value} disabled={m.value < presStartMonth}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex gap-2.5">
                    <div className="w-5 h-5 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                      <Calendar className="w-3 h-3" />
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      As vendas, as cotas, as KPIs e os relatórios de atingimento da apresentação gerada serão automaticamente consolidados e acumulados entre os meses selecionados de <strong className="text-slate-700">{selectedYear}</strong>, com comparações contra o mesmo período de <strong className="text-slate-700">{selectedYear - 1}</strong>.
                    </p>
                  </div>

                  {/* Footer Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isGeneratingPresentation}
                      onClick={() => setIsPresentationModalOpen(false)}
                      className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200 cursor-pointer text-center disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isGeneratingPresentation}
                      className="flex-1 py-2.5 bg-[#001A9C] hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer text-center disabled:opacity-50"
                    >
                      Gerar Apresentação
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

