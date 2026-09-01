import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SalesRecord } from '../types';
import { getFirebaseConfig, fetchDailySalesIndexFromFirestore, fetchDailySalesDataFromFirestore, DailySalesSnapshot } from '../lib/firebase';
import { getLocalDailySalesIndex, getLocalDailySalesData, DailySnapshotInfo } from '../lib/storage';
import {
  CalendarDays,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ArrowDownUp,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Layers,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileSpreadsheet,
  Building2,
  DollarSign,
  Award,
  BarChart3,
  RefreshCw
} from 'lucide-react';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2
  }).format(val || 0);
};

const formatPercentage = (val: number) => {
  return `${(val || 0).toFixed(1)}%`;
};

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
  onOpenImport?: () => void;
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

function getMappedGroupName(groupName: string | undefined): string {
  const name = (groupName || '').trim();
  const nameLower = name.toLowerCase();
  if (nameLower.includes('cutelaria')) return 'Tramontina Cutelaria';
  if (nameLower.includes('master') || nameLower.includes('garibaldi')) {
    if (nameLower.includes('pro')) return 'Tramontina Pro';
    return 'Tramontina Master';
  }
  if (nameLower.includes('multi')) return 'Tramontina Multi';
  return name || 'Outros';
}

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
  onOpenImport
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
  const [isLoadingIndex, setIsLoadingIndex] = useState<boolean>(false);

  // Loaded data for start and end days
  const [startRecords, setStartRecords] = useState<SalesRecord[]>([]);
  const [endRecords, setEndRecords] = useState<SalesRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Table local search, filters and sort
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableFilterOnlyWithSales, setTableFilterOnlyWithSales] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'periodSales' | 'endSales' | 'startSales' | 'repName' | 'quota' | 'pctTotal'>('periodSales');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRepId, setExpandedRepId] = useState<number | null>(null);

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

  // Helper to filter and adapt record according to sidebar filters
  const filterAndAdaptRecords = (rawRecords: SalesRecord[]) => {
    const isOnlyCD = selectedSalesTypes.includes('CD') && !selectedSalesTypes.includes('VP');
    const isOnlyVP = selectedSalesTypes.includes('VP') && !selectedSalesTypes.includes('CD');

    const result: SalesRecord[] = [];

    // Map coordinators and custom names
    rawRecords.forEach(r => {
      let coordName = r.coordName;
      const isPro = (r.groupName || '').toLowerCase().includes('pro');
      if (isPro) {
        coordName = "Marcelo Krewer";
      }

      const customName = customRepNames[r.repId.toString().trim() || r.repId];
      const repState = customRepLocations[r.repId.toString().trim() || r.repId];

      const record: SalesRecord = {
        ...r,
        coordName,
        repName: customName || r.repName
      };

      // 1. Coordinator filter
      if (selectedCoordinator !== 'All') {
        const origCoord = record.originalCoordName || record.coordName || '';
        const matchCoord = origCoord.toLowerCase().trim() === selectedCoordinator.toLowerCase().trim() ||
                           origCoord.toLowerCase().trim().includes(selectedCoordinator.toLowerCase().trim().split(' ')[0]);
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
    startRecords, selectedCoordinator, selectedProductGroups, selectedSalesTypes, searchText, selectedRepIdFilter, selectedState, customRepNames, customRepLocations, userRole, userRepId
  ]);

  const filteredEndRecords = useMemo(() => filterAndAdaptRecords(endRecords), [
    endRecords, selectedCoordinator, selectedProductGroups, selectedSalesTypes, searchText, selectedRepIdFilter, selectedState, customRepNames, customRepLocations, userRole, userRepId
  ]);

  // Aggregate by representative and compute subtraction: End Day - Start Day
  interface RepDailyComparison {
    repId: number;
    repName: string;
    coordName: string;
    quotaTotal: number;
    startVendas: number;
    startFaturado: number;
    endVendas: number;
    endFaturado: number;
    periodVendas: number; // End - Start
    periodFaturado: number; // End - Start
    periodVendasCD: number;
    periodVendasVP: number;
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
      quotaTotal: number;
      startVendas: number;
      startFaturado: number;
      endVendas: number;
      endFaturado: number;
      startVendasCD: number;
      endVendasCD: number;
      startVendasVP: number;
      endVendasVP: number;
      groups: Map<string, { startVendas: number; endVendas: number }>;
    }>();

    // Process Start Day records
    filteredStartRecords.forEach(r => {
      if (!repMap.has(r.repId)) {
        repMap.set(r.repId, {
          repId: r.repId,
          repName: r.repName,
          coordName: r.originalCoordName || r.coordName || 'Sem Coordenador',
          quotaTotal: r.quotaTotal,
          startVendas: 0,
          startFaturado: 0,
          endVendas: 0,
          endFaturado: 0,
          startVendasCD: 0,
          endVendasCD: 0,
          startVendasVP: 0,
          endVendasVP: 0,
          groups: new Map()
        });
      }
      const entry = repMap.get(r.repId)!;
      entry.startVendas += r.valorVendaTotal;
      entry.startFaturado += r.faturadoTotal;
      entry.startVendasCD += r.valorVendaCD || 0;
      entry.startVendasVP += r.valorVendaVP || 0;
      entry.quotaTotal = Math.max(entry.quotaTotal, r.quotaTotal);

      const gName = getMappedGroupName(r.groupName);
      if (!entry.groups.has(gName)) {
        entry.groups.set(gName, { startVendas: 0, endVendas: 0 });
      }
      entry.groups.get(gName)!.startVendas += r.valorVendaTotal;
    });

    // Process End Day records
    filteredEndRecords.forEach(r => {
      if (!repMap.has(r.repId)) {
        repMap.set(r.repId, {
          repId: r.repId,
          repName: r.repName,
          coordName: r.originalCoordName || r.coordName || 'Sem Coordenador',
          quotaTotal: r.quotaTotal,
          startVendas: 0,
          startFaturado: 0,
          endVendas: 0,
          endFaturado: 0,
          startVendasCD: 0,
          endVendasCD: 0,
          startVendasVP: 0,
          endVendasVP: 0,
          groups: new Map()
        });
      }
      const entry = repMap.get(r.repId)!;
      entry.endVendas += r.valorVendaTotal;
      entry.endFaturado += r.faturadoTotal;
      entry.endVendasCD += r.valorVendaCD || 0;
      entry.endVendasVP += r.valorVendaVP || 0;
      entry.quotaTotal = Math.max(entry.quotaTotal, r.quotaTotal);
      entry.repName = r.repName || entry.repName;
      entry.coordName = r.originalCoordName || r.coordName || entry.coordName;

      const gName = getMappedGroupName(r.groupName);
      if (!entry.groups.has(gName)) {
        entry.groups.set(gName, { startVendas: 0, endVendas: 0 });
      }
      entry.groups.get(gName)!.endVendas += r.valorVendaTotal;
    });

    const result: RepDailyComparison[] = [];

    repMap.forEach(item => {
      // Strictly only display representatives who have custom registered name if required, or matching rep
      const hasCustomName = Boolean(customRepNames[item.repId.toString().trim() || item.repId]);
      
      const periodVendas = Math.max(0, item.endVendas - item.startVendas);
      const periodFaturado = Math.max(0, item.endFaturado - item.startFaturado);
      const periodVendasCD = Math.max(0, item.endVendasCD - item.startVendasCD);
      const periodVendasVP = Math.max(0, item.endVendasVP - item.startVendasVP);
      const pctTotalEnd = item.quotaTotal > 0 ? (item.endVendas / item.quotaTotal) * 100 : 0;
      const defasagemEnd = item.endVendas - item.quotaTotal;

      // 6. Performance (% Total) filter from sidebar
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
        quotaTotal: item.quotaTotal,
        startVendas: item.startVendas,
        startFaturado: item.startFaturado,
        endVendas: item.endVendas,
        endFaturado: item.endFaturado,
        periodVendas,
        periodFaturado,
        periodVendasCD,
        periodVendasVP,
        pctTotalEnd,
        defasagemEnd,
        groupBreakdown
      });
    });

    return result;
  }, [filteredStartRecords, filteredEndRecords, progressThreshold, customRepNames]);

  // Summary Totals for the selected period
  const periodTotals = useMemo(() => {
    let totalStartVendas = 0;
    let totalEndVendas = 0;
    let totalPeriodVendas = 0;
    let totalPeriodFaturado = 0;
    let totalPeriodCD = 0;
    let totalPeriodVP = 0;
    let totalQuota = 0;
    let activeRepsWithSales = 0;

    comparisonData.forEach(c => {
      totalStartVendas += c.startVendas;
      totalEndVendas += c.endVendas;
      totalPeriodVendas += c.periodVendas;
      totalPeriodFaturado += c.periodFaturado;
      totalPeriodCD += c.periodVendasCD;
      totalPeriodVP += c.periodVendasVP;
      totalQuota += c.quotaTotal;
      if (c.periodVendas > 0) {
        activeRepsWithSales++;
      }
    });

    const dayIntervalCount = Math.max(1, endDay - (startDay > 0 ? startDay : 0));
    const dailyAverage = totalPeriodVendas / dayIntervalCount;

    return {
      totalStartVendas,
      totalEndVendas,
      totalPeriodVendas,
      totalPeriodFaturado,
      totalPeriodCD,
      totalPeriodVP,
      totalQuota,
      activeRepsWithSales,
      totalReps: comparisonData.length,
      dayIntervalCount,
      dailyAverage
    };
  }, [comparisonData, startDay, endDay]);

  // Product Group performance for period
  const groupPerformance = useMemo(() => {
    const map = new Map<string, { groupName: string; startVendas: number; endVendas: number; periodVendas: number }>();
    
    comparisonData.forEach(c => {
      c.groupBreakdown.forEach(g => {
        if (!map.has(g.groupName)) {
          map.set(g.groupName, {
            groupName: g.groupName,
            startVendas: 0,
            endVendas: 0,
            periodVendas: 0
          });
        }
        const entry = map.get(g.groupName)!;
        entry.startVendas += g.startVendas;
        entry.endVendas += g.endVendas;
        entry.periodVendas += g.periodVendas;
      });
    });

    return Array.from(map.values()).sort((a, b) => b.periodVendas - a.periodVendas);
  }, [comparisonData]);

  // Coordinator performance for period
  const coordinatorPerformance = useMemo(() => {
    const map = new Map<string, { coordName: string; periodVendas: number; repCount: number }>();
    
    comparisonData.forEach(c => {
      if (!map.has(c.coordName)) {
        map.set(c.coordName, { coordName: c.coordName, periodVendas: 0, repCount: 0 });
      }
      const entry = map.get(c.coordName)!;
      entry.periodVendas += c.periodVendas;
      entry.repCount++;
    });

    return Array.from(map.values()).sort((a, b) => b.periodVendas - a.periodVendas);
  }, [comparisonData]);

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
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (sortField === 'repName') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  }, [comparisonData, tableSearch, tableFilterOnlyWithSales, sortField, sortDirection]);

  // Export to CSV
  const exportToCSV = () => {
    if (sortedTableData.length === 0) {
      alert("Não há dados para exportar no período selecionado.");
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
      {/* HEADER BAR & CONTROLS */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-2xl shadow-sm">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Vendas por Dia
                </h1>
                <span className="bg-sky-100 text-sky-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Memória Diária Permanente
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Filtre períodos diários com cálculo líquido exato (<span className="font-semibold text-slate-700">Venda Dia Final − Venda Dia Inicial</span>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadSnapshotsIndex}
              disabled={isLoadingIndex}
              className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Atualizar registros da memória"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingIndex ? 'animate-spin text-sky-600' : ''}`} />
              <span>Atualizar</span>
            </button>

            {onOpenImport && (
              <button
                onClick={onOpenImport}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Importar Novo Relatório</span>
              </button>
            )}
          </div>
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
                  {startSnapshotInfo ? '✅ Salvo' : '⚠️ Sem Dados'}
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
                    Dia {String(d).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')} {hasData ? '• [Relatório Salvo]' : ''}
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
                {endSnapshotInfo ? '✅ Salvo' : '⚠️ Sem Dados'}
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
                    Dia {String(d).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')} {hasData ? '• [Relatório Salvo]' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* TIMELINE OF RECORDED DAYS IN MONTH */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              Dias com Relatórios Salvos na Memória ({MONTHS_LIST.find(m => m.value === selectedMonth)?.label}/{selectedYear}):
            </span>
            <span className="text-slate-400 text-[10px]">
              Clique em um dia para selecioná-lo rapidamente
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              onClick={() => setStartDay(0)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                startDay === 0
                  ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Dia 0 (Início)
            </button>

            {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(d => {
              const hasData = recordedDaysMap.has(d);
              const isStart = startDay === d;
              const isEnd = endDay === d;
              const isInRange = startDay > 0 && d >= startDay && d <= endDay;

              let style = "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300";
              if (hasData) {
                style = "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-bold";
              }
              if (isInRange) {
                style = "bg-sky-100 text-sky-900 border-sky-300 font-bold";
              }
              if (isStart) {
                style = "bg-sky-600 text-white border-sky-600 font-extrabold shadow-xs";
              }
              if (isEnd) {
                style = "bg-indigo-600 text-white border-indigo-600 font-extrabold shadow-xs";
              }

              return (
                <button
                  key={d}
                  onClick={() => {
                    if (d > endDay) {
                      setEndDay(d);
                    } else if (d < startDay || startDay === 0) {
                      setStartDay(d);
                    } else {
                      // Toggle
                      setEndDay(d);
                    }
                  }}
                  title={hasData ? `Dia ${d}: Relatório gravado na memória` : `Dia ${d}: Nenhum relatório salvo`}
                  className={`w-7 h-7 flex items-center justify-center text-[11px] rounded-lg border transition-all cursor-pointer ${style}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* STATUS NOTICES IF DAYS MISSING */}
        {(startDay > 0 && !startSnapshotInfo && !isLoadingData) && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Atenção:</strong> Não há relatório salvo na memória para o <strong>Dia {String(startDay).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}/{selectedYear}</strong>. Os valores iniciais serão considerados como R$ 0,00.
              </span>
            </div>
            {onOpenImport && (
              <button
                onClick={onOpenImport}
                className="text-xs font-bold text-amber-900 underline hover:no-underline whitespace-nowrap cursor-pointer"
              >
                Importar relatório para este dia
              </button>
            )}
          </div>
        )}

        {(!endSnapshotInfo && !isLoadingData) && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Atenção:</strong> Não há relatório salvo na memória para o <strong>Dia {String(endDay).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}/{selectedYear}</strong>.
              </span>
            </div>
            {onOpenImport && (
              <button
                onClick={onOpenImport}
                className="text-xs font-bold text-rose-900 underline hover:no-underline whitespace-nowrap cursor-pointer"
              >
                Importar relatório para este dia
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales in Period */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Vendas no Período
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(periodTotals.totalPeriodVendas)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600">
              Δ {startDay === 0 ? 'Início' : `Dia ${String(startDay).padStart(2, '0')}`} → Dia {String(endDay).padStart(2, '0')}
            </span>
            <span>({periodTotals.dayIntervalCount} {periodTotals.dayIntervalCount === 1 ? 'dia' : 'dias'})</span>
          </div>
        </div>

        {/* Total Invoiced in Period */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Faturado no Período
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(periodTotals.totalPeriodFaturado)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span>CD: <strong>{formatCurrency(periodTotals.totalPeriodCD)}</strong></span>
            <span>•</span>
            <span>VP: <strong>{formatCurrency(periodTotals.totalPeriodVP)}</strong></span>
          </div>
        </div>

        {/* Daily Average in Period */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Média Diária no Intervalo
            </span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(periodTotals.dailyAverage)}
          </div>
          <div className="text-[11px] text-slate-500">
            Média por dia ao longo dos {periodTotals.dayIntervalCount} dias
          </div>
        </div>

        {/* Active Representatives with Sales */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Reps com Vendas no Período
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {periodTotals.activeRepsWithSales} <span className="text-sm font-semibold text-slate-400">/ {periodTotals.totalReps}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {periodTotals.totalReps > 0
              ? `${((periodTotals.activeRepsWithSales / periodTotals.totalReps) * 100).toFixed(0)}% da equipe pontuou vendas`
              : 'Nenhum representante filtrado'}
          </div>
        </div>
      </div>

      {/* PRODUCT GROUP & COORDINATOR BREAKDOWN CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Group Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <h3 className="font-bold text-slate-900 text-sm">Vendas por Grupo de Produtos no Período</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Total: {formatCurrency(periodTotals.totalPeriodVendas)}
            </span>
          </div>

          <div className="space-y-3">
            {groupPerformance.map((group, idx) => {
              const pct = periodTotals.totalPeriodVendas > 0 ? (group.periodVendas / periodTotals.totalPeriodVendas) * 100 : 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{group.groupName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{formatCurrency(group.periodVendas)}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {groupPerformance.length === 0 && (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Nenhum grupo de produtos encontrado para os filtros selecionados.
              </p>
            )}
          </div>
        </div>

        {/* Coordinator Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Vendas por Coordenador no Período</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {coordinatorPerformance.length} Coordenadores
            </span>
          </div>

          <div className="space-y-3">
            {coordinatorPerformance.map((coord, idx) => {
              const pct = periodTotals.totalPeriodVendas > 0 ? (coord.periodVendas / periodTotals.totalPeriodVendas) * 100 : 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{coord.coordName} ({coord.repCount} reps)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{formatCurrency(coord.periodVendas)}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {coordinatorPerformance.length === 0 && (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Nenhum coordenador encontrado para os filtros selecionados.
              </p>
            )}
          </div>
        </div>
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
              <span>Apenas com Vendas ({periodTotals.activeRepsWithSales})</span>
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
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th
                  onClick={() => {
                    if (sortField === 'repName') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    else { setSortField('repName'); setSortDirection('asc'); }
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Representante</span>
                    <ArrowDownUp className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Coordenador</th>
                <th
                  onClick={() => {
                    if (sortField === 'startSales') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    else { setSortField('startSales'); setSortDirection('desc'); }
                  }}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Venda Dia {startDay === 0 ? '0' : String(startDay).padStart(2, '0')}</span>
                    <ArrowDownUp className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'endSales') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    else { setSortField('endSales'); setSortDirection('desc'); }
                  }}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Venda Dia {String(endDay).padStart(2, '0')}</span>
                    <ArrowDownUp className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'periodSales') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    else { setSortField('periodSales'); setSortDirection('desc'); }
                  }}
                  className="py-3 px-4 text-right cursor-pointer hover:text-emerald-900 transition-colors bg-emerald-50/50"
                >
                  <div className="flex items-center justify-end gap-1 text-emerald-800 font-black">
                    <span>Venda no Período (Δ)</span>
                    <ArrowDownUp className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'quota') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    else { setSortField('quota'); setSortDirection('desc'); }
                  }}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Quota Mês</span>
                    <ArrowDownUp className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'pctTotal') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    else { setSortField('pctTotal'); setSortDirection('desc'); }
                  }}
                  className="py-3 px-4 text-center cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>% Ating. Dia {String(endDay).padStart(2, '0')}</span>
                    <ArrowDownUp className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-10">Detalhe</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedTableData.map((rep, idx) => {
                const isExpanded = expandedRepId === rep.repId;
                const hasCustomName = Boolean(customRepNames[rep.repId.toString().trim() || rep.repId]);

                return (
                  <React.Fragment key={rep.repId}>
                    <tr
                      onClick={() => setExpandedRepId(isExpanded ? null : rep.repId)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        rep.periodVendas > 0 ? 'bg-white' : 'bg-slate-50/30 text-slate-400'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">
                            {rep.repName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            #{rep.repId}
                          </span>
                          {hasCustomName && (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                              Cadastrado
                            </span>
                          )}
                        </div>
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
                      <td className="py-3.5 px-4 text-center">
                        <button className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Group Breakdown Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90">
                        <td colSpan={9} className="p-4 pl-12 border-y border-slate-100">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-sky-600" />
                                Detalhamento por Grupo de Produtos no Período (Rep: {rep.repName})
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Faturamento no Período: {formatCurrency(rep.periodFaturado)}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              {rep.groupBreakdown.map((g, gIdx) => (
                                <div key={gIdx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase block truncate">
                                    {g.groupName}
                                  </span>
                                  <div className="text-sm font-black text-slate-900">
                                    {formatCurrency(g.periodVendas)}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex justify-between">
                                    <span>Dia {startDay}: {formatCurrency(g.startVendas)}</span>
                                    <span>Dia {endDay}: {formatCurrency(g.endVendas)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {sortedTableData.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">Nenhum dado encontrado para os filtros e dias selecionados.</p>
                    <p className="text-xs text-slate-400 mt-1">Verifique se os relatórios dos dias selecionados foram importados para a memória.</p>
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
