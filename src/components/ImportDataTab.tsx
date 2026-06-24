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
  availablePeriods: Array<{ id: string; year: number; month: number; recordsCount: number }>;
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

  const loadDefaults = () => {
    handleParse(INITIAL_RAW_DATA);
    setTsvText('');
  };

  const loadFullSpreadsheet = () => {
    const fullTSV = INITIAL_RAW_DATA + `
87	348	Ara Repres Ltda	27	Adriano Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	0	0	0	0	3.077	0	0	3.077	0	0	1.966	5.043	0	5.043	0	5.580	5.580	0
87	348	Ara Repres Ltda	27	Adriano Almeida	BEL	Utilidades	35	Belem Geral Mon.	0	495	0	0	0	0	0	495	0	0	0	495	0	495	495	0	495	0
87	352	Barbosa & Boulitreau	10	Juan Almeida	FAR	Utilidades	41	Far Panelas Monet.	0	0	0	0	0	0	0	0	0	0	0	0	0		0	0	0	0
87	352	Barbosa & Boulitreau	10	Juan Almeida	FAR	Utilidades	42	Far Servir Monet.	0	0	0	0	0	0	0	0	0	0	0	0	0		0	0	0	0
87	394	Tramontina Nordeste	12	Igor Pedruzzi	DEL	Lar	36	Delta Plastico Mon.	0	115	0	0	0	0	0	115	0	0	0	115	0	115	115	0	115	0
87	394	Tramontina Nordeste	12	Igor Pedruzzi	FAR	Utilidades	43	Far Talheres Monet.	0	344	0	0	0	0	0	344	0	0	0	344	0	344	344	0	344	0
87	394	Tramontina Nordeste	12	Igor Pedruzzi	CUT	Utilidades	37	Cut Churrasco Mon	0	446	0	0	0	0	0	446	0	0	0	446	0	446	446	0	446	0
87	394	Tramontina Nordeste	12	Igor Pedruzzi	GAR	Ferramentas	37	Garibaldi Master Mon	0	0	0	0	0	0	0	0	0	0	0	0	0		0	758	758	0
87	394	Tramontina Nordeste	12	Igor Pedruzzi	CUT	Utilidades	39	Cut Geral Monet.	0	771	0	0	0	0	0	771	0	0	0	771	0	771	771	0	771	0
87	394	Tramontina Nordeste	12	Igor Pedruzzi	FAR	Utilidades	42	Far Servir Monet.	0	211	0	0	0	0	0	211	0	0	0	211	0	211	211	0	211	0
87	401	Dto Padilha Ltda	15	Dionatan	ELT	Elétrica	40	Eletric Residen. Mon	0	0	0	0	0	0	0	0	0	0	0	0	0		-122	0	-122	0
87	404	Tcardoso RepresentaÇ	15	Dionatan	FAR	Utilidades	50	Far Termicos Monet.	0	0	0	0	0	0	0	0	0	0	0	0	0		0	0	0	0
87	404	Tcardoso RepresentaÇ	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	3.375	2.171	64,3	0	0	0	3.375	2.171	64,3	0	0	2.171	64,3	-1.204	1.945	0	1.945	57,6
87	405	Mj E A RepresentaÇÕE	15	Dionatan	DEL	Lar	36	Delta Plastico Mon.	0	473	0	0	0	0	0	473	0	0	0	473	0	473	473	0	473	0
87	405	Mj E A RepresentaÇÕE	15	Dionatan	ELT	Elétrica	41	Eletric Indust Mon	0	1.322	0	0	0	0	0	1.322	0	0	0	1.322	0	1.322	1.473	0	1.473	0
87	405	Mj E A RepresentaÇÕE	15	Dionatan	FAR	Utilidades	42	Far Servir Monet.	0	0	0	0	0	0	0	0	0	0	0	0	0		164	0	164	0
87	405	Mj E A RepresentaÇÕE	15	Dionatan	CUT	Utilidades	37	Cut Churrasco Mon	0	798	0	0	0	0	0	798	0	0	0	798	0	798	798	0	798	0
87	405	Mj E A RepresentaÇÕE	15	Dionatan	ELT	Elétrica	40	Eletric Residen. Mon	0	0	0	0	0	0	0	0	0	0	0	0	0		128	0	128	0
87	405	Mj E A RepresentaÇÕE	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	4.970	8.042	161,8	1.420	3.094	217,9	6.390	11.136	174,3	0	0	11.136	174,3	4.746	8.518	3.442	11.960	187,2
87	406	Vendedor FuncionÁRio	25	Marcelo Krewer	GAR	Ferramentas	37	Garibaldi Master Mon	7.100	0	0	35.500	0	0	42.600	0	0	0	0	0	0	-42.600	0	0	0	0
87	431	Arnon Bruno Represen	10	Juan Almeida	TEC		0	Sem Grupo	0	118	0	0	0	0	0	118	0	0	0	118	0	118	118	0	118	0
87	431	Arnon Bruno Represen	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	2.130	638	30	3.550	4.691	132,1	5.680	5.329	93,8	0	0	5.329	93,8	-351	638	2.851	3.489	61,4
87	431	Arnon Bruno Represen	10	Juan Almeida	ELT	Elétrica	41	Eletric Indust Mon	0	1.357	0	0	0	0	0	1.357	0	0	0	1.357	0	1.357	1.357	0	1.357	0
87	431	Arnon Bruno Represen	10	Juan Almeida	DEL	Lar	36	Delta Plastico Mon.	0	2.437	0	0	0	0	0	2.437	0	0	0	2.437	0	2.437	2.437	0	2.437	0
87	432	Aa Pupulin Represent	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	1.420	1.697	119,5	0	0	0	1.420	1.697	119,5	0	0	1.697	119,5	277	4.112	0	4.112	289,6
87	432	Aa Pupulin Represent	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	8.625	5.620	65,2	0	0	0	8.625	5.620	65,2	0	0	5.620	65,2	-3.005	6.995	0	6.995	81,1
87	432	Aa Pupulin Represent	10	Juan Almeida	ELT	Elétrica	40	Eletric Residen. Mon	0	1.340	0	0	0	0	0	1.340	0	0	0	1.340	0	1.340	2.367	0	2.367	0
87	432	Aa Pupulin Represent	10	Juan Almeida	TEC		0	Sem Grupo	0	0	0	0	0	0	0	0	0	0	0	0	0		651	0	651	0
87	433	CrisÓStomo Represent	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	3.750	8.029	214,1	0	0	0	3.750	8.029	214,1	0	0	8.029	214,1	4.279	2.401	0	2.401	64
87	433	CrisÓStomo Represent	10	Juan Almeida	TEC		0	Sem Grupo	0	1.440	0	0	0	0	0	1.440	0	0	0	1.440	0	1.440	1.440	0	1.440	0
87	433	CrisÓStomo Represent	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	1.420	652	45,9	0	0	0	1.420	652	45,9	0	0	652	45,9	-768	605	878	1.483	104,4
87	435	Dalia Representacoes	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	12.780	3.419	26,8	42.600	30.281	71,1	55.380	33.700	60,9	0	0	33.700	60,9	-21.680	5.943	50.158	56.101	101,3
87	435	Dalia Representacoes	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	710	0	0	2.130	3.458	162,3	2.840	3.458	121,8	0	0	3.458	121,8	618	0	4.103	4.103	144,5
87	437	M D H RepresentaÇÕEs	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	8.250	9.520	115,4	900	0	0	9.150	9.520	104,1	0	0	9.520	104,1	370	9.520	0	9.520	104,1
87	437	M D H RepresentaÇÕEs	10	Juan Almeida	CUT	Utilidades	37	Cut Churrasco Mon	0	36	0	0	0	0	0	36	0	0	0	36	0	36	36	0	36	0
87	437	M D H RepresentaÇÕEs	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	1.420	95	6,7	4.260	6.991	164,1	5.680	7.086	124,8	0	0	7.086	124,8	1.406	7.065	7.119	14.184	249,7
87	439	E A Nogueira Represe	27	Adriano Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	0	0	0	0	1.082	0	0	1.082	0	0	0	1.082	0	1.082	0	3.390	3.390	0
87	439	E A Nogueira Represe	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	49.700	74.918	150,7	355.000	48.586	13,7	404.700	123.503	30,5	0	0	123.503	30,5	-281.197	80.968	90.155	171.124	42,3
87	439	E A Nogueira Represe	27	Adriano Almeida	CUT	Utilidades	39	Cut Geral Monet.	750	32.462	4328,3	14.400	0	0	15.150	32.462	214,3	0	0	32.462	214,3	17.312	32.462	3.497	35.959	237,4
87	447	Romulo E Silvia Rep.	25	Marcelo Krewer	GAR	Ferramentas	37	Garibaldi Master Mon	7.100	0	0	35.500	187	0,5	42.600	187	0,4	0	0	187	0,4	-42.413	0	0	0	0
87	447	Romulo E Silvia Rep.	25	Marcelo Krewer	GAR	Ferramentas	36	Garibaldi Pro Monet	0	0	0	0	19.098	0	0	19.098	0	0	0	19.098	0	19.098	0	0	0	0
87	452	Barbosa & Boulitreau	27	Adriano Almeida	MUL		0	Sem Grupo	0	0	0	0	63.166	0	0	63.166	0	0	0	63.166	0	63.166	0	0	0	0
87	464	D. Victor Representa	3	Julio Warken	GAR	Ferramentas	36	Garibaldi Pro Monet	2.840	1.009	35,5	164.720	31.958	19,4	167.560	32.967	19,7	0	0	32.967	19,7	-134.593	941	20.363	21.305	12,7
87	464	D. Victor Representa	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	3.550	3.990	112,4	21.300	17.922	84,1	24.850	21.912	88,2	0	0	21.912	88,2	-2.938	1.294	9.997	11.291	45,4
87	465	Geraldo Silvestre Re	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	53.250	38.438	72,2	67.450	964	1,4	120.700	39.403	32,7	822	0	40.225	33,3	-80.475	42.500	964	43.465	36
87	465	Geraldo Silvestre Re	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	4.260	5.485	128,8	17.750	0	0	22.010	5.485	24,9	733	0	6.219	28,3	-15.791	7.209	0	7.209	32,8
87	465	Geraldo Silvestre Re	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	4.500	3.460	76,9	0	0	0	4.500	3.460	76,9	0	0	3.460	76,9	-1.040	1.662	0	1.662	36,9
87	466	Acop RepresentaÇÕEs	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	42.600	40.848	95,9	39.050	0	0	81.650	40.848	50	0	0	40.848	50	-40.802	37.154	0	37.154	45,5
87	466	Acop RepresentaÇÕEs	3	Julio Warken	CUT	Utilidades	39	Cut Geral Monet.	3.375	2.326	68,9	2.700	0	0	6.075	2.326	38,3	0	0	2.326	38,3	-3.749	862	0	862	14,2
87	467	Daniel Victor - Ce	25	Marcelo Krewer	GAR	Ferramentas	37	Garibaldi Master Mon	7.100	0	0	35.500	0	0	42.600	0	0	0	0	0	0	-42.600	0	0	0	0
87	472	Fp RepresentaÇÕEs Co	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	3.550	0	0	7.100	0	0	10.650	0	0	0	0	0	0	-10.650	0	0	0	0
87	472	Fp RepresentaÇÕEs Co	27	Adriano Almeida	CUT	Utilidades	39	Cut Geral Monet.	0	0	0	46.800	129.516	276,7	46.800	129.516	276,7	0	0	129.516	276,7	82.716	0	129.516	129.516	276,7
87	484	Fontenele Representa	27	Adriano Almeida	CUT	Utilidades	39	Cut Geral Monet.	0	0	0	30.600	0	0	30.600	0	0	0	0	0	0	-30.600	0	0	0	0
87	796	Ventine E LourenÇO L	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	710	823	115,9	1.420	308	21,7	2.130	1.130	53,1	0	0	1.130	53,1	-1.000	1.380	1.710	3.091	145,1
87	796	Ventine E LourenÇO L	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	8.250	3.148	38,2	900	0	0	9.150	3.148	34,4	0	0	3.148	34,4	-6.002	3.921	0	3.921	42,9
`;
    handleParse(fullTSV);
    setTsvText('');
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

      {/* Preset loaders */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Métodos de Carregamento</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col justify-between space-y-3 shadow-sm transition-all hover:border-slate-200">
            <div>
              <h3 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-sky-500" />
                Preset Reduzido (35 Linhas)
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Carrega uma seleção inteligente com os 35 representantes mais ativos do canal CD/VP. Excelente para testes iniciais rápidos.
              </p>
            </div>
            <button
              onClick={loadDefaults}
              className="w-full text-xs bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold py-2.5 px-3 rounded-lg transition-colors cursor-pointer border border-slate-200"
            >
              Pré-carregar 35 Linhas
            </button>
          </div>

          <div className="bg-gradient-to-br from-indigo-50/50 to-white p-4 rounded-xl border border-indigo-100 flex flex-col justify-between space-y-3 shadow-sm transition-all hover:border-indigo-200">
            <div>
              <h3 className="font-semibold text-indigo-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Planilha Completa Original (130+ Linhas)
              </h3>
              <p className="text-[11px] text-indigo-800/70 mt-1 leading-relaxed">
                Carrega o relatório completo de metas de vendas com todos os registros reais de representantes, divisões e subcanais integrados.
              </p>
            </div>
            <button
              onClick={loadFullSpreadsheet}
              className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-2.5 px-3 rounded-lg transition-colors shadow-xs cursor-pointer border border-indigo-700"
            >
              🔥 Pré-carregar Planilha Completa (130+)
            </button>
          </div>
        </div>
      </div>

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
              <span className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Coordenadorias</span>
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
