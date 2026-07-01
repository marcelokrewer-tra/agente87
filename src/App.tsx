import React, { useState, useMemo, useEffect } from 'react';
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
import { TramontinaLogo } from './components/TramontinaLogo';
import { generateSalesPresentation } from './presentation';
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign, 
  Search, 
  Award, 
  ShieldAlert, 
  ArrowUpRight, 
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
  Database,
  RefreshCw,
  Sparkles,
  Lock,
  Trash2,
  Plus,
  UploadCloud,
  Check,
  Map as MapIcon,
  MapPin,
  Clock,
  Presentation
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
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('kpi_authenticated') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '8701') {
      setIsAuthenticated(true);
      localStorage.setItem('kpi_authenticated', 'true');
      setAuthError('');
    } else {
      setAuthError('Senha incorreta. Tente novamente.');
    }
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
      const sorted = [...periods].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });
      setSelectedYear(sorted[0].year);
      setSelectedMonth(sorted[0].month);
      setTempYear(sorted[0].year);
      setTempMonth(sorted[0].month);
      setHasSetInitialPeriod(true);
    }
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
      setCloudPasswordError('Senha incorreta. Tente novamente.');
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

  // Check Firebase on mount and load available periods
  useEffect(() => {
    checkFirebaseStatus();
    fetchAvailablePeriods();
  }, []);

  // Re-fetch when Firebase status shifts or active period shifts
  useEffect(() => {
    fetchAvailablePeriods();
    fetchPeriodData(selectedYear, selectedMonth);
    
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
  }, [selectedYear, selectedMonth, isAccumulated, accumulateStartMonth, accumulateEndMonth]);

  // Product Group mappings as requested by the user
  const PRODUCT_GROUP_MAPPING = {
    "Cut Geral Monet.": "Tramontina Cutelaria",
    "Garibaldi Master Mon": "Tramontina Master",
    "Garibaldi Pro Monet": "Tramontina Pro",
    "Sem Grupo": "Tramontina Multi"
  } as const;

  const ALLOWED_PRODUCT_GROUPS = [
    "Tramontina Cutelaria",
    "Tramontina Master",
    "Tramontina Pro",
    "Tramontina Multi"
  ] as const;
  
  // Dashboard Core Navigation Tabs
  const [activeTab, setActiveTab] = useState<'geral' | 'representantes' | 'detalhado' | 'previa' | 'importar' | 'nomes' | 'vendas_estado' | 'localizacao'>('geral');
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);

  const [previews, setPreviews] = useState<RepresentativePreview[]>([]);
  const [previewsUpdatedAt, setPreviewsUpdatedAt] = useState<string | null>(null);
  const [isSavingPreviews, setIsSavingPreviews] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const handlePastePreviews = (text: string) => {
    const lines = text.split('\n');
    const newPreviews: RepresentativePreview[] = [];
    
    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(/\t|;|,(?!\d)/);
      if (parts.length >= 2) {
        const repId = parts[0].trim();
        const rawPrevia = parts[1].trim();
        const rawVendaDia = parts[2] ? parts[2].trim() : "0";
        
        if (repId.toLowerCase().includes('representante') || repId.toLowerCase().includes('código') || repId.toLowerCase().includes('repid')) {
          return;
        }
        
        const previaValue = parseBrazilianNumber(rawPrevia);
        const vendaDiaPrevia = parseBrazilianNumber(rawVendaDia);
        
        if (repId) {
          newPreviews.push({
            repId,
            previaValue,
            vendaDiaPrevia
          });
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
  const [searchText, setSearchText] = useState<string>('');
  const [selectedRepIdFilter, setSelectedRepIdFilter] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [namesSearchQuery, setNamesSearchQuery] = useState<string>('');
  const [progressThreshold, setProgressThreshold] = useState<string>('All'); // 'All', '100+', '75-99', 'under-75'
  const [showPreviewMetrics, setShowPreviewMetrics] = useState<boolean>(true);

  useEffect(() => {
    if (activeTab === 'previa' && (!isDisplayingCurrentData || !selectedProductGroups.includes('All'))) {
      setActiveTab('geral');
    }
  }, [selectedYear, selectedMonth, isDisplayingCurrentData, selectedProductGroups, activeTab]);
  
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

  // Compute filtered records based on interactive panel
  const filteredRecords = useMemo(() => {
    return resolvedRecords.filter(r => {
      // Coordinator filter (using original coordinator name to allow proper Pro/Master filtering)
      if (selectedCoordinator !== 'All') {
        const matchOriginal = r.originalCoordName.toLowerCase().trim() === selectedCoordinator.toLowerCase().trim() ||
                              r.originalCoordName.toLowerCase().trim().includes(selectedCoordinator.toLowerCase().trim().split(' ')[0]);
        if (!matchOriginal) return false;
      }
      
      // Product Group filter
      if (!selectedProductGroups.includes('All') && selectedProductGroups.length > 0) {
        const mappedGroupName = getMappedGroupName(r.groupName);
        if (!selectedProductGroups.includes(mappedGroupName)) {
          return false;
        }
      }
      
      // Representative exact ID filter
      if (selectedRepIdFilter !== null) {
        if (r.repId !== selectedRepIdFilter) return false;
      } else {
        // Search matching (by rep name or ID)
        if (searchText.trim() !== '') {
          const query = searchText.toLowerCase();
          const matchName = r.repName.toLowerCase().includes(query);
          const matchId = r.repId.toString().includes(query);
          const matchGroup = r.groupName.toLowerCase().includes(query);
          if (!matchName && !matchId && !matchGroup) return false;
        }
      }

      // Achievement threshold filter
      if (progressThreshold !== 'All') {
        const rate = r.quotaTotal > 0 ? (r.valorVendaTotal / r.quotaTotal) * 100 : 0;
        if (progressThreshold === '100+' && rate < 100) return false;
        if (progressThreshold === '75-99' && (rate < 75 || rate >= 100)) return false;
        if (progressThreshold === 'under-75' && rate >= 75) return false;
      }

      // State filter (clicked on the map)
      if (selectedState) {
        const repState = customRepLocations[r.repId.toString().trim() || r.repId];
        if (repState !== selectedState) return false;
      }

      return true;
    });
  }, [resolvedRecords, selectedCoordinator, selectedProductGroups, searchText, selectedRepIdFilter, progressThreshold, selectedState, customRepLocations]);

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
      if (!groups[r.coordName]) {
        groups[r.coordName] = { quota: 0, faturado: 0, name: r.coordName, reps: new Set() };
      }
      groups[r.coordName].quota += r.quotaTotal;
      groups[r.coordName].faturado += r.valorVendaTotal;
      groups[r.coordName].reps.add(r.repId);
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

    // Aggregate quotas and sales from resolvedRecords matching active filters (coordinator & products)
    resolvedRecords.forEach(r => {
      const repState = customRepLocations[r.repId.toString().trim() || r.repId];
      if (repState && stats[repState]) {
        // Coordinator filter
        if (selectedCoordinator !== 'All') {
          const matchOriginal = r.originalCoordName.toLowerCase().trim() === selectedCoordinator.toLowerCase().trim() ||
                                r.originalCoordName.toLowerCase().trim().includes(selectedCoordinator.toLowerCase().trim().split(' ')[0]);
          if (!matchOriginal) return;
        }
        
        // Product Group filter
        if (!selectedProductGroups.includes('All') && selectedProductGroups.length > 0) {
          const mappedGroupName = getMappedGroupName(r.groupName);
          if (!selectedProductGroups.includes(mappedGroupName)) {
            return;
          }
        }

        stats[repState].quota += r.quotaTotal;
        stats[repState].sales += r.valorVendaTotal;
      }
    });

    return stats;
  }, [resolvedRecords, customRepLocations, selectedCoordinator, selectedProductGroups]);

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

    return Object.entries(groups)
      .map(([name, val]) => ({
        name: name,
        value: val,
        share: totalAll > 0 ? (val / totalAll) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
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
    return selectedCoordinator !== 'All' || searchText.trim() !== '' || !selectedProductGroups.includes('All') || progressThreshold !== 'All' || selectedState !== null || selectedRepIdFilter !== null;
  }, [selectedCoordinator, searchText, selectedProductGroups, progressThreshold, selectedState, selectedRepIdFilter]);

  // Preview totals based on mapped previews
  const previewTotals = useMemo(() => {
    let totalExpectativa = 0;
    let totalVendaDiaPrevia = 0;
    let totalPedidosNovos = 0;

    previews.forEach(p => {
      const isMatch = !hasAnyFilter || activeRepIds.has(p.repId.toString().trim());
      if (isMatch) {
        totalExpectativa += p.previaValue;
        totalVendaDiaPrevia += p.vendaDiaPrevia;

        const rep = repsAggregated.find(r => r.repId.toString().trim() === p.repId.toString().trim());
        const currentSales = rep ? rep.totalVendido : 0;
        totalPedidosNovos += (currentSales - p.vendaDiaPrevia);
      }
    });

    const totalVendaAtual = totals.valorVendaTotal;
    const defasagemPrevia = totalVendaAtual - totalVendaDiaPrevia - totalExpectativa;
    const hasAnyPreview = previews.length > 0;

    return {
      totalExpectativa,
      totalVendaDiaPrevia,
      totalVendaAtual,
      defasagemPrevia,
      totalPedidosNovos,
      hasAnyPreview
    };
  }, [previews, activeRepIds, hasAnyFilter, totals.valorVendaTotal, repsAggregated]);

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
      const pValue = matchingPreview ? matchingPreview.previaValue : 0;
      const vDiaPrevia = matchingPreview ? matchingPreview.vendaDiaPrevia : 0;
      const pNovos = valorVendaTotal - vDiaPrevia;

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
  }, [filteredRecords, previews]);

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
    const headers = [
      'Representante ID', 'Nome Representante', 'Coordenador', 'Grupo', 
      'Cota Total', 'Vendas Total', '% Venda', 'Defasagem', 'Prévia', 'Pedidos Novos'
    ];
    
    const csvRows = [
      headers.join(';'), // semicolon for Excel friendly portuguese locale parser
      ...sortedDetails.map(r => {
        const matchingPreview = previews.find(p => p.repId.toString().trim() === r.repId.toString().trim());
        const previaVal = matchingPreview ? matchingPreview.previaValue : 0;
        const vendaDiaPrevia = matchingPreview ? matchingPreview.vendaDiaPrevia : 0;
        const pedNovos = r.valorVendaTotal - vendaDiaPrevia;
        
        return [
          r.repId,
          `"${r.repName.replace(/"/g, '""')}"`,
          `"${r.coordName.replace(/"/g, '""')}"`,
          `"${r.groupName.replace(/"/g, '""')}"`,
          r.quotaTotal.toString().replace('.', ','),
          r.valorVendaTotal.toString().replace('.', ','),
          (r.quotaTotal > 0 ? ((r.valorVendaTotal / r.quotaTotal) * 100).toFixed(1) : '0').replace('.', ','),
          r.defasagem.toString().replace('.', ','),
          previaVal.toString().replace('.', ','),
          pedNovos.toString().replace('.', ',')
        ].join(';');
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

    const aggregatedRows = Object.values(aggregatedByGroup);

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
              <p className="text-[11px] sm:text-xs text-slate-500">Acesso Restrito • Painel de KPI & Prévias</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center">
                Digite a senha de acesso
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (authError) setAuthError('');
                }}
                placeholder="••••"
                className="w-full tracking-widest text-center text-lg font-bold py-3 px-4 bg-slate-50 border border-slate-200 focus:border-[#001A9C] focus:bg-white rounded-xl sm:rounded-2xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#001A9C]/5 transition-all font-mono"
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
            {/* Logo area */}
            <div className="pb-3 border-b border-slate-150 flex flex-col gap-1.5">
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
                Agente 87 - Ferramentas
              </span>
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

            {/* Wrapped filters block - collapsible on mobile, always visible on large screens */}
            <div className={`space-y-4 lg:space-y-6 lg:block ${isMobileFiltersExpanded ? 'block' : 'hidden'}`}>
              {/* Seleção de Período (Mês / Ano) */}
            <div className="space-y-2.5 lg:space-y-3.5 pb-3 lg:pb-4 border-b border-slate-150">
              {/* Botão Mostrar Dados Atuais */}
              <button
                onClick={handleShowCurrentData}
                className="w-full py-1.5 px-3 bg-blue-50/50 hover:bg-[#001A9C]/10 text-[#001A9C] border border-[#001A9C]/10 hover:border-[#001A9C]/20 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs group"
                title="Voltar para o último período com dados (mês ativo)"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#001A9C] group-hover:translate-y-[-1px] transition-transform" />
                <span>Mostrar dados atuais</span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#001A9C]" />
                  Período de Análise
                </label>
                {isLoadingPeriod && (
                  <RefreshCw className="w-3 h-3 text-[#001A9C] animate-spin" />
                )}
              </div>
              
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-150 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tempIsAccumulated}
                    onChange={(e) => {
                      setTempIsAccumulated(e.target.checked);
                      if (e.target.checked) {
                        setTempAccumulateStartMonth(1);
                        setTempAccumulateEndMonth(tempMonth);
                      }
                    }}
                    className="rounded border-slate-300 text-[#001A9C] focus:ring-[#001A9C] cursor-pointer"
                  />
                  <span className="text-[11px] font-extrabold text-slate-700">Acumular Período</span>
                </label>

                {tempIsAccumulated ? (
                  <div className="space-y-2 pt-1 border-t border-slate-150">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Ano de Análise</span>
                      <select
                        value={tempYear}
                        onChange={(e) => {
                          setTempYear(parseInt(e.target.value));
                        }}
                        className="w-full text-xs bg-white border border-slate-200 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-700 font-semibold cursor-pointer"
                      >
                        {[2025, 2026].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">De (Mês)</span>
                        <select
                          value={tempAccumulateStartMonth}
                          onChange={(e) => {
                            setTempAccumulateStartMonth(parseInt(e.target.value));
                          }}
                          className="w-full text-xs bg-white border border-slate-200 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-700 font-semibold cursor-pointer"
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
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Até (Mês)</span>
                        <select
                          value={tempAccumulateEndMonth}
                          onChange={(e) => {
                            setTempAccumulateEndMonth(parseInt(e.target.value));
                          }}
                          className="w-full text-xs bg-white border border-slate-200 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-700 font-semibold cursor-pointer"
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
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-150">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Mês</span>
                      <select
                        value={tempMonth}
                        onChange={(e) => {
                          setTempMonth(parseInt(e.target.value));
                        }}
                        className="w-full text-xs bg-white border border-slate-200 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-700 font-semibold cursor-pointer"
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
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Ano</span>
                      <select
                        value={tempYear}
                        onChange={(e) => {
                          setTempYear(parseInt(e.target.value));
                        }}
                        className="w-full text-xs bg-white border border-slate-200 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-700 font-semibold cursor-pointer"
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
                  className="w-full mt-2 py-2 px-3 bg-[#001A9C] hover:bg-[#00147a] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filtrar</span>
                </button>
              </div>


            </div>

            {/* Keyword Search */}
            <div className="space-y-1.5">
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
            </div>

            {/* Coordinator Selector List */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Coordenador</label>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCoordinator('All');
                    setCurrentPage(1);
                    setIsMobileFiltersExpanded(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    selectedCoordinator === 'All'
                      ? 'bg-[#001A9C] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedCoordinator === 'All' ? 'bg-white' : 'bg-slate-300'}`} />
                  Todos
                </button>
                {distinctCoordinators.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedCoordinator(c);
                      setCurrentPage(1);
                      setIsMobileFiltersExpanded(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      selectedCoordinator === c
                        ? 'bg-[#001A9C] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedCoordinator === c ? 'bg-white' : 'bg-[#001A9C]'}`} />
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Group Filter (Grupo de Produtos) Checkboxes */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Grupo de Produtos</label>
              <div className="space-y-2.5 pt-1">
                {/* "Todos" Checkbox */}
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors">
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
                      setIsMobileFiltersExpanded(false);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-[#001A9C] focus:ring-[#001A9C]/20 cursor-pointer accent-[#001A9C]"
                  />
                  <span>Todos</span>
                </label>

                {/* Individual dynamic allowed groups as checkboxes */}
                {distinctProductGroups.map(g => {
                  const isChecked = selectedProductGroups.includes(g) || selectedProductGroups.includes('All');
                  return (
                    <label key={g} className="flex items-center gap-2.5 text-xs font-bold text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          let updated = [...selectedProductGroups];
                          if (updated.includes('All')) {
                            updated = [g];
                          } else {
                            if (updated.includes(g)) {
                              updated = updated.filter(item => item !== g);
                            } else {
                              updated.push(g);
                            }
                          }
                          
                          if (updated.length === 0 || updated.length === distinctProductGroups.length) {
                            updated = ['All'];
                          }
                          setSelectedProductGroups(updated);
                          setCurrentPage(1);
                          setIsMobileFiltersExpanded(false);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-[#001A9C] focus:ring-[#001A9C]/20 cursor-pointer accent-[#001A9C]"
                      />
                      <span>{g}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Achievement Rate Filter */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
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
                      setIsMobileFiltersExpanded(false);
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

            {/* Filter stats footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-450 font-bold">
              <span>Registros filtrados:</span>
              <strong className="text-slate-800 text-xs font-sans font-extrabold">{filteredRecords.length} / {allRecords.length}</strong>
            </div>
            </div>
          </div>
        </section>

        {/* RIGHT METRICS GRID AND TABBED CONTROLLERS */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Bento row of Core metrics cards (Filtered live) */}
          {allRecords.length > 0 && (
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ROW 1: QUOTAS */}
                <MetricCard
                  title="Cota Total"
                  value={formatCurrency(totals.quotaTotal)}
                  icon={<Target className="w-5 h-5 text-blue-600" />}
                  accentColor="blue"
                />
                <MetricCard
                  title="Cota CD"
                  value={formatCurrency(totals.quotaCD)}
                  icon={<Target className="w-5 h-5 text-purple-600" />}
                  accentColor="purple"
                />
                <MetricCard
                  title="Cota VP"
                  value={formatCurrency(totals.quotaVP)}
                  icon={<Target className="w-5 h-5 text-teal-600" />}
                  accentColor="teal"
                />

                {/* ROW 2: VENDAS */}
                <MetricCard
                  title="Vendas Total"
                  value={formatCurrency(totals.valorVendaTotal)}
                  icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                  accentColor="blue"
                />
                <MetricCard
                  title="Vendas CD"
                  value={formatCurrency(totals.valorVendaCD)}
                  icon={<DollarSign className="w-5 h-5 text-purple-600" />}
                  accentColor="purple"
                />
                <MetricCard
                  title="Vendas VP"
                  value={formatCurrency(totals.valorVendaVP)}
                  icon={<DollarSign className="w-5 h-5 text-teal-600" />}
                  accentColor="teal"
                />

                {/* ROW 3: % ATINGIMENTO */}
                <MetricCard
                  title="% VENDAS TOTAL"
                  value={formatPercent(totals.achTotal)}
                  icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
                  accentColor="blue"
                />
                <MetricCard
                  title="% VENDAS CD"
                  value={formatPercent(totals.achCD)}
                  icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                  accentColor="purple"
                />
                <MetricCard
                  title="% VENDAS VP"
                  value={formatPercent(totals.achVP)}
                  icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
                  accentColor="teal"
                />

                {/* ROW 4: DEFASAGEM */}
                <MetricCard
                  title="Defasagem Total"
                  value={formatDefasagem(totals.defasagem)}
                  icon={totals.defasagem >= 0 ? <Check className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-rose-600" />}
                  accentColor={totals.defasagem >= 0 ? "emerald" : "rose"}
                  valueClassName={totals.defasagem >= 0 ? "text-emerald-600" : "text-rose-600"}
                />
                <MetricCard
                  title="Defasagem CD"
                  value={formatDefasagem(totals.valorVendaCD - totals.quotaCD)}
                  icon={(totals.valorVendaCD - totals.quotaCD) >= 0 ? <Check className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-rose-600" />}
                  accentColor={(totals.valorVendaCD - totals.quotaCD) >= 0 ? "emerald" : "rose"}
                  valueClassName={(totals.valorVendaCD - totals.quotaCD) >= 0 ? "text-emerald-600" : "text-rose-600"}
                />
                <MetricCard
                  title="Defasagem VP"
                  value={formatDefasagem(totals.valorVendaVP - totals.quotaVP)}
                  icon={(totals.valorVendaVP - totals.quotaVP) >= 0 ? <Check className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-rose-600" />}
                  accentColor={(totals.valorVendaVP - totals.quotaVP) >= 0 ? "emerald" : "rose"}
                  valueClassName={(totals.valorVendaVP - totals.quotaVP) >= 0 ? "text-emerald-600" : "text-rose-600"}
                />
              </div>

              {/* PREVIEW METRICS SECTION */}
              {isDisplayingCurrentData && selectedProductGroups.includes('All') && previewTotals.hasAnyPreview && (
                <div className="bg-amber-50/40 border border-amber-200 p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-600" />
                      <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                        PRÉVIA
                      </span>
                    </div>
                    <button
                      onClick={() => setShowPreviewMetrics(!showPreviewMetrics)}
                      className="text-xs font-bold text-[#001A9C] hover:underline cursor-pointer"
                    >
                      {showPreviewMetrics ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
                    </button>
                  </div>

                  {showPreviewMetrics && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Card 1: Prévia */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1.5 transition-all hover:border-amber-300">
                          <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">PRÉVIA</span>
                          <div className="text-lg font-black text-slate-900">{formatCurrency(previewTotals.totalExpectativa)}</div>
                        </div>

                        {/* Card 2: Vendas do Dia da Prévia */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1.5 transition-all hover:border-amber-300">
                          <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">VENDAS NO DIA DA PRÉVIA</span>
                          <div className="text-lg font-black text-slate-900">{formatCurrency(previewTotals.totalVendaDiaPrevia)}</div>
                          {previewsUpdatedAt && (
                            <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50/50 py-1 px-2.5 rounded-lg inline-block mt-1">
                              Prévia enviada no dia {formatPreviewsDate(previewsUpdatedAt)}
                            </p>
                          )}
                        </div>

                        {/* Card 3: Defasagem Prévia */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1.5 transition-all hover:border-amber-300">
                          <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">DEFASAGEM DA PRÉVIA</span>
                          <div className={`text-lg font-black ${previewTotals.defasagemPrevia >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatDefasagem(previewTotals.defasagemPrevia)}
                          </div>
                        </div>

                        {/* Card 4: Pedidos Novos */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1.5 transition-all hover:border-amber-300">
                          <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">PEDIDOS NOVOS</span>
                          <div className={`text-lg font-black ${previewTotals.totalPedidosNovos >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(previewTotals.totalPedidosNovos)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
 
          {/* Navigation controller layout bar */}
          <div className="bg-white border border-slate-100 p-2 rounded-2xl shadow-xs flex flex-wrap gap-2 items-center">
            {[
              { id: 'geral', label: 'Geral', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'representantes', label: 'Representantes', icon: <User className="w-4 h-4" /> },
              { id: 'vendas_estado', label: 'Regiões', icon: <MapIcon className="w-4 h-4" /> },
              { id: 'detalhado', label: 'Tabela Detalhada', icon: <FileText className="w-4 h-4" /> }
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

            {/* Import Information Dropdown Menu */}
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
                      { id: 'previa', label: 'Importar Prévia', icon: <Target className="w-4 h-4 text-amber-500" /> },
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
          </div>

          {/* EMPTY STATE IF NO DATA IN ACTIVE PERIOD */}
          {allRecords.length === 0 && !['previa', 'importar', 'nomes', 'localizacao'].includes(activeTab) && (
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
                
                {/* Visual Coordinator Bar chart inside standard container */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm md:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-55 pb-2">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <LineChart className="w-4.5 h-4.5 text-indigo-500" />
                      Metas por Coordenador (CD + VP)
                    </h3>
                    <button
                      onClick={handleExportPresentation}
                      disabled={isGeneratingPresentation}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-sm transition-all cursor-pointer border border-indigo-200"
                      title="Gerar Apresentação de Vendas PPTX"
                    >
                      <Presentation className="w-4 h-4" />
                      {isGeneratingPresentation ? 'Gerando Apresentação...' : 'Gerar Apresentação de Vendas'}
                    </button>
                  </div>

                  <div className="space-y-4 pt-1">
                    {coordinatorPerformance.map((item, idx) => {
                      const cappedPercent = Math.min(item.percent, 100);
                      return (
                        <div key={item.name} className="space-y-1.5 group cursor-pointer" onClick={() => setSelectedCoordinator(item.name)}>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                              <span className="text-slate-300 font-bold">#{idx+1}</span>
                              {item.name}
                              <span className="text-[10px] text-slate-400 font-normal">({item.repsCount} reps)</span>
                            </span>
                            <div className="text-right">
                              <span className="font-extrabold text-slate-900">{formatPercent(item.percent)}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Vnd: {formatCurrency(item.faturado)}</span>
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

                    {coordinatorPerformance.length === 0 && (
                      <div className="py-8 text-center text-slate-400 text-xs">Nenhum coordenador correspondente aos filtros.</div>
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

              {/* Top Rankings list: Stars podium & Deficit review block */}
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
                            <span className="text-[10px] text-slate-400 block mt-0.5">Vnd: {formatCurrency(rep.totalFaturado)}</span>
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
                  
                  <button
                    onClick={exportPctVendasToJPG}
                    className="flex items-center gap-1.5 self-start md:self-center bg-[#001A9C] hover:bg-[#00147a] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar % Vendas
                  </button>
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
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('previaValue')}>
                          <span className="flex items-center gap-1 justify-end">Prévia <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('pedidosNovos')}>
                          <span className="flex items-center gap-1 justify-end">Pedidos Novos <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
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
                            <td className="py-3 px-3 text-right font-mono text-slate-600">
                              {formatCurrency(row.previaValue || 0)}
                            </td>
                            <td className={`py-3 px-3 text-right font-mono font-bold ${(row.pedidosNovos ?? 0) >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                              {formatCurrency(row.pedidosNovos || 0)}
                            </td>
                          </tr>
                        );
                      })}

                      {currentDetailsPageData.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">Nenhum registro corresponde aos filtros atuais.</td>
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

                  <div className="flex items-center gap-2.5">
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
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
                        Colar do Excel (Importação Rápida)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 animate-pulse">
                        Copie e cole colunas do Excel sem cabeçalhos. A ordem esperada é: <br />
                        <span className="font-semibold text-slate-600 font-mono">CÓD_REPRESENTANTE</span> | <span className="font-semibold text-slate-600 font-mono">VALOR_EXPECTATIVA</span> | <span className="font-semibold text-slate-600 font-mono">VALOR_DIA_PRÉVIA</span>
                      </p>
                    </div>

                    <textarea
                      placeholder="Exemplo de linhas:&#10;439&#9;150000&#9;45000&#10;512&#9;95000&#9;23000"
                      rows={6}
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
                        onClick={() => {
                          if (confirm('Tem certeza que deseja limpar todas as configurações desta lista?')) {
                            setPreviews([]);
                          }
                        }}
                        className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Limpar Todos
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
                                      setPreviews(current => current.filter(item => item.repId !== prev.repId));
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
              <form onSubmit={handleCloudPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Senha de Acesso
                  </label>
                  <input
                    type="password"
                    required
                    value={cloudPasswordInput}
                    onChange={(e) => {
                      setCloudPasswordInput(e.target.value);
                      if (cloudPasswordError) setCloudPasswordError('');
                    }}
                    placeholder="••••••••"
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

