import React, { useState, useEffect, useMemo } from 'react';
import { SalesRecord, getMappedGroupName } from '../types';
import { getFirebaseConfig, fetchDailySalesIndexFromFirestore, fetchDailySalesDataFromFirestore } from '../lib/firebase';
import { getLocalDailySalesIndex, getLocalDailySalesData, DailySnapshotInfo } from '../lib/storage';
import {
  Search,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2
  }).format(val || 0);
};

export interface DailyPeriodTotals {
  quotaCD: number;
  faturadoCD: number;
  quotaVP: number;
  faturadoVP: number;
  quotaTotal: number;
  faturadoTotal: number;
  pendenteCD: number;
  pendenteVP: number;
  faturadoEPendente: number;
  defasagem: number;
  valorVendaCD: number;
  valorVendaVP: number;
  valorVendaTotal: number;
  achCD: number;
  achVP: number;
  achTotal: number;
  achSale: number;
  startDay: number;
  endDay: number;
  selectedMonth: number;
  selectedYear: number;
}

interface DailySalesTabProps {
  selectedCoordinator: string;
  selectedProductGroups: string[];
  selectedSalesTypes: ('CD' | 'VP')[];
  progressThreshold: 'All' | '100+' | '75-99' | 'under-75';
  searchText: string;
  selectedRepIdFilter: number | null;
  selectedState: string | null;
  customRepNames: Record<string, string>;
  customRepLocations: Record<string, string>;
  userRole: 'admin' | 'rep' | 'coord';
  userRepId: number | null;
  allRecords?: SalesRecord[];
  onOpenImport?: () => void;
  onPeriodTotalsChange?: (totals: DailyPeriodTotals) => void;
}

const MONTHS_LIST = [
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
];

const YEARS_LIST = [2025, 2026];

type DailySortField = 'repId' | 'periodVendas' | 'endVendas' | 'startVendas' | 'repName' | 'coordName' | 'quotaTotal' | 'pctTotalEnd';

export const DailySalesTab: React.FC<DailySalesTabProps> = ({
  selectedCoordinator,
  selectedProductGroups,
  selectedSalesTypes,
  progressThreshold,
  searchText,
  selectedRepIdFilter,
  selectedState,
  customRepNames,
  customRepLocations,
  userRole,
  userRepId,
  allRecords,
  onPeriodTotalsChange
}) => {
  // Current Brasília Time defaults
  const brasiliaDate = useMemo(() => {
    try {
      return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    } catch {
      return new Date();
    }
  }, []);

  const [selectedYear, setSelectedYear] = useState<number>(brasiliaDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(brasiliaDate.getMonth() + 1);

  // Available days in selected month
  const daysInSelectedMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Date range selectors (0 = Start of month / R$ 0, 1..N = Specific day)
  const [startDay, setStartDay] = useState<number>(1);
  const [endDay, setEndDay] = useState<number>(Math.min(brasiliaDate.getDate(), daysInSelectedMonth));

  // Snapshots list from DB
  const [availableSnapshots, setAvailableSnapshots] = useState<DailySnapshotInfo[]>([]);
  const [, setIsLoadingIndex] = useState<boolean>(false);

  // Loaded data for start and end days
  const [startRecords, setStartRecords] = useState<SalesRecord[]>([]);
  const [endRecords, setEndRecords] = useState<SalesRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Table local search, filters and sort
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableFilterOnlyWithSales, setTableFilterOnlyWithSales] = useState<boolean>(false);
  const [sortField, setSortField] = useState<DailySortField>('periodVendas');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load available daily snapshots index
  const loadSnapshotsIndex = async () => {
    setIsLoadingIndex(true);
    let index: DailySnapshotInfo[] = [];
    
    if (getFirebaseConfig()) {
      try {
        index = await fetchDailySalesIndexFromFirestore();
      } catch (err) {
        console.error("Error fetching daily index from Firestore:", err);
      }
    }

    if (index.length === 0) {
      try {
        const response = await fetch('/api/daily-sales');
        if (response.ok) {
          index = await response.json();
        } else {
          index = getLocalDailySalesIndex();
        }
      } catch (err) {
        console.error(err);
        index = getLocalDailySalesIndex();
      }
    }

    setAvailableSnapshots(index);
    setIsLoadingIndex(false);
  };

  useEffect(() => {
    loadSnapshotsIndex();
  }, []);

  // Set of recorded days for selected month/year
  const recordedDaysMap = useMemo(() => {
    const map = new Map<number, DailySnapshotInfo>();
    availableSnapshots.forEach(s => {
      if (s.year === selectedYear && s.month === selectedMonth) {
        map.set(s.day, s);
      }
    });
    return map;
  }, [availableSnapshots, selectedYear, selectedMonth]);

  // Load data for startDay and endDay
  const loadDailyData = async () => {
    setIsLoadingData(true);
    
    // Fetch start day data
    let startData: SalesRecord[] = [];
    if (startDay > 0) {
      if (getFirebaseConfig()) {
        try {
          startData = await fetchDailySalesDataFromFirestore(selectedYear, selectedMonth, startDay);
        } catch (e) {
          console.error("Firestore start data fetch error:", e);
        }
      }
      if (startData.length === 0) {
        try {
          const res = await fetch(`/api/daily-sales/${selectedYear}/${selectedMonth}/${startDay}`);
          if (res.ok) {
            const json = await res.json();
            startData = json.records || [];
          } else {
            startData = getLocalDailySalesData(selectedYear, selectedMonth, startDay);
          }
        } catch {
          startData = getLocalDailySalesData(selectedYear, selectedMonth, startDay);
        }
      }
    }

    // Fetch end day data
    let endData: SalesRecord[] = [];
    if (endDay > 0) {
      if (getFirebaseConfig()) {
        try {
          endData = await fetchDailySalesDataFromFirestore(selectedYear, selectedMonth, endDay);
        } catch (e) {
          console.error("Firestore end data fetch error:", e);
        }
      }
      if (endData.length === 0) {
        try {
          const res = await fetch(`/api/daily-sales/${selectedYear}/${selectedMonth}/${endDay}`);
          if (res.ok) {
            const json = await res.json();
            endData = json.records || [];
          } else {
            endData = getLocalDailySalesData(selectedYear, selectedMonth, endDay);
          }
        } catch {
          endData = getLocalDailySalesData(selectedYear, selectedMonth, endDay);
        }
      }
    }

    setStartRecords(startData);
    setEndRecords(endData);
    setIsLoadingData(false);
  };

  useEffect(() => {
    loadDailyData();
  }, [selectedYear, selectedMonth, startDay, endDay]);

  // Build mapping from repId -> regional coordinator (consistent with App.tsx)
  const repToOrigCoord = useMemo(() => {
    const map: Record<string, string> = {};

    const populateFromRecords = (records: SalesRecord[]) => {
      records.forEach(r => {
        if (!r.repId) return;
        const key = r.repId.toString().trim();
        const isPro = (r.groupName || '').toLowerCase().includes('pro');
        const isMarcelo = (r.coordName || '').toLowerCase().includes('marcelo') || (r.coordName || '').toLowerCase().includes('krewer');
        
        // Priority: non-Pro and non-Marcelo coordinator
        if (!isPro && !isMarcelo && r.coordName && r.coordName.trim()) {
          map[key] = r.coordName.trim();
        }
      });
    };

    if (allRecords && allRecords.length > 0) {
      populateFromRecords(allRecords);
    }
    populateFromRecords(endRecords);
    populateFromRecords(startRecords);

    // Secondary pass for any reps without a non-pro coordinator
    const fallbackFromRecords = (records: SalesRecord[]) => {
      records.forEach(r => {
        if (!r.repId) return;
        const key = r.repId.toString().trim();
        if (!map[key] && r.coordName && r.coordName.trim()) {
          map[key] = r.coordName.trim();
        }
      });
    };
    if (allRecords && allRecords.length > 0) {
      fallbackFromRecords(allRecords);
    }
    fallbackFromRecords(endRecords);
    fallbackFromRecords(startRecords);

    return map;
  }, [allRecords, startRecords, endRecords]);

  // Helper to filter and adapt record according to sidebar filters
  const filterAndAdaptRecords = (rawRecords: SalesRecord[]) => {
    const isOnlyCD = selectedSalesTypes.includes('CD') && !selectedSalesTypes.includes('VP');
    const isOnlyVP = selectedSalesTypes.includes('VP') && !selectedSalesTypes.includes('CD');

    const result: SalesRecord[] = [];

    rawRecords.forEach(r => {
      const repIdKey = r.repId.toString().trim();
      const customName = (customRepNames[repIdKey] || customRepNames[r.repId.toString()] || customRepNames[r.repId])?.trim();

      // Only display representatives who have a registered name in customRepNames
      if (!customName) {
        return;
      }

      const originalCoordName = repToOrigCoord[repIdKey] || r.originalCoordName || r.coordName || 'Sem Coordenador';
      let coordName = r.coordName;
      const isPro = (r.groupName || '').toLowerCase().includes('pro');
      if (isPro) {
        coordName = "Marcelo Krewer";
      }

      const repState = customRepLocations[repIdKey || r.repId];

      const record: SalesRecord = {
        ...r,
        originalCoordName,
        coordName,
        repName: customName
      };

      // 1. Coordinator filter (match regional coordinator, matching main view behavior)
      if (selectedCoordinator !== 'All') {
        const matchCoord = originalCoordName.toLowerCase().trim() === selectedCoordinator.toLowerCase().trim() ||
                           originalCoordName.toLowerCase().trim().includes(selectedCoordinator.toLowerCase().trim().split(' ')[0]);
        if (!matchCoord) return;
      }

      // 2. Product Group filter
      if (!selectedProductGroups.includes('All')) {
        if (selectedProductGroups.length === 0) return;
        const mapped = getMappedGroupName(record.groupName);
        if (!selectedProductGroups.includes(mapped)) return;
      }

      // 3. Sales Type Filter (CD / VP adaptation)
      let recordToAdd: SalesRecord = record;
      if (isOnlyCD) {
        if (record.quotaCD === 0 && record.valorVendaCD === 0 && record.faturadoCD === 0 && record.pendenteCD === 0) return;
        recordToAdd = {
          ...record,
          quotaTotal: record.quotaCD,
          faturadoTotal: record.faturadoCD,
          faturadoEPendente: record.faturadoCD + record.pendenteCD,
          valorVendaTotal: record.valorVendaCD,
          defasagem: record.valorVendaCD - record.quotaCD,
          pctVenda: record.quotaCD > 0 ? (record.valorVendaCD / record.quotaCD) * 100 : 0,
          pctTotal: record.quotaCD > 0 ? (record.faturadoCD / record.quotaCD) * 100 : 0,
        };
      } else if (isOnlyVP) {
        if (record.quotaVP === 0 && record.valorVendaVP === 0 && record.faturadoVP === 0 && record.pendenteVP === 0) return;
        recordToAdd = {
          ...record,
          quotaTotal: record.quotaVP,
          faturadoTotal: record.faturadoVP,
          faturadoEPendente: record.faturadoVP + record.pendenteVP,
          valorVendaTotal: record.valorVendaVP,
          defasagem: record.valorVendaVP - record.quotaVP,
          pctVenda: record.quotaVP > 0 ? (record.valorVendaVP / record.quotaVP) * 100 : 0,
          pctTotal: record.quotaVP > 0 ? (record.faturadoVP / record.quotaVP) * 100 : 0,
        };
      }

      // 4. Role isolation & Rep ID filter
      if (userRole === 'rep' && userRepId !== null) {
        if (recordToAdd.repId !== userRepId) return;
      } else if (selectedRepIdFilter !== null) {
        if (recordToAdd.repId !== selectedRepIdFilter) return;
      } else {
        // Global sidebar Search matching
        if (searchText.trim() !== '') {
          const q = searchText.toLowerCase();
          const matchName = recordToAdd.repName.toLowerCase().includes(q);
          const matchId = recordToAdd.repId.toString().includes(q);
          const matchGroup = recordToAdd.groupName.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchGroup) return;
        }
      }

      // 5. State filter
      if (selectedState && repState !== selectedState) {
        return;
      }

      result.push(recordToAdd);
    });

    return result;
  };

  // Filter start and end records
  const filteredStartRecords = useMemo(() => filterAndAdaptRecords(startRecords), [
    startRecords, repToOrigCoord, selectedCoordinator, selectedProductGroups, selectedSalesTypes, searchText, selectedRepIdFilter, selectedState, customRepNames, customRepLocations, userRole, userRepId
  ]);

  const filteredEndRecords = useMemo(() => filterAndAdaptRecords(endRecords), [
    endRecords, repToOrigCoord, selectedCoordinator, selectedProductGroups, selectedSalesTypes, searchText, selectedRepIdFilter, selectedState, customRepNames, customRepLocations, userRole, userRepId
  ]);

  // Aggregate by representative and compute subtraction: End Day - Start Day
  interface RepDailyComparison {
    repId: number;
    repName: string;
    coordName: string;
    quotaCD: number;
    quotaVP: number;
    quotaTotal: number;
    startVendas: number;
    startFaturado: number;
    endVendas: number;
    endFaturado: number;
    periodVendas: number; // End - Start
    periodFaturado: number; // End - Start
    periodVendasCD: number;
    periodVendasVP: number;
    periodFaturadoCD: number;
    periodFaturadoVP: number;
    pctTotalEnd: number; // % quota reached at End Day
    defasagemEnd: number;
    groupBreakdown: Array<{
      groupName: string;
      startVendas: number;
      endVendas: number;
      periodVendas: number;
    }>;
  }

  const comparisonData = useMemo(() => {
    const repMap = new Map<number, {
      repId: number;
      repName: string;
      coordName: string;
      quotaCD: number;
      quotaVP: number;
      quotaTotal: number;
      startVendas: number;
      startFaturado: number;
      endVendas: number;
      endFaturado: number;
      startVendasCD: number;
      endVendasCD: number;
      startVendasVP: number;
      endVendasVP: number;
      startFaturadoCD: number;
      endFaturadoCD: number;
      startFaturadoVP: number;
      endFaturadoVP: number;
      groups: Map<string, { startVendas: number; endVendas: number }>;
    }>();

    // Process Start Day records
    filteredStartRecords.forEach(r => {
      const repKey = r.repId.toString().trim();
      const regionalCoord = r.originalCoordName || repToOrigCoord[repKey] || 'Sem Coordenador';

      if (!repMap.has(r.repId)) {
        repMap.set(r.repId, {
          repId: r.repId,
          repName: r.repName,
          coordName: regionalCoord,
          quotaCD: 0,
          quotaVP: 0,
          quotaTotal: 0,
          startVendas: 0,
          startFaturado: 0,
          endVendas: 0,
          endFaturado: 0,
          startVendasCD: 0,
          endVendasCD: 0,
          startVendasVP: 0,
          endVendasVP: 0,
          startFaturadoCD: 0,
          endFaturadoCD: 0,
          startFaturadoVP: 0,
          endFaturadoVP: 0,
          groups: new Map()
        });
      }
      const entry = repMap.get(r.repId)!;
      entry.startVendas += r.valorVendaTotal;
      entry.startFaturado += r.faturadoTotal;
      entry.startVendasCD += r.valorVendaCD || 0;
      entry.startVendasVP += r.valorVendaVP || 0;
      entry.startFaturadoCD += r.faturadoCD || 0;
      entry.startFaturadoVP += r.faturadoVP || 0;
      entry.quotaCD += r.quotaCD || 0;
      entry.quotaVP += r.quotaVP || 0;
      entry.quotaTotal += r.quotaTotal || 0;

      const gName = getMappedGroupName(r.groupName);
      if (!entry.groups.has(gName)) {
        entry.groups.set(gName, { startVendas: 0, endVendas: 0 });
      }
      entry.groups.get(gName)!.startVendas += r.valorVendaTotal;
    });

    // Process End Day records
    filteredEndRecords.forEach(r => {
      const repKey = r.repId.toString().trim();
      const regionalCoord = r.originalCoordName || repToOrigCoord[repKey] || 'Sem Coordenador';

      if (!repMap.has(r.repId)) {
        repMap.set(r.repId, {
          repId: r.repId,
          repName: r.repName,
          coordName: regionalCoord,
          quotaCD: 0,
          quotaVP: 0,
          quotaTotal: 0,
          startVendas: 0,
          startFaturado: 0,
          endVendas: 0,
          endFaturado: 0,
          startVendasCD: 0,
          endVendasCD: 0,
          startVendasVP: 0,
          endVendasVP: 0,
          startFaturadoCD: 0,
          endFaturadoCD: 0,
          startFaturadoVP: 0,
          endFaturadoVP: 0,
          groups: new Map()
        });
      }
      const entry = repMap.get(r.repId)!;
      entry.endVendas += r.valorVendaTotal;
      entry.endFaturado += r.faturadoTotal;
      entry.endVendasCD += r.valorVendaCD || 0;
      entry.endVendasVP += r.valorVendaVP || 0;
      entry.endFaturadoCD += r.faturadoCD || 0;
      entry.endFaturadoVP += r.faturadoVP || 0;
      
      // If end day has quota data, prefer it over start day
      if (filteredStartRecords.length === 0 || entry.quotaTotal === 0) {
        entry.quotaCD += r.quotaCD || 0;
        entry.quotaVP += r.quotaVP || 0;
        entry.quotaTotal += r.quotaTotal || 0;
      }
      
      entry.repName = r.repName || entry.repName;
      if (regionalCoord && regionalCoord !== 'Sem Coordenador') {
        entry.coordName = regionalCoord;
      }

      const gName = getMappedGroupName(r.groupName);
      if (!entry.groups.has(gName)) {
        entry.groups.set(gName, { startVendas: 0, endVendas: 0 });
      }
      entry.groups.get(gName)!.endVendas += r.valorVendaTotal;
    });

    const result: RepDailyComparison[] = [];

    repMap.forEach(item => {
      const periodVendas = Math.max(0, item.endVendas - item.startVendas);
      const periodFaturado = Math.max(0, item.endFaturado - item.startFaturado);
      const periodVendasCD = Math.max(0, item.endVendasCD - item.startVendasCD);
      const periodVendasVP = Math.max(0, item.endVendasVP - item.startVendasVP);
      const periodFaturadoCD = Math.max(0, item.endFaturadoCD - item.startFaturadoCD);
      const periodFaturadoVP = Math.max(0, item.endFaturadoVP - item.startFaturadoVP);
      const pctTotalEnd = item.quotaTotal > 0 ? (item.endVendas / item.quotaTotal) * 100 : 0;
      const defasagemEnd = item.endVendas - item.quotaTotal;

      // Performance (% Total) filter from sidebar
      if (progressThreshold !== 'All') {
        if (progressThreshold === '100+' && pctTotalEnd < 100) return;
        if (progressThreshold === '75-99' && (pctTotalEnd < 75 || pctTotalEnd >= 100)) return;
        if (progressThreshold === 'under-75' && pctTotalEnd >= 75) return;
      }

      const groupBreakdown = Array.from(item.groups.entries()).map(([gName, gVal]) => ({
        groupName: gName,
        startVendas: gVal.startVendas,
        endVendas: gVal.endVendas,
        periodVendas: Math.max(0, gVal.endVendas - gVal.startVendas)
      })).sort((a, b) => b.periodVendas - a.periodVendas);

      result.push({
        repId: item.repId,
        repName: item.repName,
        coordName: item.coordName,
        quotaCD: item.quotaCD,
        quotaVP: item.quotaVP,
        quotaTotal: item.quotaTotal,
        startVendas: item.startVendas,
        startFaturado: item.startFaturado,
        endVendas: item.endVendas,
        endFaturado: item.endFaturado,
        periodVendas,
        periodFaturado,
        periodVendasCD,
        periodVendasVP,
        periodFaturadoCD,
        periodFaturadoVP,
        pctTotalEnd,
        defasagemEnd,
        groupBreakdown
      });
    });

    return result;
  }, [filteredStartRecords, filteredEndRecords, progressThreshold]);

  // Aggregate Period Totals and notify Parent (App.tsx) to update top KPI cards
  useEffect(() => {
    let quotaCD = 0;
    let quotaVP = 0;
    let quotaTotal = 0;
    let valorVendaCD = 0;
    let valorVendaVP = 0;
    let valorVendaTotal = 0;
    let faturadoCD = 0;
    let faturadoVP = 0;
    let faturadoTotal = 0;

    comparisonData.forEach(c => {
      quotaCD += c.quotaCD;
      quotaVP += c.quotaVP;
      quotaTotal += c.quotaTotal;
      valorVendaCD += c.periodVendasCD;
      valorVendaVP += c.periodVendasVP;
      valorVendaTotal += c.periodVendas;
      faturadoCD += c.periodFaturadoCD;
      faturadoVP += c.periodFaturadoVP;
      faturadoTotal += c.periodFaturado;
    });

    const achCD = quotaCD > 0 ? (valorVendaCD / quotaCD) * 100 : 0;
    const achVP = quotaVP > 0 ? (valorVendaVP / quotaVP) * 100 : 0;
    const achTotal = quotaTotal > 0 ? (valorVendaTotal / quotaTotal) * 100 : 0;
    const defasagem = valorVendaTotal - quotaTotal;

    if (onPeriodTotalsChange) {
      onPeriodTotalsChange({
        quotaCD,
        faturadoCD,
        quotaVP,
        faturadoVP,
        quotaTotal,
        faturadoTotal,
        pendenteCD: 0,
        pendenteVP: 0,
        faturadoEPendente: faturadoTotal,
        defasagem,
        valorVendaCD,
        valorVendaVP,
        valorVendaTotal,
        achCD,
        achVP,
        achTotal,
        achSale: achTotal,
        startDay,
        endDay,
        selectedMonth,
        selectedYear
      });
    }
  }, [comparisonData, startDay, endDay, selectedMonth, selectedYear, onPeriodTotalsChange]);

  // Active reps with sales in period count
  const activeRepsWithSales = useMemo(() => {
    return comparisonData.filter(c => c.periodVendas > 0).length;
  }, [comparisonData]);

  const handleSort = (field: DailySortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'repName' || field === 'coordName' || field === 'repId' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (field: DailySortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 text-[#001A9C]" />
      : <ArrowDown className="w-3.5 h-3.5 text-[#001A9C]" />;
  };

  // Filtered and Sorted Table records
  const sortedTableData = useMemo(() => {
    return comparisonData
      .filter(item => {
        if (tableFilterOnlyWithSales && item.periodVendas <= 0) return false;
        if (tableSearch.trim() !== '') {
          const q = tableSearch.toLowerCase();
          const matchName = item.repName.toLowerCase().includes(q);
          const matchId = item.repId.toString().includes(q);
          const matchCoord = item.coordName.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchCoord) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'repId') {
          return sortDirection === 'asc' ? a.repId - b.repId : b.repId - a.repId;
        }
        if (sortField === 'repName') {
          return sortDirection === 'asc' 
            ? a.repName.localeCompare(b.repName, 'pt-BR') 
            : b.repName.localeCompare(a.repName, 'pt-BR');
        }
        if (sortField === 'coordName') {
          return sortDirection === 'asc' 
            ? a.coordName.localeCompare(b.coordName, 'pt-BR') 
            : b.coordName.localeCompare(a.coordName, 'pt-BR');
        }
        const valA = Number(a[sortField]) || 0;
        const valB = Number(b[sortField]) || 0;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  }, [comparisonData, tableSearch, tableFilterOnlyWithSales, sortField, sortDirection]);

  // Export to CSV
  const exportToCSV = () => {
    if (sortedTableData.length === 0) {
      return;
    }

    const startLabel = startDay === 0 ? "Inicio_Mes" : `Dia_${String(startDay).padStart(2, '0')}`;
    const endLabel = `Dia_${String(endDay).padStart(2, '0')}`;

    const headers = [
      'ID Representante',
      'Nome Representante',
      'Coordenador',
      `Vendas Inicial (${startDay === 0 ? 'Início' : String(startDay).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')})`,
      `Vendas Final (${String(endDay).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')})`,
      'Vendas no Periodo (Liquido)',
      'Faturado no Periodo',
      'Quota Mes',
      '% Atingimento Final'
    ];

    const rows = sortedTableData.map(r => [
      r.repId,
      `"${r.repName.replace(/"/g, '""')}"`,
      `"${r.coordName.replace(/"/g, '""')}"`,
      r.startVendas.toFixed(2).replace('.', ','),
      r.endVendas.toFixed(2).replace('.', ','),
      r.periodVendas.toFixed(2).replace('.', ','),
      r.periodFaturado.toFixed(2).replace('.', ','),
      r.quotaTotal.toFixed(2).replace('.', ','),
      `${r.pctTotalEnd.toFixed(1).replace('.', ',')}%`
    ]);

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Vendas_Por_Dia_${selectedYear}_${String(selectedMonth).padStart(2, '0')}_${startLabel}_a_${endLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const startSnapshotInfo = recordedDaysMap.get(startDay);
  const endSnapshotInfo = recordedDaysMap.get(endDay);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* SIMPLIFIED HEADER & DATE CONTROLS */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Vendas por Dia
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione o período desejado para apurar as vendas líquidas realizadas no intervalo.
          </p>
        </div>

        {/* DATE SELECTORS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Month Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Mês da Análise
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const newM = parseInt(e.target.value);
                setSelectedMonth(newM);
                const maxDays = new Date(selectedYear, newM, 0).getDate();
                if (endDay > maxDays) setEndDay(maxDays);
                if (startDay > maxDays) setStartDay(Math.max(1, maxDays - 5));
              }}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 cursor-pointer"
            >
              {MONTHS_LIST.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Ano
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                const newY = parseInt(e.target.value);
                setSelectedYear(newY);
                const maxDays = new Date(newY, selectedMonth, 0).getDate();
                if (endDay > maxDays) setEndDay(maxDays);
              }}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 cursor-pointer"
            >
              {YEARS_LIST.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Start Day Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Dia Inicial (Subtraendo)
              </label>
              {startDay > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${startSnapshotInfo ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {startSnapshotInfo ? 'Salvo' : 'Sem Dados'}
                </span>
              )}
            </div>
            <select
              value={startDay}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setStartDay(val);
                if (val > endDay && val > 0) setEndDay(val);
              }}
              className="w-full text-xs font-bold bg-sky-50/50 border border-sky-200 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sky-950 cursor-pointer"
            >
              <option value={0}>Início do Mês (Dia 0 / R$ 0,00)</option>
              {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(d => {
                const hasData = recordedDaysMap.has(d);
                return (
                  <option key={d} value={d}>
                    Dia {String(d).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')} {hasData ? '• [Salvo]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* End Day Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Dia Final (Acumulado)
              </label>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${endSnapshotInfo ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {endSnapshotInfo ? 'Salvo' : 'Sem Dados'}
              </span>
            </div>
            <select
              value={endDay}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setEndDay(val);
                if (val < startDay) setStartDay(val);
              }}
              className="w-full text-xs font-bold bg-indigo-50/50 border border-indigo-200 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-indigo-950 cursor-pointer"
            >
              {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(d => {
                const hasData = recordedDaysMap.has(d);
                return (
                  <option key={d} value={d}>
                    Dia {String(d).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')} {hasData ? '• [Salvo]' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* STATUS NOTICES IF DAYS MISSING */}
        {(startDay > 0 && !startSnapshotInfo && !isLoadingData) && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Não há relatório salvo na memória para o <strong>Dia {String(startDay).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}/{selectedYear}</strong>. Os valores iniciais serão considerados como R$ 0,00.
              </span>
            </div>
          </div>
        )}

        {(!endSnapshotInfo && !isLoadingData) && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Não há relatório salvo na memória para o <strong>Dia {String(endDay).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}/{selectedYear}</strong>.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* DETAILED REPRESENTATIVES TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter & Actions Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar representante por nome ou ID..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
              />
            </div>

            <button
              onClick={() => setTableFilterOnlyWithSales(!tableFilterOnlyWithSales)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                tableFilterOnlyWithSales
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Apenas com Vendas ({activeRepsWithSales})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={exportToCSV}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th
                  onClick={() => handleSort('repId')}
                  className="py-3 px-4 w-24 cursor-pointer hover:text-slate-900 transition-colors group select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>REP ID</span>
                    {renderSortIcon('repId')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('repName')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors group select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Representante</span>
                    {renderSortIcon('repName')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('coordName')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors group select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Coordenador</span>
                    {renderSortIcon('coordName')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('startVendas')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors group select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Venda Dia {startDay === 0 ? '0' : String(startDay).padStart(2, '0')}</span>
                    {renderSortIcon('startVendas')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('endVendas')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors group select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Venda Dia {String(endDay).padStart(2, '0')}</span>
                    {renderSortIcon('endVendas')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('periodVendas')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-emerald-900 transition-colors bg-emerald-50/60 group select-none"
                >
                  <div className="flex items-center justify-end gap-1.5 text-emerald-800 font-black">
                    <span>Venda no Período (Δ)</span>
                    {renderSortIcon('periodVendas')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('quotaTotal')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors group select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Quota Mês</span>
                    {renderSortIcon('quotaTotal')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pctTotalEnd')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-slate-900 transition-colors group select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>% Ating. Dia {String(endDay).padStart(2, '0')}</span>
                    {renderSortIcon('pctTotalEnd')}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedTableData.map((rep) => {
                return (
                  <tr
                    key={rep.repId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      rep.periodVendas > 0 ? 'bg-white' : 'bg-slate-50/30 text-slate-400'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-600 font-mono">
                      #{rep.repId}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {rep.repName}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {rep.coordName}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {formatCurrency(rep.startVendas)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                      {formatCurrency(rep.endVendas)}
                    </td>
                    <td className="py-3.5 px-4 text-right bg-emerald-50/40">
                      <div className="flex items-center justify-end gap-1.5">
                        {rep.periodVendas > 0 && <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />}
                        <span className={`font-black ${rep.periodVendas > 0 ? 'text-emerald-700 text-sm' : 'text-slate-400'}`}>
                          {formatCurrency(rep.periodVendas)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {formatCurrency(rep.quotaTotal)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block font-black px-2.5 py-1 rounded-full text-[11px] ${
                          rep.pctTotalEnd >= 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : rep.pctTotalEnd >= 75
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {rep.pctTotalEnd.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}

              {sortedTableData.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">
                      {Object.keys(customRepNames).length === 0
                        ? "Nenhum representante cadastrado via 'Importar Nomes'."
                        : "Nenhum representante com nome cadastrado encontrado para os filtros e dias selecionados."}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {Object.keys(customRepNames).length === 0
                        ? "Cadastre os nomes dos representantes na aba 'Importar Nomes' para visualizá-los."
                        : "Verifique se os relatórios dos dias selecionados foram importados para a memória."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
