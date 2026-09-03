import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Presentation,
  ArrowUpDown,
  Search,
  FileSpreadsheet,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  Trophy,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  EyeOff,
  Sparkles,
  Layers,
  BarChart3,
  Award
} from 'lucide-react';
import { SalesRecord, getMappedGroupName } from '../types';
import { getFirebaseConfig, fetchPeriodDataFromFirestore } from '../lib/firebase';
import { getLocalPeriodData } from '../lib/storage';

interface PresentationTabProps {
  selectedYear: number;
  selectedMonth: number;
  isAccumulated: boolean;
  accumulateStartMonth: number;
  accumulateEndMonth: number;
  filteredRecords: SalesRecord[];
  allRecords: SalesRecord[];
  prevYearRecords?: SalesRecord[];
  prevYearFilteredRecords?: SalesRecord[];
  isLoadingPrevYear?: boolean;
  selectedCoordinator: string;
  selectedProductGroups: string[];
  selectedSalesTypes: ('CD' | 'VP')[];
  selectedState: string | null;
  selectedRepIdFilter: number | null;
  searchText: string;
  customRepNames: Record<string, string>;
  customRepLocations: Record<string, string>;
  userRole: 'admin' | 'rep';
  userRepId: number | null;
}

export interface PresentationRepRow {
  repId: number;
  repName: string;
  pctVendaMes: number;
  pctVendaAcumulado: number;
  monthQuotaHasTarget: boolean;
  accumQuotaHasTarget: boolean;
  statusMes: 'superada' | 'em_linha' | 'abaixo';
  statusAcumulado: 'superada' | 'em_linha' | 'abaixo';
  locationState?: string;
  coordName?: string;
  // Growth Metrics vs 2025
  crescimentoPct: number;
  crescimentoStatus: 'positivo' | 'negativo' | 'estavel' | 'novo' | 'sem_base';
  has2025Data: boolean;
  isNewRep: boolean;
  crescimentoMesPct?: number;
  crescimentoAcumPct?: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const PresentationTab: React.FC<PresentationTabProps> = ({
  selectedYear,
  selectedMonth,
  isAccumulated,
  accumulateStartMonth,
  accumulateEndMonth,
  filteredRecords,
  allRecords,
  prevYearRecords = [],
  prevYearFilteredRecords = [],
  isLoadingPrevYear = false,
  selectedCoordinator,
  selectedProductGroups,
  selectedSalesTypes,
  selectedState,
  selectedRepIdFilter,
  searchText: globalSearchText,
  customRepNames,
  customRepLocations,
  userRole,
  userRepId,
}) => {
  // Local states for Presentation view
  const [localSearch, setLocalSearch] = useState<string>('');
  const [sortField, setSortField] = useState<'repId' | 'repName' | 'pctVendaMes' | 'pctVendaAcumulado' | 'crescimentoPct'>('pctVendaAcumulado');
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterThreshold, setFilterThreshold] = useState<'all' | '100+' | '75-99' | 'under-75' | 'crescimento_positivo' | 'crescimento_negativo'>('all');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);

  // States for Year-to-Date (Acumulado Jan -> Target Month) records
  const [accumulatedRecords, setAccumulatedRecords] = useState<SalesRecord[]>([]);
  const [accumulated2025Records, setAccumulated2025Records] = useState<SalesRecord[]>([]);
  const [isLoadingAccumulated, setIsLoadingAccumulated] = useState<boolean>(false);
  const [loadedMonthsInfo, setLoadedMonthsInfo] = useState<number[]>([]);

  // Target month for the current active spreadsheet view
  const targetEndMonth = useMemo(() => {
    return isAccumulated ? Math.max(accumulateStartMonth, accumulateEndMonth) : selectedMonth;
  }, [isAccumulated, accumulateStartMonth, accumulateEndMonth, selectedMonth]);

  const targetStartMonth = 1; // Always January (primeiro mês do ano)

  const monthLabel = useMemo(() => {
    if (isAccumulated) {
      const s = Math.min(accumulateStartMonth, accumulateEndMonth);
      const e = Math.max(accumulateStartMonth, accumulateEndMonth);
      return `${MONTH_NAMES[s - 1]} a ${MONTH_NAMES[e - 1]}`;
    }
    return MONTH_NAMES[selectedMonth - 1] || `Mês ${selectedMonth}`;
  }, [isAccumulated, accumulateStartMonth, accumulateEndMonth, selectedMonth]);

  const accumulatedPeriodLabel = useMemo(() => {
    if (targetEndMonth === 1) {
      return `Janeiro / ${selectedYear}`;
    }
    return `Janeiro a ${MONTH_NAMES[targetEndMonth - 1]} / ${selectedYear}`;
  }, [targetEndMonth, selectedYear]);

  // Load records from month 1 (Janeiro) to targetEndMonth for both current year and 2025
  useEffect(() => {
    let isCancelled = false;

    const loadAccumulatedData = async () => {
      setIsLoadingAccumulated(true);
      const monthsToFetch: number[] = [];
      for (let m = 1; m <= targetEndMonth; m++) {
        monthsToFetch.push(m);
      }

      const compYear = selectedYear === 2025 ? 2024 : 2025; // 2025 baseline

      try {
        const [resultsCurrent, results2025] = await Promise.all([
          // Current Year Months
          Promise.all(
            monthsToFetch.map(async (m) => {
              if (!isAccumulated && m === selectedMonth && allRecords.length > 0) {
                return allRecords.map(r => ({ ...r, month: m }));
              }

              let monthRecords: SalesRecord[] = [];

              // 1. Try Firestore if configured
              const config = getFirebaseConfig();
              if (config && config.apiKey) {
                try {
                  const fsData = await fetchPeriodDataFromFirestore(selectedYear, m);
                  if (fsData && fsData.length > 0) {
                    monthRecords = fsData;
                  }
                } catch (err) {
                  // fallback silently
                }
              }

              // 2. Try Express API
              if (monthRecords.length === 0) {
                try {
                  const response = await fetch(`/api/monthly-data/${selectedYear}/${m}`);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.records && data.records.length > 0) {
                      monthRecords = data.records;
                    }
                  }
                } catch (err) {
                  // fallback silently
                }
              }

              // 3. Fallback to LocalStorage
              if (monthRecords.length === 0) {
                monthRecords = getLocalPeriodData(selectedYear, m);
              }

              return monthRecords.map(r => ({ ...r, month: m }));
            })
          ),
          // 2025 Baseline Months
          Promise.all(
            monthsToFetch.map(async (m) => {
              let monthRecords: SalesRecord[] = [];

              // 1. Try Firestore
              const config = getFirebaseConfig();
              if (config && config.apiKey) {
                try {
                  const fsData = await fetchPeriodDataFromFirestore(compYear, m);
                  if (fsData && fsData.length > 0) {
                    monthRecords = fsData;
                  }
                } catch (err) {}
              }

              // 2. Try Express API
              if (monthRecords.length === 0) {
                try {
                  const response = await fetch(`/api/monthly-data/${compYear}/${m}`);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.records && data.records.length > 0) {
                      monthRecords = data.records;
                    }
                  }
                } catch (err) {}
              }

              // 3. Fallback to LocalStorage
              if (monthRecords.length === 0) {
                monthRecords = getLocalPeriodData(compYear, m);
              }

              return monthRecords.map(r => ({ ...r, month: m }));
            })
          )
        ]);

        if (!isCancelled) {
          setAccumulatedRecords(resultsCurrent.flat());
          setAccumulated2025Records(results2025.flat());
          setLoadedMonthsInfo(monthsToFetch);
        }
      } catch (error) {
        console.warn('Erro ao carregar dados acumulados para apresentação:', error);
      } finally {
        if (!isCancelled) {
          setIsLoadingAccumulated(false);
        }
      }
    };

    loadAccumulatedData();

    return () => {
      isCancelled = true;
    };
  }, [selectedYear, targetEndMonth, selectedMonth, isAccumulated, allRecords]);

  // Helper to filter any set of records using the dashboard's active global filters
  const applyFilters = (records: SalesRecord[]): SalesRecord[] => {
    const isOnlyCD = selectedSalesTypes.includes('CD') && !selectedSalesTypes.includes('VP');
    const isOnlyVP = selectedSalesTypes.includes('VP') && !selectedSalesTypes.includes('CD');

    const result: SalesRecord[] = [];

    records.forEach(r => {
      // Coordinator filter
      if (selectedCoordinator !== 'All') {
        const coordName = (r.originalCoordName || r.coordName || '').toLowerCase().trim();
        const filterCoord = selectedCoordinator.toLowerCase().trim();
        const matchCoord = coordName === filterCoord || coordName.includes(filterCoord.split(' ')[0]);
        if (!matchCoord) return;
      }

      // Product Group filter
      if (!selectedProductGroups.includes('All')) {
        if (selectedProductGroups.length === 0) return;
        const mapped = getMappedGroupName(r.groupName);
        if (!selectedProductGroups.includes(mapped)) return;
      }

      // Sales Type Filter
      let recordToAdd = { ...r };
      if (isOnlyCD) {
        if (r.quotaCD === 0 && r.valorVendaCD === 0 && r.faturadoCD === 0 && r.pendenteCD === 0) return;
        recordToAdd.quotaTotal = r.quotaCD;
        recordToAdd.valorVendaTotal = r.valorVendaCD;
      } else if (isOnlyVP) {
        if (r.quotaVP === 0 && r.valorVendaVP === 0 && r.faturadoVP === 0 && r.pendenteVP === 0) return;
        recordToAdd.quotaTotal = r.quotaVP;
        recordToAdd.valorVendaTotal = r.valorVendaVP;
      }

      // Role isolation / exact rep ID filter
      if (userRole === 'rep' && userRepId !== null) {
        if (recordToAdd.repId !== userRepId) return;
      } else if (selectedRepIdFilter !== null) {
        if (recordToAdd.repId !== selectedRepIdFilter) return;
      }

      // State filter
      if (selectedState) {
        const repState = customRepLocations[recordToAdd.repId.toString().trim() || recordToAdd.repId];
        if (repState !== selectedState) return;
      }

      result.push(recordToAdd);
    });

    return result;
  };

  // Compile Presentation Table Rows
  const presentationRows = useMemo<PresentationRepRow[]>(() => {
    // 1. Filter current month records
    const filteredMonthRecords = applyFilters(filteredRecords);

    // 2. Filter accumulated records (from Month 1 to targetEndMonth)
    const filteredAccumRecords = applyFilters(accumulatedRecords);

    // 3. Filter 2025 records (both active period and accumulated)
    const filtered2025PeriodRecords = prevYearFilteredRecords.length > 0 
      ? prevYearFilteredRecords 
      : applyFilters(prevYearRecords);
    const filtered2025AccumRecords = applyFilters(accumulated2025Records);

    const hasAny2025PeriodRecords = filtered2025PeriodRecords.length > 0 || filtered2025AccumRecords.length > 0;

    // Grouping by repId
    const repMap = new Map<number, {
      repId: number;
      repName: string;
      coordName?: string;
      monthQuota: number;
      monthVenda: number;
      accumQuota: number;
      accumVenda: number;
      monthVenda2025: number;
      accumVenda2025: number;
      periodVenda2025: number;
    }>();

    // Helper to get or init rep in map
    const getOrInitRep = (repId: number, rawName: string, coord?: string) => {
      const customName = customRepNames[repId.toString().trim()] || rawName;
      if (!repMap.has(repId)) {
        repMap.set(repId, {
          repId,
          repName: customName,
          coordName: coord,
          monthQuota: 0,
          monthVenda: 0,
          accumQuota: 0,
          accumVenda: 0,
          monthVenda2025: 0,
          accumVenda2025: 0,
          periodVenda2025: 0,
        });
      }
      return repMap.get(repId)!;
    };

    // Process current month records
    filteredMonthRecords.forEach(r => {
      const entry = getOrInitRep(r.repId, r.repName, r.originalCoordName || r.coordName);
      entry.monthQuota += r.quotaTotal || 0;
      entry.monthVenda += r.valorVendaTotal || 0;
    });

    // Process accumulated records
    filteredAccumRecords.forEach(r => {
      const entry = getOrInitRep(r.repId, r.repName, r.originalCoordName || r.coordName);
      entry.accumQuota += r.quotaTotal || 0;
      entry.accumVenda += r.valorVendaTotal || 0;
    });

    // Process 2025 active period records (same period as current filter)
    filtered2025PeriodRecords.forEach(r => {
      const entry = getOrInitRep(r.repId, r.repName, r.originalCoordName || r.coordName);
      entry.periodVenda2025 += r.valorVendaTotal || 0;
      if (r.month === selectedMonth) {
        entry.monthVenda2025 += r.valorVendaTotal || 0;
      }
    });

    // Process 2025 accumulated records (months 1..targetEndMonth)
    filtered2025AccumRecords.forEach(r => {
      const entry = getOrInitRep(r.repId, r.repName, r.originalCoordName || r.coordName);
      entry.accumVenda2025 += r.valorVendaTotal || 0;
      if (r.month === selectedMonth) {
        entry.monthVenda2025 += r.valorVendaTotal || 0;
      }
    });

    const rows: PresentationRepRow[] = [];

    repMap.forEach((entry) => {
      // Calculate % Venda do Mês
      const pctVendaMes = entry.monthQuota > 0 ? (entry.monthVenda / entry.monthQuota) * 100 : 0;
      
      // Calculate % Venda Acumulado (Jan to Current Month)
      const effectiveAccumQuota = entry.accumQuota > 0 ? entry.accumQuota : entry.monthQuota;
      const effectiveAccumVenda = entry.accumQuota > 0 ? entry.accumVenda : entry.monthVenda;
      const pctVendaAcumulado = effectiveAccumQuota > 0 ? (effectiveAccumVenda / effectiveAccumQuota) * 100 : 0;

      // Calculate Sales Growth vs 2025 (Crescimento de vendas em relação ao mesmo período de 2025)
      // Active period sales comparison:
      const vendaPeriodoAtual = isAccumulated 
        ? (entry.accumVenda > 0 ? entry.accumVenda : entry.monthVenda) 
        : entry.monthVenda;

      let vendaPeriodo2025 = 0;
      if (isAccumulated) {
        vendaPeriodo2025 = entry.accumVenda2025 > 0 ? entry.accumVenda2025 : entry.periodVenda2025;
      } else {
        vendaPeriodo2025 = entry.periodVenda2025 > 0 ? entry.periodVenda2025 : entry.monthVenda2025;
      }

      let crescimentoPct = 0;
      let has2025Data = false;
      let isNewRep = false;
      let crescimentoStatus: 'positivo' | 'negativo' | 'estavel' | 'novo' | 'sem_base' = 'sem_base';

      if (!hasAny2025PeriodRecords) {
        crescimentoStatus = 'sem_base';
        has2025Data = false;
      } else if (vendaPeriodo2025 > 0) {
        has2025Data = true;
        crescimentoPct = ((vendaPeriodoAtual - vendaPeriodo2025) / vendaPeriodo2025) * 100;
        if (crescimentoPct > 0.05) {
          crescimentoStatus = 'positivo';
        } else if (crescimentoPct < -0.05) {
          crescimentoStatus = 'negativo';
        } else {
          crescimentoStatus = 'estavel';
        }
      } else if (vendaPeriodo2025 === 0) {
        if (vendaPeriodoAtual > 0) {
          // Rep has sales in 2026, but 0 in 2025
          has2025Data = true;
          isNewRep = true;
          crescimentoPct = 100;
          crescimentoStatus = 'novo';
        } else {
          has2025Data = true;
          crescimentoPct = 0;
          crescimentoStatus = 'estavel';
        }
      }

      // Secondary calculations for month and accumulated growth
      const vMes2025 = entry.monthVenda2025 > 0 ? entry.monthVenda2025 : (!isAccumulated ? entry.periodVenda2025 : 0);
      const vAcum2025 = entry.accumVenda2025 > 0 ? entry.accumVenda2025 : (isAccumulated ? entry.periodVenda2025 : 0);

      const crescimentoMesPct = vMes2025 > 0 
        ? ((entry.monthVenda - vMes2025) / vMes2025) * 100 
        : (entry.monthVenda > 0 && hasAny2025PeriodRecords ? 100 : undefined);

      const crescimentoAcumPct = vAcum2025 > 0 
        ? ((entry.accumVenda - vAcum2025) / vAcum2025) * 100 
        : (entry.accumVenda > 0 && hasAny2025PeriodRecords ? 100 : undefined);

      const getStatus = (pct: number): 'superada' | 'em_linha' | 'abaixo' => {
        if (pct >= 100) return 'superada';
        if (pct >= 75) return 'em_linha';
        return 'abaixo';
      };

      const repState = customRepLocations[entry.repId.toString().trim() || entry.repId];

      rows.push({
        repId: entry.repId,
        repName: entry.repName,
        pctVendaMes,
        pctVendaAcumulado,
        monthQuotaHasTarget: entry.monthQuota > 0,
        accumQuotaHasTarget: effectiveAccumQuota > 0,
        statusMes: getStatus(pctVendaMes),
        statusAcumulado: getStatus(pctVendaAcumulado),
        locationState: repState,
        coordName: entry.coordName,
        crescimentoPct,
        crescimentoStatus,
        has2025Data,
        isNewRep,
        crescimentoMesPct,
        crescimentoAcumPct,
      });
    });

    return rows;
  }, [
    filteredRecords,
    accumulatedRecords,
    accumulated2025Records,
    prevYearRecords,
    prevYearFilteredRecords,
    selectedCoordinator,
    selectedProductGroups,
    selectedSalesTypes,
    selectedState,
    selectedRepIdFilter,
    selectedMonth,
    isAccumulated,
    userRole,
    userRepId,
    customRepNames,
    customRepLocations
  ]);

  // Apply search query (both global and local search) and threshold filter
  const filteredRows = useMemo(() => {
    let result = [...presentationRows];

    // Search filter
    const query = (localSearch || globalSearchText).trim().toLowerCase();
    if (query !== '') {
      result = result.filter(r => 
        r.repName.toLowerCase().includes(query) ||
        r.repId.toString().includes(query) ||
        (r.coordName && r.coordName.toLowerCase().includes(query)) ||
        (r.locationState && r.locationState.toLowerCase().includes(query))
      );
    }

    // Threshold filter based on % Acumulado, % Mês, or Growth
    if (filterThreshold !== 'all') {
      result = result.filter(r => {
        if (filterThreshold === '100+') return r.pctVendaAcumulado >= 100;
        if (filterThreshold === '75-99') return r.pctVendaAcumulado >= 75 && r.pctVendaAcumulado < 100;
        if (filterThreshold === 'under-75') return r.pctVendaAcumulado < 75;
        if (filterThreshold === 'crescimento_positivo') return r.crescimentoStatus === 'positivo' || r.crescimentoStatus === 'novo';
        if (filterThreshold === 'crescimento_negativo') return r.crescimentoStatus === 'negativo';
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortField === 'crescimentoPct') {
        const valA = a.has2025Data ? a.crescimentoPct : -999999;
        const valB = b.has2025Data ? b.crescimentoPct : -999999;
        return sortAscending ? valA - valB : valB - valA;
      }

      const valA = a[sortField];
      const valB = b[sortField];

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

    return result;
  }, [presentationRows, localSearch, globalSearchText, filterThreshold, sortField, sortAscending]);

  // Statistics Summary (WITHOUT any monetary values)
  const presentationStats = useMemo(() => {
    const totalReps = presentationRows.length;
    if (totalReps === 0) {
      return {
        totalReps: 0,
        avgPctMes: 0,
        avgPctAcumulado: 0,
        superouMesCount: 0,
        superouAcumuladoCount: 0,
        avgGrowth: 0,
        growingRepsCount: 0,
        has2025Data: false,
        topRepMes: null as PresentationRepRow | null,
        topRepAcumulado: null as PresentationRepRow | null,
      };
    }

    // Calculate team average achievement
    const rowsWithMonthTarget = presentationRows.filter(r => r.monthQuotaHasTarget);
    const rowsWithAccumTarget = presentationRows.filter(r => r.accumQuotaHasTarget);

    const sumPctMes = rowsWithMonthTarget.reduce((acc, r) => acc + r.pctVendaMes, 0);
    const sumPctAcum = rowsWithAccumTarget.reduce((acc, r) => acc + r.pctVendaAcumulado, 0);

    const avgPctMes = rowsWithMonthTarget.length > 0 ? sumPctMes / rowsWithMonthTarget.length : 0;
    const avgPctAcumulado = rowsWithAccumTarget.length > 0 ? sumPctAcum / rowsWithAccumTarget.length : 0;

    const superouMesCount = presentationRows.filter(r => r.pctVendaMes >= 100).length;
    const superouAcumuladoCount = presentationRows.filter(r => r.pctVendaAcumulado >= 100).length;

    // Team Growth vs 2025 calculation
    const rowsWithGrowthData = presentationRows.filter(r => r.has2025Data && !r.isNewRep);
    const sumGrowth = rowsWithGrowthData.reduce((acc, r) => acc + r.crescimentoPct, 0);
    const avgGrowth = rowsWithGrowthData.length > 0 ? sumGrowth / rowsWithGrowthData.length : 0;
    const growingRepsCount = presentationRows.filter(r => r.crescimentoStatus === 'positivo' || r.crescimentoStatus === 'novo').length;
    const has2025Data = presentationRows.some(r => r.has2025Data);

    // Top performers
    const sortedByMes = [...presentationRows].sort((a, b) => b.pctVendaMes - a.pctVendaMes);
    const sortedByAcum = [...presentationRows].sort((a, b) => b.pctVendaAcumulado - a.pctVendaAcumulado);

    return {
      totalReps,
      avgPctMes,
      avgPctAcumulado,
      superouMesCount,
      superouAcumuladoCount,
      avgGrowth,
      growingRepsCount,
      has2025Data,
      topRepMes: sortedByMes[0] || null,
      topRepAcumulado: sortedByAcum[0] || null,
    };
  }, [presentationRows]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    if (itemsPerPage >= 999) return filteredRows;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const toggleSort = (field: 'repId' | 'repName' | 'pctVendaMes' | 'pctVendaAcumulado' | 'crescimentoPct') => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(field === 'repName' || field === 'repId');
    }
  };

  // Export Presentation Data to CSV (strictly WITHOUT monetary numbers)
  const handleExportCSV = () => {
    const headers = [
      'Código do Representante',
      'Nome do Representante',
      `% Venda Mês (${monthLabel})`,
      `% Venda Acumulado (${accumulatedPeriodLabel})`,
      'Crescimento vs Mesmo Período 2025 (%)'
    ];

    const csvRows = [
      headers.join(';'),
      ...filteredRows.map(r => {
        let growthStr = '-';
        if (r.has2025Data) {
          if (r.isNewRep) {
            growthStr = '+100,0% (Novo)';
          } else {
            growthStr = `${r.crescimentoPct >= 0 ? '+' : ''}${r.crescimentoPct.toFixed(1).replace('.', ',')}%`;
          }
        }

        return [
          r.repId,
          `"${r.repName.replace(/"/g, '""')}"`,
          `${r.pctVendaMes.toFixed(1).replace('.', ',')}%`,
          `${r.pctVendaAcumulado.toFixed(1).replace('.', ',')}%`,
          `"${growthStr}"`
        ].join(';');
      })
    ];

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Apresentacao_Vendas_Tramontina_${selectedYear}_${targetEndMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Presentation Table to High-Res Image (JPG)
  const handleExportJPG = () => {
    setIsExportingImage(true);

    setTimeout(() => {
      try {
        const width = 1120;
        const headerHeight = 130;
        const colHeaderHeight = 44;
        const rowHeight = 38;
        const footerHeight = 65;
        const totalRows = filteredRows.length;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = headerHeight + colHeaderHeight + (totalRows * rowHeight) + footerHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsExportingImage(false);
          return;
        }

        // 1. Background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, canvas.height);

        // 2. Header Blue Banner
        ctx.fillStyle = '#001A9C';
        ctx.fillRect(0, 0, width, headerHeight);

        // 3. Header Text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px Arial, Helvetica, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('TRAMONTINA - AGENTE 87', 40, 48);

        ctx.fillStyle = '#93C5FD'; // Light blue
        ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
        ctx.fillText('APRESENTAÇÃO DE DESEMPENHO E CRESCIMENTO (% DE VENDA)', 40, 75);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial, Helvetica, sans-serif';
        ctx.fillText(`Mês: ${monthLabel} / ${selectedYear}  •  Acumulado: ${accumulatedPeriodLabel}  •  Base Comparativa: 2025`, 40, 100);

        // Confidential badge on top right
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.roundRect(width - 290, 30, 250, 68, 8);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px Arial, Helvetica, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MODO APRESENTAÇÃO DA EQUIPE', width - 165, 56);
        ctx.font = '10px Arial, Helvetica, sans-serif';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText('Valores monetários protegidos', width - 165, 76);

        // 4. Column Headers
        const colY = headerHeight;
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, colY, width, colHeaderHeight);

        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, colY + colHeaderHeight);
        ctx.lineTo(width, colY + colHeaderHeight);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = 'bold 11px Arial, Helvetica, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('CÓDIGO', 40, colY + 27);
        ctx.fillText('REPRESENTANTE', 130, colY + 27);
        ctx.textAlign = 'right';
        ctx.fillText(`% VENDA (${monthLabel.toUpperCase()})`, 590, colY + 27);
        ctx.fillText(`% VENDA ACUMULADO`, 830, colY + 27);
        ctx.fillText(`CRESCIMENTO (vs 2025)`, width - 40, colY + 27);

        // 5. Table Rows
        for (let i = 0; i < totalRows; i++) {
          const r = filteredRows[i];
          const rowY = headerHeight + colHeaderHeight + (i * rowHeight);

          // Alternating background
          ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          ctx.fillRect(0, rowY, width, rowHeight);

          // Border bottom
          ctx.strokeStyle = '#F1F5F9';
          ctx.beginPath();
          ctx.moveTo(0, rowY + rowHeight);
          ctx.lineTo(width, rowY + rowHeight);
          ctx.stroke();

          // Rep ID
          ctx.fillStyle = '#001A9C';
          ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`#${r.repId}`, 40, rowY + 24);

          // Rep Name
          ctx.fillStyle = '#1E293B';
          ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
          let displayName = r.repName;
          if (displayName.length > 32) {
            displayName = displayName.substring(0, 30) + '...';
          }
          ctx.fillText(displayName, 130, rowY + 24);

          // % Venda Mês with colored text and mini track
          const pctM = r.pctVendaMes;
          ctx.textAlign = 'right';
          if (pctM >= 100) {
            ctx.fillStyle = '#15803D'; // Green 700
          } else if (pctM >= 75) {
            ctx.fillStyle = '#D97706'; // Amber 600
          } else {
            ctx.fillStyle = '#E11D48'; // Rose 600
          }
          ctx.font = 'bold 13px Arial, Helvetica, sans-serif';
          ctx.fillText(`${pctM.toFixed(1).replace('.', ',')}%`, 590, rowY + 24);

          // Mini progress track for Mês
          const trackX = 420;
          const trackY = rowY + 14;
          const trackW = 75;
          const trackH = 8;
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(trackX, trackY, trackW, trackH);

          const fillW = Math.min(trackW, Math.max(0, (pctM / 100) * trackW));
          ctx.fillStyle = pctM >= 100 ? '#16A34A' : pctM >= 75 ? '#F59E0B' : '#EF4444';
          ctx.fillRect(trackX, trackY, fillW, trackH);

          // % Venda Acumulado with colored text and mini track
          const pctA = r.pctVendaAcumulado;
          ctx.textAlign = 'right';
          if (pctA >= 100) {
            ctx.fillStyle = '#15803D'; // Green 700
          } else if (pctA >= 75) {
            ctx.fillStyle = '#D97706'; // Amber 600
          } else {
            ctx.fillStyle = '#E11D48'; // Rose 600
          }
          ctx.font = 'bold 13px Arial, Helvetica, sans-serif';
          ctx.fillText(`${pctA.toFixed(1).replace('.', ',')}%`, 830, rowY + 24);

          // Mini progress track for Acumulado
          const trackAX = 670;
          const trackAY = rowY + 14;
          const trackAW = 75;
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(trackAX, trackAY, trackAW, trackH);

          const fillAW = Math.min(trackAW, Math.max(0, (pctA / 100) * trackAW));
          ctx.fillStyle = pctA >= 100 ? '#16A34A' : pctA >= 75 ? '#F59E0B' : '#EF4444';
          ctx.fillRect(trackAX, trackAY, fillAW, trackH);

          // Crescimento vs 2025
          ctx.textAlign = 'right';
          ctx.font = 'bold 13px Arial, Helvetica, sans-serif';
          if (!r.has2025Data) {
            ctx.fillStyle = '#94A3B8';
            ctx.fillText('-', width - 40, rowY + 24);
          } else if (r.isNewRep) {
            ctx.fillStyle = '#1D4ED8'; // Blue
            ctx.fillText('+100% (Novo)', width - 40, rowY + 24);
          } else if (r.crescimentoStatus === 'positivo') {
            ctx.fillStyle = '#047857'; // Emerald
            ctx.fillText(`+${r.crescimentoPct.toFixed(1).replace('.', ',')}%`, width - 40, rowY + 24);
          } else if (r.crescimentoStatus === 'negativo') {
            ctx.fillStyle = '#BE123C'; // Rose
            ctx.fillText(`${r.crescimentoPct.toFixed(1).replace('.', ',')}%`, width - 40, rowY + 24);
          } else {
            ctx.fillStyle = '#475569'; // Slate
            ctx.fillText('0,0%', width - 40, rowY + 24);
          }
        }

        // 6. Footer
        const footerY = headerHeight + colHeaderHeight + (totalRows * rowHeight);
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(0, footerY, width, footerHeight);

        ctx.fillStyle = '#64748B';
        ctx.font = '11px Arial, Helvetica, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Total de Representantes: ${totalRows}  •  Equipe Agente 87  •  Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 40, footerY + 36);

        // Download
        const link = document.createElement('a');
        link.download = `Apresentacao_Desempenho_Tramontina_${selectedYear}_${targetEndMonth}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Erro ao exportar imagem:', err);
      } finally {
        setIsExportingImage(false);
      }
    }, 100);
  };

  const handlePrint = () => {
    window.print();
  };

  const getPercentageColorClass = (pct: number) => {
    if (pct >= 100) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (pct >= 75) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const getProgressColorClass = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-5 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-100 p-6 overflow-y-auto' : ''}`}
    >
      {/* HEADER CARD */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Title & Context */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#001A9C] border border-blue-100 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                <Presentation className="w-3.5 h-3.5" />
                Painel de Apresentação
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[11px] font-bold">
                <EyeOff className="w-3 h-3 text-slate-500" />
                Modo Seguro • Sem Valores Monetários
              </span>
              {isLoadingAccumulated && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-medium animate-pulse">
                  Carregando dados acumulados...
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Apresentação de Desempenho
            </h2>

            <p className="text-xs text-slate-500 font-medium">
              Acompanhamento de metas por representante: <strong className="text-slate-700">% Venda do Mês ({monthLabel})</strong> e <strong className="text-slate-700">% Venda Acumulado ({accumulatedPeriodLabel})</strong>.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportJPG}
              disabled={isExportingImage || filteredRows.length === 0}
              className="flex items-center gap-1.5 bg-[#001A9C] hover:bg-[#00147a] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              title="Baixar imagem JPG formatada para slides de apresentação"
            >
              <Download className="w-3.5 h-3.5" />
              {isExportingImage ? 'Gerando...' : 'Exportar Imagem'}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredRows.length === 0}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              title="Exportar dados da apresentação em formato CSV para Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar CSV
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
              title="Imprimir relatório"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
              title={isFullscreen ? "Sair da Tela Cheia" : "Modo Apresentação em Tela Cheia"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {isFullscreen ? 'Sair' : 'Tela Cheia'}
            </button>
          </div>
        </div>
      </div>

      {/* TABLE CONTROLS AND FILTERS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Quick Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por código ou nome..."
              className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/15 focus:border-[#001A9C]/30 text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          {/* Achievement & Growth filter buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: '100+', label: '≥ 100% Meta Batida' },
              { id: '75-99', label: '75% a 99%' },
              { id: 'under-75', label: '< 75% Abaixo' },
              { id: 'crescimento_positivo', label: 'Crescendo (+)' },
              { id: 'crescimento_negativo', label: 'Em Queda (-)' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => {
                  setFilterThreshold(btn.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterThreshold === btn.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Items per page selector */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Exibir:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-800 py-1.5 px-2.5 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#001A9C] cursor-pointer"
            >
              <option value={15}>15 por página</option>
              <option value={30}>30 por página</option>
              <option value={50}>50 por página</option>
              <option value={999}>Mostrar Todos</option>
            </select>
          </div>
        </div>

        {/* PRESENTATION TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                {/* 1. Código do Representante */}
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-28"
                  onClick={() => toggleSort('repId')}
                >
                  <span className="flex items-center gap-1">
                    CÓDIGO <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>

                {/* 2. Nome do Representante */}
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSort('repName')}
                >
                  <span className="flex items-center gap-1">
                    REPRESENTANTE <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>

                {/* 3. % Venda do Mês Selecionado */}
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                  onClick={() => toggleSort('pctVendaMes')}
                >
                  <span className="flex items-center gap-1 justify-end">
                    % VENDA MÊS ({monthLabel.toUpperCase()}) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>

                {/* 4. % Venda Acumulado */}
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                  onClick={() => toggleSort('pctVendaAcumulado')}
                >
                  <span className="flex items-center gap-1 justify-end">
                    % VENDA ACUMULADO ({accumulatedPeriodLabel.toUpperCase()}) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>

                {/* 5. Crescimento vs Mesmo Período de 2025 */}
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                  onClick={() => toggleSort('crescimentoPct')}
                >
                  <span className="flex items-center gap-1 justify-end">
                    CRESCIMENTO (VS 2025) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedRows.map((row, index) => {
                const rankNumber = (currentPage - 1) * itemsPerPage + index + 1;

                return (
                  <tr
                    key={row.repId}
                    className="hover:bg-slate-50/80 transition-colors font-medium group"
                  >
                    {/* Código do representante */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {rankNumber <= 3 && sortField === 'pctVendaAcumulado' && !sortAscending ? (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${
                            rankNumber === 1 ? 'bg-amber-500' : rankNumber === 2 ? 'bg-slate-400' : 'bg-amber-700'
                          }`}>
                            {rankNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold text-[11px] w-4 text-center">
                            {rankNumber}
                          </span>
                        )}
                        <span className="font-extrabold text-[#001A9C] bg-blue-50/70 border border-blue-100 px-2.5 py-0.5 rounded-lg text-xs">
                          #{row.repId}
                        </span>
                      </div>
                    </td>

                    {/* Nome do representante */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm group-hover:text-[#001A9C] transition-colors">
                          {row.repName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {row.coordName && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Coord: {row.coordName}
                            </span>
                          )}
                          {row.locationState && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                              {row.locationState}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* % Venda do mês selecionado */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${getPercentageColorClass(row.pctVendaMes)}`}>
                            {row.pctVendaMes.toFixed(1).replace('.', ',')}%
                          </span>
                        </div>
                        {/* Mini visual progress track */}
                        <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getProgressColorClass(row.pctVendaMes)}`}
                            style={{ width: `${Math.min(100, row.pctVendaMes)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* % Venda Acumulado */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${getPercentageColorClass(row.pctVendaAcumulado)}`}>
                            {row.pctVendaAcumulado.toFixed(1).replace('.', ',')}%
                          </span>
                        </div>
                        {/* Mini visual progress track */}
                        <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getProgressColorClass(row.pctVendaAcumulado)}`}
                            style={{ width: `${Math.min(100, row.pctVendaAcumulado)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* 5. Crescimento vs Mesmo Período de 2025 */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        {!row.has2025Data ? (
                          <span className="text-slate-400 font-medium text-xs px-2 py-0.5 bg-slate-50 rounded-lg border border-slate-200/60" title="Sem histórico comparativo no período em 2025">
                            -
                          </span>
                        ) : row.isNewRep ? (
                          <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-1 rounded-lg">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-black">+100%</span>
                            <span className="text-[10px] font-bold text-blue-600/80 uppercase">Novo</span>
                          </div>
                        ) : (
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border ${
                            row.crescimentoStatus === 'positivo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : row.crescimentoStatus === 'negativo'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {row.crescimentoStatus === 'positivo' && <TrendingUp className="w-3 h-3 text-emerald-600" />}
                            {row.crescimentoStatus === 'negativo' && <TrendingDown className="w-3 h-3 text-rose-600" />}
                            <span>
                              {row.crescimentoPct > 0 ? '+' : ''}
                              {row.crescimentoPct.toFixed(1).replace('.', ',')}%
                            </span>
                          </div>
                        )}
                        {/* Secondary context (Mês vs Acumulado) */}
                        {row.has2025Data && !row.isNewRep && isAccumulated && row.crescimentoMesPct !== undefined && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Mês: {row.crescimentoMesPct > 0 ? '+' : ''}{row.crescimentoMesPct.toFixed(1).replace('.', ',')}%
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <Search className="w-8 h-8 stroke-1 text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">Nenhum representante encontrado</p>
                      <p className="text-[11px] text-slate-400">Tente ajustar os filtros ou termo de busca.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {filteredRows.length > itemsPerPage && itemsPerPage < 999 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <span className="text-xs text-slate-500 font-medium">
              Mostrando <strong className="text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</strong> a{' '}
              <strong className="text-slate-700">{Math.min(currentPage * itemsPerPage, filteredRows.length)}</strong> de{' '}
              <strong className="text-slate-700">{filteredRows.length}</strong> representantes
            </span>

            <div className="flex items-center gap-1.5 self-end sm:self-center">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-slate-700 px-2.5">
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Próxima Página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
