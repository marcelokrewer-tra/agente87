import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { PhysicalQuotaRecord } from '../types';
import { parsePhysicalQuotaTSV } from '../rawData';
import {
  saveLocalPhysicalQuotaPeriod,
  deleteLocalPhysicalQuotaPeriod
} from '../lib/storage';
import { getFirebaseConfig } from '../lib/firebase';
import { logAnalyticsEvent } from '../lib/analytics';
import { 
  FileSpreadsheet, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Database, 
  RefreshCw, 
  Trash2,
  Boxes,
  Download,
  Info,
  Package
} from 'lucide-react';

interface ImportPhysicalQuotaTabProps {
  onPhysicalQuotaDataSaved: (year: number, month: number, records: PhysicalQuotaRecord[]) => void;
  currentRecordsCount: number;
  initialYear: number;
  initialMonth: number;
  availablePhysicalQuotaPeriods: Array<{ id: string; year: number; month: number; recordsCount: number; updatedAt?: string }>;
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

export const ImportPhysicalQuotaTab: React.FC<ImportPhysicalQuotaTabProps> = ({
  onPhysicalQuotaDataSaved,
  currentRecordsCount,
  initialYear,
  initialMonth,
  availablePhysicalQuotaPeriods = [],
  onRefreshPeriods
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);

  const [physicalTsvText, setPhysicalTsvText] = useState('');
  const [parsedPhysicalRecords, setParsedPhysicalRecords] = useState<PhysicalQuotaRecord[]>([]);

  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if selected period has data
  const currentPeriodId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const existingPeriodInfo = availablePhysicalQuotaPeriods.find(p => p.id === currentPeriodId);

  const handleParsePhysical = (textToParse: string) => {
    try {
      const records = parsePhysicalQuotaTSV(textToParse);
      if (records.length === 0) {
        setErrorStatus("Nenhum registro de cota física válido pôde ser extraído. Verifique se o texto contém colunas: Código, Nome, Coordenador, Grupo/Linha (opcional), Cota Física, Venda Física.");
        setParsedPhysicalRecords([]);
        return;
      }
      setParsedPhysicalRecords(records);
      setErrorStatus(null);
      setSuccessStatus(`Planilha de cotas físicas processada com sucesso! ${records.length} registros prontos para salvar.`);
      setTimeout(() => setSuccessStatus(null), 5000);
    } catch (err: any) {
      setErrorStatus(`Erro ao processar cotas físicas: ${err.message || err}`);
      setParsedPhysicalRecords([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
        
        setPhysicalTsvText(tsv);
        handleParsePhysical(tsv);
      } catch (err: any) {
        setErrorStatus("Falha ao ler arquivo Excel/CSV: " + (err.message || err));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveData = async () => {
    if (parsedPhysicalRecords.length === 0) {
      setErrorStatus("Insira ou envie uma planilha válida de cotas físicas antes de salvar.");
      return;
    }

    setIsSaving(true);
    setErrorStatus(null);

    try {
      saveLocalPhysicalQuotaPeriod(selectedYear, selectedMonth, parsedPhysicalRecords);

      // Save to Express server
      try {
        await fetch('/api/physical-quotas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: selectedYear,
            month: selectedMonth,
            records: parsedPhysicalRecords
          })
        });
      } catch (err) {
        console.warn("Servidor backend offline, mantendo em armazenamento local", err);
      }

      onPhysicalQuotaDataSaved(selectedYear, selectedMonth, parsedPhysicalRecords);
      onRefreshPeriods();

      setSuccessStatus(`Cotas Físicas salvas com sucesso para ${selectedMonth}/${selectedYear}! (${parsedPhysicalRecords.length} registros)`);
      logAnalyticsEvent('physical_quota_data_saved', `${selectedMonth}/${selectedYear} - ${parsedPhysicalRecords.length} registros`);

      // Clear input state
      setPhysicalTsvText('');
      setParsedPhysicalRecords([]);
    } catch (err: any) {
      setErrorStatus("Erro ao salvar cotas físicas: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePeriod = async () => {
    if (!existingPeriodInfo) return;

    if (!window.confirm(`Tem certeza que deseja EXCLUIR as Cotas Físicas cadastradas para o período de ${selectedMonth}/${selectedYear}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      deleteLocalPhysicalQuotaPeriod(selectedYear, selectedMonth);

      try {
        await fetch(`/api/physical-quotas/${selectedYear}/${selectedMonth}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn("Servidor backend offline na exclusão", err);
      }

      onRefreshPeriods();
      onPhysicalQuotaDataSaved(selectedYear, selectedMonth, []);
      setSuccessStatus(`Cotas físicas de ${selectedMonth}/${selectedYear} excluídas com sucesso.`);
      logAnalyticsEvent('physical_quota_period_deleted', `${selectedMonth}/${selectedYear}`);
    } catch (err: any) {
      setErrorStatus("Erro ao excluir período: " + (err.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'AGE', 'REP', 'NOME REPRESENTANTE', 'COORD', 'NOME COORDENADOR', 
      'LINHA', 'GRUPO', 'NOME GRUPO', 'QUOTA TOTAL', 'FATURADO TOTAL', 
      '% TOTAL', 'PENDENTE CD', 'PENDENTE VP', 'FATURADO E PENDENTE', '%', 'DEFASAGEM'
    ];
    const sampleRows = [
      ['87', '309', 'E A Nogueira Represe', '10', 'Juan Almeida', 'Ferramentas', '11', 'Martelos', '754', '1.110', '147,2', '36', '0', '1.146', '152', '392'],
      ['87', '309', 'E A Nogueira Represe', '10', 'Juan Almeida', 'Ferramentas', '8', 'Chaves De Aperto', '2.457', '5.161', '210,1', '288', '0', '5.449', '221,8', '2.992'],
      ['87', '311', 'Mab Guimaraes E Repr', '27', 'Adriano Almeida', 'Ferramentas', '9', 'Chaves De Fenda', '5.592', '9.264', '165,7', '0', '174', '9.438', '168,8', '3.846'],
      ['87', '311', 'Mab Guimaraes E Repr', '27', 'Adriano Almeida', 'Ferramentas', '7', 'Articulados', '2.706', '15.384', '568,5', '0', '0', '15.384', '568,5', '12.678']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotas Físicas');
    XLSX.writeFile(workbook, `Modelo_Valores_Fisicos_Venda.xlsx`);
  };

  // Distinct groups in parsed records
  const distinctGroupsInParsed = Array.from(new Set(parsedPhysicalRecords.map(r => r.groupName || 'Ferramentas Geral')));

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Title Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-200 border border-purple-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Boxes className="w-3.5 h-3.5" />
            <span>Gestão de Unidades e Famílias Ferramentas</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Importar Cotas Físicas (Somente Linha Ferramentas)
          </h2>
          <p className="text-xs text-purple-200 max-w-2xl leading-relaxed">
            Selecione o ano e mês referente e envie a planilha de cotas físicas em unidades. As informações serão salvas de forma independente das vendas financeiras em R$.
          </p>
        </div>
      </div>

      {/* Status Alerts */}
      {errorStatus && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs font-semibold shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorStatus}</div>
        </motion.div>
      )}

      {successStatus && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-xs font-semibold shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">{successStatus}</div>
        </motion.div>
      )}

      {/* STEP 1: PERIOD SELECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-purple-600" />
            <span>1. Mês e Ano de Referência da Cota Física</span>
          </h3>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-purple-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
          >
            <Download className="w-3.5 h-3.5 text-purple-700" />
            <span>Baixar Planilha Exemplo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mês de Referência</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            >
              {MONTHS_LIST.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ano de Referência</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            >
              {YEARS_LIST.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <div className={`w-full p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${existingPeriodInfo ? 'bg-purple-50/60 border-purple-200 text-purple-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              <div className="flex items-center gap-2">
                <Database className={`w-4 h-4 ${existingPeriodInfo ? 'text-purple-600' : 'text-slate-400'}`} />
                <div>
                  <span className="font-bold block">
                    {existingPeriodInfo ? `Cotas Físicas Cadastradas` : `Sem dados no período`}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {existingPeriodInfo ? `${existingPeriodInfo.recordsCount} registro(s) em memória` : `${selectedMonth}/${selectedYear}`}
                  </span>
                </div>
              </div>

              {existingPeriodInfo && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeletePeriod}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border border-rose-200"
                  title="Excluir dados deste período"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Excluir</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: FILE UPLOAD & TSV PASTE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Upload className="w-4.5 h-4.5 text-purple-600" />
            <span>2. Enviar Arquivo Excel ou Colar Tabela de Cotas Físicas</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Upload Box */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">Opção A: Upload de Planilha (.xlsx, .xls, .csv)</label>
            <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/20 rounded-2xl p-6 text-center transition-all cursor-pointer group relative">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="space-y-2 pointer-events-none">
                <div className="w-12 h-12 bg-purple-100 border border-purple-200 rounded-2xl flex items-center justify-center text-purple-700 mx-auto group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">Clique aqui para selecionar a planilha</div>
                <div className="text-[11px] text-slate-500">Suporta Excel (.xlsx) ou CSV com separador ponto-e-vírgula</div>
              </div>
            </div>
          </div>

          {/* Paste TSV */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Opção B: Colar Dados da Tabela diretamente</label>
            <textarea
              rows={6}
              value={physicalTsvText}
              onChange={(e) => {
                setPhysicalTsvText(e.target.value);
                handleParsePhysical(e.target.value);
              }}
              placeholder="Cole aqui as linhas da sua tabela copiadas do Excel...&#10;Exemplo:&#10;771	Enr Representações	Juan Almeida	Ferramentas Master	1200	1350"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Column Format Guide */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Info className="w-4 h-4 text-purple-600" />
            <span>Estrutura de Colunas Reconhecida (Valores Físicos de Venda dos Representantes):</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] font-medium text-slate-600">
            <div className="bg-white p-2 rounded-xl border border-slate-200">1. REP (Código)</div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">2. NOME REPRESENTANTE</div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">3. NOME COORDENADOR</div>
            <div className="bg-white p-2 rounded-xl border border-purple-200 font-bold text-purple-900 bg-purple-50/50">4. NOME GRUPO (Produtos)</div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">5. QUOTA TOTAL (Cota)</div>
            <div className="bg-white p-2 rounded-xl border border-emerald-200 font-bold text-emerald-900 bg-emerald-50/50">6. FATURADO E PENDENTE (Venda Total)</div>
          </div>
        </div>
      </div>

      {/* PARSED PREVIEW & SAVE BUTTON */}
      {parsedPhysicalRecords.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-purple-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-purple-900 flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                <span>Prévia do Processamento ({parsedPhysicalRecords.length} registros reconhecidos)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Grupos de produtos identificados: <strong className="text-purple-900">{distinctGroupsInParsed.join(', ')}</strong>
              </p>
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveData}
              className="px-5 py-2.5 bg-purple-900 hover:bg-purple-800 active:bg-purple-950 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Salvando...' : `Salvar Cotas Físicas para ${selectedMonth}/${selectedYear}`}</span>
            </button>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500">
                  <th className="py-2.5 px-3">Cód</th>
                  <th className="py-2.5 px-3">Representante</th>
                  <th className="py-2.5 px-3">Coordenador</th>
                  <th className="py-2.5 px-3">Grupo de Produtos</th>
                  <th className="py-2.5 px-3 text-right">Quota Total (Cota un)</th>
                  <th className="py-2.5 px-3 text-right">Venda Total (Faturado e Pendente)</th>
                  <th className="py-2.5 px-3 text-right">% Atingimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {parsedPhysicalRecords.slice(0, 8).map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-slate-500">#{r.repId}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{r.repName}</td>
                    <td className="py-2 px-3 text-slate-600">{r.coordName}</td>
                    <td className="py-2 px-3 text-purple-900 font-extrabold">
                      <span className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-full text-[10px]">
                        {r.groupName || 'Ferramentas Geral'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{r.cotaFisica.toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{r.vendaFisica.toLocaleString('pt-BR')}</td>
                    <td className={`py-2 px-3 text-right font-mono font-extrabold ${r.pctFisica >= 100 ? 'text-emerald-600' : 'text-purple-700'}`}>
                      {r.pctFisica.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parsedPhysicalRecords.length > 8 && (
            <div className="text-center text-xs text-slate-500 font-medium pt-1">
              + {parsedPhysicalRecords.length - 8} registro(s) adicionais prontos para salvar.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
