import pptxgen from 'pptxgenjs';
import { SalesRecord } from './types';

interface PresentationProps {
  allRecords: SalesRecord[];
  customRepNames: Record<string, string>;
  customRepLocations: Record<string, string>;
  selectedMonth: number;
  selectedYear: number;
}

// Helper to format currency
const formatCurrency = (val: number): string => {
  return 'R$ ' + val.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

// Helper to format percentage
const formatPercent = (val: number): string => {
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }) + '%';
};

// Helper to get represented brand name from emp column
const getRepresentadas = (empStr: string | undefined): string => {
  if (!empStr) return "Multi";
  const groups = empStr.split(',').map(g => g.trim().toUpperCase());
  const mapped = groups.map(g => {
    if (g === 'CUT' || g.includes('CUT')) return 'Cutelaria';
    if (g === 'GAR' || g.includes('GAR')) return 'Garibaldi';
    if (g === 'MUL' || g.includes('MUL')) return 'Multi';
    return g;
  });
  return Array.from(new Set(mapped)).join(', ');
};

const getHeaderCell = (text: string, align: 'left' | 'center' | 'right' = 'left') => {
  return {
    text,
    options: {
      bold: true,
      fill: { color: '001A9C' }, // Tramontina Navy
      color: 'FFFFFF',
      fontSize: 9.5,
      align,
      fontFace: 'Segoe UI',
      margin: [3, 5, 3, 5]
    }
  };
};

const getBodyCell = (text: string, isEven: boolean, align: 'left' | 'center' | 'right' = 'left', isBold: boolean = false, textColor?: string) => {
  return {
    text,
    options: {
      bold: isBold,
      fill: { color: isEven ? 'F8FAFC' : 'FFFFFF' },
      color: textColor || '1E293B',
      fontSize: 8.5,
      align,
      fontFace: 'Segoe UI',
      margin: [3, 5, 3, 5]
    }
  };
};

const addSlideChrome = (slide: pptxgen.Slide, colors: any, titleText: string, periodLabel: string) => {
  // Slide background
  slide.background = { fill: colors.bgLight };

  // Top header accent line
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: colors.primary } });

  // Slide Title (Segoe UI)
  slide.addText(titleText.toUpperCase(), {
    x: 1.1, y: 0.4, w: 7.4, h: 0.35,
    fontSize: 13, fontFace: 'Segoe UI', color: colors.indigo, bold: true
  });

  slide.addText("Agente 87 - Ferramentas", {
    x: 1.1, y: 0.75, w: 7.4, h: 0.3,
    fontSize: 9, fontFace: 'Segoe UI', color: colors.slateMed, bold: false
  });

  // Period label top-right
  slide.addText(periodLabel, {
    x: 8.53, y: 0.4, w: 3.7, h: 0.35,
    fontSize: 10, fontFace: 'Segoe UI', color: colors.slateMed, bold: true, align: 'right'
  });

  // Footer bar
  slide.addShape('rect', { x: 1.1, y: 6.9, w: 11.13, h: 0.05, fill: { color: 'E2E8F0' } });

  slide.addText("Desempenho Comercial | Agente 87", {
    x: 1.1, y: 7.0, w: 6.0, h: 0.3,
    fontSize: 8, fontFace: 'Segoe UI', color: colors.slateLight, align: 'left'
  });

  slide.addText(periodLabel, {
    x: 8.53, y: 7.0, w: 3.7, h: 0.3,
    fontSize: 8, fontFace: 'Segoe UI', color: colors.slateLight, align: 'right'
  });
};

const drawKPIBox = (
  slide: pptxgen.Slide,
  colors: any,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  value: string,
  subtitle: string,
  accentColor: string,
  isDark: boolean = false
) => {
  // Main card shape (rect)
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: isDark ? colors.primary : colors.white },
    line: { color: isDark ? colors.primary : 'E2E8F0', pt: 1 }
  });

  // Left vertical color accent
  if (!isDark) {
    slide.addShape('rect', {
      x, y, w: 0.08, h,
      fill: { color: accentColor }
    });
  }

  // Card Title
  slide.addText(title.toUpperCase(), {
    x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.25,
    fontSize: 9, fontFace: 'Segoe UI',
    color: isDark ? '93C5FD' : colors.slateMed,
    bold: true
  });

  // Metric Value
  slide.addText(value, {
    x: x + 0.2, y: y + 0.4, w: w - 0.4, h: 0.55,
    fontSize: 22, fontFace: 'Segoe UI',
    color: isDark ? colors.white : colors.slateDark,
    bold: true
  });

  // Description / Details
  if (subtitle) {
    slide.addText(subtitle, {
      x: x + 0.2, y: y + 0.95, w: w - 0.4, h: h - 1.1,
      fontSize: 9, fontFace: 'Segoe UI',
      color: isDark ? 'CBD5E1' : colors.slateLight,
      bold: false
    });
  }
};

const addBentoDashboardSlide = (
  pptx: pptxgen,
  colors: any,
  titleText: string,
  periodLabel: string,
  segmentStats: { multi: number; garibaldi: number; cutelaria: number },
  cdStats: { quota: number; sales: number; pct: number },
  vpStats: { quota: number; sales: number; pct: number },
  totalStats: { quota: number; sales: number; pct: number },
  isPro: boolean = false
) => {
  let slide = pptx.addSlide();
  addSlideChrome(slide, colors, titleText, periodLabel);

  // Column metrics adjusted for safe widescreen centering
  const col1X = 1.1;
  const col2X = 4.9;
  const col3X = 8.7;
  const colW = 3.53;

  slide.addText("ATINGIMENTO POR SEGMENTO", {
    x: col1X, y: 1.3, w: colW, h: 0.3,
    fontSize: 10, fontFace: 'Segoe UI', color: colors.slateMed, bold: true
  });

  slide.addText("DESEMPENHO POR CANAL", {
    x: col2X, y: 1.3, w: colW, h: 0.3,
    fontSize: 10, fontFace: 'Segoe UI', color: colors.slateMed, bold: true
  });

  slide.addText("RESULTADO CONSOLIDADO", {
    x: col3X, y: 1.3, w: colW, h: 0.3,
    fontSize: 10, fontFace: 'Segoe UI', color: colors.slateMed, bold: true
  });

  // SEGMENTS
  drawKPIBox(
    slide, colors,
    col1X, 1.7, colW, 1.5,
    "Multi (MUL)",
    formatPercent(segmentStats.multi),
    "Linha de Utilidades e Multi",
    colors.indigo
  );

  drawKPIBox(
    slide, colors,
    col1X, 3.4, colW, 1.5,
    "Garibaldi (GAR)",
    formatPercent(segmentStats.garibaldi),
    "Linha Garibaldi (Master + Pro)",
    'EA580C'
  );

  drawKPIBox(
    slide, colors,
    col1X, 5.1, colW, 1.5,
    "Cutelaria (CUT)",
    formatPercent(segmentStats.cutelaria),
    "Linha de Facas e Talheres",
    'EF4444'
  );

  // CHANNELS
  drawKPIBox(
    slide, colors,
    col2X, 1.7, colW, 2.3,
    "Faturamento CD",
    formatPercent(cdStats.pct),
    `Meta CD: ${formatCurrency(cdStats.quota)}\nFaturado CD: ${formatCurrency(cdStats.sales)}`,
    colors.indigo
  );

  drawKPIBox(
    slide, colors,
    col2X, 4.3, colW, 2.3,
    "Vendas Varejo (VP)",
    formatPercent(vpStats.pct),
    `Meta VP: ${formatCurrency(vpStats.quota)}\nVendas VP: ${formatCurrency(vpStats.sales)}`,
    colors.indigo
  );

  // CONSOLIDATED TOTAL CARD (rect)
  slide.addShape('rect', {
    x: col3X, y: 1.7, w: colW, h: 4.9,
    fill: { color: isPro ? 'EA580C' : colors.primary },
    line: { color: isPro ? 'EA580C' : colors.primary, pt: 1 }
  });

  slide.addText(isPro ? "TRAMONTINA PRO TOTAL" : "DESEMPENHO DO COORDENADOR", {
    x: col3X + 0.3, y: 2.1, w: colW - 0.6, h: 0.3,
    fontSize: 10, fontFace: 'Segoe UI', color: isPro ? 'FFEDD5' : '93C5FD', bold: true
  });

  slide.addText(formatPercent(totalStats.pct), {
    x: col3X + 0.3, y: 2.5, w: colW - 0.6, h: 1.2,
    fontSize: 54, fontFace: 'Segoe UI', color: colors.white, bold: true
  });

  slide.addText("Atingimento Geral do Período", {
    x: col3X + 0.3, y: 3.8, w: colW - 0.6, h: 0.3,
    fontSize: 12, fontFace: 'Segoe UI', color: colors.white, bold: true
  });

  slide.addText(
    `Meta Consolidada:\n${formatCurrency(totalStats.quota)}\n\nRealizado Total:\n${formatCurrency(totalStats.sales)}`,
    {
      x: col3X + 0.3, y: 4.3, w: colW - 0.6, h: 2.0,
      fontSize: 11, fontFace: 'Segoe UI', color: 'CBD5E1', bold: false
    }
  );
};

export const generateSalesPresentation = async ({
  allRecords: rawAllRecords,
  customRepNames,
  customRepLocations,
  selectedMonth,
  selectedYear
}: PresentationProps) => {
  const pptx = new pptxgen();
  // Define custom 1920x1080 px widescreen layout (16:9 ratio, equivalent to 13.333 x 7.5 inches)
  pptx.defineLayout({ name: 'LAYOUT_1920x1080', width: 13.333, height: 7.5 });
  pptx.layout = 'LAYOUT_1920x1080';

  // Filter rawAllRecords based on target coordinator Garibaldi Master requirement
  const allRecords = rawAllRecords.filter(r => {
    const coordLower = (r.coordName || '').toLowerCase().trim();
    const isTargetCoord = 
      coordLower.includes("juan") || 
      coordLower.includes("adriano") || 
      coordLower.includes("dionatan") || 
      coordLower.includes("julio") ||
      coordLower.includes("júlio");

    const emp = (r.emp || '').trim().toUpperCase();
    const isGaribaldi = emp === 'GAR' || emp.includes('GAR');

    if (isTargetCoord && isGaribaldi) {
      const isMaster = (r.groupName || '').toLowerCase().includes('master');
      return isMaster;
    }
    return true;
  });

  // Define design tokens
  const colors = {
    primary: '001A9C',      // Tramontina Deep Blue (Hex #001A9C as requested)
    indigo: '001A9C',       // Indigo Accent (Hex #001A9C as requested)
    slateDark: '1E293B',    // Slate 800
    slateMed: '475569',     // Slate 600
    slateLight: '94A3B8',   // Slate 400
    bgLight: 'F8FAFC',      // Off-white / light slate
    white: 'FFFFFF',
    green: '10B981',        // Success
    red: 'EF4444',          // Danger
    cardBg: 'F1F5F9'        // Light slate for cards
  };

  const getMonthName = (month: number): string => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[month - 1] || "Mês";
  };

  const periodLabel = `${getMonthName(selectedMonth)} / ${selectedYear}`;

  // ---------------------------------------------------------------------------
  // DATA PREPARATION & SEGMENTATIONS
  // ---------------------------------------------------------------------------
  const isProGroup = (groupNameStr: string): boolean => {
    const name = groupNameStr.toLowerCase().trim();
    return name === "garibaldi pro monet" || name.includes("pro monet") || name.startsWith("pro ");
  };

  // 1. Total General (CD + VP)
  let totalQuotaCD = 0;
  let totalSalesCD = 0;
  let totalQuotaVP = 0;
  let totalSalesVP = 0;

  allRecords.forEach(r => {
    totalQuotaCD += r.quotaCD;
    totalSalesCD += r.valorVendaCD;
    totalQuotaVP += r.quotaVP;
    totalSalesVP += r.valorVendaVP;
  });

  const totalQuotaAll = totalQuotaCD + totalQuotaVP;
  const totalSalesAll = totalSalesCD + totalSalesVP;

  const pctCDTotal = totalQuotaCD > 0 ? (totalSalesCD / totalQuotaCD) * 100 : 0;
  const pctVPTotal = totalQuotaVP > 0 ? (totalSalesVP / totalQuotaVP) * 100 : 0;
  const pctAllTotal = totalQuotaAll > 0 ? (totalSalesAll / totalQuotaAll) * 100 : 0;

  // Segment totals for Igor Pedruzzi
  let multiQuotaIgor = 0, multiSalesIgor = 0;
  let garQuotaIgor = 0, garSalesIgor = 0;
  let cutQuotaIgor = 0, cutSalesIgor = 0;

  allRecords.forEach(r => {
    const emp = (r.emp || '').trim().toUpperCase();
    if (emp === 'MUL' || emp.includes('MUL')) {
      multiQuotaIgor += r.quotaTotal;
      multiSalesIgor += r.valorVendaTotal;
    } else if (emp === 'GAR' || emp.includes('GAR')) {
      garQuotaIgor += r.quotaTotal;
      garSalesIgor += r.valorVendaTotal;
    } else if (emp === 'CUT' || emp.includes('CUT')) {
      cutQuotaIgor += r.quotaTotal;
      cutSalesIgor += r.valorVendaTotal;
    } else {
      multiQuotaIgor += r.quotaTotal;
      multiSalesIgor += r.valorVendaTotal;
    }
  });

  const igorSegments = {
    multi: multiQuotaIgor > 0 ? (multiSalesIgor / multiQuotaIgor) * 100 : 0,
    garibaldi: garQuotaIgor > 0 ? (garSalesIgor / garQuotaIgor) * 100 : 0,
    cutelaria: cutQuotaIgor > 0 ? (cutSalesIgor / cutQuotaIgor) * 100 : 0
  };

  // 2. Marcelo Krewer (Tramontina PRO)
  let marceloQuotaCD = 0;
  let marceloSalesCD = 0;
  let marceloQuotaVP = 0;
  let marceloSalesVP = 0;

  const proRecords = allRecords.filter(r => isProGroup(r.groupName));
  proRecords.forEach(r => {
    marceloQuotaCD += r.quotaCD;
    marceloSalesCD += r.valorVendaCD;
    marceloQuotaVP += r.quotaVP;
    marceloSalesVP += r.valorVendaVP;
  });

  const marceloQuotaTotal = marceloQuotaCD + marceloQuotaVP;
  const marceloSalesTotal = marceloSalesCD + marceloSalesVP;
  const marceloPctCD = marceloQuotaCD > 0 ? (marceloSalesCD / marceloQuotaCD) * 100 : 0;
  const marceloPctVP = marceloQuotaVP > 0 ? (marceloSalesVP / marceloQuotaVP) * 100 : 0;
  const marceloPctTotal = marceloQuotaTotal > 0 ? (marceloSalesTotal / marceloQuotaTotal) * 100 : 0;

  let marceloMultiQ = 0, marceloMultiS = 0;
  let marceloGarQ = 0, marceloGarS = 0;
  let marceloCutQ = 0, marceloCutS = 0;

  proRecords.forEach(r => {
    const emp = (r.emp || '').trim().toUpperCase();
    if (emp === 'MUL' || emp.includes('MUL')) {
      marceloMultiQ += r.quotaTotal;
      marceloMultiS += r.valorVendaTotal;
    } else if (emp === 'GAR' || emp.includes('GAR')) {
      marceloGarQ += r.quotaTotal;
      marceloGarS += r.valorVendaTotal;
    } else if (emp === 'CUT' || emp.includes('CUT')) {
      marceloCutQ += r.quotaTotal;
      marceloCutS += r.valorVendaTotal;
    } else {
      marceloMultiQ += r.quotaTotal;
      marceloMultiS += r.valorVendaTotal;
    }
  });

  const marceloSegments = {
    multi: marceloMultiQ > 0 ? (marceloMultiS / marceloMultiQ) * 100 : 0,
    garibaldi: marceloGarQ > 0 ? (marceloGarS / marceloGarQ) * 100 : 0,
    cutelaria: marceloCutQ > 0 ? (marceloCutS / marceloCutQ) * 100 : 0
  };

  // 3. Coordinator Calculations (EXCLUDING Tramontina PRO)
  const coordinators = [
    { key: "Adriano Almeida", name: "Adriano Almeida", display: "Adriano Almeida", cargo: "Atacados Nordeste" },
    { key: "Juan Almeida", name: "Juan Almeida", display: "Juan Almeida", cargo: "SE / AL / PE / PB" },
    { key: "Dionatan Oliveira", name: "Dionatan Oliveira", display: "Dionatan Oliveira", cargo: "Bahia" },
    { key: "Julio Warken", name: "Julio Warken", display: "Júlio Warken", cargo: "RN / CE / PI" }
  ];

  const coordStats = coordinators.map(coord => {
    let quotaCD = 0;
    let salesCD = 0;
    let quotaVP = 0;
    let salesVP = 0;

    // Filter records for this coordinator, excluding Tramontina PRO
    const coordRecords = allRecords.filter(r => {
      const matchName = r.coordName.toLowerCase().trim() === coord.key.toLowerCase().trim() ||
                        r.coordName.toLowerCase().trim().includes(coord.name.toLowerCase().trim().split(' ')[0]);
      return matchName && !isProGroup(r.groupName);
    });

    coordRecords.forEach(r => {
      quotaCD += r.quotaCD;
      salesCD += r.valorVendaCD;
      quotaVP += r.quotaVP;
      salesVP += r.valorVendaVP;
    });

    const quotaTotal = quotaCD + quotaVP;
    const salesTotal = salesCD + salesVP;

    // Segment stats for this coordinator
    let multiQ = 0, multiS = 0;
    let garQ = 0, garS = 0;
    let cutQ = 0, cutS = 0;

    coordRecords.forEach(r => {
      const emp = (r.emp || '').trim().toUpperCase();
      if (emp === 'MUL' || emp.includes('MUL')) {
        multiQ += r.quotaTotal;
        multiS += r.valorVendaTotal;
      } else if (emp === 'GAR' || emp.includes('GAR')) {
        garQ += r.quotaTotal;
        garS += r.valorVendaTotal;
      } else if (emp === 'CUT' || emp.includes('CUT')) {
        cutQ += r.quotaTotal;
        cutS += r.valorVendaTotal;
      } else {
        multiQ += r.quotaTotal;
        multiS += r.valorVendaTotal;
      }
    });

    const segments = {
      multi: multiQ > 0 ? (multiS / multiQ) * 100 : 0,
      garibaldi: garQ > 0 ? (garS / garQ) * 100 : 0,
      cutelaria: cutQ > 0 ? (cutS / cutQ) * 100 : 0
    };

    // Group representatives under this coordinator
    const repsMap: { [key: number]: { repId: number; repName: string; emp: string; quota: number; sales: number } } = {};
    coordRecords.forEach(r => {
      const repId = r.repId;
      const repName = customRepNames[repId.toString().trim() || repId] || r.repName;
      if (!repsMap[repId]) {
        repsMap[repId] = { repId, repName, emp: r.emp, quota: 0, sales: 0 };
      }
      repsMap[repId].quota += r.quotaTotal;
      repsMap[repId].sales += r.valorVendaTotal;
    });

    const repsList = Object.values(repsMap).map(rep => ({
      ...rep,
      pct: rep.quota > 0 ? (rep.sales / rep.quota) * 100 : 0
    })).sort((a, b) => b.pct - a.pct);

    return {
      ...coord,
      quotaCD,
      salesCD,
      quotaVP,
      salesVP,
      quotaTotal,
      salesTotal,
      pctCD: quotaCD > 0 ? (salesCD / quotaCD) * 100 : 0,
      pctVP: quotaVP > 0 ? (salesVP / quotaVP) * 100 : 0,
      pctTotal: quotaTotal > 0 ? (salesTotal / quotaTotal) * 100 : 0,
      segments,
      repsList
    };
  });

  // 4. Performance by State (UF)
  const stateStatsMap: { [key: string]: { uf: string; name: string; repsCount: number; quota: number; sales: number } } = {};
  
  const stateNames: Record<string, string> = {
    'AL': 'Alagoas', 'BA': 'Bahia', 'CE': 'Ceará', 'MA': 'Maranhão',
    'PB': 'Paraíba', 'PE': 'Pernambuco', 'PI': 'Piauí', 'RN': 'Rio Grande do Norte',
    'SE': 'Sergipe', 'SP': 'São Paulo', 'RJ': 'Rio de Janeiro', 'MG': 'Minas Gerais'
  };

  allRecords.forEach(r => {
    const repState = customRepLocations[r.repId.toString().trim() || r.repId] || 'Outros';
    if (!stateStatsMap[repState]) {
      stateStatsMap[repState] = {
        uf: repState,
        name: stateNames[repState] || repState,
        repsCount: 0,
        quota: 0,
        sales: 0
      };
    }
    stateStatsMap[repState].quota += r.quotaTotal;
    stateStatsMap[repState].sales += r.valorVendaTotal;
  });

  // Count reps per state
  Object.keys(customRepLocations).forEach(repId => {
    const state = customRepLocations[repId];
    if (state && stateStatsMap[state]) {
      const hasRecords = allRecords.some(r => r.repId.toString().trim() === repId.trim());
      if (hasRecords) {
        stateStatsMap[state].repsCount += 1;
      }
    }
  });

  const stateStatsList = Object.values(stateStatsMap)
    .map(st => ({
      ...st,
      pct: st.quota > 0 ? (st.sales / st.quota) * 100 : 0
    }))
    .filter(st => st.quota > 0)
    .sort((a, b) => b.pct - a.pct);

  // 5. Champions calculations (overall reps with total sales attainment >= 100%)
  const repsOverallMap: { [key: number]: { repId: number; repName: string; coordName: string; quota: number; sales: number } } = {};
  allRecords.forEach(r => {
    const repId = r.repId;
    const repName = customRepNames[repId.toString().trim() || repId] || r.repName;
    if (!repsOverallMap[repId]) {
      repsOverallMap[repId] = {
        repId,
        repName,
        coordName: r.coordName,
        quota: 0,
        sales: 0
      };
    }
    repsOverallMap[repId].quota += r.quotaTotal;
    repsOverallMap[repId].sales += r.valorVendaTotal;
  });

  const championsList = Object.values(repsOverallMap)
    .map(rep => ({
      ...rep,
      pct: rep.quota > 0 ? (rep.sales / rep.quota) * 100 : 0
    }))
    .filter(rep => rep.pct >= 100)
    .sort((a, b) => b.pct - a.pct);

  // ---------------------------------------------------------------------------
  // SLIDE 1: TELA DESEMPENHO BRASIL (FORMER SLIDE 3)
  // ---------------------------------------------------------------------------
  let slideBr = pptx.addSlide();
  addSlideChrome(slideBr, colors, "DESEMPENHO TRAMONTINA BRASIL", periodLabel);

  // Table structure for Brasil Performance
  const brHeaders = [
    getHeaderCell("Região / Divisão"),
    getHeaderCell("Cota Planejada", "right"),
    getHeaderCell("Realizado (Vendas)", "right"),
    getHeaderCell("Desempenho (% Venda)", "center")
  ];

  // Dynamic Nordeste Total calculations, with other regions filled with "À Definir"
  const brRowsData = [
    { name: "SUL - FERRAMENTAS", quota: "À Definir", sales: "À Definir", pct: "À Definir" },
    { name: "SUD - FERRAMENTAS SP", quota: "À Definir", sales: "À Definir", pct: "À Definir" },
    { name: "SUD - FERRAMENTAS RJ/MG/ES", quota: "À Definir", sales: "À Definir", pct: "À Definir" },
    { name: "PLA - FERRAMENTAS", quota: "À Definir", sales: "À Definir", pct: "À Definir" },
    { name: "NORD - FERRAMENTAS (ESSE QUE É O AGENTE 87 QUE IREMOS PEGAR OS DADOS DO SITE)", quota: totalQuotaAll, sales: totalSalesAll, pct: pctAllTotal, isDynamic: true },
    { name: "NORTE - FERRAMENTAS", quota: "À Definir", sales: "À Definir", pct: "À Definir" }
  ];

  const brRows: any[] = [brHeaders];

  brRowsData.forEach((row, idx) => {
    const isEven = idx % 2 === 1;

    // For Nordeste (dynamic row), format currency and percent. For others, use "À Definir"
    const qStr = typeof row.quota === 'number' ? formatCurrency(row.quota) : row.quota;
    const sStr = typeof row.sales === 'number' ? formatCurrency(row.sales) : row.sales;
    const pStr = typeof row.pct === 'number' ? formatPercent(row.pct) : row.pct;

    const pctColor = typeof row.pct === 'number' ? (row.pct >= 100 ? colors.green : colors.red) : undefined;

    brRows.push([
      getBodyCell(row.name, isEven, 'left', row.isDynamic),
      getBodyCell(qStr, isEven, 'right', row.isDynamic),
      getBodyCell(sStr, isEven, 'right', row.isDynamic),
      getBodyCell(pStr, isEven, 'center', true, pctColor)
    ]);
  });

  // Grand Total row (since other values are "À Definir", the total is also "À Definir")
  brRows.push([
    getBodyCell("CONSOLIDADO BRASIL TOTAL", false, 'left', true, colors.primary),
    getBodyCell("À Definir", false, 'right', true, colors.primary),
    getBodyCell("À Definir", false, 'right', true, colors.primary),
    getBodyCell("À Definir", false, 'center', true, colors.primary)
  ]);

  slideBr.addTable(brRows, {
    x: 1.1, y: 1.6, w: 11.13,
    colW: [3.8, 2.4, 2.4, 2.53],
    border: { type: 'solid', color: 'E2E8F0', pt: 1 }
  });

  slideBr.addText("Nota: Região Nordeste calculada em tempo real com base nos faturamentos consolidados da filial. Outras divisões apresentadas como À Definir.", {
    x: 1.1, y: 6.3, w: 11.13, h: 0.3, fontSize: 8.5, fontFace: 'Segoe UI', color: colors.slateLight, italic: true
  });

  // ---------------------------------------------------------------------------
  // SLIDE 2: TELA FATURAMENTO CD BRASIL (FORMER SLIDE 4)
  // ---------------------------------------------------------------------------
  let slideCd = pptx.addSlide();
  addSlideChrome(slideCd, colors, "FATURAMENTO EXCLUSIVO CD BRASIL", periodLabel);

  const cdHeaders = [
    getHeaderCell("Regional CD"),
    getHeaderCell("Cota CD", "right"),
    getHeaderCell("Faturado CD", "right"),
    getHeaderCell("Atingimento CD (%)", "center")
  ];

  const cdRowsData = [
    { name: "Regional Sul (CD)", quota: "À Definir", sales: "À Definir", pct: "À Definir" },
    { name: "Regional Sudeste (CD)", quota: "À Definir", sales: "À Definir", pct: "À Definir" },
    { name: "Regional Planalto (CD)", quota: "À Definir", sales: "À Definir", pct: "À Definir" },
    { name: "Regional Nordeste (CD)", quota: "À Definir", sales: "À Definir", pct: "À Definir" },
    { name: "Regional Norte (CD)", quota: "À Definir", sales: "À Definir", pct: "À Definir" }
  ];

  const cdRows: any[] = [cdHeaders];

  cdRowsData.forEach((row, idx) => {
    const isEven = idx % 2 === 1;

    cdRows.push([
      getBodyCell(row.name, isEven, 'left', false),
      getBodyCell(row.quota, isEven, 'right', false),
      getBodyCell(row.sales, isEven, 'right', false),
      getBodyCell(row.pct, isEven, 'center', true)
    ]);
  });

  cdRows.push([
    getBodyCell("TOTAL BRASIL (CD)", false, 'left', true, colors.primary),
    getBodyCell("À Definir", false, 'right', true, colors.primary),
    getBodyCell("À Definir", false, 'right', true, colors.primary),
    getBodyCell("À Definir", false, 'center', true, colors.primary)
  ]);

  slideCd.addTable(cdRows, {
    x: 1.1, y: 1.6, w: 11.13,
    colW: [3.8, 2.4, 2.4, 2.53],
    border: { type: 'solid', color: 'E2E8F0', pt: 1 }
  });

  // ---------------------------------------------------------------------------
  // SLIDE 6: DESEMPENHO FERRAMENTAS NORDESTE (IGOR PEDRUZZI)
  // ---------------------------------------------------------------------------
  addBentoDashboardSlide(
    pptx,
    colors,
    "Ferramentas Nordeste — Igor Pedruzzi",
    periodLabel,
    igorSegments,
    { quota: totalQuotaCD, sales: totalSalesCD, pct: pctCDTotal },
    { quota: totalQuotaVP, sales: totalSalesVP, pct: pctVPTotal },
    { quota: totalQuotaAll, sales: totalSalesAll, pct: pctAllTotal }
  );

  // ---------------------------------------------------------------------------
  // SLIDE 7: MARCELO KREWER - TRAMONTINA PRO (ONLY TRAMONTINA PRO)
  // ---------------------------------------------------------------------------
  addBentoDashboardSlide(
    pptx,
    colors,
    "Tramontina PRO — Marcelo Krewer",
    periodLabel,
    marceloSegments,
    { quota: marceloQuotaCD, sales: marceloSalesCD, pct: marceloPctCD },
    { quota: marceloQuotaVP, sales: marceloSalesVP, pct: marceloPctVP },
    { quota: marceloQuotaTotal, sales: marceloSalesTotal, pct: marceloPctTotal },
    true // PRO styling theme
  );

  // ---------------------------------------------------------------------------
  // SLIDES 8+: COORDINATORS (Adriano, Juan, Dionatan, Julio)
  // ---------------------------------------------------------------------------
  coordStats.forEach(coord => {
    // 1. Bento Dashboard Slide
    addBentoDashboardSlide(
      pptx,
      colors,
      `${coord.display} — ${coord.cargo}`,
      periodLabel,
      coord.segments,
      { quota: coord.quotaCD, sales: coord.salesCD, pct: coord.pctCD },
      { quota: coord.quotaVP, sales: coord.salesVP, pct: coord.pctVP },
      { quota: coord.quotaTotal, sales: coord.salesTotal, pct: coord.pctTotal }
    );

    // 2. Representatives Detailed Table slide
    let slideR = pptx.addSlide();
    addSlideChrome(slideR, colors, `Equipe ${coord.display} — Detalhes representantes`, periodLabel);

    slideR.addText("Atingimento Individuais (% Venda) — Sem Valores Nominais", {
      x: 1.1, y: 1.1, w: 11.13, h: 0.4,
      fontSize: 12, fontFace: 'Segoe UI', color: colors.slateMed, bold: false
    });

    const repHeaders = [
      getHeaderCell("Código Rep"),
      getHeaderCell("Nome Representante"),
      getHeaderCell("Marcas Representadas"),
      getHeaderCell("Atingimento (% Venda)", "center")
    ];

    const repRows: any[] = [repHeaders];
    const visibleReps = coord.repsList.slice(0, 9); // Fit cleanly on slide

    visibleReps.forEach((rep, rIdx) => {
      const isEven = rIdx % 2 === 1;
      repRows.push([
        getBodyCell(`#${rep.repId}`, isEven, 'left', true),
        getBodyCell(rep.repName, isEven, 'left', false),
        getBodyCell(getRepresentadas(rep.emp), isEven, 'left', false),
        getBodyCell(formatPercent(rep.pct), isEven, 'center', true, rep.pct >= 100 ? colors.green : colors.red)
      ]);
    });

    slideR.addTable(repRows, {
      x: 1.1, y: 1.6, w: 11.13,
      colW: [1.6, 4.0, 3.0, 2.53],
      border: { type: 'solid', color: 'E2E8F0', pt: 1 }
    });

    let extraNote = "Atingimento calculado individualmente baseado na meta correspondente do profissional.";
    if (coord.repsList.length > 9) {
      extraNote += ` (Exibindo os top 9 de um total de ${coord.repsList.length} representantes ativos na equipe)`;
    }
    slideR.addText(extraNote, {
      x: 1.1, y: 6.3, w: 11.13, h: 0.3, fontSize: 8.5, fontFace: 'Segoe UI', color: colors.slateLight, italic: true
    });
  });

  // ---------------------------------------------------------------------------
  // SLIDE: GALERIA DOS CAMPEÕES (PAGINATED, 6 CARDS PER SLIDE)
  // ---------------------------------------------------------------------------
  const pageSize = 6;
  const numSlides = Math.ceil(championsList.length / pageSize) || 1;

  for (let sIdx = 0; sIdx < numSlides; sIdx++) {
    let slideChamp = pptx.addSlide();
    addSlideChrome(slideChamp, colors, `GALERIA DOS CAMPEÕES`, periodLabel);

    slideChamp.addText(`Destaque especial para os representantes com atingimento de vendas maior ou igual a 100% (Slide ${sIdx + 1} de ${numSlides})`, {
      x: 1.1, y: 1.1, w: 11.13, h: 0.4,
      fontSize: 12, fontFace: 'Segoe UI', color: colors.slateMed, bold: false
    });

    const startIdx = sIdx * pageSize;
    const endIdx = Math.min(startIdx + pageSize, championsList.length);
    const pageChamps = championsList.slice(startIdx, endIdx);

    if (pageChamps.length === 0) {
      slideChamp.addText("Nenhum representante atingiu 100% da meta nesta apuração.", {
        x: 1.1, y: 3.0, w: 11.13, h: 1.0,
        fontSize: 14, fontFace: 'Segoe UI', color: colors.slateLight, bold: true, align: 'center'
      });
    } else {
      pageChamps.forEach((champ, idx) => {
        // Compute 2 rows of 3 columns
        const colIdx = idx % 3;
        const rowIdx = Math.floor(idx / 3);

        const cardW = 3.53;
        const cardH = 2.2;
        const cardGapX = 0.27;
        const cardGapY = 0.3;

        const cardX = 1.1 + colIdx * (cardW + cardGapX);
        const cardY = 1.7 + rowIdx * (cardH + cardGapY);

        // Draw card background
        slideChamp.addShape('rect', {
          x: cardX, y: cardY, w: cardW, h: cardH,
          fill: { color: colors.white },
          line: { color: 'E2E8F0', pt: 1 }
        });

        // Top accent line
        slideChamp.addShape('rect', {
          x: cardX, y: cardY, w: cardW, h: 0.1,
          fill: { color: colors.green }
        });

        // Medal icon
        slideChamp.addText("🏆", {
          x: cardX + 0.2, y: cardY + 0.2, w: 0.5, h: 0.4,
          fontSize: 18
        });

        // Representative ID
        slideChamp.addText(`#${champ.repId}`, {
          x: cardX + 0.8, y: cardY + 0.2, w: cardW - 1.0, h: 0.3,
          fontSize: 8, fontFace: 'Segoe UI', color: colors.slateLight, bold: true
        });

        // Representative name
        slideChamp.addText(champ.repName, {
          x: cardX + 0.2, y: cardY + 0.6, w: cardW - 0.4, h: 0.5,
          fontSize: 11, fontFace: 'Segoe UI', color: colors.slateDark, bold: true
        });

        // Team Coordinator
        slideChamp.addText(`Equipe: ${champ.coordName}`, {
          x: cardX + 0.2, y: cardY + 1.1, w: cardW - 0.4, h: 0.3,
          fontSize: 9, fontFace: 'Segoe UI', color: colors.slateMed
        });

        // Performance Percentage
        slideChamp.addText(formatPercent(champ.pct), {
          x: cardX + 0.2, y: cardY + 1.4, w: cardW - 0.4, h: 0.6,
          fontSize: 22, fontFace: 'Segoe UI', color: colors.green, bold: true
        });
      });
    }
  }

  // ---------------------------------------------------------------------------
  // SLIDE FINAL: BOAS VENDAS
  // ---------------------------------------------------------------------------
  let slideEnd = pptx.addSlide();
  slideEnd.background = { fill: colors.primary };

  slideEnd.addText("Boas Vendas!", {
    x: 1.1, y: 2.8, w: 11.13, h: 1.5,
    fontSize: 54, fontFace: 'Segoe UI', color: colors.white, bold: true, align: 'center'
  });

  slideEnd.addText("TRAMONTINA — AGENTE 87", {
    x: 1.1, y: 4.3, w: 11.13, h: 0.5,
    fontSize: 16, fontFace: 'Segoe UI', color: '93C5FD', bold: true, align: 'center'
  });

  // Save/Download the Presentation
  const fileName = `Apresentacao_Vendas_Nordeste_${selectedMonth}_${selectedYear}.pptx`;
  await pptx.writeFile({ fileName });
};
