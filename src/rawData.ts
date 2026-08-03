import { SalesRecord } from './types';

export function parsePortugueseNumber(val: string | undefined): number {
  if (!val) return 0;
  let cleaned = val.trim().replace(/\s/g, '').replace('R$', '');
  if (cleaned === "" || cleaned === "-" || cleaned === "Sem Grupo") return 0;
  
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Both separators, e.g., 2.000.000,50
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Only comma, e.g., 19,90
    cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes('.')) {
    // Only dots, e.g., 2.000.000 or 19.90
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      if (/\.\d{3}$/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseTSV(tsvText: string): SalesRecord[] {
  const lines = tsvText.split('\n');
  const records: SalesRecord[] = [];
  
  let lineIdx = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Ignore column titles and headers
    if (line.includes("VALORES MONETÁRIOS DE VENDA") || line.startsWith("AGE\tREP") || line.startsWith("\t\t\t")) {
      continue;
    }
    
    const cols = line.split('\t');
    if (cols.length < 15) continue; // Skip invalid columns
    
    const ageCode = parseInt(cols[0]?.trim()) || 0;
    const repId = parseInt(cols[1]?.trim()) || 0;
    const repName = cols[2]?.trim() || '';
    
    const repNameLower = repName.toLowerCase().trim();
    const lineLower = line.toLowerCase();
    
    // Check if it's a total row, invalid row, or summary/totals row from Excel/Google Sheets.
    // Real representative rows must have a valid non-zero numeric ID.
    // If repId is 0 or NaN, or if repName is empty, it's not a valid representative data row.
    if (!repId || isNaN(repId) || !repName) {
      continue;
    }
    
    // Explicit check for exact matches of total/soma keywords in repName or tab separators,
    // avoiding partial substring matches that skip real people like "Geraldo".
    const isExplicitTotalRow = 
      repNameLower === "total" ||
      repNameLower === "soma" ||
      repNameLower === "total geral" ||
      repNameLower === "soma geral" ||
      repNameLower === "resumo" ||
      repNameLower === "resultado" ||
      repNameLower === "total de vendas" ||
      lineLower.includes("\ttotal\t") ||
      lineLower.includes("\tsoma\t");
      
    if (isExplicitTotalRow) {
      continue;
    }
    
    const coordId = parseInt(cols[3]?.trim()) || 0;
    const coordName = cols[4]?.trim() || '';
    const emp = cols[5]?.trim() || '';
    const linha = cols[6]?.trim() || 'Sem Linha';
    const groupId = parseInt(cols[7]?.trim()) || 0;
    const groupName = cols[8]?.trim() || 'Sem Grupo';
    
    const quotaCD = parsePortugueseNumber(cols[9]);
    const faturadoCD = parsePortugueseNumber(cols[10]);
    const valorVendaCD = parsePortugueseNumber(cols[23] || '0');
    const pctCD = quotaCD > 0 ? (valorVendaCD / quotaCD) * 100 : 0;
    
    const quotaVP = parsePortugueseNumber(cols[12]);
    const faturadoVP = parsePortugueseNumber(cols[13]);
    const valorVendaVP = parsePortugueseNumber(cols[24] || '0');
    const pctVP = quotaVP > 0 ? (valorVendaVP / quotaVP) * 100 : 0;
    
    const quotaTotal = parsePortugueseNumber(cols[15]);
    const faturadoTotal = parsePortugueseNumber(cols[16]);
    const valorVendaTotal = parsePortugueseNumber(cols[25] || '0');
    const pctTotal = quotaTotal > 0 ? (valorVendaTotal / quotaTotal) * 100 : 0;
    
    const pendenteCD = parsePortugueseNumber(cols[18] || '0');
    const pendenteVP = parsePortugueseNumber(cols[19] || '0');
    
    const faturadoEPendente = parsePortugueseNumber(cols[20] || '0');
    const pctFaturadoEPendente = quotaTotal > 0 ? (faturadoEPendente / quotaTotal) * 100 : 0;
    
    // defasagem: subtrair venda (valorVendaTotal) pelo valor da cota (quotaTotal)
    const defasagem = valorVendaTotal - quotaTotal;
    
    const pctVenda = quotaTotal > 0 ? (valorVendaTotal / quotaTotal) * 100 : 0;
    
    records.push({
      id: `${repId}-${emp}-${groupId}-${lineIdx++}`,
      age: ageCode,
      repId,
      repName,
      coordId,
      coordName,
      emp,
      linha,
      groupId,
      groupName,
      quotaCD,
      faturadoCD,
      pctCD,
      quotaVP,
      faturadoVP,
      pctVP,
      quotaTotal,
      faturadoTotal,
      pctTotal,
      pendenteCD,
      pendenteVP,
      faturadoEPendente,
      pctFaturadoEPendente,
      defasagem,
      valorVendaCD,
      valorVendaVP,
      valorVendaTotal,
      pctVenda
    });
  }
  
  return records;
}

// Representative sample rows for standard start, fully populated.
// Users can use the raw file importer inside the dashboard to load more.
export const INITIAL_RAW_DATA = `AGE	REP	NOME REPRESENTANTE	COORD	NOME COORDENADOR	EMP	LINHA	GRUPO	NOME GRUPO	QUOTA CD	FATURADO CD	% CD	QUOTA VP	FATURADO VP	% VP	QUOTA TOTAL	FATURADO TOTAL	% TOTAL	PENDENTE CD	PENDENTE VP	FATURADO E PENDENTE	%	DEFASAGEM	VALOR DE VENDA CD	VALOR DE VENDA VP	VALOR DE VENDA TOTAL	% VENDA
87	309	E A Nogueira Represe	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	3.000	5.374	179,1	0	0	0	3.000	5.374	179,1	0	0	5.374	179,1	2.374	5.374	0	5.374	179,1
87	309	E A Nogueira Represe	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	42.600	57.582	135,2	63.900	60.259	94,3	106.500	117.841	110,7	0	0	117.841	110,7	11.341	38.657	24.785	63.442	59,6
87	309	E A Nogueira Represe	10	Juan Almeida	MUL		0	Sem Grupo	65.600	61.973	94,5	188.000	69.298	36,9	253.600	131.271	51,8	0	0	131.271	51,8	-122.329	50.510	52.484	102.994	40,6
87	309	E A Nogueira Represe	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	355	205	57,9	4.970	0	0	5.325	205	3,9	0	0	205	3,9	-5.120	205	0	205	3,9
87	311	Mab Guimaraes E Repr	27	Adriano Almeida	MUL		0	Sem Grupo	0	0	0	1.000.000	1.257.354	125,7	1.000.000	1.257.354	125,7	0	0	1.257.354	125,7	257.354	0	1.227.850	1.227.850	122,8
87	311	Mab Guimaraes E Repr	27	Adriano Almeida	CUT	Utilidades	39	Cut Geral Monet.	0	0	0	22.500	0	0	22.500	0	0	0	0	0	0	-22.500	0	0	0	0
87	311	Mab Guimaraes E Repr	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	21.300	0	0	156.200	207.489	132,8	177.500	207.489	116,9	0	0	207.489	116,9	29.989	0	208.130	208.130	117,3
87	319	Ebl Com & Repres De	27	Adriano Almeida	CUT	Utilidades	39	Cut Geral Monet.	0	0	0	94.500	143.792	152,2	94.500	143.792	152,2	0	0	143.792	152,2	49.292	0	143.792	143.792	152,2
87	319	Ebl Com & Repres De	27	Adriano Almeida	MUL		0	Sem Grupo	0	0	0	464.000	799.581	172,3	464.000	799.581	172,3	0	0	799.581	172,3	335.581	0	954.128	954.128	205,6
87	319	Ebl Com & Repres De	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	41.890	71.494	170,7	284.000	360.352	126,9	325.890	431.845	132,5	0	0	431.845	132,5	105.955	71.494	442.035	513.528	157,6
87	345	Gf Represe Ltda	27	Adriano Almeida	CUT	Utilidades	39	Cut Geral Monet.	0	0	0	3.600	8.235	228,7	3.600	8.235	228,7	0	0	8.235	228,7	4.635	0	8.235	8.235	228,7
87	345	Gf Represe Ltda	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	17.750	73.748	415,5	63.900	360.572	564,3	81.650	434.320	531,9	0	0	434.320	531,9	352.670	75.016	385.080	460.096	563,5
87	345	Gf Represe Ltda	27	Adriano Almeida	MUL		0	Sem Grupo	0	0	0	480.000	626.719	130,6	480.000	626.719	130,6	0	0	626.719	130,6	146.719	0	643.848	643.848	134,1
87	348	Ara Repres Ltda	27	Adriano Almeida	CUT	Utilidades	39	Cut Geral Monet.	11.250	17.922	159,3	19.800	18.741	94,7	31.050	36.663	118,1	0	0	36.663	118,1	5.613	17.922	18.741	36.663	118,1
87	348	Ara Repres Ltda	27	Adriano Almeida	MUL		0	Sem Grupo	0	6.812	0	2.232.000	1.529.851	68,5	2.232.000	1.536.663	68,9	0	0	1.536.663	68,9	-695.338	6.812	1.731.816	1.738.628	77,9
87	348	Ara Repres Ltda	27	Adriano Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	14.200	0	0	624.800	581.660	93,1	639.000	581.660	91	0	0	581.660	91	-57.340	6.904	634.714	641.618	100,4
87	352	Barbosa & Boulitreau	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	11.250	4.216	37,5	0	0	0	11.250	4.216	37,5	0	0	4.216	37,5	-7.034	4.893	0	4.893	43,5
87	352	Barbosa & Boulitreau	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	2.840	1.488	52,4	14.200	7.179	50,6	17.040	8.667	50,9	0	0	8.667	50,9	-8.373	1.577	7.995	9.572	56,2
87	352	Barbosa & Boulitreau	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	113.600	112.536	99,1	92.300	28.923	31,3	205.900	141.459	68,7	89	0	141.548	68,8	-64.352	134.549	44.131	178.680	86,8
87	352	Barbosa & Boulitreau	10	Juan Almeida	MUL		0	Sem Grupo	172.200	146.599	85,1	272.000	143.392	52,7	444.200	289.990	65,3	0	4.205	294.196	66,2	-150.004	160.215	204.103	364.318	82
87	362	L & G Medeiros E Mac	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	74.550	115.183	154,5	28.400	4.825	17	102.950	120.008	116,6	0	0	120.008	116,6	17.058	118.623	0	118.623	115,2
87	362	L & G Medeiros E Mac	10	Juan Almeida	GAR	Ferramentas	36	Garibaldi Pro Monet	2.840	3.685	129,8	7.100	604	8,5	9.940	4.290	43,2	0	0	4.290	43,2	-5.650	4.179	0	4.179	42
87	362	L & G Medeiros E Mac	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	19.500	20.860	107	0	0	0	19.500	20.860	107	0	0	20.860	107	1.360	21.224	0	21.224	108,8
87	362	L & G Medeiros E Mac	10	Juan Almeida	MUL		0	Sem Grupo	147.600	145.791	98,8	64.000	15.819	24,7	211.600	161.610	76,4	0	0	161.610	76,4	-49.990	169.182	26.100	195.281	92,3
87	363	Galba Junior Ltda	3	Julio Warken	GAR	Ferramentas	36	Garibaldi Pro Monet	4.260	7.317	171,8	29.820	6.451	21,6	34.080	13.768	40,4	0	0	13.768	40,4	-20.312	7.317	31.173	38.490	112,9
87	363	Galba Junior Ltda	3	Julio Warken	MUL		0	Sem Grupo	188.600	219.703	116,5	240.000	199.717	83,2	428.600	419.420	97,9	0	0	419.420	97,9	-9.180	195.401	211.506	406.908	94,9
87	363	Galba Junior Ltda	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	85.200	103.547	121,5	49.700	25.521	51,4	134.900	129.068	95,7	0	0	129.068	95,7	-5.832	92.228	23.001	115.229	85,4
87	363	Galba Junior Ltda	3	Julio Warken	CUT	Utilidades	39	Cut Geral Monet.	18.000	18.313	101,7	4.500	0	0	22.500	18.313	81,4	0	0	18.313	81,4	-4.187	13.260	0	13.260	58,9
87	394	Tramontina Nordeste	12	Igor Pedruzzi	FAR	Utilidades	41	Far Panelas Monet.	0	599	0	0	0	0	0	599	0	0	0	599	0	599	599	0	599	0
87	394	Tramontina Nordeste	12	Igor Pedruzzi	FAR	Utilidades	50	Far Termicos Monet.	0	1.336	0	0	0	0	0	1.336	0	0	0	1.336	0	1.336	1.336	0	1.336	0
87	401	Dto Padilha Ltda	15	Dionatan	MUL		0	Sem Grupo	155.800	204.700	131,4	56.000	0	0	211.800	204.700	96,7	0	0	204.700	96,7	-7.100	206.271	0	206.271	97,4
87	401	Dto Padilha Ltda	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	7.100	10.754	151,5	52.540	53.464	101,8	59.640	64.218	107,7	0	0	64.218	107,7	4.578	10.754	60.661	71.415	119,7
87	401	Dto Padilha Ltda	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	21.300	0	0	205.900	198.488	96,4	227.200	198.488	87,4	0	0	198.488	87,4	-28.712	0	307.159	307.159	135,2
87	402	P.H.G. Da Silva & Ci	3	Julio Warken	GAR	Ferramentas	36	Garibaldi Pro Monet	1.420	5.456	384,2	0	0	0	1.420	5.456	384,2	0	0	5.456	384,2	4.036	1.956	0	1.956	137,8
87	402	P.H.G. Da Silva & Ci	3	Julio Warken	CUT	Utilidades	39	Cut Geral Monet.	8.250	11.811	143,2	900	0	0	9.150	11.811	129,1	0	0	11.811	129,1	2.661	11.811	0	11.811	129,1
87	402	P.H.G. Da Silva & Ci	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	31.950	9.738	30,5	7.100	0	0	39.050	9.738	24,9	0	0	9.738	24,9	-29.312	14.504	0	14.504	37,1
87	402	P.H.G. Da Silva & Ci	3	Julio Warken	MUL		0	Sem Grupo	32.800	39.052	119,1	56.000	33.208	59,3	88.800	72.260	81,4	0	0	72.260	81,4	-16.540	51.573	84.718	136.291	153,5
87	404	Tcardoso RepresentaÇ	15	Dionatan	GAR	Ferramentas	36	Garibaldi Pro Monet	4.260	9.713	228	1.420	2.017	142	5.680	11.730	206,5	0	0	11.730	206,5	6.050	11.096	7.355	18.451	324,8
87	404	Tcardoso RepresentaÇ	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	35.500	54.065	152,3	3.550	0	0	39.050	54.065	138,5	0	0	54.065	138,5	15.015	54.948	0	54.948	140,7
87	404	Tcardoso RepresentaÇ	15	Dionatan	MUL		0	Sem Grupo	82.000	94.971	115,8	8.000	0	0	90.000	94.971	105,5	0	0	94.971	105,5	4.971	93.889	0	93.889	104,3
87	405	Mj E A RepresentaÇÕE	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	63.900	93.486	146,3	14.200	7.279	51,3	78.100	100.765	129	0	0	100.765	129	22.665	102.433	7.279	109.712	140,5
87	405	Mj E A RepresentaÇÕE	15	Dionatan	MUL		0	Sem Grupo	213.200	247.762	116,2	36.000	39.597	110	249.200	287.359	115,3	0	0	287.359	115,3	38.159	274.148	39.597	313.745	125,9
87	405	Mj E A RepresentaÇÕE	15	Dionatan	CUT	Utilidades	39	Cut Geral Monet.	15.000	15.989	106,6	0	0	0	15.000	15.989	106,6	0	0	15.989	106,6	989	16.742	0	16.742	111,6
87	431	Arnon Bruno Represen	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	8.625	14.847	172,1	9.000	0	0	17.625	14.847	84,2	0	0	14.847	84,2	-2.778	15.098	0	15.098	85,7
87	431	Arnon Bruno Represen	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	31.950	46.094	144,3	35.500	34.956	98,5	67.450	81.050	120,2	0	0	81.050	120,2	13.600	47.817	34.725	82.542	122,4
87	431	Arnon Bruno Represen	10	Juan Almeida	MUL		0	Sem Grupo	45.100	38.271	84,9	208.000	168.284	80,9	253.100	206.555	81,6	0	0	206.555	81,6	-46.545	42.018	149.205	191.223	75,6
87	432	Aa Pupulin Represent	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	56.800	63.801	112,3	14.200	3.564	25,1	71.000	67.365	94,9	130	0	67.495	95,1	-3.505	89.303	3.564	92.867	130,8
87	432	Aa Pupulin Represent	10	Juan Almeida	MUL		0	Sem Grupo	73.800	76.256	103,3	28.000	10.204	36,4	101.800	86.460	84,9	0	0	86.460	84,9	-15.340	108.778	10.204	118.983	116,9
87	433	CrisÓStomo Represent	10	Juan Almeida	MUL		0	Sem Grupo	36.900	47.068	127,6	88.000	89.480	101,7	124.900	136.549	109,3	0	0	136.549	109,3	11.649	53.519	100.128	153.647	123
87	433	CrisÓStomo Represent	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	28.400	34.005	119,7	17.750	3.060	17,2	46.150	37.065	80,3	0	0	37.065	80,3	-9.085	34.812	31.522	66.334	143,7
87	435	Dalia Representacoes	10	Juan Almeida	CUT	Utilidades	39	Cut Geral Monet.	1.875	11.326	604,1	450	0	0	2.325	11.326	487,2	0	0	11.326	487,2	9.001	15.668	0	15.668	673,9
87	437	M D H RepresentaÇÕEs	10	Juan Almeida	MUL		0	Sem Grupo	41.000	108.395	264,4	64.000	45.604	71,3	105.000	153.999	146,7	0	0	153.999	146,7	48.999	126.449	68.707	195.156	185,9
87	439	E A Nogueira Represe	27	Adriano Almeida	MUL		0	Sem Grupo	0	0	0	1.772.000	1.613.450	91,1	1.772.000	1.613.450	91,1	0	0	1.613.450	91,1	-158.550	0	2.294.394	2.294.394	129,5
87	464	D. Victor Representa	3	Julio Warken	MUL		0	Sem Grupo	4.100	8.276	201,9	52.000	56.996	109,6	56.100	65.272	116,4	0	0	65.272	116,4	9.172	9.630	49.377	59.007	105,2
87	465	Geraldo Silvestre Re	10	Juan Almeida	MUL		0	Sem Grupo	82.000	194.313	237	368.000	29.110	7,9	450.000	223.422	49,7	0	0	223.422	49,7	-226.578	99.277	400.298	499.574	111
87	466	Acop RepresentaÇÕEs	3	Julio Warken	MUL		0	Sem Grupo	73.800	57.499	77,9	80.000	34.919	43,7	153.800	92.418	60,1	0	0	92.418	60,1	-61.382	34.360	24.083	58.444	38
87	472	Fp RepresentaÇÕEs Co	27	Adriano Almeida	MUL		0	Sem Grupo	0	0	0	184.000	403.860	219,5	184.000	403.860	219,5	0	0	403.860	219,5	219.860	0	403.860	403.860	219,5
87	702	Db RepresentaÇÕEs Lt	3	Julio Warken	MUL		0	Sem Grupo	41.000	6.996	17,1	240.000	178.770	74,5	281.000	185.766	66,1	0	0	185.766	66,1	-95.234	6.748	124.163	130.911	46,6
87	705	Comercial Gregorio E	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	82.360	68.388	83	42.600	9.478	22,3	124.960	77.866	62,3	0	0	77.866	62,3	-47.094	68.376	9.478	77.855	62,3
87	712	F & R Repres Ltda	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	53.250	27.896	52,4	10.650	0	0	63.900	27.896	43,7	0	0	27.896	43,7	-36.004	41.688	0	41.688	65,2
87	718	Marcos Gomessat Repr	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	99.400	96.148	96,7	14.200	0	0	113.600	96.148	84,6	0	0	96.148	84,6	-17.452	117.474	0	117.474	103,4
87	722	Thiago Vicente Repre	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	113.600	138.374	121,8	14.200	19.803	139,5	127.800	158.177	123,8	0	0	158.177	123,8	30.377	141.875	19.803	161.677	126,5
87	726	Fp RepresentaÇÕEs Co	3	Julio Warken	GAR	Ferramentas	37	Garibaldi Master Mon	46.150	50.737	109,9	10.650	2.695	25,3	56.800	53.431	94,1	0	0	53.431	94,1	-3.369	67.899	9.204	77.103	135,8
87	736	Zoodiac RepresentaÇÃ	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	60.350	65.294	108,2	10.650	0	0	71.000	65.294	92	0	0	65.294	92	-5.706	73.272	0	73.272	103,2
87	739	C M 11 Representacoe	27	Adriano Almeida	MUL		0	Sem Grupo	0	0	0	520.000	562.477	108,2	520.000	562.477	108,2	0	0	562.477	108,2	42.477	0	595.893	595.893	114,6
87	741	Fortaleza E FranÇA R	15	Dionatan	GAR	Ferramentas	37	Garibaldi Master Mon	106.500	100.069	94	24.850	4.023	16,2	131.350	104.092	79,3	0	0	104.092	79,3	-27.258	113.931	2.601	116.531	88,7
87	747	Romulo E Silvia Rep.	10	Juan Almeida	GAR	Ferramentas	37	Garibaldi Master Mon	3.550	7.243	204	78.100	92.879	118,9	81.650	100.123	122,6	0	0	100.123	122,6	18.473	7.135	139.257	146.392	179,3
87	753	C Oliveira Repres Lt	15	Dionatan	MUL		0	Sem Grupo	270.600	284.243	105	8.000	0	0	278.600	284.243	102	0	0	284.243	102	5.643	287.459	0	287.459	103,2
87	756	E & T Repres. Comerc	3	Julio Warken	MUL		0	Sem Grupo	123.000	32.343	26,3	288.000	40.156	13,9	411.000	72.499	17,6	0	0	72.499	17,6	-338.501	31.173	35.882	67.055	16,3
87	766	Pragora Com De Mat D	15	Dionatan	MUL		0	Sem Grupo	328.000	302.415	92,2	64.000	17.267	27	392.000	319.682	81,6	0	0	319.682	81,6	-72.318	371.008	20.121	391.129	99,8
87	769	Mab Repres Ltda	27	Adriano Almeida	MUL		0	Sem Grupo	0	0	0	704.000	1.103.056	156,7	704.000	1.103.056	156,7	0	0	1.103.056	156,7	399.056	0	2.589.325	2.589.325	367,8
87	770	Mt Cardoso Represent	27	Adriano Almeida	MUL		0	Sem Grupo	0	0	0	492.000	507.601	103,2	492.000	507.601	103,2	0	0	507.601	103,2	15.601	0	597.147	597.147	121,4
87	771	Enr RepresentaÇÕEs L	10	Juan Almeida	MUL		0	Sem Grupo	98.400	65.367	66,4	144.000	108.266	75,2	242.400	173.632	71,6	0	0	173.632	71,6	-68.768	72.324	113.037	185.361	76,5
87	775	Trl Com Mat De Const	15	Dionatan	MUL		0	Sem Grupo	131.200	53.187	40,5	28.000	0	0	159.200	53.187	33,4	0	0	53.187	33,4	-106.013	62.336	44.676	107.012	67,2
87	776	Silva Couto Repres L	15	Dionatan	MUL		0	Sem Grupo	246.000	285.139	115,9	44.000	9.004	20,5	290.000	294.143	101,4	0	0	294.143	101,4	4.143	324.033	9.004	333.037	114,8
87	778	Renascer RepresentaÇ	15	Dionatan	MUL		0	Sem Grupo	246.000	284.254	115,6	24.000	0	0	270.000	284.254	105,3	0	0	284.254	105,3	14.254	312.075	0	312.075	115,6
87	784	Fontenele Representa	3	Julio Warken	MUL		0	Sem Grupo	143.500	85.095	59,3	88.000	59.855	68	231.500	144.949	62,6	0	0	144.949	62,6	-86.551	104.109	70.116	174.225	75,3
87	787	Igor Michel Repres L	3	Julio Warken	MUL		0	Sem Grupo	82.000	97.678	119,1	144.000	2.980	2,1	226.000	100.658	44,5	0	0	100.658	44,5	-125.342	128.399	119.520	247.919	109,7
87	789	Dlm RepresentaÇÕEs C	3	Julio Warken	MUL		0	Sem Grupo	82.000	111.995	136,6	116.000	53.183	45,9	198.000	165.178	83,4	0	0	165.178	83,4	-32.822	118.099	90.040	208.139	105,1
87	794	Manoel Rodrigues De	10	Juan Almeida	MUL		0	Sem Grupo	123.000	120.340	97,8	48.000	60.341	125,7	171.000	180.681	105,7	0	20.240	200.921	117,5	29.921	139.560	70.326	209.886	122,7`;

export function isAllowedPhysicalQuotaGroup(groupName: string | undefined): boolean {
  if (!groupName) return false;
  const lower = groupName.trim().toLowerCase();

  // Exclude non-tools and explicitly excluded items (panelas, tramontina teec, cutelaria, etc.)
  if (
    lower.includes("panela") ||
    lower.includes("tramontina teec") ||
    lower.includes("teec") ||
    lower.includes("starflon") ||
    lower.includes("porcelana") ||
    lower.includes("frigideira") ||
    lower.includes("inox") ||
    lower.includes("plastico") ||
    lower.includes("plástico") ||
    lower.includes("utilidade") ||
    lower.includes("talher") ||
    lower.includes("móveis") ||
    lower.includes("moveis") ||
    lower.includes("lixeira") ||
    lower.includes("pia") ||
    lower.includes("cuba") ||
    lower.includes("disjuntor") ||
    lower.includes("interruptor") ||
    lower.includes("cutelaria") ||
    lower.includes("churrasco")
  ) {
    return false;
  }

  // Allowed list of 10 categories:
  // 1. Facões
  if (lower.includes("facoe") || lower.includes("facõe") || lower.includes("facao") || lower.includes("facão")) return true;
  // 2. Articulados
  if (lower.includes("articulado")) return true;
  // 3. Martelos
  if (lower.includes("martelo")) return true;
  // 4. Chaves de Aperto
  if (lower.includes("chaves de aperto") || lower.includes("chave de aperto")) return true;
  // 5. Chaves de Fenda
  if (lower.includes("chaves de fenda") || lower.includes("chave de fenda")) return true;
  // 6. Ferramentas elétricas
  if (
    lower.includes("ferram. eletrica") || lower.includes("ferram. elétrica") ||
    lower.includes("ferramentas eletrica") || lower.includes("ferramentas elétrica") ||
    lower.includes("ferram. eletricas") || lower.includes("ferram. elétricas") ||
    lower.includes("ferramentas eletricas") || lower.includes("ferramentas elétricas") ||
    lower.includes("ferramenta eletrica") || lower.includes("ferramenta elétrica") ||
    (lower.includes("eletrica") && !lower.includes("residen")) || (lower.includes("elétrica") && !lower.includes("residen"))
  ) return true;
  // 7. Brocas
  if (lower.includes("broca")) return true;
  // 8. Carrinhos de Mão
  if (lower.includes("carrinhos de mao") || lower.includes("carrinhos de mão") || lower.includes("carrinho de mao") || lower.includes("carrinho de mão") || lower.includes("carrinho")) return true;
  // 9. Pás
  if (lower === "pas" || lower === "pás" || lower.startsWith("pas ") || lower.startsWith("pás ") || lower.endsWith(" pas") || lower.endsWith(" pás") || lower === "pa" || lower === "pà" || lower.includes(" pá") || lower.includes(" pa ")) return true;
  // 10. Mangueira
  if (lower.includes("mangueira")) return true;

  return false;
}

export function parsePhysicalQuotaTSV(tsvText: string): import('./types').PhysicalQuotaRecord[] {
  const lines = tsvText.split('\n');
  const records: import('./types').PhysicalQuotaRecord[] = [];

  const headerIndices = {
    repId: -1,
    repName: -1,
    coordName: -1,
    linha: -1,
    groupName: -1,
    quota: -1,
    venda: -1,
  };

  let hasCustomHeader = false;
  let idx = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    const lower = line.toLowerCase();
    
    // Check if title or column header
    if (lower.includes("valores físicos") || lower.includes("valores fisicos")) {
      continue;
    }

    // Check header line defining column names
    if (lower.includes("faturado e pendente") || (lower.includes("quota total") && lower.includes("faturado"))) {
      const hCols = line.split(/\t|;|\|/).map(c => c.trim().toLowerCase());
      
      hCols.forEach((col, cIdx) => {
        if ((col === "rep" || col === "cód" || col === "cod") && headerIndices.repId === -1) {
          headerIndices.repId = cIdx;
        } else if (col.includes("nome representante") || col === "representante") {
          headerIndices.repName = cIdx;
        } else if (col.includes("nome coordenador") || col.includes("coordenador")) {
          headerIndices.coordName = cIdx;
        } else if (col === "linha" || col.includes("linha")) {
          headerIndices.linha = cIdx;
        } else if (col.includes("nome grupo") || col === "grupo") {
          headerIndices.groupName = cIdx;
        } else if (col.includes("quota total") || col.includes("cota física") || col === "quota") {
          headerIndices.quota = cIdx;
        } else if (col.includes("faturado e pendente") || col.includes("venda total") || col.includes("venda física")) {
          headerIndices.venda = cIdx;
        }
      });

      if (headerIndices.venda !== -1 || headerIndices.quota !== -1) {
        hasCustomHeader = true;
      }
      continue;
    }

    const cols = line.split(/\t|;|\|/).map(c => c.trim());
    if (cols.length < 2) continue;

    let repId = 0;
    let repName = '';
    let coordName = 'Juan Almeida';
    let linhaName = '';
    let groupName = 'Ferramentas Geral';
    let cotaFisica = 0;
    let vendaFisica = 0;

    // Check Linha filtering for standard 14+ column Tramontina structure
    if (cols.length >= 14 && /^\d+$/.test(cols[1])) {
      linhaName = cols[5] || '';
      // If a Linha is provided and it is NOT Ferramentas, skip this row
      if (linhaName && !linhaName.toLowerCase().includes("ferramenta")) {
        continue;
      }
      repId = parseInt(cols[1]);
      repName = cols[2];
      coordName = cols[4] || 'Juan Almeida';
      groupName = cols[7] || cols[5] || 'Ferramentas Geral';
      cotaFisica = parsePortugueseNumber(cols[8]);
      vendaFisica = parsePortugueseNumber(cols[13]); // FATURADO E PENDENTE (Venda Total)
    } else if (hasCustomHeader && headerIndices.venda !== -1 && headerIndices.quota !== -1) {
      if (headerIndices.linha !== -1 && cols[headerIndices.linha]) {
        linhaName = cols[headerIndices.linha];
        if (linhaName && !linhaName.toLowerCase().includes("ferramenta")) {
          continue;
        }
      }

      if (headerIndices.repId !== -1 && cols[headerIndices.repId]) {
        repId = parseInt(cols[headerIndices.repId]);
      } else if (cols[1] && /^\d+$/.test(cols[1])) {
        repId = parseInt(cols[1]);
      }

      if (headerIndices.repName !== -1 && cols[headerIndices.repName]) {
        repName = cols[headerIndices.repName];
      }
      if (headerIndices.coordName !== -1 && cols[headerIndices.coordName]) {
        coordName = cols[headerIndices.coordName];
      }
      if (headerIndices.groupName !== -1 && cols[headerIndices.groupName]) {
        groupName = cols[headerIndices.groupName];
      }
      if (headerIndices.quota !== -1 && cols[headerIndices.quota]) {
        cotaFisica = parsePortugueseNumber(cols[headerIndices.quota]);
      }
      if (headerIndices.venda !== -1 && cols[headerIndices.venda]) {
        vendaFisica = parsePortugueseNumber(cols[headerIndices.venda]);
      }
    } else {
      // Heuristics based on column counts:
      if (cols.length >= 6 && /^\d+$/.test(cols[0])) {
        repId = parseInt(cols[0]);
        repName = cols[1];
        coordName = cols[2];
        groupName = cols[3] || 'Ferramentas Geral';
        cotaFisica = parsePortugueseNumber(cols[4]);
        vendaFisica = parsePortugueseNumber(cols[5]);
      } else if (cols.length >= 7 && /^\d+$/.test(cols[1])) {
        repId = parseInt(cols[1]);
        repName = cols[2];
        coordName = cols[3];
        groupName = cols[4] || 'Ferramentas Geral';
        cotaFisica = parsePortugueseNumber(cols[5]);
        vendaFisica = parsePortugueseNumber(cols[6]);
      } else {
        cols.forEach((col, cIdx) => {
          if (!col) return;
          if (/^\d{3,6}$/.test(col) && repId === 0) {
            repId = parseInt(col);
          } else if ((cIdx === 1 || cIdx === 2) && !repName && !/^\d+$/.test(col) && col.length > 2) {
            repName = col;
          } else if (cIdx === 3 && !/^\d+$/.test(col) && col.length > 2) {
            coordName = col;
          }
        });

        if (cols.length >= 2) {
          cotaFisica = parsePortugueseNumber(cols[cols.length - 2]);
          vendaFisica = parsePortugueseNumber(cols[cols.length - 1]);
        }
      }
    }

    const finalGroup = groupName || 'Ferramentas Geral';
    if (!isAllowedPhysicalQuotaGroup(finalGroup) && !isAllowedPhysicalQuotaGroup(linhaName)) {
      continue;
    }

    if (repId > 0) {
      if (!repName) {
        repName = 'Representante ' + repId;
      }
      const defasagemFisica = vendaFisica - cotaFisica;
      const pctFisica = cotaFisica > 0 ? (vendaFisica / cotaFisica) * 100 : 0;

      records.push({
        id: 'pq-' + repId + '-' + (idx++),
        repId,
        repName,
        coordName,
        groupName: finalGroup,
        cotaFisica,
        vendaFisica,
        defasagemFisica,
        pctFisica
      });
    }
  }

  return records;
}

export function generateDefaultSalesForPeriod(year: number, month: number): SalesRecord[] {
  return parseTSV(INITIAL_RAW_DATA);
}

export function generateDefaultPhysicalQuotas(year: number, month: number): import('./types').PhysicalQuotaRecord[] {
  const salesRecords = parseTSV(INITIAL_RAW_DATA);
  const repMap = new Map<number, { repId: number; repName: string; coordName: string; groupName: string; quotaCD: number; valorVendaTotal: number }>();

  salesRecords.forEach(r => {
    const isTool = r.linha.toLowerCase().includes('ferramenta') || r.groupName.toLowerCase().includes('master') || r.groupName.toLowerCase().includes('pro') || r.groupName.toLowerCase().includes('garibaldi');
    if (isTool || !repMap.has(r.repId)) {
      if (!repMap.has(r.repId) || isTool) {
        repMap.set(r.repId, {
          repId: r.repId,
          repName: r.repName,
          coordName: r.coordName || 'Juan Almeida',
          groupName: r.groupName || 'Tramontina Ferramentas',
          quotaCD: r.quotaTotal || 10000,
          valorVendaTotal: r.valorVendaTotal || 8000
        });
      }
    }
  });

  const yearFactor = year === 2025 ? 0.92 : 1.0;
  const monthFactor = 0.85 + (month % 5) * 0.08;

  let idx = 0;
  return Array.from(repMap.values()).map(r => {
    // Generate deterministic physical quota (e.g. pieces/units) based on sales figures and rep ID
    const baseQuota = Math.round((r.quotaCD / 50) * yearFactor * monthFactor);
    const cotaFisica = Math.max(200, Math.round(baseQuota / 10) * 10);
    const baseVenda = Math.round((r.valorVendaTotal / 52) * yearFactor * monthFactor);
    const vendaFisica = Math.max(0, Math.round(baseVenda / 10) * 10);
    const defasagemFisica = vendaFisica - cotaFisica;
    const pctFisica = cotaFisica > 0 ? (vendaFisica / cotaFisica) * 100 : 0;

    return {
      id: 'pq-def-' + r.repId + '-' + year + '-' + month + '-' + (idx++),
      repId: r.repId,
      repName: r.repName,
      coordName: r.coordName,
      groupName: 'Ferramentas',
      cotaFisica,
      vendaFisica,
      defasagemFisica,
      pctFisica,
      month,
      year
    };
  });
}

