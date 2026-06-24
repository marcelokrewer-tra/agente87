import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SalesRecord } from '../types';
import { parseTSV, INITIAL_RAW_DATA } from '../rawData';
import { FileSpreadsheet, Upload, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface ImportDataTabProps {
  onDataImported: (records: SalesRecord[]) => void;
  currentRecordsCount: number;
}

export const ImportDataTab: React.FC<ImportDataTabProps> = ({
  onDataImported,
  currentRecordsCount
}) => {
  const [tsvText, setTsvText] = useState('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  const handleParse = (textToParse: string) => {
    try {
      const records = parseTSV(textToParse);
      if (records.length === 0) {
        setErrorStatus("Nenhum registro de venda válido pôde ser extraído. Verifique o cabeçalho e as colunas (separados por tabulação).");
        setSuccessStatus(null);
        return;
      }
      
      onDataImported(records);
      setSuccessStatus(`Sucesso! ${records.length} novos registros importados e processados pelo dashboard.`);
      setErrorStatus(null);
      
      // Auto dismiss success after 4 seconds
      setTimeout(() => setSuccessStatus(null), 4000);
    } catch (err: any) {
      setErrorStatus(`Erro ao processar dados: ${err.message || err}`);
      setSuccessStatus(null);
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
87	484	Fontenele Representa	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	0	0	0	47.570	38.949	81,9	47.570	38.949	81,9	0	0	38.949	81,9	-8.621	0	7.321	7.321	15,4
87	498	Esperanza Assessoria	27	Adriano Almeida	CUT	Utilidades	39	Cut Geral Monet.	0	0	0	900	0	0	900	0	0	0	0	0	0	-900	0	0	0	0
87	498	Esperanza Assessoria	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	3.550	0	0	49.700	35.945	72,3	53.250	35.945	67,5	0	0	35.945	67,5	-17.305	0	71.669	71.669	134,6
87	702	Db RepresentaÇÕEs Lt	3	Julio Warken	CUT	Utilidades	39	Cut Geral Monet.	9.000	0	0	3.600	0	0	12.600	0	0	0	0	0	0	-12.600	0	0	0	0
87	702	Db RepresentaÇÕEs Lt	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	21.300	3.048	14,3	74.550	21.134	28,4	95.850	24.182	25,2	0	0	24.182	25,2	-71.668	3.048	33.802	36.850	38,5
87	702	Db RepresentaÇÕEs Lt	3	Julio Warken	GAR	Ferramentas	36	Garibaldi Pro Monet	355	0	0	11.360	18.982	167,1	11.715	18.982	162	0	0	18.982	162	7.267	0	27.667	27.667	236,2
87	705	Comercial Gregorio E	3	Julio Warken	CUT	Utilidades	39	Cut Geral Monet.	8.250	4.379	53,1	0	0	0	8.250	4.379	53,1	0	0	4.379	53,1	-3.871	4.761	0	4.761	57,7
87	705	Comercial Gregorio E	3	Julio Warken	GAR	Ferramentas	36	Garibaldi Pro Monet	8.520	1.748	20,5	9.230	0	0	17.750	1.748	9,9	0	0	1.748	9,9	-16.002	1.748	0	1.748	9,9
87	709	Ahcc RepresentaÇÕEs	3	Julio Warken	CUT	Utilidades	39	Cut Geral Monet.	15.750	1.542	9,8	6.300	0	0	22.050	1.542	7	0	0	1.542	7	-20.508	1.784	0	1.784	8,1
87	709	Ahcc RepresentaÇÕEs	3	Julio Warken	GAR	Ferramentas	36	Garibaldi Pro Monet	4.260	962	22,6	11.360	0	0	15.620	962	6,2	0	0	962	6,2	-14.658	962	0	962	6,2
87	709	Ahcc RepresentaÇÕEs	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	113.600	23.875	21	42.600	0	0	156.200	23.875	15,3	0	0	23.875	15,3	-132.325	25.258	0	25.258	16,2
87	712	F & R Repres Ltda	15	Dionatan	FAR	Utilidades	42	Far Servir Monet.	0	0	0	0	0	0	0	0	0	0	0	0	0		375	0	375	0
87	712	F & R Repres Ltda	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	6.000	7.209	120,2	0	0	0	6.000	7.209	120,2	0	0	7.209	120,2	1.209	7.894	0	7.894	131,6
87	712	F & R Repres Ltda	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	2.840	492	17,3	0	0	0	2.840	492	17,3	0	0	492	17,3	-2.348	1.566	0	1.566	55,1
87	712	F & R Repres Ltda	15	Dionatan	TEC		0	Sem Grupo	0	0	0	0	0	0	0	0	0	0	0	0	0		26.014	0	26.014	0
87	712	F & R Repres Ltda	15	Dionatan	ELT	Elétrica	40	Eletric Residen. Mon	0	816	0	0	0	0	0	816	0	0	0	816	0	816	816	0	816	0
87	715	Debon Repres Ltda (D	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	28.400	-549	1,9	234.300	61.170	26,1	262.700	60.621	23,1	0	0	60.621	23,1	-202.079	-549	65.394	64.845	24,7
87	715	Debon Repres Ltda (D	27	Adriano Almeida	CUT	Utilidades	39	Cut Geral Monet.	3.750	0	0	45.000	0	0	48.750	0	0	0	0	0	0	-48.750	0	0	0	0
87	718	Marcos Gomessat Repr	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	9.750	5.987	61,4	0	0	0	9.750	5.987	61,4	0	0	5.987	61,4	-3.763	13.324	0	13.324	136,7
87	718	Marcos Gomessat Repr	15	Dionatan	ELT	Elétrica	40	Eletric Residen. Mon	0	2.083	0	0	0	0	0	2.083	0	0	0	2.083	0	2.083	2.083	0	2.083	0
87	718	Marcos Gomessat Repr	15	Dionatan	ELT	Elétrica	41	Eletric Indust Mon	0	1.215	0	0	0	0	0	1.215	0	0	0	1.215	0	1.215	1.215	0	1.215	0
87	718	Marcos Gomessat Repr	15	Dionatan	ELT	Elétrica	42	Eletric Ilumin. Mon.	0	1.218	0	0	0	0	0	1.218	0	0	0	1.218	0	1.218	335	0	335	0
87	718	Marcos Gomessat Repr	15	Dionatan	FAR	Utilidades	50	Far Termicos Monet.	0	120	0	0	0	0	0	120	0	0	0	120	0	120	120	0	120	0
87	718	Marcos Gomessat Repr	15	Dionatan	ELT	Elétrica	43	Eletric Extrud. Mon.	0	1.962	0	0	0	0	0	1.962	0	0	0	1.962	0	1.962	1.962	0	1.962	0
87	718	Marcos Gomessat Repr	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	7.100	6.235	87,8	710	0	0	7.810	6.235	79,8	0	0	6.235	79,8	-1.575	7.553	0	7.553	96,7
87	722	Thiago Vicente Repre	15	Dionatan	CUT	Utilidades	38	Cut Antiaderente Mon	0	1.199	0	0	0	0	0	1.199	0	0	0	1.199	0	1.199	1.199	0	1.199	0
87	722	Thiago Vicente Repre	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	4.970	2.418	48,7	710	0	0	5.680	2.418	42,6	0	0	2.418	42,6	-3.262	2.061	0	2.061	36,3
87	722	Thiago Vicente Repre	15	Dionatan	DEL	Lar	36	Delta Plastico Mon.	0	1.647	0	0	0	0	0	1.647	0	0	0	1.647	0	1.647	1.647	0	1.647	0
87	722	Thiago Vicente Repre	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	12.750	13.558	106,3	0	0	0	12.750	13.558	106,3	0	0	13.558	106,3	808	14.850	0	14.850	116,5
87	722	Thiago Vicente Repre	15	Dionatan	ELT	Elétrica	40	Eletric Residen. Mon	0	379	0	0	0	0	0	379	0	0	0	379	0	379	379	0	379	0
87	722	Thiago Vicente Repre	15	Dionatan	TEC		0	Sem Grupo	0	1.027	0	0	0	0	0	1.027	0	0	0	1.027	0	1.027	1.027	0	1.027	0
87	722	Thiago Vicente Repre	15	Dionatan	BEL	Utilidades	35	Belem Geral Mon.	0	491	0	0	0	0	0	491	0	0	0	491	0	491	600	0	600	0
87	726	Fp RepresentaÇÕEs Co	3	Julio Warken	CUT	Utilidades	39	Cut Geral Monet.	7.500	2.117	28,2	1.350	0	0	8.850	2.117	23,9	0	0	2.117	23,9	-6.733	2.225	1.048	3.273	37
87	726	Fp RepresentaÇÕEs Co	3	Julio Warken	GAR	Ferramentas	36	Garibaldi Pro Monet	2.130	2.543	119,4	5.680	0	0	7.810	2.543	32,6	0	0	2.543	32,6	-5.267	4.588	146	4.734	60,6
87	736	Zoodiac RepresentaÇÃ	15	Dionatan	ELT	Elétrica	40	Eletric Residen. Mon	0	361	0	0	0	0	0	361	0	0	0	361	0	361	361	0	361	0
87	736	Zoodiac RepresentaÇÃ	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	33.750	72.473	214,7	0	0	0	33.750	72.473	214,7	0	0	72.473	214,7	38.723	77.723	0	77.723	230,3
87	736	Zoodiac RepresentaÇÃ	15	Dionatan	DEL	Lar	36	Delta Plastico Mon.	0	6.868	0	0	0	0	0	6.868	0	0	0	6.868	0	6.868	8.337	0	8.337	0
87	736	Zoodiac RepresentaÇÃ	15	Dionatan	TEC		0	Sem Grupo	0	242	0	0	0	0	0	242	0	0	0	242	0	242	242	0	242	0
87	736	Zoodiac RepresentaÇÃ	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	3.550	2.980	84	710	0	0	4.260	2.980	70	0	0	2.980	70	-1.280	2.980	0	2.980	70
87	736	Zoodiac RepresentaÇÃ	15	Dionatan	FAR	Utilidades	43	Far Talheres Monet.	0	1.451	0	0	0	0	0	1.451	0	0	0	1.451	0	1.451	1.451	0	1.451	0
87	739	C M 11 Representacoe	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	0	0	0	99.400	181.238	182,3	99.400	181.238	182,3	0	1.393	182.631	183,7	83.231	0	184.145	184.145	185,3
87	739	C M 11 Representacoe	27	Adriano Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	0	0	0	15.620	17.479	111,9	15.620	17.479	111,9	0	0	17.479	111,9	1.859	0	17.540	17.540	112,3
87	741	Fortaleza E FranÇA R	15	Dionatan	TEC		0	Sem Grupo	0	332	0	0	0	0	0	332	0	0	0	332	0	332	332	0	332	0
87	741	Fortaleza E FranÇA R	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	106.500	100.069	94	24.850	4.023	16,2	131.350	104.092	79,3	0	0	104.092	79,3	-27.258	113.931	2.601	116.531	88,7
87	741	Fortaleza E FranÇA R	15	Dionatan	DEL	Lar	36	Delta Plastico Mon.	0	225	0	0	0	0	0	225	0	0	0	225	0	225	486	0	486	0
87	741	Fortaleza E FranÇA R	15	Dionatan	ELT	Elétrica	40	Eletric Residen. Mon	0	389	0	0	0	0	0	389	0	0	0	389	0	389	389	0	389	0
87	741	Fortaleza E FranÇA R	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	12.750	8.376	65,7	0	0	0	12.750	8.376	65,7	0	0	8.376	65,7	-4.374	13.157	0	13.157	103,2
87	741	Fortaleza E FranÇA R	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	7.810	8.444	108,1	4.260	0	0	12.070	8.444	70	0	0	8.444	70	-3.626	7.894	0	7.894	65,4
87	747	Romulo E Silvia Rep.	10	Juan Almeida	ELT	Elétrica	41	Eletric Indust Mon	0	87	0	0	0	0	0	87	0	0	0	87	0	87	87	0	87	0
87	747	Romulo E Silvia Rep.	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	6.375	1.642	25,8	0	0	0	6.375	1.642	25,8	0	0	1.642	25,8	-4.733	3.405	0	3.405	53,4
87	747	Romulo E Silvia Rep.	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	1.420	3.081	217	359.970	448.056	124,5	361.390	451.137	124,8	0	0	451.137	124,8	89.747	3.081	553.554	556.635	154
87	753	C Oliveira Repres Lt	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	4.260	6.547	153,7	1.420	0	0	5.680	6.547	115,3	0	0	6.547	115,3	867	7.020	0	7.020	123,6
87	753	C Oliveira Repres Lt	15	Dionatan	FAR	Utilidades	50	Far Termicos Monet.	0	210	0	0	0	0	0	210	0	0	0	210	0	210	210	0	210	0
87	753	C Oliveira Repres Lt	15	Dionatan	FAR	Utilidades	41	Far Panelas Monet.	0	664	0	0	0	0	0	664	0	0	0	664	0	664	664	0	664	0
87	753	C Oliveira Repres Lt	15	Dionatan	ELT	Elétrica	40	Eletric Residen. Mon	0	1.749	0	0	0	0	0	1.749	0	0	0	1.749	0	1.749	1.504	0	1.504	0
87	753	C Oliveira Repres Lt	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	85.200	96.899	113,7	14.200	0	0	99.400	96.899	97,5	0	0	96.899	97,5	-2.501	92.222	0	92.222	92,8
87	753	C Oliveira Repres Lt	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	9.750	6.650	68,2	0	0	0	9.750	6.650	68,2	0	0	6.650	68,2	-3.100	6.738	0	6.738	69,1
87	753	C Oliveira Repres Lt	15	Dionatan	TEC		0	Sem Grupo	0	285	0	0	0	0	0	285	0	0	0	285	0	285	285	0	285	0
87	756	E & T Repres. Comerc	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	35.500	9.982	28,1	21.300	6.811	32	56.800	16.794	29,6	0	0	16.794	29,6	-40.006	7.485	6.811	14.296	25,2
87	756	E & T Repres. Comerc	3	Julio Warken	GAR	Ferramentas	36	Garibaldi Pro Monet	1.420	0	0	0	53.040	0	1.420	53.040	3735,2	0	0	53.040	3735,2	51.620	0	53.232	53.232	3748,7
87	756	E & T Repres. Comerc	3	Julio Warken	CUT	Utilidades	39	Cut Geral Monet.	7.500	204	2,7	0	0	0	7.500	204	2,7	0	0	204	2,7	-7.296	204	0	204	2,7
87	766	Pragora Com De Mat D	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	106.500	104.503	98,1	28.400	11.376	40,1	134.900	115.878	85,9	0	0	115.878	85,9	-19.022	119.658	26.638	146.297	108,5
87	766	Pragora Com De Mat D	15	Dionatan	CUT	Utilidades	38	Cut Antiaderente Mon	0	339	0	0	0	0	0	339	0	0	0	339	0	339	339	0	339	0
87	766	Pragora Com De Mat D	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	18.750	16.780	89,5	0	0	0	18.750	16.780	89,5	0	0	16.780	89,5	-19.022	21.898	0	21.898	116,8
87	766	Pragora Com De Mat D	15	Dionatan	CUT	Utilidades	37	Cut Churrasco Mon	0	36	0	0	0	0	0	36	0	0	0	36	0	36	36	0	36	0
87	766	Pragora Com De Mat D	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	2.840	4.373	154	1.420	32	2,3	4.260	4.405	103,4	0	0	4.405	103,4	145	6.581	245	6.826	160,2
87	766	Pragora Com De Mat D	15	Dionatan	FAR	Utilidades	50	Far Termicos Monet.	0	36	0	0	0	0	0	36	0	0	0	36	0	36	36	0	36	0
87	769	Mab Repres Ltda	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	0	0	0	127.800	161.619	126,5	127.800	161.619	126,5	0	0	161.619	126,5	33.819	0	265.541	265.541	207,8
87	769	Mab Repres Ltda	27	Adriano Almeida	CUT	Utilidades	39	Cut Geral Monet.	0	0	0	19.800	103.110	520,8	19.800	103.110	520,8	0	0	103.110	520,8	83.310	0	0	0	0
87	770	Mt Cardoso Represent	27	Adriano Almeida	CUT	Utilidades	39	Cut Geral Monet.	0	0	0	22.500	50.174	223	22.500	50.174	223	0	0	50.174	223	27.674	0	50.174	50.174	223
87	770	Mt Cardoso Represent	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	0	10.627	0	113.600	89.901	79,1	113.600	100.528	88,5	0	0	100.528	88,5	-13.072	16.458	96.960	113.418	99,8
87	771	Enr RepresentaÇÕEs L	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	8.520	43	0,5	35.500	38.558	108,6	44.020	38.601	87,7	0	1.683	40.283	91,5	-3.737	7.872	42.605	50.476	114,7
87	771	Enr RepresentaÇÕEs L	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	9.000	7.074	78,6	0	0	0	9.000	7.074	78,6	0	0	7.074	78,6	-1.926	7.119	0	7.119	79,1
87	771	Enr RepresentaÇÕEs L	10	Juan Almeida	TEC		0	Sem Grupo	0	48	0	0	0	0	0	48	0	0	0	48	0	48	48	0	48	0
87	771	Enr RepresentaÇÕEs L	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	35.500	26.394	74,4	17.750	14.114	79,5	53.250	40.508	76,1	0	0	40.508	76,1	-12.742	33.760	11.553	45.313	85,1
87	775	Trl Com Mat De Const	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	6.000	2.463	41,1	0	0	0	6.000	2.463	41,1	0	0	2.463	41,1	-3.537	4.727	0	4.727	78,8
87	775	Trl Com Mat De Const	15	Dionatan	CUT	Utilidades	37	Cut Churrasco Mon	0	143	0	0	0	0	0	143	0	0	0	143	0	143	143	0	143	0
87	775	Trl Com Mat De Const	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	42.600	28.557	67	3.550	0	0	46.150	28.557	61,9	0	0	28.557	61,9	-17.593	33.035	8.704	41.739	90,4
87	775	Trl Com Mat De Const	15	Dionatan	ELT	Elétrica	40	Eletric Residen. Mon	0	220	0	0	0	0	0	220	0	0	0	220	0	220	220	0	220	0
87	775	Trl Com Mat De Const	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	6.390	3.363	52,6	44.020	42.400	96,3	50.410	45.764	90,8	0	0	45.764	90,8	-4.646	3.624	178.116	181.740	360,5
87	775	Trl Com Mat De Const	15	Dionatan	FAR	Utilidades	50	Far Termicos Monet.	0	762	0	0	0	0	0	762	0	0	0	762	0	762	921	0	921	0
87	776	Silva Couto Repres L	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	11.250	8.209	73	0	0	0	11.250	8.209	73	0	0	8.209	73	-3.041	8.869	0	8.869	78,8
87	776	Silva Couto Repres L	15	Dionatan	ELT	Elétrica	40	Eletric Residen. Mon	0	50	0	0	0	0	0	50	0	0	0	50	0	50	50	0	50	0
87	776	Silva Couto Repres L	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	127.800	160.681	125,7	28.400	2.678	9,4	156.200	163.359	104,6	0	0	163.359	104,6	7.159	171.785	3.686	175.471	112,3
87	776	Silva Couto Repres L	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	3.550	3.529	99,4	29.110	48.923	168,1	32.660	52.452	160,6	0	0	52.452	160,6	19.792	3.554	53.571	57.125	174,9
87	776	Silva Couto Repres L	15	Dionatan	TEC		0	Sem Grupo	0	75	0	0	0	0	0	75	0	0	0	75	0	75	75	0	75	0
87	776	Silva Couto Repres L	15	Dionatan	DEL	Lar	36	Delta Plastico Mon.	0	389	0	0	0	0	0	389	0	0	0	389	0	389	389	0	389	0
87	778	Renascer RepresentaÇ	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	3.550	520	14,6	110.050	102.698	93,3	113.600	103.218	90,9	0	0	103.218	90,9	-10.382	520	150.076	150.596	132,6
87	778	Renascer RepresentaÇ	15	Dionatan	FAR	Utilidades	42	Far Servir Monet.	0	374	0	0	0	0	0	374	0	0	0	374	0	374	374	0	374	0
87	778	Renascer RepresentaÇ	15	Dionatan	FAR	Utilidades	41	Far Panelas Monet.	0	158	0	0	0	0	0	158	0	0	0	158	0	158	158	0	158	0
87	778	Renascer RepresentaÇ	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	10.500	11.811	112,5	1.800	0	0	12.300	11.811	96	0	0	11.811	96	-489	12.592	0	12.592	102,4
87	778	Renascer RepresentaÇ	15	Dionatan	ELT	Elétrica	40	Eletric Residen. Mon	0	687	0	0	0	0	0	687	0	0	0	687	0	687	687	0	687	0
87	778	Renascer RepresentaÇ	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	42.600	43.341	101,7	21.300	17.738	83,3	63.900	61.079	95,6	0	0	61.079	95,6	-2.821	47.445	21.317	68.762	107,6
87	784	Fontenele Representa	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	78.100	83.324	106,7	56.800	3.460	6,1	134.900	86.784	64,3	0	0	86.784	64,3	-48.116	102.522	5.711	108.233	80,2
87	784	Fontenele Representa	3	Julio Warken	ELT	Elétrica	40	Eletric Residen. Mon	0	0	0	0	0	0	0	0	0	0	0	0	0		347	0	347	0
87	784	Fontenele Representa	3	Julio Warken	CUT	Utilidades	39	Cut Geral Monet.	7.500	4.594	61,3	1.800	0	0	9.300	4.594	49,4	0	0	4.594	49,4	-4.706	5.016	0	5.016	53,9
87	784	Fontenele Representa	3	Julio Warken	GAR	Ferramentas	36	Garibaldi Pro Monet	5.680	2.249	39,6	5.680	0	0	11.360	2.249	19,8	0	0	2.249	19,8	-9.111	2.175	0	2.175	19,1
87	787	Igor Michel Repres L	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	10.650	2.001	18,8	85.200	0	0	95.850	2.001	2,1	0	0	2.001	2,1	-93.849	5.922	101.231	107.154	111,8
87	787	Igor Michel Repres L	3	Julio Warken	CUT	Utilidades	39	Cut Geral Monet.	1.500	1.323	88,2	0	0	0	1.500	1.323	88,2	0	0	1.323	88,2	-177	3.647	0	3.647	243,1
87	787	Igor Michel Repres L	3	Julio Warken	GAR	Ferramentas	36	Garibaldi Pro Monet	710	0	0	2.130	5.019	235,6	2.840	5.019	176,7	0	0	5.019	176,7	2.179	0	6.986	6.986	246
87	789	Dlm RepresentaÇÕEs C	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	39.050	41.923	107,4	10.650	0	0	49.700	41.923	84,4	0	0	41.923	84,4	-7.777	44.580	0	44.580	89,7
87	789	Dlm RepresentaÇÕEs C	3	Julio Warken	GAR	Ferramentas	36	Garibaldi Pro Monet	3.550	4.114	115,9	2.840	0	0	6.390	4.114	64,4	0	0	4.114	64,4	-2.276	511	0	511	8
87	789	Dlm RepresentaÇÕEs C	3	Julio Warken	CUT	Utilidades	39	Cut Geral Monet.	6.750	7.711	114,2	1.800	0	0	8.550	7.711	90,2	0	0	7.711	90,2	-839	8.643	0	8.643	101,1
87	789	Dlm RepresentaÇÕEs C	3	Julio Warken	ELT	Elétrica	40	Eletric Residen. Mon	0	359	0	0	0	0	0	359	0	0	0	359	0	359	735	0	735	0
87	794	Manoel Rodrigues De	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	71.000	82.299	115,9	28.400	0	0	99.400	82.299	82,8	0	0	82.299	82,8	-17.101	102.585	-10.488	92.097	92,7
87	794	Manoel Rodrigues De	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	1.420	1.449	102	1.420	0	0	2.840	1.449	51	0	0	1.449	51	-1.391	3.037	0	3.037	107
87	794	Manoel Rodrigues De	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	16.500	29.508	178,8	0	0	0	16.500	29.508	178,8	0	0	29.508	178,8	13.008	29.508	0	29.508	178,8
87	794	Manoel Rodrigues De	10	Juan Almeida	FAR	Utilidades	43	Far Talheres Monet.	0	134	0	0	0	0	0	134	0	0	0	134	0	134	134	0	134	0
87	796	Ventine E LourenÇO L	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	35.500	43.193	121,7	14.200	30.646	215,8	49.700	73.839	148,6	0	0	73.839	148,6	24.139	45.790	30.971	76.761	154,5
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

  return (
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-sm max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-800">Importação Dinâmica de Planilhas (TSV / Excel)</h2>
          <p className="text-sm text-slate-500">
            Atualmente, o dashboard está rodando com <strong className="text-slate-800">{currentRecordsCount} registros</strong>.
            Você pode atualizar os dados colando o relatório de vendas copiado diretamente do Excel, ou alternar entre os presets fornecidos.
          </p>
        </div>
      </div>

      {successStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center gap-2 text-sm"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successStatus}</span>
        </motion.div>
      )}

      {errorStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-center gap-2 text-sm"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorStatus}</span>
        </motion.div>
      )}

      {/* Preset Fast loaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col justify-between space-y-3 shadow-sm">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-500" />
              Conjunto Reduzido (Foco)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Carrega os 35 principais registros que mostram os principais representantes, vendas CD/VP e coordenadorias.
            </p>
          </div>
          <button
            onClick={loadDefaults}
            className="w-full text-xs bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold py-2 px-3 rounded-lg transition-colors cursor-pointer"
          >
            Carregar 35 Linhas Principais
          </button>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-100 flex flex-col justify-between space-y-3 shadow-sm">
          <div>
            <h3 className="font-semibold text-indigo-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Planilha Completa Relatório (130+ Linhas)
            </h3>
            <p className="text-xs text-indigo-700/70 mt-1">
              Importa e processa 100% das linhas detalhadas fornecidas do relatório original (representantes, divisões elétricas, churrasco, far, etc.) com todos os KPIs integrados.
            </p>
          </div>
          <button
            onClick={loadFullSpreadsheet}
            className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-2 px-3 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            🔥 Importar Planilha Completa (130+ Registros)
          </button>
        </div>
      </div>

      {/* Manual Paste Form */}
      <form onSubmit={onPasteSubmit} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-semibold text-slate-700">Ou Cole Novos Dados Manualmente:</label>
          <span className="text-xs text-slate-400">Separados por Tabulação (TSV)</span>
        </div>
        
        <textarea
          rows={6}
          value={tsvText}
          onChange={(e) => setTsvText(e.target.value)}
          placeholder={`AGE\tREP\tNOME REPRESENTANTE\tCOORD\tNOME COORDENADOR\tEMP\t...\n87\t309\tE A Nogueira Represe\t10\tJuan Almeida\tCUT\tUtilidades\t39\tCut Geral Monet.\t3.000\t5.374\t179,1\t...`}
          className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
        />

        <div className="flex justify-between items-center">
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Dica: Copie as células diretamente da sua planilha do Excel ou Google Sheets e cole aqui.
          </p>
          <button
            type="submit"
            disabled={!tsvText.trim()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar Dados Digitados
          </button>
        </div>
      </form>
    </div>
  );
};
