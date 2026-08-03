import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SalesRecord } from '../types';
import { parseTSV, INITIAL_RAW_DATA } from '../rawData';
import {
  saveLocalPeriod,
  deleteLocalPeriod
} from '../lib/storage';
import { getFirebaseConfig, savePeriodToFirestore, deletePeriodFromFirestore } from '../lib/firebase';
import { 
  FileSpreadsheet, 
  Upload, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  Database, 
  RefreshCw, 
  Trash2
} from 'lucide-react';

interface ImportDataTabProps {
  onDataSaved: (year: number, month: number, records: SalesRecord[]) => void;
  currentRecordsCount: number;
  initialYear: number;
  initialMonth: number;
  availablePeriods: Array<{ id: string; year: number; month: number; recordsCount: number; updatedAt?: string }>;
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

const YEARS_LIST = [2024, 2025, 2026, 2027];

export const ImportDataTab: React.FC<ImportDataTabProps> = ({
  onDataSaved,
  currentRecordsCount,
  initialYear,
  initialMonth,
  availablePeriods,
  onRefreshPeriods
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  
  // Sales state
  const [tsvText, setTsvText] = useState('');
  const [parsedRecords, setParsedRecords] = useState<SalesRecord[]>([]);

  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if selected period already has data
  const currentPeriodId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const existingPeriodInfo = availablePeriods.find(p => p.id === currentPeriodId);

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

  const saveToDatabase = async () => {
    if (parsedRecords.length === 0) {
      setErrorStatus("Processe uma planilha válida antes de salvar.");
      return;
    }

    setIsSaving(true);
    setErrorStatus(null);
    setSuccessStatus(null);

    try {
      if (getFirebaseConfig()) {
        try {
          await savePeriodToFirestore(selectedYear, selectedMonth, parsedRecords);
        } catch (fsErr) {
          console.error("Erro ao salvar no Firestore:", fsErr);
        }
      }

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
        setSuccessStatus(`Sucesso! ${parsedRecords.length} registros de vendas salvos para ${selectedMonth}/${selectedYear}.`);
        setTsvText('');
        setParsedRecords([]);
      } else {
        throw new Error("Falha na resposta do servidor");
      }
    } catch (err: any) {
      saveLocalPeriod(selectedYear, selectedMonth, parsedRecords);
      onDataSaved(selectedYear, selectedMonth, parsedRecords);
      onRefreshPeriods();
      setSuccessStatus(`Dados de vendas salvos no armazenamento local para ${selectedMonth}/${selectedYear}.`);
      setTsvText('');
      setParsedRecords([]);
    } finally {
      setIsSaving(false);
    }
  };

  const deletePeriod = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente os dados de vendas de ${selectedMonth}/${selectedYear}?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorStatus(null);

    try {
      if (getFirebaseConfig()) {
        try {
          await deletePeriodFromFirestore(selectedYear, selectedMonth);
        } catch (fsErr) {
          console.error("Erro ao deletar no Firestore:", fsErr);
        }
      }

      await fetch(`/api/monthly-data/${selectedYear}/${selectedMonth}`, { method: 'DELETE' });
      deleteLocalPeriod(selectedYear, selectedMonth);
      onDataSaved(selectedYear, selectedMonth, []);
      onRefreshPeriods();
      setSuccessStatus(`Dados de vendas do mês ${selectedMonth}/${selectedYear} foram excluídos.`);
      setParsedRecords([]);
    } catch (err: any) {
      setErrorStatus(`Erro ao excluir: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6 text-slate-700">
      {/* Header Description */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-700">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-800">
            Importação de Dados de Vendas Monetárias (R$)
          </h2>
          <p className="text-sm text-slate-500">
            Selecione o mês e ano para importar e atualizar os valores de metas e faturamento em Reais (R$).
          </p>
        </div>
      </div>

      {/* Target Period Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Calendar className="w-4 h-4 text-[#001A9C]" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Selecione o Mês e Ano de Destino
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

      {/* SALES IMPORT SECTION */}
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
    </div>
  );
};
