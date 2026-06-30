import pptxgen from 'pptxgenjs';
import { SalesRecord } from './types';

interface PresentationProps {
  currentYearRecords: SalesRecord[];
  previousYearRecords: SalesRecord[];
  customRepNames: Record<string, string>;
  customRepLocations: Record<string, string>;
  startMonth: number;
  endMonth: number;
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
    x: 1.1, y: 0.4, w: 11.13, h: 0.35,
    fontSize: 13, fontFace: 'Segoe UI', color: colors.indigo, bold: true
  });

  slide.addText(`${periodLabel} | Agente 87`, {
    x: 1.1, y: 0.75, w: 11.13, h: 0.3,
    fontSize: 9, fontFace: 'Segoe UI', color: colors.slateMed, bold: false
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
  detailsOrSubtitle: any,
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
    x: x + 0.2, y: y + 0.12, w: w - 0.4, h: 0.22,
    fontSize: 9, fontFace: 'Segoe UI',
    color: isDark ? '93C5FD' : colors.slateMed,
    bold: true
  });

  // Metric Value
  slide.addText(value, {
    x: x + 0.2, y: y + 0.34, w: w - 0.4, h: 0.45,
    fontSize: 22, fontFace: 'Segoe UI',
    color: isDark ? colors.white : colors.slateDark,
    bold: true
  });

  // Description / Details
  if (detailsOrSubtitle) {
    if (typeof detailsOrSubtitle === 'string') {
      slide.addText(detailsOrSubtitle, {
        x: x + 0.2, y: y + 0.82, w: w - 0.4, h: h - 0.9,
        fontSize: 8.5, fontFace: 'Segoe UI',
        color: isDark ? 'CBD5E1' : colors.slateLight,
        lineSpacing: 12,
        bold: false
      });
    } else {
      const details = detailsOrSubtitle;
      const quotaLabel = details.quotaLabel || "Meta";
      const salesLabel = details.salesLabel || "Realizado";

      const quotaText = `${quotaLabel}: ${formatCurrency(details.quota)}`;
      const salesText = `${salesLabel}: ${formatCurrency(details.sales)}`;

      let growthValueStr = "";
      let isGrowth = false;
      let isDrop = false;

      if (details.prevSales !== undefined) {
        const prev = details.prevSales;
        if (prev && prev > 0) {
          const pct = ((details.sales - prev) / prev) * 100;
          const sign = pct >= 0 ? "+" : "";
          const arrow = pct >= 0 ? "▲" : "▼";
          growthValueStr = `${arrow} ${sign}${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
          isGrowth = pct >= 0;
          isDrop = pct < 0;
        } else {
          growthValueStr = "À Definir";
        }
      }

      const textObjects: pptxgen.TextProps[] = [
        { text: `${quotaText}\n`, options: { color: isDark ? 'CBD5E1' : colors.slateLight, fontSize: 8.5, bold: false } },
        { text: `${salesText}\n`, options: { color: isDark ? colors.white : colors.slateDark, fontSize: 10, bold: true } }
      ];

      if (growthValueStr) {
        textObjects.push({ text: "Crescimento no Período: ", options: { color: isDark ? 'CBD5E1' : colors.slateLight, fontSize: 8.5, bold: false } });
        
        let growthColor = isDark ? '93C5FD' : colors.slateMed;
        if (isGrowth) {
          growthColor = '10B981'; // Green
        } else if (isDrop) {
          growthColor = 'EF4444'; // Red
        }

        textObjects.push({ 
          text: growthValueStr, 
          options: { color: growthColor, fontSize: 10, bold: true } 
        });
      }

      slide.addText(textObjects, {
        x: x + 0.2, y: y + 0.82, w: w - 0.4, h: h - 0.9,
        fontSize: 8.5, fontFace: 'Segoe UI',
        lineSpacing: 13,
      });
    }
  }
};

const addBentoDashboardSlide = (
  pptx: pptxgen,
  colors: any,
  titleText: string,
  periodLabel: string,
  segmentStats: {
    multi: { quota: number; sales: number; pct: number; prevSales?: number; growth: string };
    garibaldi: { quota: number; sales: number; pct: number; prevSales?: number; growth: string };
    cutelaria: { quota: number; sales: number; pct: number; prevSales?: number; growth: string };
  },
  cdStats: { quota: number; sales: number; pct: number; prevSales?: number },
  vpStats: { quota: number; sales: number; pct: number; prevSales?: number },
  totalStats: { quota: number; sales: number; pct: number; prevSales?: number },
  isPro: boolean = false
) => {
  let slide = pptx.addSlide();
  addSlideChrome(slide, colors, titleText, periodLabel);

  // Column metrics adjusted for safe widescreen centering
  const col1X = 1.1;
  const col2X = 4.9;
  const col3X = 8.7;
  const colW = 3.53;

  slide.addText("DESEMPENHO POR SEGMENTO", {
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
    col1X, 1.65, colW, 1.6,
    "Tramontina Multi",
    formatPercent(segmentStats.multi.pct),
    { quota: segmentStats.multi.quota, sales: segmentStats.multi.sales, prevSales: segmentStats.multi.prevSales, quotaLabel: "Cota do Período", salesLabel: "Venda Realizada no Período" },
    '10B981'
  );

  drawKPIBox(
    slide, colors,
    col1X, 3.35, colW, 1.6,
    isPro ? "Tramontina Pro" : "Tramontina Garibaldi",
    formatPercent(segmentStats.garibaldi.pct),
    { quota: segmentStats.garibaldi.quota, sales: segmentStats.garibaldi.sales, prevSales: segmentStats.garibaldi.prevSales, quotaLabel: "Cota do Período", salesLabel: "Venda Realizada no Período" },
    'F97316'
  );

  drawKPIBox(
    slide, colors,
    col1X, 5.05, colW, 1.6,
    "Tramontina Cutelaria",
    formatPercent(segmentStats.cutelaria.pct),
    { quota: segmentStats.cutelaria.quota, sales: segmentStats.cutelaria.sales, prevSales: segmentStats.cutelaria.prevSales, quotaLabel: "Cota do Período", salesLabel: "Venda Realizada no Período" },
    '60A5FA'
  );

  // CHANNELS
  drawKPIBox(
    slide, colors,
    col2X, 1.65, colW, 2.4,
    "Vendas CD",
    formatPercent(cdStats.pct),
    { quota: cdStats.quota, sales: cdStats.sales, prevSales: cdStats.prevSales, quotaLabel: "Cota do Período (CD)", salesLabel: "Venda Realizada no Período (CD)" },
    colors.indigo
  );

  drawKPIBox(
    slide, colors,
    col2X, 4.25, colW, 2.4,
    "Vendas Varejo (VP)",
    formatPercent(vpStats.pct),
    { quota: vpStats.quota, sales: vpStats.sales, prevSales: vpStats.prevSales, quotaLabel: "Cota do Período (VP)", salesLabel: "Venda Realizada no Período (VP)" },
    colors.indigo
  );

  // CONSOLIDATED TOTAL CARD (rect)
  slide.addShape('rect', {
    x: col3X, y: 1.65, w: colW, h: 5.0,
    fill: { color: isPro ? 'EA580C' : colors.primary },
    line: { color: isPro ? 'EA580C' : colors.primary, pt: 1 }
  });

  slide.addText(isPro ? "TRAMONTINA PRO TOTAL" : "DESEMPENHO DO COORDENADOR", {
    x: col3X + 0.3, y: 2.05, w: colW - 0.6, h: 0.3,
    fontSize: 10, fontFace: 'Segoe UI', color: isPro ? 'FFEDD5' : '93C5FD', bold: true
  });

  slide.addText(formatPercent(totalStats.pct), {
    x: col3X + 0.3, y: 2.45, w: colW - 0.6, h: 1.2,
    fontSize: 54, fontFace: 'Segoe UI', color: colors.white, bold: true
  });

  slide.addText("Desempenho Geral do Período", {
    x: col3X + 0.3, y: 3.75, w: colW - 0.6, h: 0.3,
    fontSize: 12, fontFace: 'Segoe UI', color: colors.white, bold: true
  });

  const consolidatedText: pptxgen.TextProps[] = [
    { text: "Cota do Período:\n", options: { color: 'CBD5E1', fontSize: 10, bold: false } },
    { text: `${formatCurrency(totalStats.quota)}\n\n`, options: { color: colors.white, fontSize: 11, bold: true } },
    { text: "Venda Realizada no Período:\n", options: { color: 'CBD5E1', fontSize: 10, bold: false } },
    { text: `${formatCurrency(totalStats.sales)}`, options: { color: colors.white, fontSize: 13, bold: true } }
  ];

  if (totalStats.prevSales !== undefined && totalStats.prevSales > 0) {
    const pct = ((totalStats.sales - totalStats.prevSales) / totalStats.prevSales) * 100;
    const sign = pct >= 0 ? "+" : "";
    const arrow = pct >= 0 ? "▲" : "▼";
    const growthColor = pct >= 0 ? '4ADE80' : 'FCA5A5'; // Lighter green/red for dark backgrounds
    consolidatedText.push({
      text: `\n\nCrescimento no Período:\n`,
      options: { color: 'CBD5E1', fontSize: 10, bold: false }
    });
    consolidatedText.push({
      text: `${arrow} ${sign}${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
      options: { color: growthColor, fontSize: 13, bold: true }
    });
  }

  slide.addText(consolidatedText, {
    x: col3X + 0.3, y: 4.15, w: colW - 0.6, h: 2.3,
    fontSize: 10, fontFace: 'Segoe UI',
    lineSpacing: 13
  });
};

export const generateSalesPresentation = async ({
  currentYearRecords,
  previousYearRecords,
  customRepNames,
  customRepLocations,
  startMonth,
  endMonth,
  selectedYear
}: PresentationProps) => {
  const pptx = new pptxgen();
  // Define custom 1920x1080 px widescreen layout (16:9 ratio, equivalent to 13.333 x 7.5 inches)
  pptx.defineLayout({ name: 'LAYOUT_1920x1080', width: 13.333, height: 7.5 });
  pptx.layout = 'LAYOUT_1920x1080';

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

  const getPortugueseMonthRange = (start: number, end: number, year: number) => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    if (start === end) {
      return `${months[start - 1]} de ${year}`;
    }
    return `${months[start - 1]} à ${months[end - 1]} de ${year}`;
  };

  const periodLabel = `Vendas acumuladas de ${getPortugueseMonthRange(startMonth, endMonth, selectedYear)}`;

  // Map raw records to assign PRO records to Marcelo Krewer and apply custom names to align with the website
  const mapPresentationRecords = (rawRecs: SalesRecord[]) => {
    return rawRecs.map(r => {
      let coordName = r.coordName || '';
      const isPro = (r.groupName || '').toLowerCase().includes('pro');
      if (isPro) {
        coordName = "Marcelo Krewer";
      }
      const customName = customRepNames[r.repId.toString().trim() || r.repId];
      return {
        ...r,
        coordName,
        repName: customName || r.repName
      };
    });
  };

  const allRecords = mapPresentationRecords(currentYearRecords);
  const previousRecords = mapPresentationRecords(previousYearRecords);

  // ---------------------------------------------------------------------------
  // DATA PREPARATION & SEGMENTATIONS
  // ---------------------------------------------------------------------------
  const isProGroup = (groupNameStr: string): boolean => {
    return (groupNameStr || '').toLowerCase().includes('pro');
  };

  // Helper to calculate segment statistics with comparative growth
  const getSegmentStats = (recs: SalesRecord[], prevRecs: SalesRecord[]) => {
    let multiQ = 0, multiS = 0, prevMultiS = 0;
    let garQ = 0, garS = 0, prevGarS = 0;
    let cutQ = 0, cutS = 0, prevCutS = 0;

    recs.forEach(r => {
      const groupName = (r.groupName || '').trim();
      if (groupName === "Cut Geral Monet.") {
        cutQ += r.quotaTotal;
        cutS += r.valorVendaTotal;
      } else if (groupName === "Garibaldi Master Mon" || groupName === "Garibaldi Pro Monet") {
        garQ += r.quotaTotal;
        garS += r.valorVendaTotal;
      } else {
        // Sem Grupo or any other unmapped group goes to Tramontina Multi
        multiQ += r.quotaTotal;
        multiS += r.valorVendaTotal;
      }
    });

    prevRecs.forEach(r => {
      const groupName = (r.groupName || '').trim();
      if (groupName === "Cut Geral Monet.") {
        prevCutS += r.valorVendaTotal;
      } else if (groupName === "Garibaldi Master Mon" || groupName === "Garibaldi Pro Monet") {
        prevGarS += r.valorVendaTotal;
      } else {
        prevMultiS += r.valorVendaTotal;
      }
    });

    const formatGrowth = (current: number, previous: number): string => {
      if (!previous || previous <= 0) return "À Definir";
      const pct = ((current - previous) / previous) * 100;
      const sign = pct >= 0 ? "+" : "";
      return `${sign}${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    };

    return {
      multi: {
        quota: multiQ,
        sales: multiS,
        pct: multiQ > 0 ? (multiS / multiQ) * 100 : 0,
        prevSales: prevMultiS,
        growth: formatGrowth(multiS, prevMultiS)
      },
      garibaldi: {
        quota: garQ,
        sales: garS,
        pct: garQ > 0 ? (garS / garQ) * 100 : 0,
        prevSales: prevGarS,
        growth: formatGrowth(garS, prevGarS)
      },
      cutelaria: {
        quota: cutQ,
        sales: cutS,
        pct: cutQ > 0 ? (cutS / cutQ) * 100 : 0,
        prevSales: prevCutS,
        growth: formatGrowth(cutS, prevCutS)
      }
    };
  };

  // 1. Total General (CD + VP) for Igor Pedruzzi
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

  let prevTotalSalesCD = 0;
  let prevTotalSalesVP = 0;
  previousRecords.forEach(r => {
    prevTotalSalesCD += r.valorVendaCD;
    prevTotalSalesVP += r.valorVendaVP;
  });
  const prevTotalSalesAll = prevTotalSalesCD + prevTotalSalesVP;

  const pctCDTotal = totalQuotaCD > 0 ? (totalSalesCD / totalQuotaCD) * 100 : 0;
  const pctVPTotal = totalQuotaVP > 0 ? (totalSalesVP / totalQuotaVP) * 100 : 0;
  const pctAllTotal = totalQuotaAll > 0 ? (totalSalesAll / totalQuotaAll) * 100 : 0;

  const igorSegments = getSegmentStats(allRecords, previousRecords);

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

  let prevProSalesCD = 0;
  let prevProSalesVP = 0;
  previousRecords.filter(r => isProGroup(r.groupName)).forEach(r => {
    prevProSalesCD += r.valorVendaCD;
    prevProSalesVP += r.valorVendaVP;
  });
  const prevProSalesAll = prevProSalesCD + prevProSalesVP;

  const marceloQuotaTotal = marceloQuotaCD + marceloQuotaVP;
  const marceloSalesTotal = marceloSalesCD + marceloSalesVP;
  const marceloPctCD = marceloQuotaCD > 0 ? (marceloSalesCD / marceloQuotaCD) * 100 : 0;
  const marceloPctVP = marceloQuotaVP > 0 ? (marceloSalesVP / marceloQuotaVP) * 100 : 0;
  const marceloPctTotal = marceloQuotaTotal > 0 ? (marceloSalesTotal / marceloQuotaTotal) * 100 : 0;

  const marceloSegments = getSegmentStats(proRecords, previousRecords.filter(r => isProGroup(r.groupName)));

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
    const coordPrevRecords = previousRecords.filter(r => {
      const matchName = r.coordName.toLowerCase().trim() === coord.key.toLowerCase().trim() ||
                        r.coordName.toLowerCase().trim().includes(coord.name.toLowerCase().trim().split(' ')[0]);
      return matchName && !isProGroup(r.groupName);
    });
    const segments = getSegmentStats(coordRecords, coordPrevRecords);

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

    let prevSalesCD = 0;
    let prevSalesVP = 0;
    coordPrevRecords.forEach(r => {
      prevSalesCD += r.valorVendaCD;
      prevSalesVP += r.valorVendaVP;
    });
    const prevSalesTotal = prevSalesCD + prevSalesVP;

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
      prevSalesCD,
      prevSalesVP,
      prevSalesTotal,
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
  addSlideChrome(slideBr, colors, "Desempenho dos agentes em relação ao PAIM - Vendas CD + VP", periodLabel);

  // Calculate Month-specific totals for Nordeste (Agente 87) - Ending Month of the period
  const currentMonthRecords = allRecords.filter(r => r.month === endMonth);
  let monthQuotaCD = 0, monthSalesCD = 0;
  let monthQuotaVP = 0, monthSalesVP = 0;
  currentMonthRecords.forEach(r => {
    monthQuotaCD += r.quotaCD;
    monthSalesCD += r.valorVendaCD;
    monthQuotaVP += r.quotaVP;
    monthSalesVP += r.valorVendaVP;
  });
  const monthQuotaTotal = monthQuotaCD + monthQuotaVP;
  const monthSalesTotal = monthSalesCD + monthSalesVP;
  const monthPctTotal = monthQuotaTotal > 0 ? (monthSalesTotal / monthQuotaTotal) * 100 : 0;

  // Calculate YTD Accumulated totals for Nordeste (Agente 87) - Accumulated Range
  let accumQuotaCD = 0, accumSalesCD = 0;
  let accumQuotaVP = 0, accumSalesVP = 0;
  allRecords.forEach(r => {
    accumQuotaCD += r.quotaCD;
    accumSalesCD += r.valorVendaCD;
    accumQuotaVP += r.quotaVP;
    accumSalesVP += r.valorVendaVP;
  });
  const accumQuotaTotal = accumQuotaCD + accumQuotaVP;
  const accumSalesTotal = accumSalesCD + accumSalesVP;
  const accumPctTotal = accumQuotaTotal > 0 ? (accumSalesTotal / accumQuotaTotal) * 100 : 0;

  // Table structure for Brasil Performance
  const brHeaders = [
    getHeaderCell("Agente / Divisão"),
    getHeaderCell("Cota Mês", "right"),
    getHeaderCell("Vendas", "right"),
    getHeaderCell("% Vendas", "center"),
    getHeaderCell("Cota do Período", "right"),
    getHeaderCell("Vendas", "right"),
    getHeaderCell("% Vendas", "center"),
    getHeaderCell("Crescimento no Período", "center")
  ];

  // Previous Year Accumulated sales for Nordeste (Agente 87)
  let prevAccumSalesCD = 0, prevAccumSalesVP = 0;
  previousRecords.forEach(r => {
    prevAccumSalesCD += r.valorVendaCD;
    prevAccumSalesVP += r.valorVendaVP;
  });
  const prevAccumSalesTotal = prevAccumSalesCD + prevAccumSalesVP;

  const formatGrowthPct = (current: number, previous: number): string => {
    if (!previous || previous <= 0) return "À Definir";
    const pct = ((current - previous) / previous) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  };

  const nordesteGrowth = formatGrowthPct(accumSalesTotal, prevAccumSalesTotal);

  // Dynamic Nordeste Total calculations, with other regions filled with "À Definir"
  const brRowsData = [
    { name: "SUL - FERRAMENTAS", qMonth: "À Definir", sMonth: "À Definir", pMonth: "À Definir", qAccum: "À Definir", sAccum: "À Definir", pAccum: "À Definir", growth: "À Definir" },
    { name: "SUD - FERRAMENTAS SP", qMonth: "À Definir", sMonth: "À Definir", pMonth: "À Definir", qAccum: "À Definir", sAccum: "À Definir", pAccum: "À Definir", growth: "À Definir" },
    { name: "SUD - FERRAMENTAS RJ/MG/ES", qMonth: "À Definir", sMonth: "À Definir", pMonth: "À Definir", qAccum: "À Definir", sAccum: "À Definir", pAccum: "À Definir", growth: "À Definir" },
    { name: "PLA - FERRAMENTAS", qMonth: "À Definir", sMonth: "À Definir", pMonth: "À Definir", qAccum: "À Definir", sAccum: "À Definir", pAccum: "À Definir", growth: "À Definir" },
    { name: "NORD - FERRAMENTAS", qMonth: monthQuotaTotal, sMonth: monthSalesTotal, pMonth: monthPctTotal, qAccum: accumQuotaTotal, sAccum: accumSalesTotal, pAccum: accumPctTotal, growth: nordesteGrowth, isDynamic: true },
    { name: "NORTE - FERRAMENTAS", qMonth: "À Definir", sMonth: "À Definir", pMonth: "À Definir", qAccum: "À Definir", sAccum: "À Definir", pAccum: "À Definir", growth: "À Definir" }
  ];

  const brRows: any[] = [brHeaders];

  brRowsData.forEach((row, idx) => {
    const isEven = idx % 2 === 1;

    const qmStr = typeof row.qMonth === 'number' ? formatCurrency(row.qMonth) : row.qMonth;
    const smStr = typeof row.sMonth === 'number' ? formatCurrency(row.sMonth) : row.sMonth;
    const pmStr = typeof row.pMonth === 'number' ? formatPercent(row.pMonth) : row.pMonth;

    const qaStr = typeof row.qAccum === 'number' ? formatCurrency(row.qAccum) : row.qAccum;
    const saStr = typeof row.sAccum === 'number' ? formatCurrency(row.sAccum) : row.sAccum;
    const paStr = typeof row.pAccum === 'number' ? formatPercent(row.pAccum) : row.pAccum;

    const pmColor = typeof row.pMonth === 'number' ? (row.pMonth >= 100 ? colors.green : colors.red) : undefined;
    const paColor = typeof row.pAccum === 'number' ? (row.pAccum >= 100 ? colors.green : colors.red) : undefined;

    brRows.push([
      getBodyCell(row.name, isEven, 'left', row.isDynamic),
      getBodyCell(qmStr, isEven, 'right', row.isDynamic),
      getBodyCell(smStr, isEven, 'right', row.isDynamic),
      getBodyCell(pmStr, isEven, 'center', true, pmColor),
      getBodyCell(qaStr, isEven, 'right', row.isDynamic),
      getBodyCell(saStr, isEven, 'right', row.isDynamic),
      getBodyCell(paStr, isEven, 'center', true, paColor),
      getBodyCell(row.growth, isEven, 'center', false)
    ]);
  });

  // Grand Total row (since other values are "À Definir", the total is also "À Definir")
  brRows.push([
    getBodyCell("CONSOLIDADO BRASIL TOTAL", false, 'left', true, colors.primary),
    getBodyCell("À Definir", false, 'right', true, colors.primary),
    getBodyCell("À Definir", false, 'right', true, colors.primary),
    getBodyCell("À Definir", false, 'center', true, colors.primary),
    getBodyCell("À Definir", false, 'right', true, colors.primary),
    getBodyCell("À Definir", false, 'right', true, colors.primary),
    getBodyCell("À Definir", false, 'center', true, colors.primary),
    getBodyCell("À Definir", false, 'center', true, colors.primary)
  ]);

  slideBr.addTable(brRows, {
    x: 1.1, y: 1.6, w: 11.13,
    colW: [2.73, 1.2, 1.2, 1.0, 1.4, 1.2, 1.0, 1.4],
    border: { type: 'solid', color: 'E2E8F0', pt: 1 }
  });

  slideBr.addText("Nota: Região Nordeste calculada em tempo real com base nas vendas consolidadas da filial. Outras divisões apresentadas como À Definir.", {
    x: 1.1, y: 6.3, w: 11.13, h: 0.3, fontSize: 8.5, fontFace: 'Segoe UI', color: colors.slateLight, italic: true
  });

  // ---------------------------------------------------------------------------
  // SLIDE 2: TELA FATURAMENTO CD BRASIL (FORMER SLIDE 4)
  // ---------------------------------------------------------------------------
  let slideCd = pptx.addSlide();
  addSlideChrome(slideCd, colors, "Vendas CD", periodLabel);

  const getRegionNameCell = (text: string) => {
    return {
      text,
      options: {
        bold: true,
        fill: { color: '020617' }, // Very dark slate
        color: 'FFFFFF',
        fontSize: 9,
        align: 'left',
        valign: 'middle',
        fontFace: 'Segoe UI',
        margin: [3, 5, 3, 5]
      }
    };
  };

  const cdHeaderRow1 = [
    {
      text: "CD´s BRASIL",
      options: {
        rowspan: 2,
        bold: true,
        fill: { color: '001A9C' },
        color: 'FFFFFF',
        fontSize: 9,
        align: 'center',
        valign: 'middle',
        fontFace: 'Segoe UI',
        margin: [2, 3, 2, 3]
      }
    },
    {
      text: `${getMonthName(endMonth).toUpperCase()} ${selectedYear}`,
      options: {
        colspan: 3,
        bold: true,
        fill: { color: '001A9C' },
        color: 'FFFFFF',
        fontSize: 9,
        align: 'center',
        valign: 'middle',
        fontFace: 'Segoe UI',
        margin: [2, 3, 2, 3]
      }
    },
    {
      text: `CRESCIMENTO MENSAL\n${selectedYear - 1} x ${selectedYear}`,
      options: {
        colspan: 2,
        bold: true,
        fill: { color: '001A9C' },
        color: 'FFFFFF',
        fontSize: 8,
        align: 'center',
        valign: 'middle',
        fontFace: 'Segoe UI',
        margin: [2, 3, 2, 3]
      }
    },
    {
      text: `ACUMULADO ${selectedYear}\nJAN a ${getMonthName(endMonth).toUpperCase()}`,
      options: {
        colspan: 3,
        bold: true,
        fill: { color: '001A9C' },
        color: 'FFFFFF',
        fontSize: 8,
        align: 'center',
        valign: 'middle',
        fontFace: 'Segoe UI',
        margin: [2, 3, 2, 3]
      }
    },
    {
      text: `CRESCIMENTO ACUMULADO\n${selectedYear} x ${selectedYear - 1}`,
      options: {
        colspan: 2,
        bold: true,
        fill: { color: '001A9C' },
        color: 'FFFFFF',
        fontSize: 8,
        align: 'center',
        valign: 'middle',
        fontFace: 'Segoe UI',
        margin: [2, 3, 2, 3]
      }
    }
  ];

  const cdHeaderRow2 = [
    { text: "Meta", options: { bold: true, fill: { color: '001A9C' }, color: 'FFFFFF', fontSize: 8, align: 'center', valign: 'middle', fontFace: 'Segoe UI' } },
    { text: "Realizado", options: { bold: true, fill: { color: '001A9C' }, color: 'FFFFFF', fontSize: 8, align: 'center', valign: 'middle', fontFace: 'Segoe UI' } },
    { text: "%", options: { bold: true, fill: { color: '001A9C' }, color: 'FFFFFF', fontSize: 8, align: 'center', valign: 'middle', fontFace: 'Segoe UI' } },
    
    { text: `Vendas\n${getMonthName(endMonth)} ${selectedYear - 1}`, options: { bold: true, fill: { color: '001A9C' }, color: 'FFFFFF', fontSize: 8, align: 'center', valign: 'middle', fontFace: 'Segoe UI' } },
    { text: `Crescimento\n${selectedYear} x ${selectedYear - 1}`, options: { bold: true, fill: { color: '001A9C' }, color: 'FFFFFF', fontSize: 8, align: 'center', valign: 'middle', fontFace: 'Segoe UI' } },
    
    { text: "Meta", options: { bold: true, fill: { color: '001A9C' }, color: 'FFFFFF', fontSize: 8, align: 'center', valign: 'middle', fontFace: 'Segoe UI' } },
    { text: "Realizado", options: { bold: true, fill: { color: '001A9C' }, color: 'FFFFFF', fontSize: 8, align: 'center', valign: 'middle', fontFace: 'Segoe UI' } },
    { text: "%", options: { bold: true, fill: { color: '001A9C' }, color: 'FFFFFF', fontSize: 8, align: 'center', valign: 'middle', fontFace: 'Segoe UI' } },
    
    { text: `Vendas\nJan a ${getMonthName(endMonth)} ${selectedYear - 1}`, options: { bold: true, fill: { color: '001A9C' }, color: 'FFFFFF', fontSize: 7, align: 'center', valign: 'middle', fontFace: 'Segoe UI' } },
    { text: `Crescimento\n${selectedYear} x ${selectedYear - 1}`, options: { bold: true, fill: { color: '001A9C' }, color: 'FFFFFF', fontSize: 8, align: 'center', valign: 'middle', fontFace: 'Segoe UI' } }
  ];

  const regions = ["Sul", "Sudeste", "Planalto", "Nordeste", "Norte"];
  const cdRows: any[] = [cdHeaderRow1, cdHeaderRow2];

  // Previous Year Month-specific CD sales for Nordeste (Agente 87)
  const prevMonthRecordsForCd = previousRecords.filter(r => r.month === endMonth);
  let prevMonthSalesCD = 0;
  prevMonthRecordsForCd.forEach(r => {
    prevMonthSalesCD += r.valorVendaCD;
  });

  const monthPctCD = monthQuotaCD > 0 ? (monthSalesCD / monthQuotaCD) * 100 : 0;
  const accumPctCD = accumQuotaCD > 0 ? (accumSalesCD / accumQuotaCD) * 100 : 0;

  const monthGrowthCD = formatGrowthPct(monthSalesCD, prevMonthSalesCD);
  const accumGrowthCD = formatGrowthPct(accumSalesCD, prevAccumSalesCD);

  regions.forEach((region, idx) => {
    const isEven = idx % 2 === 1;
    const isNordeste = region === "Nordeste";
    
    const rowCells: any[] = [
      getRegionNameCell(region)
    ];

    if (isNordeste) {
      // Columns in order: Meta, Realizado, %, PrevYearMonth, Growth, MetaAccum, RealizadoAccum, %Accum, PrevYearAccum, GrowthAccum
      const cellsData = [
        { val: monthQuotaCD, type: 'currency' },
        { val: monthSalesCD, type: 'currency' },
        { val: monthPctCD, type: 'percent', highlight: true },
        { val: prevMonthSalesCD, type: 'currency' },
        { val: monthGrowthCD, type: 'growth' },
        { val: accumQuotaCD, type: 'currency' },
        { val: accumSalesCD, type: 'currency' },
        { val: accumPctCD, type: 'percent', highlight: true },
        { val: prevAccumSalesCD, type: 'currency' },
        { val: accumGrowthCD, type: 'growth' }
      ];

      cellsData.forEach(c => {
        let textVal = "";
        let colorVal = isEven ? '64748B' : '475569';
        
        if (c.type === 'currency' && typeof c.val === 'number') {
          textVal = formatCurrency(c.val);
        } else if (c.type === 'percent' && typeof c.val === 'number') {
          textVal = formatPercent(c.val);
          if (c.highlight) {
            colorVal = c.val >= 100 ? colors.green : colors.red;
          }
        } else {
          textVal = String(c.val);
        }

        rowCells.push({
          text: textVal,
          options: {
            bold: isNordeste,
            fill: { color: isEven ? 'F1F5F9' : 'F8FAFC' }, // Highlight Nordeste row slightly
            color: colorVal,
            fontSize: 8.5,
            align: 'center',
            valign: 'middle',
            fontFace: 'Segoe UI',
            margin: [3, 5, 3, 5]
          }
        });
      });
    } else {
      for (let i = 0; i < 10; i++) {
        rowCells.push({
          text: "À Definir",
          options: {
            bold: false,
            fill: { color: isEven ? 'F8FAFC' : 'FFFFFF' },
            color: '64748B',
            fontSize: 8.5,
            align: 'center',
            valign: 'middle',
            fontFace: 'Segoe UI',
            margin: [3, 5, 3, 5]
          }
        });
      }
    }
    cdRows.push(rowCells);
  });

  const totalRow = [
    getRegionNameCell("TOTAL")
  ];
  for (let i = 0; i < 10; i++) {
    totalRow.push({
      text: "À Definir",
      options: {
        bold: true,
        fill: { color: 'F1F5F9' },
        color: '0F172A',
        fontSize: 9,
        align: 'center',
        valign: 'middle',
        fontFace: 'Segoe UI',
        margin: [3, 5, 3, 5]
      }
    });
  }
  cdRows.push(totalRow);

  slideCd.addTable(cdRows, {
    x: 0.5, y: 1.6, w: 12.33,
    colW: [1.33, 1.1, 1.1, 0.9, 1.2, 1.1, 1.1, 1.1, 0.9, 1.3, 1.13],
    border: { type: 'solid', color: 'CBD5E1', pt: 1 }
  });

  slideCd.addText("Nota: Região Nordeste calculada em tempo real com base nas vendas de CD da filial. Outras divisões apresentadas como À Definir.", {
    x: 0.5, y: 6.3, w: 12.33, h: 0.3, fontSize: 8.5, fontFace: 'Segoe UI', color: colors.slateLight, italic: true
  });

  // ---------------------------------------------------------------------------
  // SLIDE 6: DESEMPENHO FERRAMENTAS NORDESTE (IGOR PEDRUZZI)
  // ---------------------------------------------------------------------------
  addBentoDashboardSlide(
    pptx,
    colors,
    "Igor Pedruzzi — Gerente de Vendas",
    periodLabel,
    igorSegments,
    { quota: totalQuotaCD, sales: totalSalesCD, pct: pctCDTotal, prevSales: prevTotalSalesCD },
    { quota: totalQuotaVP, sales: totalSalesVP, pct: pctVPTotal, prevSales: prevTotalSalesVP },
    { quota: totalQuotaAll, sales: totalSalesAll, pct: pctAllTotal, prevSales: prevTotalSalesAll }
  );

  // ---------------------------------------------------------------------------
  // SLIDE 7: MARCELO KREWER - TRAMONTINA PRO (ONLY TRAMONTINA PRO)
  // ---------------------------------------------------------------------------
  addBentoDashboardSlide(
    pptx,
    colors,
    "Marcelo Krewer — Coordenador de Vendas",
    periodLabel,
    marceloSegments,
    { quota: marceloQuotaCD, sales: marceloSalesCD, pct: marceloPctCD, prevSales: prevProSalesCD },
    { quota: marceloQuotaVP, sales: marceloSalesVP, pct: marceloPctVP, prevSales: prevProSalesVP },
    { quota: marceloQuotaTotal, sales: marceloSalesTotal, pct: marceloPctTotal, prevSales: prevProSalesAll },
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
      `${coord.display} — Coordenador de Vendas`,
      periodLabel,
      coord.segments,
      { quota: coord.quotaCD, sales: coord.salesCD, pct: coord.pctCD, prevSales: coord.prevSalesCD },
      { quota: coord.quotaVP, sales: coord.salesVP, pct: coord.pctVP, prevSales: coord.prevSalesVP },
      { quota: coord.quotaTotal, sales: coord.salesTotal, pct: coord.pctTotal, prevSales: coord.prevSalesTotal }
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
  const fileName = `Apresentacao_Vendas_Nordeste_${endMonth}_${selectedYear}.pptx`;
  await pptx.writeFile({ fileName });
};
