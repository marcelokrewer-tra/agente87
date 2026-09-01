import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  UploadCloud,
  RefreshCw,
  Percent,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  BarChart3,
  PieChart,
  Table as TableIcon,
  X,
  Check
} from 'lucide-react';
import {
  SellOutRecord,
  MONTH_KEYS,
  MONTH_NAMES_PT,
  getStoredSellOutRecords,
  saveStoredSellOutRecords,
  parseSellOutCSV,
  INITIAL_SELL_OUT_CSV
} from '../data/sellOutData';

interface SellOutTabProps {
  selectedCoordinator: string;
  selectedProductGroups: string[];
  searchText?: string;
  userRole?: 'admin' | 'coord' | 'rep';
}

export const SellOutTab: React.FC<SellOutTabProps> = ({
  selectedCoordinator,
  selectedProductGroups,
  searchText: globalSearch = '',
  userRole = 'admin'
}) => {
  // All stored records
  const [records, setRecords] = useState<SellOutRecord[]>(() => getStoredSellOutRecords());

  // Period / Month selection state
  // 'ytd' = Jan..Jul (active months of 2026), 'all' = Jan..Dec, 'custom' = selected months, or specific month 'janeiro', etc.
  const [periodFilter, setPeriodFilter] = useState<'ytd' | 'all' | 'custom' | string>('ytd');
  const [customSelectedMonths, setCustomSelectedMonths] = useState<string[]>([
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho'
  ]);

  // Product line filter (can be 'GERAL', 'TRAMONTINA MULTI', 'TRAMONTINA MASTER', 'TRAMONTINA PRO', or 'ALL_LINES')
  const [activeLineFilter, setActiveLineFilter] = useState<string>('GERAL');

  // Search & Selected Client filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<'venda2026' | 'venda2025' | 'crescimentoPct' | 'crescimentoNominal' | 'cliente'>('venda2026');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Expanded client row for deep-dive
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync with global search if passed
  useEffect(() => {
    if (globalSearch) {
      setSearchQuery(globalSearch);
      setIsAutocompleteOpen(false);
    }
  }, [globalSearch]);

  // Synchronize with sidebar product group filter if user changes it
  useEffect(() => {
    if (selectedProductGroups && selectedProductGroups.length > 0) {
      if (selectedProductGroups.includes('All')) {
        setActiveLineFilter('GERAL');
      } else if (selectedProductGroups.includes('Tramontina Multi')) {
        setActiveLineFilter('TRAMONTINA MULTI');
      } else if (selectedProductGroups.includes('Tramontina Master')) {
        setActiveLineFilter('TRAMONTINA MASTER');
      } else if (selectedProductGroups.includes('Tramontina Pro')) {
        setActiveLineFilter('TRAMONTINA PRO');
      }
    }
  }, [selectedProductGroups]);

  // Determine active months to calculate
  const activeMonthsList = useMemo(() => {
    if (periodFilter === 'ytd') {
      // Months with data in 2026: Jan to Jul
      return ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho'];
    }
    if (periodFilter === 'all') {
      return [...MONTH_KEYS];
    }
    if (periodFilter === 'custom') {
      return customSelectedMonths;
    }
    // Single month
    return [periodFilter];
  }, [periodFilter, customSelectedMonths]);

  // Available coordinators from records
  const availableCoordinators = useMemo(() => {
    const coords = new Set<string>();
    records.forEach(r => {
      if (r.coordenador) coords.add(r.coordenador);
    });
    return Array.from(coords).sort();
  }, [records]);

  // Available product lines in records
  const availableLines = useMemo(() => {
    const lines = new Set<string>();
    records.forEach(r => {
      if (r.linha) lines.add(r.linha);
    });
    return Array.from(lines);
  }, [records]);

  // Formatters
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatPercent = (val: number) => {
    if (isNaN(val) || !isFinite(val)) return '0.0%';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  };

  // Helper to sum months for a record
  const sumMonths = (record: SellOutRecord, months: string[]): number => {
    let total = 0;
    months.forEach(m => {
      const val = (record.meses as any)[m];
      if (typeof val === 'number') {
        total += val;
      }
    });
    return total;
  };

  // Filter records by Coordinator and Product Line
  const filteredRawRecords = useMemo(() => {
    return records.filter(r => {
      // Coordinator filter
      if (selectedCoordinator && selectedCoordinator !== 'All') {
        if (r.coordenador.toLowerCase() !== selectedCoordinator.toLowerCase()) {
          return false;
        }
      }

      // Line filter
      if (activeLineFilter !== 'ALL_LINES') {
        if (r.linha.toUpperCase() !== activeLineFilter.toUpperCase()) {
          return false;
        }
      }

      return true;
    });
  }, [records, selectedCoordinator, activeLineFilter]);

  // Unique clients in filtered raw records
  const uniqueClients = useMemo(() => {
    const clients = new Set<string>();
    filteredRawRecords.forEach(r => clients.add(r.cliente));
    return Array.from(clients).sort();
  }, [filteredRawRecords]);

  // Group by client and calculate YoY analysis
  interface ClientSellOutSummary {
    cliente: string;
    coordenador: string;
    linha: string;
    venda2025: number;
    venda2026: number;
    crescimentoNominal: number;
    crescimentoPct: number;
    share2026Pct: number;
    record2025?: SellOutRecord;
    record2026?: SellOutRecord;
    monthlyData: {
      key: string;
      label: string;
      short: string;
      venda2025: number;
      venda2026: number;
      diff: number;
      growthPct: number;
    }[];
    linesBreakdown: {
      linha: string;
      venda2025: number;
      venda2026: number;
      diff: number;
      growthPct: number;
    }[];
  }

  // Calculate totals first for share calculation
  const totalSellOut2026All = useMemo(() => {
    let sum = 0;
    filteredRawRecords.filter(r => r.ano === 2026).forEach(r => {
      sum += sumMonths(r, activeMonthsList);
    });
    return sum;
  }, [filteredRawRecords, activeMonthsList]);

  const clientSummaries = useMemo<ClientSellOutSummary[]>(() => {
    return uniqueClients.map(cliente => {
      const clientRecords = records.filter(r => r.cliente === cliente);

      // Find record for current active line filter, or aggregate
      let rec2025: SellOutRecord | undefined;
      let rec2026: SellOutRecord | undefined;

      if (activeLineFilter !== 'ALL_LINES') {
        rec2025 = clientRecords.find(r => r.ano === 2025 && r.linha.toUpperCase() === activeLineFilter.toUpperCase());
        rec2026 = clientRecords.find(r => r.ano === 2026 && r.linha.toUpperCase() === activeLineFilter.toUpperCase());
      } else {
        // Find GERAL if exists, else first
        rec2025 = clientRecords.find(r => r.ano === 2025 && r.linha.toUpperCase() === 'GERAL');
        rec2026 = clientRecords.find(r => r.ano === 2026 && r.linha.toUpperCase() === 'GERAL');
      }

      const coord = rec2026?.coordenador || rec2025?.coordenador || 'Adriano Almeida';

      const venda2025 = rec2025 ? sumMonths(rec2025, activeMonthsList) : 0;
      const venda2026 = rec2026 ? sumMonths(rec2026, activeMonthsList) : 0;
      const crescimentoNominal = venda2026 - venda2025;
      const crescimentoPct = venda2025 > 0 ? ((venda2026 - venda2025) / venda2025) * 100 : (venda2026 > 0 ? 100 : 0);
      const share2026Pct = totalSellOut2026All > 0 ? (venda2026 / totalSellOut2026All) * 100 : 0;

      // Month-by-month details
      const monthlyData = MONTH_NAMES_PT.map(m => {
        const v2025 = rec2025 ? ((rec2025.meses as any)[m.key] || 0) : 0;
        const v2026 = rec2026 ? ((rec2026.meses as any)[m.key] || 0) : 0;
        const diff = v2026 - v2025;
        const growthPct = v2025 > 0 ? ((v2026 - v2025) / v2025) * 100 : (v2026 > 0 ? 100 : 0);

        return {
          key: m.key,
          label: m.label,
          short: m.short,
          venda2025: v2025,
          venda2026: v2026,
          diff,
          growthPct
        };
      });

      // Product lines breakdown for this client
      const distinctLines = ['GERAL', 'TRAMONTINA MULTI', 'TRAMONTINA MASTER', 'TRAMONTINA PRO'];
      const linesBreakdown = distinctLines.map(linha => {
        const r2025 = clientRecords.find(r => r.ano === 2025 && r.linha.toUpperCase() === linha.toUpperCase());
        const r2026 = clientRecords.find(r => r.ano === 2026 && r.linha.toUpperCase() === linha.toUpperCase());
        const v25 = r2025 ? sumMonths(r2025, activeMonthsList) : 0;
        const v26 = r2026 ? sumMonths(r2026, activeMonthsList) : 0;
        const diff = v26 - v25;
        const growthPct = v25 > 0 ? ((v26 - v25) / v25) * 100 : (v26 > 0 ? 100 : 0);

        return {
          linha,
          venda2025: v25,
          venda2026: v26,
          diff,
          growthPct
        };
      });

      return {
        cliente,
        coordenador: coord,
        linha: activeLineFilter,
        venda2025,
        venda2026,
        crescimentoNominal,
        crescimentoPct,
        share2026Pct,
        record2025: rec2025,
        record2026: rec2026,
        monthlyData,
        linesBreakdown
      };
    });
  }, [uniqueClients, records, activeLineFilter, activeMonthsList, totalSellOut2026All]);

  // Autocomplete suggestions based on memory (known unique clients)
  const clientSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return uniqueClients.filter(c => c.toLowerCase().includes(q));
  }, [uniqueClients, searchQuery]);

  // Filter and sort client summaries (only filtering by client name)
  const processedClients = useMemo(() => {
    let list = clientSummaries.filter(c => {
      // Search query filter by client only
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCliente = c.cliente.toLowerCase().includes(q);
        if (!matchCliente) return false;
      }
      return true;
    });

    // Sorting
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [clientSummaries, searchQuery, sortField, sortDirection]);

  // Active selected client data object (if a client is clicked/selected)
  const activeClientSummary = useMemo(() => {
    if (!selectedClient) return null;
    return clientSummaries.find(c => c.cliente.toUpperCase() === selectedClient.toUpperCase()) || null;
  }, [clientSummaries, selectedClient]);

  // Displayed KPIs: if a client is selected, show only that client's metrics; otherwise show total aggregated view
  const displayedKPIs = useMemo(() => {
    if (activeClientSummary) {
      return {
        isSingleClient: true,
        clientName: activeClientSummary.cliente,
        total2025: activeClientSummary.venda2025,
        total2026: activeClientSummary.venda2026,
        diffNominal: activeClientSummary.crescimentoNominal,
        growthPct: activeClientSummary.crescimentoPct,
        clientsCount: 1,
        avgMonthlySellOut: activeMonthsList.length > 0 ? activeClientSummary.venda2026 / activeMonthsList.length : 0
      };
    }

    let total2025 = 0;
    let total2026 = 0;
    processedClients.forEach(c => {
      total2025 += c.venda2025;
      total2026 += c.venda2026;
    });

    const diffNominal = total2026 - total2025;
    const growthPct = total2025 > 0 ? ((total2026 - total2025) / total2025) * 100 : 0;
    const clientsCount = processedClients.length;
    const avgMonthlySellOut = activeMonthsList.length > 0 ? total2026 / activeMonthsList.length : 0;

    return {
      isSingleClient: false,
      clientName: 'Todos',
      total2025,
      total2026,
      diffNominal,
      growthPct,
      clientsCount,
      avgMonthlySellOut
    };
  }, [activeClientSummary, processedClients, activeMonthsList]);

  // Monthly timeline for the bar chart: shows either the single selected client's evolution or aggregate
  const monthlyTimeline = useMemo(() => {
    return MONTH_NAMES_PT.map(m => {
      let v2025 = 0;
      let v2026 = 0;

      if (activeClientSummary) {
        const mItem = activeClientSummary.monthlyData.find(item => item.key === m.key);
        if (mItem) {
          v2025 = mItem.venda2025;
          v2026 = mItem.venda2026;
        }
      } else {
        processedClients.forEach(c => {
          const mItem = c.monthlyData.find(item => item.key === m.key);
          if (mItem) {
            v2025 += mItem.venda2025;
            v2026 += mItem.venda2026;
          }
        });
      }

      const diff = v2026 - v2025;
      const growthPct = v2025 > 0 ? ((v2026 - v2025) / v2025) * 100 : (v2026 > 0 ? 100 : 0);
      const isActive = activeMonthsList.includes(m.key);
      const has2026Data = v2026 > 0;

      return {
        key: m.key,
        label: m.label,
        short: m.short,
        num: m.num,
        venda2025: v2025,
        venda2026: v2026,
        diff,
        growthPct,
        isActive,
        has2026Data
      };
    });
  }, [activeClientSummary, processedClients, activeMonthsList]);

  // Max value in monthly timeline for chart bar height scaling
  const maxMonthlyVal = useMemo(() => {
    let max = 1;
    monthlyTimeline.forEach(m => {
      if (m.venda2025 > max) max = m.venda2025;
      if (m.venda2026 > max) max = m.venda2026;
    });
    return max;
  }, [monthlyTimeline]);

  // Toggle client row expansion
  const toggleClientExpansion = (cliente: string) => {
    setExpandedClients(prev => ({
      ...prev,
      [cliente]: !prev[cliente]
    }));
  };

  // Handle CSV Import
  const handleProcessImport = () => {
    if (!importText.trim()) {
      setImportFeedback({ type: 'error', message: 'Cole os dados do relatório antes de processar.' });
      return;
    }

    try {
      const parsed = parseSellOutCSV(importText);
      if (parsed.length === 0) {
        setImportFeedback({ type: 'error', message: 'Nenhum registro válido encontrado. Verifique o cabeçalho e colunas.' });
        return;
      }

      setRecords(parsed);
      saveStoredSellOutRecords(parsed);
      setImportFeedback({ type: 'success', message: `${parsed.length} linhas de Sell Out importadas com sucesso!` });
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportFeedback(null);
        setImportText('');
      }, 1200);
    } catch (e: any) {
      setImportFeedback({ type: 'error', message: `Erro ao processar: ${e?.message || 'Formato inválido'}` });
    }
  };

  // Reset to initial data
  const handleResetToDefault = () => {
    const def = parseSellOutCSV(INITIAL_SELL_OUT_CSV);
    setRecords(def);
    saveStoredSellOutRecords(def);
    setImportFeedback({ type: 'success', message: 'Dados padrão restaurados!' });
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Cliente',
      'Coordenador',
      'Linha',
      'Sell Out 2025 (Período)',
      'Sell Out 2026 (Período)',
      'Variação Nominal (R$)',
      'Crescimento YoY (%)',
      'Participação 2026 (%)'
    ];

    const rows = processedClients.map(c => [
      `"${c.cliente}"`,
      `"${c.coordenador}"`,
      `"${c.linha}"`,
      c.venda2025.toFixed(2),
      c.venda2026.toFixed(2),
      c.crescimentoNominal.toFixed(2),
      `${c.crescimentoPct.toFixed(2)}%`,
      `${c.share2026Pct.toFixed(2)}%`
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `analise_sell_out_${activeLineFilter.toLowerCase().replace(/\s+/g, '_')}_${periodFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Period label
  const periodDescription = useMemo(() => {
    if (periodFilter === 'ytd') return 'Acumulado Jan a Jul (Meses com dados em 2026)';
    if (periodFilter === 'all') return 'Ano Completo (Jan a Dez)';
    if (periodFilter === 'custom') return `${customSelectedMonths.length} meses selecionados`;
    const mObj = MONTH_NAMES_PT.find(m => m.key === periodFilter);
    return mObj ? `Mês de ${mObj.label}` : periodFilter;
  }, [periodFilter, customSelectedMonths]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. TOP HEADER & SELL OUT ACTION BAR */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Análise de Sell Out</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Evolução por Clientes
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Acompanhamento de Sell Out YoY (2025 vs 2026), crescimento nominal e desempenho por linha de produtos
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Active Filters summary pills */}
            {selectedCoordinator && selectedCoordinator !== 'All' && (
              <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-3xs">
                <span>Coord: <strong>{selectedCoordinator}</strong></span>
              </span>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-3xs flex items-center gap-2 cursor-pointer"
              title="Exportar dados da análise de Sell Out em formato CSV"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Exportar CSV</span>
            </button>

            {userRole === 'admin' && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 bg-[#001A9C] hover:bg-[#00147a] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-sky-200" />
                <span>Importar Sell Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. DEDICATED SELL OUT KPIS (SALES KPIS ARE HIDDEN AS REQUESTED) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* KPI 1: Sell Out 2026 */}
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sell Out 2026</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(displayedKPIs.total2026)}
            </div>
            <div className="text-[11.5px] text-slate-500 font-medium mt-0.5">
              {periodDescription}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Linha: <strong className="text-slate-700">{activeLineFilter}</strong></span>
            <span className="text-slate-600 font-bold">
              {displayedKPIs.isSingleClient ? (
                <span className="text-blue-700 font-black">{displayedKPIs.clientName}</span>
              ) : (
                <span>{displayedKPIs.clientsCount} clientes</span>
              )}
            </span>
          </div>
        </div>

        {/* KPI 2: Sell Out 2025 */}
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sell Out 2025 (Mesmo Período)</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-700 tracking-tight">
              {formatCurrency(displayedKPIs.total2025)}
            </div>
            <div className="text-[11.5px] text-slate-500 font-medium mt-0.5">
              Base comparativa homóloga
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Meses: <strong className="text-slate-700">{activeMonthsList.length} ativos</strong></span>
            <span className="text-slate-400">Média/mês: {formatCurrency(displayedKPIs.avgMonthlySellOut)}</span>
          </div>
        </div>

        {/* KPI 3: Crescimento Nominal & % */}
        <div className={`bg-white border p-4.5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden transition-all ${
          displayedKPIs.diffNominal >= 0 ? 'border-emerald-200/80 hover:border-emerald-300' : 'border-rose-200/80 hover:border-rose-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Crescimento Sell Out (YoY)</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              displayedKPIs.diffNominal >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {displayedKPIs.diffNominal >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black tracking-tight ${
              displayedKPIs.diffNominal >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {formatPercent(displayedKPIs.growthPct)}
            </div>
            <div className={`text-[12px] font-bold mt-0.5 ${
              displayedKPIs.diffNominal >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {displayedKPIs.diffNominal >= 0 ? '+' : ''}{formatCurrency(displayedKPIs.diffNominal)}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Variação Real</span>
            <span className={`font-bold ${displayedKPIs.diffNominal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {displayedKPIs.diffNominal >= 0 ? 'Expansão de Sell Out' : 'Retração'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. CONTROL PANEL: CLIENT SELECTION, PRODUCT LINES & VIEWS */}
      <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          
          {/* Search bar with Autocomplete and Selected Client Indicator */}
          <div className="md:col-span-5 relative space-y-1.5">
            {/* Selected Client indicator */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">Cliente selecionado:</span>
                <span className={`px-2 py-0.5 rounded-md font-extrabold text-xs transition-colors ${
                  selectedClient 
                    ? 'bg-[#001A9C] text-white shadow-3xs' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {selectedClient || 'Todos'}
                </span>
              </div>
              {selectedClient && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    setSearchQuery('');
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Ver Todos</span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Input with real-time memory suggestions */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsAutocompleteOpen(true)}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsAutocompleteOpen(true);
                }}
                placeholder="Buscar cliente..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsAutocompleteOpen(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Autocomplete Dropdown */}
              {isAutocompleteOpen && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  <div className="p-2 bg-slate-50 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 border-b border-slate-200">
                    <span>Sugestões Encontradas ({clientSuggestions.length})</span>
                    <button 
                      type="button" 
                      onClick={() => setIsAutocompleteOpen(false)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {clientSuggestions.length > 0 ? (
                    clientSuggestions.map(clientName => {
                      const isItemActive = selectedClient?.toUpperCase() === clientName.toUpperCase();
                      return (
                        <button
                          key={clientName}
                          type="button"
                          onClick={() => {
                            setSelectedClient(clientName);
                            setSearchQuery(clientName);
                            setIsAutocompleteOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors flex items-center justify-between group cursor-pointer ${
                            isItemActive ? 'bg-blue-50 text-[#001A9C]' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className={`w-3.5 h-3.5 ${isItemActive ? 'text-[#001A9C]' : 'text-slate-400 group-hover:text-blue-600'}`} />
                            <span>{clientName}</span>
                          </div>
                          {isItemActive && (
                            <span className="text-[10px] bg-[#001A9C] text-white font-extrabold px-1.5 py-0.5 rounded">
                              Ativo
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-xs text-slate-400 text-center font-medium">
                      Nenhum cliente cadastrado com esse nome
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Product Line Filter Pills */}
          <div className="md:col-span-7 flex flex-wrap items-center justify-start md:justify-end gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Linha:</span>
            {[
              { id: 'GERAL', label: 'Geral (Total)' },
              { id: 'TRAMONTINA MULTI', label: 'Multi' },
              { id: 'TRAMONTINA MASTER', label: 'Master' },
              { id: 'TRAMONTINA PRO', label: 'Pro' }
            ].map(line => (
              <button
                key={line.id}
                onClick={() => setActiveLineFilter(line.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeLineFilter === line.id
                    ? 'bg-[#001A9C] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-transparent'
                }`}
              >
                {line.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Período:</span>
            
            <button
              onClick={() => setPeriodFilter('ytd')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodFilter === 'ytd'
                  ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Acumulado (Jan a Jul 2026)
            </button>

            <button
              onClick={() => setPeriodFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodFilter === 'all'
                  ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Ano Todo (Jan a Dez)
            </button>

            {/* Individual Months Pills */}
            <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-slate-200">
              {MONTH_NAMES_PT.slice(0, 7).map(m => (
                <button
                  key={m.key}
                  onClick={() => setPeriodFilter(m.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    periodFilter === m.key
                      ? 'bg-slate-900 text-white shadow-3xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m.short}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. VISUAL TIMELINE & COMPARISON CHART (Monthly Bar Chart 2025 vs 2026) */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-[#001A9C]" />
            <h3 className="font-black text-slate-800 text-sm">
              Evolução Mensal do Sell Out: 2025 vs 2026 {displayedKPIs.isSingleClient ? `(${displayedKPIs.clientName} - ${activeLineFilter})` : `(${activeLineFilter})`}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" />
              <span className="text-slate-500">2025</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
              <span className="text-blue-900">2026</span>
            </div>
          </div>
        </div>

        {/* Custom Responsive SVG / HTML Bar Chart */}
        <div className="pt-2">
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-3 items-end h-56 pt-6 pb-2 border-b border-slate-100">
            {monthlyTimeline.map(m => {
              const h2025Pct = maxMonthlyVal > 0 ? (m.venda2025 / maxMonthlyVal) * 100 : 0;
              const h2026Pct = maxMonthlyVal > 0 ? (m.venda2026 / maxMonthlyVal) * 100 : 0;

              return (
                <div key={m.key} className="flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute -top-12 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white text-[10.5px] p-2 rounded-lg shadow-xl whitespace-nowrap space-y-0.5">
                    <p className="font-bold">{m.label}</p>
                    <p className="text-slate-300">2025: {formatCurrency(m.venda2025)}</p>
                    <p className="text-blue-300">2026: {formatCurrency(m.venda2026)}</p>
                    {m.venda2025 > 0 && m.venda2026 > 0 && (
                      <p className={`font-bold ${m.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPercent(m.growthPct)} ({formatCurrency(m.diff)})
                      </p>
                    )}
                  </div>

                  {/* Bars side by side */}
                  <div className="w-full flex items-end justify-center gap-1 h-full px-0.5">
                    {/* 2025 bar */}
                    <div
                      className="w-1/2 bg-slate-200 hover:bg-slate-300 rounded-t-sm transition-all relative"
                      style={{ height: `${Math.max(h2025Pct, 4)}%` }}
                    />
                    {/* 2026 bar */}
                    <div
                      className={`w-1/2 rounded-t-sm transition-all relative ${
                        m.venda2026 > 0 ? 'bg-[#001A9C] hover:bg-blue-700' : 'bg-slate-100'
                      }`}
                      style={{ height: `${Math.max(h2026Pct, m.venda2026 > 0 ? 4 : 1)}%` }}
                    />
                  </div>

                  {/* Month Label */}
                  <div className="pt-2 text-center">
                    <span className={`text-[11px] font-bold block ${
                      m.isActive ? 'text-slate-900 font-black' : 'text-slate-400'
                    }`}>
                      {m.short}
                    </span>
                    {m.venda2026 > 0 && m.venda2025 > 0 && (
                      <span className={`text-[9.5px] font-extrabold block ${
                        m.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {formatPercent(m.growthPct)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. MAIN CONTENT DISPLAY: TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-black text-slate-800 text-sm">
                Tabela de Sell Out por Cliente ({processedClients.length} encontrados)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Clique no cliente para expandir o detalhamento por linha e histórico mês a mês
              </p>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Ordenando por: <strong className="text-slate-800 capitalize">{sortField.replace('venda', 'Sell Out ').replace('Pct', ' %')}</strong> ({sortDirection === 'desc' ? 'Decrescente' : 'Crescente'})
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase text-[10.5px] tracking-wider select-none">
                  <th className="py-3 px-3.5 w-12 text-center">#</th>
                  
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'cliente') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortField('cliente'); setSortDirection('asc'); }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cliente</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th className="py-3 px-3 text-slate-500">Coordenador</th>

                  <th 
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'venda2025') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortField('venda2025'); setSortDirection('desc'); }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Sell Out 2025</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th 
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'venda2026') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortField('venda2026'); setSortDirection('desc'); }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5 text-blue-900">
                      <span>Sell Out 2026</span>
                      <ArrowUpDown className="w-3 h-3 text-blue-600" />
                    </div>
                  </th>

                  <th 
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'crescimentoNominal') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortField('crescimentoNominal'); setSortDirection('desc'); }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Variação (R$)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th 
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'crescimentoPct') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortField('crescimentoPct'); setSortDirection('desc'); }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Crescimento (%)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th className="py-3 px-3 text-right">Share (%)</th>
                  <th className="py-3 px-3.5 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {processedClients.map((client, idx) => {
                  const isExpanded = !!expandedClients[client.cliente];
                  const isGrowing = client.crescimentoNominal >= 0;
                  const isSelected = selectedClient?.toUpperCase() === client.cliente.toUpperCase();

                  return (
                    <React.Fragment key={client.cliente}>
                      <tr 
                        className={`transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50/90 ring-1 ring-blue-300' 
                            : isExpanded ? 'bg-slate-50/60' : 'hover:bg-slate-50/80'
                        }`}
                        onClick={() => {
                          setSelectedClient(client.cliente);
                          toggleClientExpansion(client.cliente);
                        }}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-3.5 text-center text-slate-400 font-bold text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Client Name */}
                        <td className="py-3.5 px-4 font-black text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-[#001A9C] text-white shadow-3xs' : 'bg-[#001A9C]/10 text-[#001A9C]'
                            }`}>
                              {client.cliente.substring(0, 2)}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm">{client.cliente}</span>
                              {isSelected && (
                                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-[#001A9C] text-white shadow-3xs">
                                  Foco Ativo
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Coordinator */}
                        <td className="py-3.5 px-3 text-slate-600 font-semibold">
                          {client.coordenador}
                        </td>

                        {/* Sell Out 2025 */}
                        <td className="py-3.5 px-4 text-right text-slate-600 font-bold font-sans">
                          {formatCurrency(client.venda2025)}
                        </td>

                        {/* Sell Out 2026 */}
                        <td className="py-3.5 px-4 text-right text-slate-900 font-black font-sans text-sm">
                          {formatCurrency(client.venda2026)}
                        </td>

                        {/* Nominal Diff */}
                        <td className={`py-3.5 px-4 text-right font-black font-sans ${
                          isGrowing ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {isGrowing ? '+' : ''}{formatCurrency(client.crescimentoNominal)}
                        </td>

                        {/* Growth % */}
                        <td className="py-3.5 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                            isGrowing 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {isGrowing ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {formatPercent(client.crescimentoPct)}
                          </span>
                        </td>

                        {/* Share */}
                        <td className="py-3.5 px-3 text-right text-slate-500 font-bold">
                          {client.share2026Pct.toFixed(1)}%
                        </td>

                        {/* Action Expand Button */}
                        <td className="py-3.5 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleClientExpansion(client.cliente);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                            title={isExpanded ? 'Recolher detalhes' : 'Ver detalhamento por linha e histórico'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDED ROW: DETAILED LINE BREAKDOWN & MONTH-BY-MONTH */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-y border-slate-200">
                          <td colSpan={9} className="p-4 sm:p-5">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-black text-slate-800 text-xs flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-[#001A9C]" />
                                  <span>Detalhamento por Linha de Produto: {client.cliente}</span>
                                </h4>
                                <span className="text-xs text-slate-500">
                                  Período: {periodDescription}
                                </span>
                              </div>

                              {/* Breakdown by product line for this client */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {client.linesBreakdown.map(lb => (
                                  <div key={lb.linha} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-slate-500 uppercase">{lb.linha}</span>
                                      <span className={`text-xs font-black ${lb.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {formatPercent(lb.growthPct)}
                                      </span>
                                    </div>
                                    <div className="text-base font-black text-slate-900">
                                      {formatCurrency(lb.venda2026)}
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                      <span>2025: {formatCurrency(lb.venda2025)}</span>
                                      <span className={`font-bold ${lb.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {lb.diff >= 0 ? '+' : ''}{formatCurrency(lb.diff)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Month by month grid for this client */}
                              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <span className="text-[11px] font-bold text-slate-500 uppercase block">
                                  Histórico Mês a Mês ({client.linha})
                                </span>
                                
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs text-center border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold">
                                        <th className="py-1.5 px-2 text-left">Ano</th>
                                        {MONTH_NAMES_PT.map(m => (
                                          <th key={m.key} className="py-1.5 px-2">{m.short}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      <tr className="text-slate-600 font-semibold">
                                        <td className="py-2 px-2 text-left font-bold text-slate-400">2025</td>
                                        {client.monthlyData.map(m => (
                                          <td key={m.key} className="py-2 px-2">
                                            {m.venda2025 > 0 ? formatCurrency(m.venda2025) : '-'}
                                          </td>
                                        ))}
                                      </tr>
                                      <tr className="text-slate-900 font-bold bg-blue-50/40">
                                        <td className="py-2 px-2 text-left font-black text-blue-900">2026</td>
                                        {client.monthlyData.map(m => (
                                          <td key={m.key} className="py-2 px-2 font-black text-blue-950">
                                            {m.venda2026 > 0 ? formatCurrency(m.venda2026) : '-'}
                                          </td>
                                        ))}
                                      </tr>
                                      <tr className="text-[11px] font-black">
                                        <td className="py-1.5 px-2 text-left text-slate-400">YoY %</td>
                                        {client.monthlyData.map(m => (
                                          <td key={m.key} className={`py-1.5 px-2 ${
                                            m.venda2026 > 0 && m.venda2025 > 0
                                              ? (m.diff >= 0 ? 'text-emerald-600' : 'text-rose-600')
                                              : 'text-slate-300'
                                          }`}>
                                            {m.venda2026 > 0 && m.venda2025 > 0 ? formatPercent(m.growthPct) : '-'}
                                          </td>
                                        ))}
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {processedClients.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Nenhum cliente encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* 6. IMPORT SELL OUT MODAL */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden"
            >
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UploadCloud className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold">Importar Relatório de Sell Out</h3>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cole abaixo o conteúdo em formato CSV/TSV contendo as colunas de 
                  <strong> CLIENTE; COORDENADOR; SELL OUT; ANO; JANEIRO..DEZEMBRO</strong>.
                </p>

                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder="Cole aqui o CSV de Sell Out..."
                  rows={8}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C]"
                />

                {importFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    importFeedback.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {importFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{importFeedback.message}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Restaurar Dados Padrão</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(false)}
                      className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessImport}
                      className="px-5 py-2 bg-[#001A9C] hover:bg-[#00147a] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Processar Importação</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
