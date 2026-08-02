import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { SalesRecord, PhysicalQuotaRecord } from '../types';
import { parseTSV, INITIAL_RAW_DATA, parsePhysicalQuotaTSV, generateDefaultPhysicalQuotas } from '../rawData';
import {
  saveLocalPeriod,
  deleteLocalPeriod,
  getLocalPeriodsIndex,
  saveLocalPhysicalQuotaPeriod,
  deleteLocalPhysicalQuotaPeriod,
  getLocalPhysicalQuotaPeriodsIndex
} from '../lib/storage';
import {
  getFirebaseConfig,
  savePeriodToFirestore,
  deletePeriodFromFirestore
} from '../lib/firebase';
import { logAnalyticsEvent } from '../lib/analytics';
import { 
  FileSpreadsheet, 
  Upload, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  Database, 
  RefreshCw, 
  Trash2,
  Layers,
  TrendingUp,
  Target,
  Download,
  Boxes
} from 'lucide-react';

interface ImportDataTabProps {
  onDataSaved: (year: number, month: number, records: SalesRecord[]) => void;
  onPhysicalQuotaDataSaved?: (year: number, month: number, records: PhysicalQuotaRecord[]) => void;
  currentRecordsCount: number;
  initialYear: number;
  initialMonth: number;
  availablePeriods: Array<{ id: string; year: number; month: number; recordsCount: number; updatedAt?: string }>;
  availablePhysicalQuotaPeriods?: Array<{ id: string; year: number; month: number; recordsCount: number; updatedAt?: string }>;
  onRefreshPeriods: () => void;
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

export const ImportDataTab: React.FC<ImportDataTabProps> = ({
  onDataSaved,
  onPhysicalQuotaDataSaved,
  currentRecordsCount,
  initialYear,
  initialMonth,
  availablePeriods,
  availablePhysicalQuotaPeriods = [],
  onRefreshPeriods
}) => {
  const [importMode, setImportMode] = useState<'sales' | 'physical'>('sales');
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  
  // Sales state
  const [tsvText, setTsvText] = useState('');
  const [parsedRecords, setParsedRecords] = useState<SalesRecord[]>([]);

  // Physical Quotas state
  const [physicalTsvText, setPhysicalTsvText] = useState('');
  const [parsedPhysicalRecords, setParsedPhysicalRecords] = useState<PhysicalQuotaRecord[]>([]);
  
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if selected period already has data
  const currentPeriodId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const existingPeriodInfo = importMode === 'sales' 
    ? availablePeriods.find(p => p.id === currentPeriodId)
    : availablePhysicalQuotaPeriods.find(p => p.id === currentPeriodId);

  const handleParseSales = (textToParse: string) => {
    try {
      const records = parseTSV(textToParse);
      if (records.length === 0) {
        setErrorStatus("Nenhum registro de venda válido pôde ser extraído. Verifique o cabeçalho e as colunas.");
        setParsedRecords([]);
        return;
      }
      setParsedRecords(records);
      setErrorStatus(null);
      setSuccessStatus(`Planilha de vendas processada com sucesso! ${records.length} registros prontos para salvar.`);
      setTimeout(() => setSuccessStatus(null), 5000);
    } catch (err: any) {
      setErrorStatus(`Erro ao processar vendas: ${err.message || err}`);
      setParsedRecords([]);
    }
  };

  const handleParsePhysical = (textToParse: string) => {
    try {
      const records = parsePhysicalQuotaTSV(textToParse);
      if (records.length === 0) {
        setErrorStatus("Nenhum registro de cota física válido pôde ser extraído. Use colunas: Rep ID, Nome, Coordenador, Cota Física, Venda Física.");
        setParsedPhysicalRecords([]);
        return;
      }
      setParsedPhysicalRecords(records);
      setErrorStatus(null);
      setSuccessStatus(`Planilha de cotas físicas de Ferramentas processada com sucesso! ${records.length} representantes identificados.`);
      setTimeout(() => setSuccessStatus(null), 5000);
    } catch (err: any) {
      setErrorStatus(`Erro ao processar cotas físicas: ${err.message || err}`);
      setParsedPhysicalRecords([]);
    }
  };

  const generatePhysicalTemplateExcel = () => {
    const defaults = generateDefaultPhysicalQuotas(selectedYear, selectedMonth);
    const rows = defaults.map(d => ({
      'Código Rep': d.repId,
      'Nome do Representante': d.repName,
      'Coordenador': d.coordName,
      'Linha / Grupo': 'Ferramentas',
      'Cota Física (Unidades)': d.cotaFisica,
      'Realizado Físico (Venda Unidades)': d.vendaFisica
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cotas Físicas Ferramentas");
    XLSX.writeFile(wb, `Modelo_Cotas_Fisicas_Ferramentas_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const saveToDatabase = async () => {
    if (importMode === 'sales') {
      if (parsedRecords.length === 0) {
        setErrorStatus("Carregue ou cole os dados antes de salvar na memória.");
        return;
      }

      setIsSaving(true);
      setErrorStatus(null);
      setSuccessStatus(null);

      try {
        const res = await fetch("/api/monthly-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year: selectedYear,
            month: selectedMonth,
            records: parsedRecords,
          }),
        });

        if (res.ok) {
          saveLocalPeriod(selectedYear, selectedMonth, parsedRecords);
          onDataSaved(selectedYear, selectedMonth, parsedRecords);
          onRefreshPeriods();
          setSuccessStatus(`Sucesso! ${parsedRecords.length} registros de vendas do mês ${selectedMonth}/${selectedYear} foram salvos na memória do servidor.`);
          setTsvText('');
          setParsedRecords([]);
        } else {
          throw new Error("Falha ao responder da API do servidor");
        }
      } catch (err: any) {
        saveLocalPeriod(selectedYear, selectedMonth, parsedRecords);
        onDataSaved(selectedYear, selectedMonth, parsedRecords);
        onRefreshPeriods();
        setSuccessStatus(`Salvo localmente com sucesso (${parsedRecords.length} registros).`);
        setTsvText('');
        setParsedRecords([]);
      } finally {
        setIsSaving(false);
      }
    } else {
      // Physical Quota import mode
      if (parsedPhysicalRecords.length === 0) {
        setErrorStatus("Carregue ou cole os dados de cotas físicas antes de salvar.");
        return;
      }

      setIsSaving(true);
      setErrorStatus(null);
      setSuccessStatus(null);

      try {
        const res = await fetch("/api/physical-quotas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year: selectedYear,
            month: selectedMonth,
            records: parsedPhysicalRecords,
          }),
        });

        if (res.ok) {
          saveLocalPhysicalQuotaPeriod(selectedYear, selectedMonth, parsedPhysicalRecords);
          if (onPhysicalQuotaDataSaved) {
            onPhysicalQuotaDataSaved(selectedYear, selectedMonth, parsedPhysicalRecords);
          }
          onRefreshPeriods();
          setSuccessStatus(`Sucesso! ${parsedPhysicalRecords.length} cotas físicas de Ferramentas salvas para ${selectedMonth}/${selectedYear}.`);
          setPhysicalTsvText('');
          setParsedPhysicalRecords([]);
        } else {
          throw new Error("Falha na API de cotas físicas");
        }
      } catch (err: any) {
        saveLocalPhysicalQuotaPeriod(selectedYear, selectedMonth, parsedPhysicalRecords);
        if (onPhysicalQuotaDataSaved) {
          onPhysicalQuotaDataSaved(selectedYear, selectedMonth, parsedPhysicalRecords);
        }
        onRefreshPeriods();
        setSuccessStatus(`Cotas físicas salvas com sucesso no armazenamento local (${parsedPhysicalRecords.length} representantes).`);
        setPhysicalTsvText('');
        setParsedPhysicalRecords([]);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const deletePeriod = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente os dados de ${selectedMonth}/${selectedYear}?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorStatus(null);

    try {
      if (importMode === 'sales') {
        await fetch(`/api/monthly-data/${selectedYear}/${selectedMonth}`, { method: 'DELETE' });
        deleteLocalPeriod(selectedYear, selectedMonth);
        onDataSaved(selectedYear, selectedMonth, []);
      } else {
        await fetch(`/api/physical-quotas/${selectedYear}/${selectedMonth}`, { method: 'DELETE' });
        deleteLocalPhysicalQuotaPeriod(selectedYear, selectedMonth);
        if (onPhysicalQuotaDataSaved) {
          onPhysicalQuotaDataSaved(selectedYear, selectedMonth, []);
        }
      }
      onRefreshPeriods();
      setSuccessStatus(`Dados do mês ${selectedMonth}/${selectedYear} foram excluídos.`);
      setParsedRecords([]);
      setParsedPhysicalRecords([]);
    } catch (err: any) {
      setErrorStatus(`Erro ao excluir: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6 text-slate-700">
      {/* Selector of Import Type (Vendas vs Cotas Físicas) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setImportMode('sales');
            setErrorStatus(null);
            setSuccessStatus(null);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            importMode === 'sales'
              ? 'bg-[#001A9C] text-white shadow-md shadow-[#001A9C]/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Importar Vendas (Valores R$)
        </button>

        <button
          type="button"
          onClick={() => {
            setImportMode('physical');
            setErrorStatus(null);
            setSuccessStatus(null);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            importMode === 'physical'
              ? 'bg-purple-700 text-white shadow-md shadow-purple-700/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4 text-purple-200" />
          Importar Cotas Físicas (Linha Ferramentas)
        </button>
      </div>

      {/* Header Description */}
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-2xl ${importMode === 'sales' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
          {importMode === 'sales' ? <FileSpreadsheet className="w-6 h-6" /> : <Boxes className="w-6 h-6" />}
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-800">
            {importMode === 'sales' ? 'Importação de Dados de Vendas Monetárias' : 'Importação de Cotas Físicas (Somente Ferramentas)'}
          </h2>
          <p className="text-sm text-slate-500">
            {importMode === 'sales'
              ? 'Selecione o mês e ano para importar e atualizar os valores de metas e faturamento em Reais (R$).'
              : 'Importe as metas e vendas físicas em unidades/peças exclusivamente para os produtos da linha de Ferramentas.'}
          </p>
        </div>
      </div>

      {/* Target Period Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Calendar className={`w-4 h-4 ${importMode === 'sales' ? 'text-[#001A9C]' : 'text-purple-700'}`} />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Selecione o Mês e Ano de Destino {importMode === 'physical' && '(Sugestão do Mês Vigente Ativa)'}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Mês Referente</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(parseInt(e.target.value));
                setParsedRecords([]);
                setParsedPhysicalRecords([]);
                setErrorStatus(null);
                setSuccessStatus(null);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-700 cursor-pointer font-semibold"
            >
              {MONTHS_LIST.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ano Referente</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                setParsedRecords([]);
                setParsedPhysicalRecords([]);
                setErrorStatus(null);
                setSuccessStatus(null);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-700 cursor-pointer font-semibold"
            >
              {YEARS_LIST.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Status na Memória</span>
              {existingPeriodInfo ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-500" />
                  Ativo ({existingPeriodInfo.recordsCount} registros)
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  Sem Dados Salvos
                </span>
              )}
            </div>
            
            {existingPeriodInfo && (
              <button
                type="button"
                onClick={deletePeriod}
                disabled={isDeleting}
                className="p-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Excluir dados deste período permanentemente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {successStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successStatus}</span>
        </motion.div>
      )}

      {errorStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorStatus}</span>
        </motion.div>
      )}

      {importMode === 'sales' ? (
        /* SALES IMPORT SECTION */
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#001A9C]" />
              Colar Dados de Vendas (TSV / Excel Copiado)
            </h3>
            <button
              type="button"
              onClick={() => {
                setTsvText(INITIAL_RAW_DATA);
                handleParseSales(INITIAL_RAW_DATA);
              }}
              className="text-[11px] font-bold text-[#001A9C] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Carregar Modelo Demonstrativo
            </button>
          </div>

          <textarea
            value={tsvText}
            onChange={(e) => setTsvText(e.target.value)}
            placeholder="Copie as linhas do Excel/Google Sheets e cole aqui (colunas separadas por TAB)..."
            rows={6}
            className="w-full text-xs font-mono bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A9C]/20 focus:border-[#001A9C] text-slate-700"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleParseSales(tsvText)}
              disabled={!tsvText.trim()}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Processar Planilha de Vendas
            </button>

            {parsedRecords.length > 0 && (
              <button
                type="button"
                onClick={saveToDatabase}
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#001A9C] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-md shadow-[#001A9C]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando Vendas...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Salvar Vendas para {selectedMonth}/{selectedYear} ({parsedRecords.length} linhas)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* PHYSICAL QUOTAS IMPORT SECTION */
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-purple-700" />
              Colar Cotas Físicas (Linha Ferramentas)
            </h3>
            <button
              type="button"
              onClick={generatePhysicalTemplateExcel}
              className="text-[11px] font-bold text-purple-700 hover:bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Modelo Excel (.xlsx)
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Copie a tabela do Excel com as colunas: <strong>Código Rep</strong>, <strong>Nome Representante</strong>, <strong>Coordenador</strong>, <strong>Cota Física (Unidades)</strong> e <strong>Realizado Físico (Venda)</strong>.
          </p>

          <textarea
            value={physicalTsvText}
            onChange={(e) => setPhysicalTsvText(e.target.value)}
            placeholder="Copie as colunas de Cotas Físicas do Excel e cole aqui..."
            rows={6}
            className="w-full text-xs font-mono bg-purple-50/40 border border-purple-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-700"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const defaults = generateDefaultPhysicalQuotas(selectedYear, selectedMonth);
                setParsedPhysicalRecords(defaults);
                setSuccessStatus(`Cotas físicas demonstrativas geradas para Ferramentas (${defaults.length} representantes).`);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold rounded-xl border border-purple-200 transition-colors cursor-pointer"
            >
              Carregar Modelo Padrão de Ferramentas
            </button>

            <button
              type="button"
              onClick={() => handleParsePhysical(physicalTsvText)}
              disabled={!physicalTsvText.trim()}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Processar Cotas Físicas
            </button>

            {parsedPhysicalRecords.length > 0 && (
              <button
                type="button"
                onClick={saveToDatabase}
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando Cotas Físicas...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Salvar Cotas Físicas ({parsedPhysicalRecords.length} reps)
                  </>
                )}
              </button>
            )}
          </div>

          {/* Preview of Parsed Physical Quotas */}
          {parsedPhysicalRecords.length > 0 && (
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2 text-xs">
              <div className="font-bold text-purple-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-700" />
                Prévia de Cotas Físicas - Linha Ferramentas ({selectedMonth}/{selectedYear})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700 pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Cota Física</div>
                  <div className="font-extrabold text-slate-800 text-sm">
                    {parsedPhysicalRecords.reduce((acc, r) => acc + r.cotaFisica, 0).toLocaleString('pt-BR')} un
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Venda Física</div>
                  <div className="font-extrabold text-purple-800 text-sm">
                    {parsedPhysicalRecords.reduce((acc, r) => acc + r.vendaFisica, 0).toLocaleString('pt-BR')} un
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">% Atingimento</div>
                  <div className="font-extrabold text-emerald-700 text-sm">
                    {(() => {
                      const totalCota = parsedPhysicalRecords.reduce((acc, r) => acc + r.cotaFisica, 0);
                      const totalVenda = parsedPhysicalRecords.reduce((acc, r) => acc + r.vendaFisica, 0);
                      return totalCota > 0 ? ((totalVenda / totalCota) * 100).toFixed(1) : '0.0';
                    })()}%
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Representantes</div>
                  <div className="font-extrabold text-slate-800 text-sm">
                    {parsedPhysicalRecords.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
