import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  INITIAL_RAW_DATA, 
  parseTSV 
} from './rawData';
import { 
  SalesRecord 
} from './types';
import { MetricCard } from './components/MetricCard';
import { KPIGauge } from './components/KPIGauge';
import { ImportDataTab } from './components/ImportDataTab';
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
  Download, 
  LayoutDashboard, 
  User, 
  Filter, 
  ArrowUpDown, 
  PlusSquare, 
  Info,
  Building,
  Layers,
  LineChart,
  Grid,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';

export default function App() {
  // Global parsed Sales Records
  const [allRecords, setAllRecords] = useState<SalesRecord[]>(() => parseTSV(INITIAL_RAW_DATA));
  
  // Dashboard Core Navigation Tabs
  const [activeTab, setActiveTab] = useState<'geral' | 'coordenadores' | 'representantes' | 'detalhado' | 'importar'>('geral');
  
  // Filter States
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>('All');
  const [selectedEnterprise, setSelectedEnterprise] = useState<string>('All');
  const [selectedProductLine, setSelectedProductLine] = useState<string>('All');
  const [searchText, setSearchText] = useState<string>('');
  const [progressThreshold, setProgressThreshold] = useState<string>('All'); // 'All', '100+', '75-99', 'under-75'
  
  // Detailed Modal for Representative Product Group breakdown
  const [selectedRepDetailId, setSelectedRepDetailId] = useState<number | null>(null);

  // Pagination for detailed table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Sorting for detailed table
  const [sortField, setSortField] = useState<keyof SalesRecord>('repName');
  const [sortAscending, setSortAscending] = useState<boolean>(true);

  // Reset all active filters
  const resetFilters = () => {
    setSelectedCoordinator('All');
    setSelectedEnterprise('All');
    setSelectedProductLine('All');
    setSearchText('');
    setProgressThreshold('All');
  };

  // Extract distinct lists dynamically from database state to populate select menus
  const distinctCoordinators = useMemo(() => {
    const coords = new Set<string>();
    allRecords.forEach(r => {
      if (r.coordName) coords.add(r.coordName);
    });
    return Array.from(coords).sort();
  }, [allRecords]);

  const distinctEnterprises = useMemo(() => {
    const emps = new Set<string>();
    allRecords.forEach(r => {
      if (r.emp) emps.add(r.emp);
    });
    return Array.from(emps).sort();
  }, [allRecords]);

  const distinctProductLines = useMemo(() => {
    const lines = new Set<string>();
    allRecords.forEach(r => {
      if (r.linha) lines.add(r.linha);
    });
    return Array.from(lines).sort();
  }, [allRecords]);

  // Compute filtered records based on interactive panel
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      // Coordinator filter
      if (selectedCoordinator !== 'All' && r.coordName !== selectedCoordinator) return false;
      
      // Enterprise filter (EMP)
      if (selectedEnterprise !== 'All' && r.emp !== selectedEnterprise) return false;
      
      // Product Line filter (LINHA)
      if (selectedProductLine !== 'All' && r.linha !== selectedProductLine) return false;
      
      // Search matching (by rep name or ID)
      if (searchText.trim() !== '') {
        const query = searchText.toLowerCase();
        const matchName = r.repName.toLowerCase().includes(query);
        const matchId = r.repId.toString().includes(query);
        const matchGroup = r.groupName.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchGroup) return false;
      }

      // Achievement threshold filter
      if (progressThreshold !== 'All') {
        const rate = r.quotaTotal > 0 ? (r.faturadoTotal / r.quotaTotal) * 100 : 0;
        if (progressThreshold === '100+' && rate < 100) return false;
        if (progressThreshold === '75-99' && (rate < 75 || rate >= 100)) return false;
        if (progressThreshold === 'under-75' && rate >= 75) return false;
      }

      return true;
    });
  }, [allRecords, selectedCoordinator, selectedEnterprise, selectedProductLine, searchText, progressThreshold]);

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
    let defasagem = 0;
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
      defasagem += r.defasagem;
      valorVendaCD += r.valorVendaCD;
      valorVendaVP += r.valorVendaVP;
      valorVendaTotal += r.valorVendaTotal;
    });

    const achCD = quotaCD > 0 ? (faturadoCD / quotaCD) * 100 : 0;
    const achVP = quotaVP > 0 ? (faturadoVP / quotaVP) * 100 : 0;
    const achTotal = quotaTotal > 0 ? (faturadoTotal / quotaTotal) * 100 : 0;
    const achSale = quotaTotal > 0 ? (valorVendaTotal / quotaTotal) * 100 : 0;

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
      groups[r.coordName].faturado += r.faturadoTotal;
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
      .sort((a,b) => b.faturado - a.faturado);
  }, [filteredRecords]);

  // Group by Enterprise (EMP) to build structural segmentation charts
  const enterpriseDonutData = useMemo(() => {
    const groups: { [key: string]: number } = {};
    let totalAll = 0;
    
    filteredRecords.forEach(r => {
      if (!groups[r.emp]) groups[r.emp] = 0;
      groups[r.emp] += r.faturadoTotal;
      totalAll += r.faturadoTotal;
    });

    return Object.entries(groups)
      .map(([emp, val]) => ({
        name: emp || 'Outros',
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
      let defasagemTotal = 0;
      
      records.forEach(r => {
        qTotal += r.quotaTotal;
        fTotal += r.faturadoTotal;
        fCD += r.faturadoCD;
        fVP += r.faturadoVP;
        vVenda += r.valorVendaTotal;
        defasagemTotal += r.defasagem;
      });

      return {
        repId: first.repId,
        repName: first.repName,
        coordName: first.coordName,
        totalQuota: qTotal,
        totalFaturado: fTotal,
        totalFaturadoCD: fCD,
        totalFaturadoVP: fVP,
        totalVendido: vVenda,
        defasagem: defasagemTotal,
        pctTotal: qTotal > 0 ? (fTotal / qTotal) * 100 : 0,
        pctVenda: qTotal > 0 ? (vVenda / qTotal) * 100 : 0,
        recordsCount: records.length,
        items: records
      };
    }).sort((a, b) => b.totalFaturado - a.totalFaturado);
  }, [filteredRecords]);

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

  // Sorting logic for details table
  const sortedDetails = useMemo(() => {
    const sorted = [...filteredRecords];
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
  }, [filteredRecords, sortField, sortAscending]);

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
      'Representante ID', 'Nome Representante', 'Coordenador', 'Empresa (Filial)', 
      'Linha', 'Grupo', 'Cota Total', 'Faturado Total', '% Atingimento', 'Defasagem', 'Valor Venda Total'
    ];
    
    const csvRows = [
      headers.join(';'), // semicolon for Excel friendly portuguese locale parser
      ...filteredRecords.map(r => [
        r.repId,
        `"${r.repName.replace(/"/g, '""')}"`,
        `"${r.coordName.replace(/"/g, '""')}"`,
        r.emp,
        `"${r.linha.replace(/"/g, '""')}"`,
        `"${r.groupName.replace(/"/g, '""')}"`,
        r.quotaTotal.toString().replace('.', ','),
        r.faturadoTotal.toString().replace('.', ','),
        (r.quotaTotal > 0 ? ((r.faturadoTotal / r.quotaTotal) * 100).toFixed(1) : '0').replace('.', ','),
        r.defasagem.toString().replace('.', ','),
        r.valorVendaTotal.toString().replace('.', ',')
      ].join(';'))
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

  // Find the selected representative for the detailed group-split modal
  const repDetailData = useMemo(() => {
    if (selectedRepDetailId === null) return null;
    const items = allRecords.filter(r => r.repId === selectedRepDetailId);
    if (!items.length) return null;
    
    let quota = 0;
    let faturado = 0;
    let defasagem = 0;
    let valorVenda = 0;
    
    items.forEach(i => {
      quota += i.quotaTotal;
      faturado += i.faturadoTotal;
      defasagem += i.defasagem;
      valorVenda += i.valorVendaTotal;
    });

    return {
      repId: selectedRepDetailId,
      repName: items[0].repName,
      coordName: items[0].coordName,
      quota,
      faturado,
      defasagem,
      valorVenda,
      percent: quota > 0 ? (faturado / quota) * 100 : 0,
      rows: items
    };
  }, [allRecords, selectedRepDetailId]);

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
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Faturado Total</span>
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
                    Atingimento: {formatPercent(repDetailData.percent)}
                  </span>
                </div>

                <div className="space-y-3.5">
                  {repDetailData.rows.map((row, idx) => {
                    const rowAch = row.quotaTotal > 0 ? (row.faturadoTotal / row.quotaTotal) * 100 : 0;
                    return (
                      <div key={row.id || idx} className="p-4 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 uppercase tracking-wider font-mono">
                                {row.emp}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                {row.linha}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm mt-1">{row.groupName}</h4>
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
                            <span>Fat: <strong className="text-slate-800">{formatCurrency(row.faturadoTotal)}</strong></span>
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

      {/* Decorative top strip */}
      <div className="h-2 bg-gradient-to-r from-red-500 via-orange-500 to-indigo-600" />

      {/* Corporate header title */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-red-600 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">TRAMONTINA S/A • COMERCIAL</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              KPIs de Faturamento & Vendas
              <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border border-slate-200 font-extrabold tracking-normal font-mono">
                {allRecords.length} lançamentos
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-semibold">
              Dashboard integrado CD e VP, cota de representantes, margem de faturamento, pendentes e defasagem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 bg-white p-2 rounded-xl border border-slate-200 self-start md:self-center shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase pb-0.5 pl-2 leading-none">Visualização:</span>
            <button 
              onClick={resetFilters} 
              className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Limpar Filtros
            </button>
            <button 
              onClick={exportToCSV}
              className="px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar (.CSV)
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COMPACT FILTER CONTROLS SIDEBAR */}
        <section className="lg:col-span-1 space-y-5">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-5 text-slate-300">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-450" />
                  Ajustes e Filtros
                </h3>
              </div>
              {(selectedCoordinator !== 'All' || selectedEnterprise !== 'All' || selectedProductLine !== 'All' || searchText !== '' || progressThreshold !== 'All') && (
                <span className="h-2 w-2 rounded-full bg-indigo-400 block animate-pulse" />
              )}
            </div>

            {/* Keyword Search */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Buscar Representante</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Nome, ID ou Grupo..."
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-white placeholder-slate-500"
                />
              </div>
            </div>

            {/* Coordinator Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Coordenador</label>
              <div className="relative">
                <select
                  value={selectedCoordinator}
                  onChange={(e) => {
                    setSelectedCoordinator(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs bg-slate-800 border border-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-white cursor-pointer appearance-none"
                >
                  <option value="All" className="bg-slate-900 text-white">Todos os Coordenadores ({distinctCoordinators.length})</option>
                  {distinctCoordinators.map(c => (
                    <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            {/* Product Line Filter (LINHA) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Empresa (Filial / Divisão)</label>
              <div className="relative">
                <select
                  value={selectedEnterprise}
                  onChange={(e) => {
                    setSelectedEnterprise(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs bg-slate-800 border border-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-white cursor-pointer appearance-none"
                >
                  <option value="All" className="bg-slate-900 text-white">Todas as Filiais ({distinctEnterprises.length})</option>
                  {distinctEnterprises.map(e => (
                    <option key={e} value={e} className="bg-slate-900 text-white">{e}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            {/* Product Business Segment Line */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Linha de Negócio</label>
              <div className="relative">
                <select
                  value={selectedProductLine}
                  onChange={(e) => {
                    setSelectedProductLine(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs bg-slate-800 border border-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-white cursor-pointer appearance-none"
                >
                  <option value="All" className="bg-slate-900 text-white">Todas as Linhas ({distinctProductLines.length})</option>
                  {distinctProductLines.map(l => (
                    <option key={l} value={l} className="bg-slate-900 text-white">{l}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            {/* Achievement Rate Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Desempenho da Cota (% Total)</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'All', label: 'Todos' },
                  { id: '100+', label: 'Meta 100%+' },
                  { id: '75-99', label: 'Meta 75-99%' },
                  { id: 'under-75', label: 'Abaixo de 75%' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setProgressThreshold(opt.id);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                      progressThreshold === opt.id 
                        ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-xs' 
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Registros filtrados:</span>
              <strong className="text-white text-xs font-sans font-extrabold">{filteredRecords.length} / {allRecords.length}</strong>
            </div>

            {/* Metadata sync footer indicator */}
            <div className="pt-2">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex flex-col justify-start">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest leading-none">Última Sincronização</span>
                <span className="text-[10px] font-mono font-medium text-emerald-400 mt-1.5">Completa • Tempo Real</span>
              </div>
            </div>
          </div>

          {/* Quick instructions block */}
          <div className="p-4 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl text-white shadow-md relative overflow-hidden space-y-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              Gestão de Defasagem
            </h4>
            <p className="text-[11px] text-indigo-100/80 leading-relaxed font-normal">
              A <strong>Defasagem</strong> representa a diferença matemática líquida entre o volume faturado e a cota total estipulada em reais. 
              Gaps negativos vermelhos necessitam de ação imediatas de prospecção e liberação de pendentes.
            </p>
          </div>
        </section>

        {/* RIGHT METRICS GRID AND TABBED CONTROLLERS */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Bento row of Core metrics cards (Filtered live) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Faturado Líquido (CD+VP)"
              value={formatCurrency(totals.faturadoTotal)}
              subtitle={`Total apurado consolidado`}
              icon={<TrendingUp className="w-5 h-5" />}
              accentColor="emerald"
            />
            <MetricCard
              title="Atingimento Geral"
              value={formatPercent(totals.achTotal)}
              subtitle={`Meta global: ${formatCurrency(totals.quotaTotal)}`}
              icon={<Target className="w-5 h-5" />}
              accentColor="sky"
              trend={{
                value: (totals.achTotal >= 100) ? "Excedente" : `${(100 - totals.achTotal).toFixed(1)}% faltantes`,
                isPositive: totals.achTotal >= 100
              }}
            />
            <MetricCard
              title="Defasagem Líquida"
              value={(totals.defasagem >= 0 ? '+' : '') + formatCurrency(totals.defasagem)}
              subtitle={`${totals.defasagem >= 0 ? 'Superávit' : 'Déficit'} em relação à cota`}
              icon={<ShieldAlert className="w-5 h-5" />}
              accentColor={totals.defasagem >= 0 ? 'emerald' : 'rose'}
            />
            <MetricCard
              title="Valor de Venda"
              value={formatCurrency(totals.valorVendaTotal)}
              subtitle={`Ating. venda: ${formatPercent(totals.achSale)}`}
              icon={<DollarSign className="w-5 h-5" />}
              accentColor="amber"
            />
          </div>

          {/* Navigation controller layout bar */}
          <div className="bg-white border border-slate-100 p-2 rounded-2xl shadow-xs flex flex-wrap gap-2">
            {[
              { id: 'geral', label: 'Panorama Geral', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'representantes', label: 'Representantes', icon: <User className="w-4 h-4" /> },
              { id: 'coordenadores', label: 'Coordenadores', icon: <Users className="w-4 h-4" /> },
              { id: 'detalhado', label: 'Tabela Detalhada', icon: <FileText className="w-4 h-4" /> },
              { id: 'importar', label: 'Importar Planilha (Excel)', icon: <FileSpreadsheet className="w-4 h-4" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
                  activeTab === tab.id 
                    ? 'text-slate-900 bg-slate-900/5 font-extrabold' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {/* Floating pill transition */}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabControl"
                    className="absolute inset-0 bg-slate-950/[0.04] border border-slate-950/[0.02] rounded-xl pointer-events-none"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: PANORAMA GERAL SECTION */}
          {activeTab === 'geral' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Primary Charts layout split */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Visual Coordinator Bar chart inside standard container */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm md:col-span-2 space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <LineChart className="w-4.5 h-4.5 text-indigo-500" />
                      Atingimento por Coordenadoria (CD + VP Misto)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Cota estipulada em reais comparada ao real faturado bruto por equipe.</p>
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
                              <span className="text-[10px] text-slate-400 block mt-0.5">Fat: {formatCurrency(item.faturado)}</span>
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
                      Faturamento por Filial (EMP)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Participação de cada prefixo corporativo no faturamento.</p>
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
                          
                          <span className={`text-xs font-bold font-mono px-2 py-0.5 bg-white border rounded-full text-slate-700 ${borderClass}`}>
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
                      Top 5 Estrelas (Atingimento da Cota)
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
                              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Coordenadoria: {rep.coordName}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-extrabold text-emerald-600 block">{formatPercent(rep.pctTotal)}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Fat: {formatCurrency(rep.totalFaturado)}</span>
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
                      Intervenção Crítica: Maior Defasagem (R$)
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
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Coordenadoria: {rep.coordName}</p>
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
          {activeTab === 'representantes' && (
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
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Faturado CD / VP</span>
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

          {/* TAB 3: COORDINATORS LEAGUE BOARD */}
          {activeTab === 'coordenadores' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm"
            >
              <div>
                <h3 className="font-bold text-slate-900 text-base">Liga de Coordenadores</h3>
                <p className="text-xs text-slate-400 mt-0.5">Indicadores sintetizados por equipe com volume de representantes ativos.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4 font-semibold">Coordenadoria</th>
                      <th className="py-3 px-2 font-semibold text-center">Nº Reps</th>
                      <th className="py-3 px-2 font-semibold text-right">Cota Global</th>
                      <th className="py-3 px-2 font-semibold text-right">Faturado CD/VP</th>
                      <th className="py-3 px-2 font-semibold text-right">Defasagem</th>
                      <th className="py-3 px-2 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coordinatorPerformance.map(coord => {
                      const achRate = coord.percent;
                      const progressColor = achRate >= 100 
                        ? 'bg-emerald-500' 
                        : achRate >= 75 
                        ? 'bg-amber-500' 
                        : 'bg-rose-500';

                      const textProgressColor = achRate >= 100 
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                        : achRate >= 75 
                        ? 'text-amber-700 bg-amber-50 border-amber-100' 
                        : 'text-rose-700 bg-rose-50 border-rose-100';

                      return (
                        <tr key={coord.name} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors font-medium">
                          <td className="py-4 px-4 font-bold text-slate-800 text-sm">{coord.name}</td>
                          <td className="py-4 px-2 text-center text-slate-700">{coord.repsCount}</td>
                          <td className="py-4 px-2 text-right font-mono font-semibold text-slate-600">{formatCurrency(coord.quota)}</td>
                          <td className="py-4 px-2 text-right font-mono font-bold text-slate-900">{formatCurrency(coord.faturado)}</td>
                          <td className={`py-4 px-2 text-right font-mono font-bold ${coord.defasagem >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {formatCurrency(coord.defasagem)}
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase font-extrabold leading-normal ${textProgressColor}`}>
                              {formatPercent(coord.percent)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedCoordinator(coord.name);
                                setActiveTab('geral');
                              }}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              Filtro Rápido
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {coordinatorPerformance.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">Nenhum coordenador correspondente.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 4: PRISTINE FILTERABLE TABLE DATA EXPLORER */}
          {activeTab === 'detalhado' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                
                {/* Header row in explorer */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Registros de Faturamento Detalhados</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Mostrando {sortedDetails.length} linhas filtradas. Clique nos cabeçalhos para ordenar.</p>
                  </div>
                  
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-1.5 self-start md:self-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar Filtro Ativo (.CSV)
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
                        <th className="py-3 px-1 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleSort('emp')}>
                          <span className="flex items-center gap-1">Filial <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-2 cursor-pointer hover:bg-slate-50 transition-colors hidden md:table-cell" onClick={() => toggleSort('linha')}>
                          <span className="flex items-center gap-1">Linha <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('quotaTotal')}>
                          <span className="flex items-center gap-1 justify-end">Cota Planejada <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('faturadoTotal')}>
                          <span className="flex items-center gap-1 justify-end">Faturado <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('pctTotal')}>
                          <span className="flex items-center gap-1 justify-end">% Ating. <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => toggleSort('defasagem')}>
                          <span className="flex items-center gap-1 justify-end">Defasagem <ArrowUpDown className="w-3 h-3 text-slate-400" /></span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentDetailsPageData.map((row) => {
                        const rowRate = row.quotaTotal > 0 ? (row.faturadoTotal / row.quotaTotal) * 100 : 0;
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
                            <td className="py-3 px-1"><span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-extrabold font-mono text-[10px] uppercase">{row.emp}</span></td>
                            <td className="py-3 px-2 text-slate-500 hidden md:table-cell">{row.linha}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600">{formatCurrency(row.quotaTotal)}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-800">{formatCurrency(row.faturadoTotal)}</td>
                            <td className={`py-3 px-3 text-right font-mono ${rowRateColor}`}>
                              {formatPercent(rowRate)}
                            </td>
                            <td className={`py-3 px-3 text-right font-mono font-bold ${row.defasagem >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                              {formatCurrency(row.defasagem)}
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

          {/* TAB 5: IMPORT/COULD EXCEL SHEET INTERACTIVE PASTE */}
          {activeTab === 'importar' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ImportDataTab 
                currentRecordsCount={allRecords.length}
                onDataImported={(records) => {
                  setAllRecords(records);
                  setActiveTab('geral');
                  resetFilters();
                  setCurrentPage(1);
                }}
              />
            </motion.div>
          )}

        </section>

      </main>

      {/* Floating detail status notice */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 mt-12 text-center text-xs text-slate-400 font-medium space-y-1">
        <p>© 2026 Tramontina S/A. Todos os direitos reservados. Sistema interno de auditoria e performance de representantes.</p>
        <p className="text-slate-350">
          Projetado com tipografia pairing Plus Jakarta Sans & JetBrains Mono • Dados dinâmicos auto-indexados via React 19.
        </p>
      </footer>
    </div>
  );
}

