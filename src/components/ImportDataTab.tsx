import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SalesRecord } from '../types';
import { parseTSV, INITIAL_RAW_DATA } from '../rawData';
import {
  saveLocalPeriod,
  deleteLocalPeriod,
  getLocalPeriodsIndex
} from '../lib/storage';
import {
  getFirebaseConfig,
  savePeriodToFirestore,
  deletePeriodFromFirestore
} from '../lib/firebase';
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
  Target
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

const YEARS_LIST = [2025, 2026];

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
  
  const [tsvText, setTsvText] = useState('');
  const [parsedRecords, setParsedRecords] = useState<SalesRecord[]>([]);
  
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if selected period already has data in public DB
  const currentPeriodId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const existingPeriodInfo = availablePeriods.find(p => p.id === currentPeriodId);

  const handleParse = (textToParse: string) => {
    try {
      const records = parseTSV(textToParse);
      if (records.length === 0) {
        setErrorStatus("Nenhum registro de venda válido pôde ser extraído. Verifique o cabeçalho e as colunas (separados por tabulação).");
        setParsedRecords([]);
        return;
      }
      
      setParsedRecords(records);
      setErrorStatus(null);
      setSuccessStatus(`Planilha processada localmente com sucesso! ${records.length} registros prontos para serem salvos.`);
      
      // Auto dismiss message
      setTimeout(() => setSuccessStatus(null), 5000);
    } catch (err: any) {
      setErrorStatus(`Erro ao processar dados: ${err.message || err}`);
      setParsedRecords([]);
    }
  };

  const onPasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tsvText.trim()) return;
    handleParse(tsvText);
  };

  const saveToDatabase = async () => {
    if (parsedRecords.length === 0) {
      setErrorStatus("Carregue ou cole os dados antes de salvar na memória.");
      return;
    }

    setIsSaving(true);
    setErrorStatus(null);
    setSuccessStatus(null);

    // 1. If Firebase is configured, write directly to Firestore!
    const firebaseCfg = getFirebaseConfig();
    if (firebaseCfg) {
      try {
        await savePeriodToFirestore(selectedYear, selectedMonth, parsedRecords);
        setSuccessStatus(`✨ Sucesso! Os dados de ${MONTHS_LIST.find(m => m.value === selectedMonth)?.label}/${selectedYear} foram salvos com sucesso na nuvem do Firebase Firestore e estão públicos para qualquer dispositivo!`);
        onDataSaved(selectedYear, selectedMonth, parsedRecords);
        setParsedRecords([]);
        setTsvText('');
      } catch (err: any) {
        console.error("Firestore save error:", err);
        setErrorStatus(`Erro ao salvar no Firestore Cloud: ${err.message || err}`);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // 2. Otherwise fall back to local server / localStorage
    try {
      let isLocalFallback = false;
      let errorMsg = '';

      try {
        const response = await fetch('/api/monthly-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: selectedYear,
            month: selectedMonth,
            records: parsedRecords
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSuccessStatus(`Sucesso! Os dados de ${MONTHS_LIST.find(m => m.value === selectedMonth)?.label}/${selectedYear} foram gravados com sucesso na memória pública do servidor.`);
            onDataSaved(selectedYear, selectedMonth, parsedRecords);
            setParsedRecords([]);
            setTsvText('');
            return;
          } else {
            errorMsg = result.error || 'Erro desconhecido ao salvar.';
          }
        } else {
          isLocalFallback = true;
        }
      } catch (err: any) {
        console.warn("API save failed, falling back to localStorage:", err);
        isLocalFallback = true;
      }

      if (isLocalFallback) {
        saveLocalPeriod(selectedYear, selectedMonth, parsedRecords);
        setSuccessStatus(`⚠️ Ambiente estático (Vercel) detectado. Os dados de ${MONTHS_LIST.find(m => m.value === selectedMonth)?.label}/${selectedYear} foram salvos localmente no seu navegador! Para persistência pública global, conecte o Firebase no botão da barra lateral.`);
        onDataSaved(selectedYear, selectedMonth, parsedRecords);
        setParsedRecords([]);
        setTsvText('');
      } else {
        throw new Error(errorMsg || 'Erro na rede ou ao salvar.');
      }
    } catch (err: any) {
      setErrorStatus(`Erro ao salvar: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deletePeriod = async () => {
    if (!window.confirm(`Tem certeza que deseja apagar permanentemente todos os dados armazenados de ${MONTHS_LIST.find(m => m.value === selectedMonth)?.label}/${selectedYear}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setIsDeleting(true);
    setErrorStatus(null);
    setSuccessStatus(null);

    // 1. If Firebase is configured, delete directly from Firestore
    const firebaseCfg = getFirebaseConfig();
    if (firebaseCfg) {
      try {
        await deletePeriodFromFirestore(selectedYear, selectedMonth);
        setSuccessStatus(`Os dados do período de ${MONTHS_LIST.find(m => m.value === selectedMonth)?.label}/${selectedYear} foram excluídos com sucesso do Firebase Firestore Cloud.`);
        onRefreshPeriods();
        onDataSaved(selectedYear, selectedMonth, []);
      } catch (err: any) {
        console.error("Firestore delete error:", err);
        setErrorStatus(`Erro ao excluir do Firestore: ${err.message || err}`);
      } finally {
        setIsDeleting(false);
      }
      return;
    }

    // 2. Otherwise fall back to local server / localStorage
    try {
      let isLocalFallback = false;
      let errorMsg = '';

      try {
        const response = await fetch(`/api/monthly-data/${selectedYear}/${selectedMonth}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSuccessStatus(`Os dados do período de ${MONTHS_LIST.find(m => m.value === selectedMonth)?.label}/${selectedYear} foram excluídos com sucesso da memória.`);
            onRefreshPeriods();
            onDataSaved(selectedYear, selectedMonth, []);
            return;
          } else {
            errorMsg = result.error || 'Erro desconhecido ao excluir.';
          }
        } else {
          isLocalFallback = true;
        }
      } catch (err: any) {
        console.warn("API delete failed, falling back to localStorage:", err);
        isLocalFallback = true;
      }

      if (isLocalFallback) {
        deleteLocalPeriod(selectedYear, selectedMonth);
        setSuccessStatus(`Os dados de ${MONTHS_LIST.find(m => m.value === selectedMonth)?.label}/${selectedYear} foram excluídos do armazenamento local do seu navegador.`);
        onRefreshPeriods();
        onDataSaved(selectedYear, selectedMonth, []);
      } else {
        throw new Error(errorMsg || 'Erro na rede ou ao excluir.');
      }
    } catch (err: any) {
      setErrorStatus(`Erro ao excluir período: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6 text-slate-700">
      {/* Tab Header Description */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-800">Sistema de Importação & Memória Compartilhada</h2>
          <p className="text-sm text-slate-500">
            Abaixo você pode selecionar o período e realizar upload de dados. Os dados salvos são armazenados diretamente na 
            <strong> memória compartilhada do servidor</strong>, ficando imediatamente disponíveis para todos os usuários que acessarem este dashboard.
          </p>
        </div>
      </div>

      {/* Target Period Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Calendar className="w-4 h-4 text-[#001A9C]" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Selecione o Período de Destino</h3>
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
                  Ativo ({existingPeriodInfo.recordsCount} linhas)
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
          className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-start gap-2.5 text-xs font-medium shadow-2xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successStatus}</span>
        </motion.div>
      )}

      {errorStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-2.5 text-xs font-medium shadow-2xs"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorStatus}</span>
        </motion.div>
      )}


      {/* Manual Paste Form */}
      <form onSubmit={onPasteSubmit} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Ou Cole Dados do Excel (Formato Tabulação/TSV):</label>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">Separado por Tab</span>
        </div>
        
        <textarea
          rows={5}
          value={tsvText}
          onChange={(e) => setTsvText(e.target.value)}
          placeholder={`AGE\tREP\tNOME REPRESENTANTE\tCOORD\tNOME COORDENADOR\tEMP\t...\n87\t309\tE A Nogueira Represe\t10\tJuan Almeida\tCUT\tUtilidades\t39\tCut Geral Monet.\t3.000\t5.374\t179,1\t...`}
          className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
        />

        <div className="flex justify-between items-center">
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
            Copie as colunas da sua planilha do Excel ou Google Sheets e cole aqui.
          </p>
          <button
            type="submit"
            disabled={!tsvText.trim()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-3.5 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Processar Texto Colado
          </button>
        </div>
      </form>

      {/* Parsed Preview Area & DB persistence button */}
      {parsedRecords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-indigo-950 text-white p-5 rounded-xl space-y-4 shadow-md border border-indigo-900"
        >
          <div className="flex items-center justify-between border-b border-indigo-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-indigo-400" />
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
                Prévia do Processamento Local
              </h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-200">
              Pronto para Salvar
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-1 text-center">
            <div className="bg-indigo-900/40 p-3 rounded-lg border border-indigo-800/50">
              <span className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Período Selecionado</span>
              <span className="block text-sm font-extrabold mt-1 text-white">
                {MONTHS_LIST.find(m => m.value === selectedMonth)?.label} / {selectedYear}
              </span>
            </div>
            
            <div className="bg-indigo-900/40 p-3 rounded-lg border border-indigo-800/50">
              <span className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Linhas de Dados</span>
              <span className="block text-sm font-extrabold mt-1 text-white">
                {parsedRecords.length} registros
              </span>
            </div>

            <div className="bg-indigo-900/40 p-3 rounded-lg border border-indigo-800/50">
              <span className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Coordenadores</span>
              <span className="block text-sm font-extrabold mt-1 text-white">
                {Array.from(new Set(parsedRecords.map(r => r.coordName))).length} frentes
              </span>
            </div>

            <div className="bg-indigo-900/40 p-3 rounded-lg border border-indigo-800/50">
              <span className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Representantes</span>
              <span className="block text-sm font-extrabold mt-1 text-white">
                {Array.from(new Set(parsedRecords.map(r => r.repName))).length} empresas
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-indigo-900 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <p className="text-[11px] text-indigo-200/80 max-w-xl">
              ⚠️ {existingPeriodInfo ? (
                <span><strong>Já existem dados salvos</strong> para {MONTHS_LIST.find(m => m.value === selectedMonth)?.label}/{selectedYear}. Ao salvar abaixo, você irá substituir permanentemente as {existingPeriodInfo.recordsCount} linhas atuais.</span>
              ) : (
                <span>Este período está atualmente vazio. Ao salvar abaixo, todos os usuários passarão a visualizar este conjunto de dados para {MONTHS_LIST.find(m => m.value === selectedMonth)?.label}/{selectedYear}.</span>
              )}
            </p>
            
            <button
              type="button"
              onClick={saveToDatabase}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 bg-[#001A9C] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-black py-3 px-5 rounded-lg transition-all cursor-pointer disabled:opacity-50 shrink-0 select-none shadow-md"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Salvando na Memória...
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-indigo-300" />
                  Salvar na Memória do Servidor
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
