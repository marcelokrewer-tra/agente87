import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Boxes,
  Target,
  TrendingUp,
  Check,
  ShieldAlert,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Search,
  Users,
  Award,
  Filter,
  BarChart3
} from 'lucide-react';
import { PhysicalQuotaRecord } from '../types';

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
  onExitMode: () => void;
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
  onExitMode
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  const [sortField, setSortField] = useState<keyof PhysicalQuotaRecord>('pctFisica');
  const [sortAscending, setSortAscending] = useState<boolean>(false);

  // Compute Period Label
  const periodLabel = useMemo(() => {
    if (isAccumulated) {
      const startName = SHORT_MONTH_NAMES[Math.min(accumulateStartMonth, accumulateEndMonth) - 1];
      const endName = SHORT_MONTH_NAMES[Math.max(accumulateStartMonth, accumulateEndMonth) - 1];
      return `Acumulado (${startName} a ${endName} / ${selectedYear})`;
    }
    return `${MONTH_NAMES[selectedMonth - 1]} / ${selectedYear}`;
  }, [selectedYear, selectedMonth, isAccumulated, accumulateStartMonth, accumulateEndMonth]);

  // Compute Overall KPIs
  const kpis = useMemo(() => {
    let totalCota = 0;
    let totalVenda = 0;
    let repsOnTarget = 0;

    records.forEach(r => {
      totalCota += r.cotaFisica || 0;
      totalVenda += r.vendaFisica || 0;
      if (r.pctFisica >= 100) repsOnTarget++;
    });

    const totalDefasagem = totalVenda - totalCota;
    const totalPct = totalCota > 0 ? (totalVenda / totalCota) * 100 : 0;
    const repsTotal = records.length;

    // Coordinator performance
    const coordMap = new Map<string, { cota: number; venda: number }>();
    records.forEach(r => {
      const cName = r.coordName || 'Outros';
      const curr = coordMap.get(cName) || { cota: 0, venda: 0 };
      curr.cota += r.cotaFisica || 0;
      curr.venda += r.vendaFisica || 0;
      coordMap.set(cName, curr);
    });

    let topCoordName = '-';
    let topCoordPct = 0;
    coordMap.forEach((val, name) => {
      const pct = val.cota > 0 ? (val.venda / val.cota) * 100 : 0;
      if (pct > topCoordPct) {
        topCoordPct = pct;
        topCoordName = name;
      }
    });

    return {
      totalCota,
      totalVenda,
      totalDefasagem,
      totalPct,
      repsOnTarget,
      repsTotal,
      topCoordName,
      topCoordPct
    };
  }, [records]);

  // Filtered and Sorted list of records
  const processedRecords = useMemo(() => {
    let filtered = records.filter(r => {
      if (selectedCoordinator !== 'All') {
        const matchCoord = (r.coordName || '').toLowerCase().includes(selectedCoordinator.toLowerCase().trim().split(' ')[0]);
        if (!matchCoord) return false;
      }

      if (searchText.trim()) {
        const clean = searchText.toLowerCase().trim();
        const matchesName = (r.repName || '').toLowerCase().includes(clean);
        const matchesId = (r.repId || '').toString().includes(clean);
        if (!matchesName && !matchesId) return false;
      }

      if (progressThreshold === '100+') {
        if (r.pctFisica < 100) return false;
      } else if (progressThreshold === '75-99') {
        if (r.pctFisica < 75 || r.pctFisica >= 100) return false;
      } else if (progressThreshold === 'under-75') {
        if (r.pctFisica >= 75) return false;
      }

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      let valA = a[sortField] ?? 0;
      let valB = b[sortField] ?? 0;

      if (typeof valA === 'string') {
        valA = (valA as string).toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return sortAscending ? -1 : 1;
      if (valA > valB) return sortAscending ? 1 : -1;
      return 0;
    });
  }, [records, selectedCoordinator, searchText, progressThreshold, sortField, sortAscending]);

  // Pagination
  const totalPages = Math.ceil(processedRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedRecords.slice(start, start + itemsPerPage);
  }, [processedRecords, currentPage]);

  const handleSort = (field: keyof PhysicalQuotaRecord) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Código Rep',
      'Representante',
      'Coordenador',
      'Ano',
      'Mês',
      'Cota Física (Ferramentas)',
      'Venda Física Realizada',
      'Defasagem Física',
      '% Atingimento'
    ];

    const rows = processedRecords.map(r => [
      r.repId,
      `"${r.repName}"`,
      `"${r.coordName}"`,
      r.year,
      r.month,
      r.cotaFisica,
      r.vendaFisica,
      r.defasagemFisica,
      `${r.pctFisica.toFixed(2)}%`
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExitMode}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Voltar para análise de vendas em R$"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para Vendas (R$)</span>
              </button>
              <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                Somente Linha Ferramentas
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2.5 pt-1">
              <Boxes className="w-6 h-6 text-purple-300" />
              <span>Análise de Cotas Físicas de Produto</span>
            </h2>
            <p className="text-xs text-purple-200 font-medium">
              Período Ativo: <strong className="text-white font-bold">{periodLabel}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white text-purple-900 hover:bg-purple-50 active:bg-purple-100 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-purple-700" />
              <span>Exportar Excel (CSV)</span>
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
          <span className="text-[10px] text-slate-400 font-bold block">Meta em unidades</span>
        </div>

        {/* Card 2: Vendas Realizadas */}
        <div className="bg-white border border-blue-100 p-4 rounded-2xl shadow-3xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-blue-900/60 uppercase tracking-wider block">Venda Física</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {kpis.totalVenda.toLocaleString('pt-BR')} <span className="text-xs font-sans text-slate-500 font-semibold">un</span>
          </p>
          <span className="text-[10px] text-blue-600 font-bold block">Realizado no período</span>
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
              Defasagem
            </span>
            {kpis.totalDefasagem >= 0 ? <Check className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
          </div>
          <p className={`text-lg sm:text-xl font-black font-mono ${kpis.totalDefasagem >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {kpis.totalDefasagem >= 0 ? `+${kpis.totalDefasagem.toLocaleString('pt-BR')}` : kpis.totalDefasagem.toLocaleString('pt-BR')} <span className="text-xs font-sans font-semibold">un</span>
          </p>
          <span className="text-[10px] font-bold block opacity-75">
            {kpis.totalDefasagem >= 0 ? 'Superávit em unidades' : 'Diferença para a cota'}
          </span>
        </div>

        {/* Card 5: Reps na Meta */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Reps na Meta (100%+)</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {kpis.repsOnTarget} <span className="text-xs font-sans text-slate-400 font-medium">/ {kpis.repsTotal} reps</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-bold block">
            {kpis.repsTotal > 0 ? `${((kpis.repsOnTarget / kpis.repsTotal) * 100).toFixed(0)}% da equipe` : '0%'}
          </span>
        </div>

        {/* Card 6: Top Coordenador */}
        <div className="bg-white border border-purple-100 p-4 rounded-2xl shadow-3xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-purple-900/60 uppercase tracking-wider block">Top Coordenador</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-sm font-black text-slate-900 truncate" title={kpis.topCoordName}>
            {kpis.topCoordName}
          </p>
          <span className="text-[10px] text-purple-700 font-extrabold block">
            {kpis.topCoordPct.toFixed(1)}% de cota física
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH BAR FOR TABLE */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar representante por nome ou código..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-800 text-xs placeholder-slate-400 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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

            {/* Filter by Progress */}
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

      {/* REPRESENTATIVES PHYSICAL QUOTA TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-150 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-700" />
              <span>Desempenho Individual de Cotas Físicas</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Listando {processedRecords.length} representante(s)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('repId')}>
                  Cód. / Rep
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('coordName')}>
                  Coordenador
                </th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSort('cotaFisica')}>
                  Cota Física (un)
                </th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSort('vendaFisica')}>
                  Venda Física (un)
                </th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSort('defasagemFisica')}>
                  Defasagem (un)
                </th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSort('pctFisica')}>
                  % Atingimento
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedRecords.map((r, idx) => {
                const isAchieved = r.pctFisica >= 100;
                const isWarning = r.pctFisica >= 75 && r.pctFisica < 100;

                return (
                  <tr key={`${r.repId}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          #{r.repId}
                        </span>
                        <span className="font-bold text-slate-800 truncate max-w-[200px]" title={r.repName}>
                          {r.repName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {r.coordName || '-'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                      {r.cotaFisica.toLocaleString('pt-BR')}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                      {r.vendaFisica.toLocaleString('pt-BR')}
                    </td>

                    <td className={`py-3 px-4 text-right font-mono font-bold ${r.defasagemFisica >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {r.defasagemFisica >= 0 ? `+${r.defasagemFisica.toLocaleString('pt-BR')}` : r.defasagemFisica.toLocaleString('pt-BR')}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${isAchieved ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(r.pctFisica, 100)}%` }}
                          />
                        </div>
                        <span className={`font-mono font-extrabold ${isAchieved ? 'text-emerald-600' : isWarning ? 'text-amber-600' : 'text-rose-600'}`}>
                          {r.pctFisica.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum registro de cota física encontrado para os filtros selecionados.
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
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition-all cursor-pointer"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition-all cursor-pointer"
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
