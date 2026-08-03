import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Boxes,
  Target,
  TrendingUp,
  Check,
  ShieldAlert,
  ArrowLeft,
  Download,
  Search,
  Users,
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  PackageX,
  AlertTriangle,
  UploadCloud,
  Layers
} from 'lucide-react';
import { PhysicalQuotaRecord } from '../types';
import { isAllowedPhysicalQuotaGroup } from '../rawData';

interface PhysicalQuotaViewProps {
  records: PhysicalQuotaRecord[];
  allRecordsCount: number;
  selectedYear: number;
  selectedMonth: number;
  isAccumulated: boolean;
  accumulateStartMonth: number;
  accumulateEndMonth: number;
  selectedCoordinator: string;
  setSelectedCoordinator: (coord: string) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  progressThreshold: string;
  setProgressThreshold: (val: string) => void;
  distinctCoordinators: string[];
  customRepNames?: Record<string, string>;
  onExitMode: () => void;
  onGoToImport?: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const PhysicalQuotaView: React.FC<PhysicalQuotaViewProps> = ({
  records,
  allRecordsCount,
  selectedYear,
  selectedMonth,
  isAccumulated,
  accumulateStartMonth,
  accumulateEndMonth,
  selectedCoordinator,
  setSelectedCoordinator,
  searchText,
  setSearchText,
  progressThreshold,
  setProgressThreshold,
  distinctCoordinators,
  customRepNames = {},
  onExitMode,
  onGoToImport
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const [selectedProductGroup, setSelectedProductGroup] = useState<string>('All');
  const [expandedRepId, setExpandedRepId] = useState<number | null>(null);

  // Apply priority representative names from "Importar nomes" and filter allowed groups
  const mappedRecords = useMemo(() => {
    return records
      .filter(r => isAllowedPhysicalQuotaGroup(r.groupName))
      .map(r => {
        const customName = customRepNames[r.repId.toString().trim()] || customRepNames[r.repId];
        return {
          ...r,
          repName: customName || r.repName
        };
      });
  }, [records, customRepNames]);

  // Compute Period Label
  const periodLabel = useMemo(() => {
    if (isAccumulated) {
      const startName = SHORT_MONTH_NAMES[Math.min(accumulateStartMonth, accumulateEndMonth) - 1];
      const endName = SHORT_MONTH_NAMES[Math.max(accumulateStartMonth, accumulateEndMonth) - 1];
      return `Acumulado (${startName} a ${endName} / ${selectedYear})`;
    }
    return `${MONTH_NAMES[selectedMonth - 1]} / ${selectedYear}`;
  }, [selectedYear, selectedMonth, isAccumulated, accumulateStartMonth, accumulateEndMonth]);

  // Extract distinct product groups present in records
  const distinctGroups = useMemo(() => {
    const set = new Set<string>();
    mappedRecords.forEach(r => {
      if (r.groupName) set.add(r.groupName);
    });
    return Array.from(set).sort();
  }, [mappedRecords]);

  // Product Groups Global Breakdown Summary
  const productGroupSummaries = useMemo(() => {
    const map = new Map<string, { groupName: string; cota: number; venda: number; repsWithSales: number; totalReps: number }>();

    mappedRecords.forEach(r => {
      const group = r.groupName || 'Ferramentas Geral';
      const curr = map.get(group) || { groupName: group, cota: 0, venda: 0, repsWithSales: 0, totalReps: 0 };
      curr.cota += r.cotaFisica || 0;
      curr.venda += r.vendaFisica || 0;
      curr.totalReps += 1;
      if ((r.vendaFisica || 0) > 0) curr.repsWithSales += 1;
      map.set(group, curr);
    });

    return Array.from(map.values()).map(item => {
      const pct = item.cota > 0 ? (item.venda / item.cota) * 100 : 0;
      const defasagem = item.venda - item.cota;
      let status: 'achieved' | 'selling' | 'nosales' = 'selling';
      if (item.venda === 0 && item.cota > 0) status = 'nosales';
      else if (pct >= 100) status = 'achieved';

      return {
        ...item,
        pct,
        defasagem,
        status
      };
    }).sort((a, b) => b.cota - a.cota);
  }, [mappedRecords]);

  // Aggregate records by Representative for clean display
  const repAggregations = useMemo(() => {
    let filtered = mappedRecords.filter(r => {
      // Filter by coordinator
      if (selectedCoordinator !== 'All') {
        const matchCoord = (r.coordName || '').toLowerCase().includes(selectedCoordinator.toLowerCase().trim().split(' ')[0]);
        if (!matchCoord) return false;
      }

      // Filter by search text
      if (searchText.trim()) {
        const clean = searchText.toLowerCase().trim();
        const matchesName = (r.repName || '').toLowerCase().includes(clean);
        const matchesId = (r.repId || '').toString().includes(clean);
        const matchesGroup = (r.groupName || '').toLowerCase().includes(clean);
        if (!matchesName && !matchesId && !matchesGroup) return false;
      }

      // Filter by Product Group
      if (selectedProductGroup !== 'All') {
        if ((r.groupName || 'Ferramentas Geral') !== selectedProductGroup) return false;
      }

      return true;
    });

    // Group items by Representative ID
    const repMap = new Map<number, {
      repId: number;
      repName: string;
      coordName: string;
      totalCota: number;
      totalVenda: number;
      groups: Array<{ groupName: string; cota: number; venda: number; pct: number; isSelling: boolean }>;
    }>();

    filtered.forEach(r => {
      const existing = repMap.get(r.repId);
      const groupItem = {
        groupName: r.groupName || 'Ferramentas Geral',
        cota: r.cotaFisica || 0,
        venda: r.vendaFisica || 0,
        pct: r.cotaFisica > 0 ? ((r.vendaFisica || 0) / r.cotaFisica) * 100 : 0,
        isSelling: (r.vendaFisica || 0) > 0
      };

      if (existing) {
        existing.totalCota += r.cotaFisica || 0;
        existing.totalVenda += r.vendaFisica || 0;
        existing.groups.push(groupItem);
      } else {
        repMap.set(r.repId, {
          repId: r.repId,
          repName: r.repName,
          coordName: r.coordName || 'Juan Almeida',
          totalCota: r.cotaFisica || 0,
          totalVenda: r.vendaFisica || 0,
          groups: [groupItem]
        });
      }
    });

    let list = Array.from(repMap.values()).map(rep => {
      const pct = rep.totalCota > 0 ? (rep.totalVenda / rep.totalCota) * 100 : 0;
      const defasagem = rep.totalVenda - rep.totalCota;
      const groupsSellingCount = rep.groups.filter(g => g.isSelling).length;
      const groupsTotalCount = rep.groups.length;

      return {
        ...rep,
        pct,
        defasagem,
        groupsSellingCount,
        groupsTotalCount
      };
    });

    // Filter by progress threshold
    if (progressThreshold === '100+') {
      list = list.filter(r => r.pct >= 100);
    } else if (progressThreshold === '75-99') {
      list = list.filter(r => r.pct >= 75 && r.pct < 100);
    } else if (progressThreshold === 'under-75') {
      list = list.filter(r => r.pct < 75);
    }

    // Sort by % Atingimento descending
    return list.sort((a, b) => b.pct - a.pct);
  }, [mappedRecords, selectedCoordinator, searchText, selectedProductGroup, progressThreshold]);

  // Overall KPIs
  const kpis = useMemo(() => {
    let totalCota = 0;
    let totalVenda = 0;
    let repsOnTarget = 0;

    repAggregations.forEach(r => {
      totalCota += r.totalCota;
      totalVenda += r.totalVenda;
      if (r.pct >= 100) repsOnTarget++;
    });

    const totalDefasagem = totalVenda - totalCota;
    const totalPct = totalCota > 0 ? (totalVenda / totalCota) * 100 : 0;

    return {
      totalCota,
      totalVenda,
      totalDefasagem,
      totalPct,
      repsOnTarget,
      repsTotal: repAggregations.length
    };
  }, [repAggregations]);

  // Pagination
  const totalPages = Math.ceil(repAggregations.length / itemsPerPage) || 1;
  const paginatedReps = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return repAggregations.slice(start, start + itemsPerPage);
  }, [repAggregations, currentPage]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Código Rep',
      'Representante',
      'Coordenador',
      'Grupo de Produtos',
      'Cota Física (un)',
      'Venda Total (un)',
      'Defasagem Física (un)',
      '% Atingimento',
      'Status Venda'
    ];

    const rows = mappedRecords.map(r => [
      r.repId,
      `"${r.repName}"`,
      `"${r.coordName}"`,
      `"${r.groupName || 'Ferramentas Geral'}"`,
      r.cotaFisica,
      r.vendaFisica,
      r.defasagemFisica,
      `${r.pctFisica.toFixed(2)}%`,
      r.vendaFisica > 0 ? 'Vendido' : 'Sem Venda'
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cotas_Fisicas_Ferramentas_${selectedYear}_M${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EMPTY STATE IF NO PHYSICAL QUOTAS IN PERIOD
  if (mappedRecords.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto my-8">
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={onExitMode}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para Vendas em R$</span>
              </button>
              <h2 className="text-xl sm:text-2xl font-black">Análise de Cotas Físicas de Ferramentas</h2>
              <p className="text-xs text-purple-200">Período Selecionado: <strong>{periodLabel}</strong></p>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-slate-200 p-8 sm:p-12 rounded-2xl shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center text-purple-700 mx-auto">
            <Boxes className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800">Sem Cotas Físicas para {periodLabel}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Não foram encontradas tabelas de cotas físicas de produtos para este período. Para visualizar as metas físicas por representante e grupo de produtos, importe a planilha em <strong>Importar Cotas Físicas</strong>.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
            {onGoToImport && (
              <button
                type="button"
                onClick={onGoToImport}
                className="w-full sm:w-auto px-6 py-2.5 bg-purple-900 hover:bg-purple-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Importar Cotas Físicas ({selectedMonth}/{selectedYear})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExitMode}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              Voltar ao Dashboard de Vendas
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExitMode}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para Vendas (R$)</span>
              </button>
              <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                Exclusivo Ferramentas
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2.5 pt-1">
              <Boxes className="w-6 h-6 text-purple-300" />
              <span>Análise de Cotas Físicas por Grupo de Produtos</span>
            </h2>
            <p className="text-xs text-purple-200 font-medium">
              Período Selecionado: <strong className="text-white font-bold">{periodLabel}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onGoToImport && (
              <button
                type="button"
                onClick={onGoToImport}
                className="px-3 py-2 bg-purple-800/80 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-purple-600/50"
              >
                <UploadCloud className="w-4 h-4 text-purple-300" />
                <span>Importar Planilha</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white text-purple-900 hover:bg-purple-50 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-purple-700" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Cota Física Total */}
        <div className="bg-white border border-purple-100 p-4 rounded-2xl shadow-3xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-purple-900/60 uppercase tracking-wider block">Cota Física Total</span>
            <Boxes className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {kpis.totalCota.toLocaleString('pt-BR')} <span className="text-xs font-sans text-slate-500 font-semibold">un</span>
          </p>
          <span className="text-[10px] text-slate-400 font-bold block">Meta em peças</span>
        </div>

        {/* Card 2: Vendas Realizadas */}
        <div className="bg-white border border-blue-100 p-4 rounded-2xl shadow-3xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-blue-900/60 uppercase tracking-wider block">Venda Total</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {kpis.totalVenda.toLocaleString('pt-BR')} <span className="text-xs font-sans text-slate-500 font-semibold">un</span>
          </p>
          <span className="text-[10px] text-blue-600 font-bold block">Faturado e Pendente</span>
        </div>

        {/* Card 3: % Atingimento */}
        <div className="bg-white border border-purple-100 p-4 rounded-2xl shadow-3xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-purple-900/60 uppercase tracking-wider block">% Atingimento</span>
            <Target className="w-4 h-4 text-purple-600" />
          </div>
          <p className={`text-lg sm:text-xl font-black font-mono ${kpis.totalPct >= 100 ? 'text-emerald-600' : 'text-purple-900'}`}>
            {kpis.totalPct.toFixed(1)}%
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all ${kpis.totalPct >= 100 ? 'bg-emerald-500' : 'bg-purple-600'}`}
              style={{ width: `${Math.min(kpis.totalPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 4: Defasagem Física */}
        <div className={`p-4 rounded-2xl border shadow-3xs space-y-1 ${kpis.totalDefasagem >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${kpis.totalDefasagem >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
              Defasagem Total
            </span>
            {kpis.totalDefasagem >= 0 ? <Check className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
          </div>
          <p className={`text-lg sm:text-xl font-black font-mono ${kpis.totalDefasagem >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {kpis.totalDefasagem >= 0 ? `+${kpis.totalDefasagem.toLocaleString('pt-BR')}` : kpis.totalDefasagem.toLocaleString('pt-BR')} <span className="text-xs font-sans font-semibold">un</span>
          </p>
          <span className="text-[10px] font-bold block opacity-75">
            {kpis.totalDefasagem >= 0 ? 'Superávit físico' : 'Diferença para meta'}
          </span>
        </div>

        {/* Card 5: Reps na Meta */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Reps em Meta (100%+)</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {kpis.repsOnTarget} <span className="text-xs font-sans text-slate-400 font-medium">/ {kpis.repsTotal} reps</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-bold block">
            {kpis.repsTotal > 0 ? `${((kpis.repsOnTarget / kpis.repsTotal) * 100).toFixed(0)}% da equipe` : '0%'}
          </span>
        </div>

        {/* Card 6: Grupos Cadastrados */}
        <div className="bg-white border border-purple-100 p-4 rounded-2xl shadow-3xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-purple-900/60 uppercase tracking-wider block">Grupos / Linhas</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {productGroupSummaries.length} <span className="text-xs font-sans text-slate-500 font-semibold">famílias</span>
          </p>
          <span className="text-[10px] text-purple-700 font-extrabold block">
            Linhas analisadas
          </span>
        </div>
      </div>

      {/* SECTION: PRODUCT GROUPS HIGHLIGHT (QUAL PRODUTO ESTÁ SENDO VENDIDO E QUAL NÃO ESTÁ) */}
      <div className="bg-white border border-purple-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-purple-100 pb-3">
          <h3 className="text-sm font-black text-purple-950 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-purple-700" />
            <span>Resumo por Grupo de Produtos (O que está vendendo e o que não está)</span>
          </h3>
          <span className="text-xs font-bold text-slate-500">
            Clique num grupo para filtrar representantes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {productGroupSummaries.map((grp) => {
            const isSelected = selectedProductGroup === grp.groupName;
            const isNoSales = grp.status === 'nosales';
            const isAchieved = grp.status === 'achieved';

            return (
              <div
                key={grp.groupName}
                onClick={() => setSelectedProductGroup(isSelected ? 'All' : grp.groupName)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 relative ${
                  isSelected 
                    ? 'ring-2 ring-purple-600 bg-purple-50/80 border-purple-300 shadow-sm' 
                    : isNoSales 
                    ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300' 
                    : isAchieved 
                    ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300' 
                    : 'bg-slate-50/80 border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-extrabold text-xs text-slate-900 truncate" title={grp.groupName}>
                    {grp.groupName}
                  </span>

                  {isNoSales ? (
                    <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shrink-0">
                      <PackageX className="w-3 h-3 text-rose-600" />
                      Sem Vendas
                    </span>
                  ) : isAchieved ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shrink-0">
                      <PackageCheck className="w-3 h-3 text-emerald-600" />
                      Meta 100%+
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shrink-0">
                      Em Venda
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Cota (un)</span>
                    <span className="font-mono font-bold text-slate-800">{grp.cota.toLocaleString('pt-BR')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Venda (un)</span>
                    <span className={`font-mono font-black ${isNoSales ? 'text-rose-600' : 'text-slate-900'}`}>
                      {grp.venda.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-slate-200/60 text-[11px]">
                  <span className="text-slate-500 font-medium">
                    {grp.repsWithSales} de {grp.totalReps} reps venderam
                  </span>
                  <span className={`font-mono font-black ${isAchieved ? 'text-emerald-600' : isNoSales ? 'text-rose-600' : 'text-purple-700'}`}>
                    {grp.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por representante ou código..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-800 text-xs placeholder-slate-400 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filter by Product Group */}
            <select
              value={selectedProductGroup}
              onChange={(e) => {
                setSelectedProductGroup(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-purple-900 focus:outline-none focus:border-purple-600"
            >
              <option value="All">Todos os Grupos de Produtos</option>
              {distinctGroups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Filter by Coordinator */}
            <select
              value={selectedCoordinator}
              onChange={(e) => {
                setSelectedCoordinator(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-600"
            >
              <option value="All">Todos os Coordenadores</option>
              {distinctCoordinators.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={progressThreshold}
              onChange={(e) => {
                setProgressThreshold(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-600"
            >
              <option value="All">Todos os Status</option>
              <option value="100+">Meta 100%+</option>
              <option value="75-99">75% a 99%</option>
              <option value="under-75">Abaixo de 75%</option>
            </select>
          </div>
        </div>
      </div>

      {/* REPRESENTATIVES REORGANIZED TABLE WITH EXPANDABLE GROUP BREAKDOWN */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-150 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-700" />
              <span>Desempenho por Representante e Grupos de Produtos</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Exibindo {repAggregations.length} representante(s). Clique no representante para ver detalhes de cada grupo de produtos.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Cód. / Representante</th>
                <th className="py-3 px-4">Coordenador</th>
                <th className="py-3 px-4">Grupos Vendendo</th>
                <th className="py-3 px-4 text-right">Cota Física (un)</th>
                <th className="py-3 px-4 text-right">Venda Total (un)</th>
                <th className="py-3 px-4 text-right">Defasagem (un)</th>
                <th className="py-3 px-4 text-right">% Atingimento</th>
                <th className="py-3 px-4 text-center">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedReps.map((rep) => {
                const isAchieved = rep.pct >= 100;
                const isWarning = rep.pct >= 75 && rep.pct < 100;
                const isExpanded = expandedRepId === rep.repId;

                return (
                  <React.Fragment key={rep.repId}>
                    <tr 
                      onClick={() => setExpandedRepId(isExpanded ? null : rep.repId)}
                      className={`hover:bg-purple-50/40 transition-colors cursor-pointer ${isExpanded ? 'bg-purple-50/60' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            #{rep.repId}
                          </span>
                          <span className="font-bold text-slate-900 truncate max-w-[220px]" title={rep.repName}>
                            {rep.repName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {rep.coordName}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${rep.groupsSellingCount === rep.groupsTotalCount ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : rep.groupsSellingCount > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                            {rep.groupsSellingCount} / {rep.groupsTotalCount} grupos com venda
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                        {rep.totalCota.toLocaleString('pt-BR')}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                        {rep.totalVenda.toLocaleString('pt-BR')}
                      </td>

                      <td className={`py-3 px-4 text-right font-mono font-bold ${rep.defasagem >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {rep.defasagem >= 0 ? `+${rep.defasagem.toLocaleString('pt-BR')}` : rep.defasagem.toLocaleString('pt-BR')}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full rounded-full ${isAchieved ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(rep.pct, 100)}%` }}
                            />
                          </div>
                          <span className={`font-mono font-extrabold ${isAchieved ? 'text-emerald-600' : isWarning ? 'text-amber-600' : 'text-rose-600'}`}>
                            {rep.pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          className="p-1 text-slate-400 hover:text-purple-700 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED GROUP BREAKDOWN ROW FOR THIS REPRESENTATIVE */}
                    {isExpanded && (
                      <tr className="bg-purple-50/30">
                        <td colSpan={8} className="p-4 border-y border-purple-100">
                          <div className="bg-white border border-purple-200 rounded-xl p-4 space-y-3 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                                <Boxes className="w-4 h-4 text-purple-700" />
                                Detalhamento dos Grupos de Produtos — {rep.repName} (#{rep.repId})
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Coordenador: <strong>{rep.coordName}</strong>
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {rep.groups.map((grp, gIdx) => (
                                <div
                                  key={gIdx}
                                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${grp.isSelling ? 'bg-slate-50/90 border-slate-200' : 'bg-rose-50/60 border-rose-200'}`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-slate-900">{grp.groupName}</span>
                                    {grp.isSelling ? (
                                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        Vendendo
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <PackageX className="w-3 h-3 text-rose-600" />
                                        Sem Venda
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex justify-between items-center font-mono text-[11px] pt-1">
                                    <span className="text-slate-500">Cota: <strong>{grp.cota.toLocaleString('pt-BR')} un</strong></span>
                                    <span className={`font-bold ${grp.isSelling ? 'text-slate-900' : 'text-rose-600'}`}>
                                      Venda: <strong>{grp.venda.toLocaleString('pt-BR')} un</strong>
                                    </span>
                                  </div>

                                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${grp.pct >= 100 ? 'bg-emerald-500' : grp.isSelling ? 'bg-purple-600' : 'bg-rose-500'}`}
                                      style={{ width: `${Math.min(grp.pct, 100)}%` }}
                                    />
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

              {paginatedReps.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum representante encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-150 flex items-center justify-between text-xs text-slate-500">
            <span>
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg font-bold text-slate-700 transition-all cursor-pointer"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg font-bold text-slate-700 transition-all cursor-pointer"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
