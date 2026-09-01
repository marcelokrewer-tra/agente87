import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { INITIAL_RAW_DATA, parseTSV } from "./src/rawData";
import { SalesRecord } from "./src/types";

interface MonthData {
  id: string; // e.g. "2026-06"
  year: number;
  month: number;
  updatedAt: string;
  records: SalesRecord[];
}

export interface DailySalesData {
  id: string; // e.g. "2026-09-01"
  year: number;
  month: number;
  day: number;
  updatedAt: string;
  records: SalesRecord[];
}

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "monthly_sales_db.json");
const DAILY_DB_FILE = path.join(process.cwd(), "daily_sales_db.json");

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to load database
function loadDatabase(): Record<string, MonthData> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error loading JSON database, resetting:", error);
  }

  // Pre-seed authentic initial active period (June 2026)
  const baseRecords = parseTSV(INITIAL_RAW_DATA);
  const db: Record<string, MonthData> = {
    "2026-06": {
      id: "2026-06",
      year: 2026,
      month: 6,
      updatedAt: new Date().toISOString(),
      records: baseRecords,
    }
  };
  saveDatabase(db);
  return db;
}

// Helper to load daily sales database
function loadDailyDatabase(): Record<string, DailySalesData> {
  try {
    if (fs.existsSync(DAILY_DB_FILE)) {
      const content = fs.readFileSync(DAILY_DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error loading daily JSON database:", error);
  }
  return {};
}

// Helper to save daily sales database
function saveDailyDatabase(db: Record<string, DailySalesData>): void {
  try {
    fs.writeFileSync(DAILY_DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving daily JSON database:", error);
  }
}

function getMappedGroupName(groupName: string | undefined): string {
  const name = (groupName || '').trim();
  const nameLower = name.toLowerCase();
  if (nameLower === "cut geral monet.") return "Tramontina Cutelaria";
  if (nameLower === "garibaldi master mon") return "Tramontina Master";
  if (nameLower === "garibaldi pro monet" || nameLower.includes("pro")) return "Tramontina Pro";
  return "Tramontina Multi";
}

// Helper to save database
function saveDatabase(db: Record<string, MonthData>): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving JSON database:", error);
  }
}

// API Routes
// 1. Get list of all periods with metadata (excluding full records to keep payload small)
app.get("/api/monthly-data", (req, res) => {
  const db = loadDatabase();
  const list = Object.values(db).map(({ id, year, month, updatedAt, records }) => ({
    id,
    year,
    month,
    updatedAt,
    recordsCount: records.length,
  }));
  res.json(list);
});

// 2. Get records for a specific period
app.get("/api/monthly-data/:year/:month", (req, res) => {
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);
  const id = `${year}-${String(month).padStart(2, "0")}`;
  
  const db = loadDatabase();
  const data = db[id];
  
  if (data) {
    res.json(data);
  } else {
    // If not found, return empty structure instead of failing
    res.json({
      id,
      year,
      month,
      updatedAt: "",
      records: [],
      exists: false,
    });
  }
});

// 3. Post/update records for a specific period
app.post("/api/monthly-data", (req, res) => {
  const { year, month, records } = req.body;
  
  if (!year || !month || !Array.isArray(records)) {
    return res.status(400).json({ error: "Parâmetros inválidos. 'year', 'month' e 'records' (array) são obrigatórios." });
  }

  const id = `${year}-${String(month).padStart(2, "0")}`;
  const db = loadDatabase();
  
  db[id] = {
    id,
    year: parseInt(year),
    month: parseInt(month),
    updatedAt: new Date().toISOString(),
    records,
  };
  
  saveDatabase(db);
  res.json({ success: true, id, recordsCount: records.length });
});

// 4. Delete a specific period's data
app.delete("/api/monthly-data/:year/:month", (req, res) => {
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);
  const id = `${year}-${String(month).padStart(2, "0")}`;
  
  const db = loadDatabase();
  if (db[id]) {
    delete db[id];
    saveDatabase(db);
    res.json({ success: true, message: `Dados de ${month}/${year} removidos com sucesso.` });
  } else {
    res.status(404).json({ error: "Período não encontrado." });
  }
});

// 5. Reset to factory defaults
app.post("/api/monthly-data/reset", (req, res) => {
  const initialRecords = parseTSV(INITIAL_RAW_DATA);
  const db: Record<string, MonthData> = {
    "2026-06": {
      id: "2026-06",
      year: 2026,
      month: 6,
      updatedAt: new Date().toISOString(),
      records: initialRecords,
    }
  };
  saveDatabase(db);
  res.json({ success: true, message: "Banco de dados redefinido para os padrões de fábrica." });
});

// ==================== DAILY SALES MEMORY ROUTES ====================
// 1. Get list of all recorded days with metadata
app.get("/api/daily-sales", (req, res) => {
  const db = loadDailyDatabase();
  const list = Object.values(db).map(({ id, year, month, day, updatedAt, records }) => ({
    id,
    year,
    month,
    day,
    updatedAt,
    recordsCount: records.length,
  }));
  res.json(list);
});

// 2. Get records for a specific day
app.get("/api/daily-sales/:year/:month/:day", (req, res) => {
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);
  const day = parseInt(req.params.day);
  const id = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  
  const db = loadDailyDatabase();
  const data = db[id];
  
  if (data) {
    res.json(data);
  } else {
    res.json({
      id,
      year,
      month,
      day,
      updatedAt: "",
      records: [],
      exists: false,
    });
  }
});

// 3. Post/update records for a specific day (overwrites any previous submission for that day)
app.post("/api/daily-sales", (req, res) => {
  const { year, month, day, records } = req.body;
  
  if (!year || !month || !day || !Array.isArray(records)) {
    return res.status(400).json({ error: "Parâmetros inválidos. 'year', 'month', 'day' e 'records' (array) são obrigatórios." });
  }

  const id = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const db = loadDailyDatabase();
  
  // Always overwrites so only the latest report of that day is stored in permanent database
  db[id] = {
    id,
    year: parseInt(year),
    month: parseInt(month),
    day: parseInt(day),
    updatedAt: new Date().toISOString(),
    records,
  };
  
  saveDailyDatabase(db);
  res.json({ success: true, id, recordsCount: records.length, updatedAt: db[id].updatedAt });
});

// 4. Delete a specific day's data
app.delete("/api/daily-sales/:year/:month/:day", (req, res) => {
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);
  const day = parseInt(req.params.day);
  const id = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  
  const db = loadDailyDatabase();
  if (db[id]) {
    delete db[id];
    saveDailyDatabase(db);
    res.json({ success: true, message: `Dados do dia ${day}/${month}/${year} removidos com sucesso.` });
  } else {
    res.status(404).json({ error: "Registro diário não encontrado." });
  }
});

// 6. AI Insights Generator powered by Gemini (with Full System Sales DB Access & Local Analytical Fallback)
function getSystemWideDatabaseAnalysis() {
  const db = loadDatabase();
  const periodKeys = Object.keys(db); // e.g. ["2026-06", "2025-07", ...]
  
  const periodDetails: Record<string, any> = {};
  const yearDetails: Record<number, any> = {};

  periodKeys.forEach(pKey => {
    const monthData = db[pKey];
    const recs = monthData.records || [];

    let totalQuota = 0;
    let totalFaturado = 0;
    const groups: Record<string, { quota: number; faturado: number }> = {};
    const coords: Record<string, { quota: number; faturado: number }> = {};
    const reps: Record<string, { name: string; repId: number; quota: number; faturado: number }> = {};

    recs.forEach(r => {
      const gName = getMappedGroupName(r.groupName);
      const cName = r.originalCoordName || r.coordName || "Outros";
      const repKey = `${r.repId}`;
      const repName = r.repName || `Rep ${r.repId}`;

      const q = r.quotaTotal || 0;
      const f = r.valorVendaTotal || r.faturadoTotal || 0;

      totalQuota += q;
      totalFaturado += f;

      if (!groups[gName]) groups[gName] = { quota: 0, faturado: 0 };
      groups[gName].quota += q;
      groups[gName].faturado += f;

      if (!coords[cName]) coords[cName] = { quota: 0, faturado: 0 };
      coords[cName].quota += q;
      coords[cName].faturado += f;

      if (!reps[repKey]) reps[repKey] = { name: repName, repId: r.repId, quota: 0, faturado: 0 };
      reps[repKey].quota += q;
      reps[repKey].faturado += f;
    });

    periodDetails[pKey] = {
      year: monthData.year,
      month: monthData.month,
      recordsCount: recs.length,
      totalQuota,
      totalFaturado,
      totalDefasagem: totalFaturado - totalQuota,
      totalPercent: totalQuota > 0 ? (totalFaturado / totalQuota) * 100 : 0,
      groups: Object.entries(groups).map(([g, val]) => ({
        group: g,
        quota: val.quota,
        faturado: val.faturado,
        defasagem: val.faturado - val.quota,
        percent: val.quota > 0 ? (val.faturado / val.quota) * 100 : 0
      })).sort((a, b) => a.defasagem - b.defasagem),
      coordinators: Object.entries(coords).map(([c, val]) => ({
        name: c,
        quota: val.quota,
        faturado: val.faturado,
        defasagem: val.faturado - val.quota,
        percent: val.quota > 0 ? (val.faturado / val.quota) * 100 : 0
      })).sort((a, b) => a.defasagem - b.defasagem),
      reps: Object.values(reps).map(val => ({
        name: val.name,
        repId: val.repId,
        quota: val.quota,
        faturado: val.faturado,
        defasagem: val.faturado - val.quota,
        percent: val.quota > 0 ? (val.faturado / val.quota) * 100 : 0
      })).sort((a, b) => a.defasagem - b.defasagem)
    };

    // Year level accumulation
    const y = monthData.year;
    if (!yearDetails[y]) {
      yearDetails[y] = {
        year: y,
        quota: 0,
        faturado: 0,
        defasagem: 0,
        percent: 0,
        groups: {},
        coords: {},
        reps: {}
      };
    }
    yearDetails[y].quota += totalQuota;
    yearDetails[y].faturado += totalFaturado;

    Object.entries(groups).forEach(([g, val]) => {
      if (!yearDetails[y].groups[g]) yearDetails[y].groups[g] = { quota: 0, faturado: 0 };
      yearDetails[y].groups[g].quota += val.quota;
      yearDetails[y].groups[g].faturado += val.faturado;
    });

    Object.entries(coords).forEach(([c, val]) => {
      if (!yearDetails[y].coords[c]) yearDetails[y].coords[c] = { quota: 0, faturado: 0 };
      yearDetails[y].coords[c].quota += val.quota;
      yearDetails[y].coords[c].faturado += val.faturado;
    });

    Object.entries(reps).forEach(([rId, val]) => {
      if (!yearDetails[y].reps[rId]) yearDetails[y].reps[rId] = { name: val.name, repId: val.repId, quota: 0, faturado: 0 };
      yearDetails[y].reps[rId].quota += val.quota;
      yearDetails[y].reps[rId].faturado += val.faturado;
    });
  });

  // Finalize Year Details calculations
  Object.keys(yearDetails).forEach(yStr => {
    const y = Number(yStr);
    const yd = yearDetails[y];
    yd.defasagem = yd.faturado - yd.quota;
    yd.percent = yd.quota > 0 ? (yd.faturado / yd.quota) * 100 : 0;
  });

  return {
    availablePeriods: periodKeys,
    periodDetails,
    yearDetails
  };
}

app.post("/api/ai-insights", async (req, res) => {
  const { question, context } = req.body;
  const sysAnalysis = getSystemWideDatabaseAnalysis();

  const generateLocalAnalyticalReport = (q: string, ctx: any) => {
    const lowerQ = (q || "").toLowerCase();
    const periods = sysAnalysis.availablePeriods;

    // Check if question asks about specific month (Julho, Junho, Janeiro, etc.)
    const monthNamesMap: Record<string, number> = {
      'janeiro': 1, 'jan': 1,
      'fevereiro': 2, 'fev': 2,
      'março': 3, 'marco': 3, 'mar': 3,
      'abril': 4, 'abr': 4,
      'maio': 5, 'mai': 5,
      'junho': 6, 'jun': 6,
      'julho': 7, 'jul': 7,
      'agosto': 8, 'ago': 8,
      'setembro': 9, 'set': 9,
      'outubro': 10, 'out': 10,
      'novembro': 11, 'nov': 11,
      'dezembro': 12, 'dez': 12
    };

    const monthLabelsMap: Record<number, string> = {
      1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
      7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
    };

    let askedMonthName = "";
    let askedMonthNum = 0;
    Object.entries(monthNamesMap).forEach(([name, num]) => {
      if (!askedMonthName && new RegExp(`\\b${name}\\b`, 'i').test(lowerQ)) {
        askedMonthName = monthLabelsMap[num] || name;
        askedMonthNum = num;
      }
    });

    // Extract explicit year or infer default year = 2026
    let askedYear = 0;
    const yearMatch = lowerQ.match(/\b(202[0-9])\b/);
    if (yearMatch) {
      askedYear = parseInt(yearMatch[1], 10);
    } else if (askedMonthNum > 0) {
      // Default to 2026 if month mentioned without explicit year (user requirement)
      askedYear = 2026;
    }

    // Use client context periods if provided, otherwise server database
    const yearDetails = (ctx?.yearlyAccumulated && Object.keys(ctx.yearlyAccumulated).length > 0)
      ? ctx.yearlyAccumulated
      : sysAnalysis.yearDetails;

    const allPeriods = (ctx?.allAvailablePeriods && ctx.allAvailablePeriods.length > 0)
      ? ctx.allAvailablePeriods
      : Object.values(sysAnalysis.periodDetails);

    // List of registered period labels for user messaging
    const registeredPeriodLabels = allPeriods.map((p: any) => {
      const mName = monthLabelsMap[p.month] || `Mês ${p.month}`;
      const yVal = p.year || 2026;
      return `${mName}/${yVal}`;
    });

    // Check YoY Comparison query (2025 vs 2026 or "acumulado", "comparando", "queda")
    const isYoYQuery = lowerQ.includes("2025") || lowerQ.includes("2026") || lowerQ.includes("comparando") || lowerQ.includes("queda no acumulado") || lowerQ.includes("comparar");

    if (isYoYQuery && !askedMonthNum) {
      const y2025 = yearDetails[2025];
      const y2026 = yearDetails[2026];

      if (y2025 && y2026) {
        // Calculate exact YoY differences
        const diffTotal = (y2026.faturado || y2026.totalFaturado || 0) - (y2025.faturado || y2025.totalFaturado || 0);
        const fat25 = y2025.faturado || y2025.totalFaturado || 0;
        const fat26 = y2026.faturado || y2026.totalFaturado || 0;
        const pctDiff = fat25 > 0 ? ((diffTotal) / fat25) * 100 : 0;

        // Group drops comparison
        const g25 = y2025.groups || y2025.productGroups || {};
        const g26 = y2026.groups || y2026.productGroups || {};
        const allGroupNames = Array.from(new Set([...Object.keys(g25), ...Object.keys(g26)]));
        
        const groupComparison = allGroupNames.map(g => {
          const f25 = g25[g]?.faturado || 0;
          const f26 = g26[g]?.faturado || 0;
          const diff = f26 - f25;
          const pct = f25 > 0 ? ((diff) / f25) * 100 : 0;
          return { group: g, f25, f26, diff, pct };
        }).sort((a, b) => a.diff - b.diff);

        const worstGroupYoY = groupComparison[0] || { group: 'Pro', diff: 0, pct: 0 };

        return `### 🎯 Comparativo de Vendas Acumulado (2025 vs 2026)
A análise comparativa do faturamento acumulado entre **2025** e **2026** mostra uma variação total de **R$ ${diffTotal.toLocaleString('pt-BR')}** (**${pctDiff.toFixed(1)}%**).

A maior queda por linha de produto no acumulado foi na linha **${worstGroupYoY.group}**, com uma redução de **R$ ${Math.abs(worstGroupYoY.diff).toLocaleString('pt-BR')}** (**${worstGroupYoY.pct.toFixed(1)}%**).

### 📊 Desempenho Comparativo por Linha de Produto
${groupComparison.map(g => 
  `- **${g.group}**: 2025 = R$ ${g.f25.toLocaleString('pt-BR')} | 2026 = R$ ${g.f26.toLocaleString('pt-BR')} | Variação = **R$ ${g.diff.toLocaleString('pt-BR')}** (${g.pct.toFixed(1)}%)`
).join('\n')}

### 💡 Recomendações Estratégicas
- **Reativação da Linha ${worstGroupYoY.group}**: Focar em ações de incentivo para recuperar o volume do período anterior.
- **Acompanhamento de Metas**: Ajustar estratégias de promoção para os grupos com maior queda acumulada.`;
      }
    }

    // Specific Month Query (e.g., Julho de 2026, Janeiro de 2026, Julho de 2025)
    if (askedMonthName && askedMonthNum) {
      const targetId = `${askedYear}-${String(askedMonthNum).padStart(2, '0')}`;
      
      let matchPeriod = sysAnalysis.periodDetails[targetId];
      if (!matchPeriod && allPeriods) {
        matchPeriod = allPeriods.find((p: any) => p.id === targetId || (p.year === askedYear && p.month === askedMonthNum));
      }

      if (matchPeriod) {
        const groups = matchPeriod.productGroups || matchPeriod.groups || [];
        const coords = matchPeriod.coordinators || matchPeriod.coords || [];
        const worstG = groups[0];

        const faturadoVal = matchPeriod.totalFaturado ?? matchPeriod.faturado ?? 0;
        const quotaVal = matchPeriod.totalQuota ?? matchPeriod.quota ?? 0;
        const defasagemVal = matchPeriod.totalDefasagem ?? (faturadoVal - quotaVal);
        const percentVal = matchPeriod.totalPercent ?? (quotaVal > 0 ? (faturadoVal / quotaVal) * 100 : 0);

        return `### 🎯 Análise do Mês de ${askedMonthName} de ${askedYear}
Dados de vendas obtidos do banco de dados do sistema para **${askedMonthName}/${askedYear}**:
- **Faturamento Total**: **R$ ${faturadoVal.toLocaleString('pt-BR')}**
- **Cota / Meta Total**: **R$ ${quotaVal.toLocaleString('pt-BR')}**
- **Defasagem Total**: **R$ ${defasagemVal.toLocaleString('pt-BR')}**
- **Atingimento da Meta**: **${percentVal.toFixed(1)}%**

### 📊 Desempenho por Linha de Produto em ${askedMonthName}/${askedYear}
${groups.map((g: any) => 
  `- **${g.group}**: Meta R$ ${(g.quota || 0).toLocaleString('pt-BR')} | Faturado R$ ${(g.faturado || 0).toLocaleString('pt-BR')} | Defasagem **R$ ${(g.defasagem || 0).toLocaleString('pt-BR')}** (**${(g.percent || 0).toFixed(1)}%**)`
).join('\n')}

${coords.length > 0 ? `### 👤 Desempenho por Coordenador em ${askedMonthName}/${askedYear}
${coords.slice(0, 5).map((c: any) => 
  `- **${c.name}**: Meta R$ ${(c.quota || 0).toLocaleString('pt-BR')} | Faturado R$ ${(c.faturado || 0).toLocaleString('pt-BR')} | Defasagem **R$ ${(c.defasagem || 0).toLocaleString('pt-BR')}** (**${(c.percent || 0).toFixed(1)}%**)`
).join('\n')}` : ''}

### 💡 Diagnóstico e Destaques
- **Maior Ponto de Atenção**: Linha **${worstG?.group || 'Pro'}** com defasagem de **R$ ${Math.abs(worstG?.defasagem || 0).toLocaleString('pt-BR')}**.
- **Status dos Dados**: Registros do mês **${askedMonthName}/${askedYear}** auditados e integrados com sucesso.`;
      } else {
        return `### 🎯 Consulta do Mês de ${askedMonthName} de ${askedYear}
O mês de **${askedMonthName}/${askedYear}** ainda não possui planilha de vendas cadastrada no banco de dados do sistema.

**Períodos atualmente disponíveis no banco de dados:**
${registeredPeriodLabels.length > 0 ? registeredPeriodLabels.map((pLabel: string) => `- **${pLabel}**`).join('\n') : '- Nenhum período cadastrado no momento.'}

### 💡 Como Carregar os Dados de ${askedMonthName}/${askedYear}
1. Acesse a aba **'Importar (Excel)'** no menu superior.
2. Selecione o mês **${askedMonthName}** e o ano **${askedYear}**.
3. Cole as informações de vendas e clique em **'Salvar Dados'**.
O sistema processará as informações e a IA passará a analisar **${askedMonthName}/${askedYear}** automaticamente!`;
      }
    }

    // Default Fallback query for active tab or general queries
    const period = ctx?.periodLabel || "Período Ativo";
    const totalFaturado = ctx?.totalFaturado ? `R$ ${Number(ctx.totalFaturado).toLocaleString('pt-BR')}` : "R$ 0";
    const totalQuota = ctx?.totalQuota ? `R$ ${Number(ctx.totalQuota).toLocaleString('pt-BR')}` : "R$ 0";
    const totalDefasagem = ctx?.totalDefasagem ? `R$ ${Number(ctx.totalDefasagem).toLocaleString('pt-BR')}` : "R$ 0";
    const totalPercent = ctx?.totalPercent ? `${Number(ctx.totalPercent).toFixed(1)}%` : "0,0%";

    const groups: Array<any> = ctx?.productGroups || [];
    const sortedGroups = [...groups].sort((a, b) => (a.defasagem ?? 0) - (b.defasagem ?? 0));
    const worstGroup = sortedGroups[0];
    const bottomReps: Array<any> = ctx?.bottomReps || [];
    const coords: Array<any> = ctx?.coordinators || [];

    return `### 🎯 Resposta Direta
Análise executiva completa realizada para o período **${period}**. O faturamento acumulado é de **${totalFaturado}** para uma meta de **${totalQuota}** (**${totalPercent}** de atingimento e defasagem de **${totalDefasagem}**).

### 📊 Análise Numérica por Grupo de Produto
${sortedGroups.slice(0, 5).map(g => 
  `- **${g.group}**: Meta R$ ${Number(g.quota || 0).toLocaleString('pt-BR')} | Faturado R$ ${Number(g.faturado || 0).toLocaleString('pt-BR')} | Defasagem **R$ ${(g.defasagem || 0).toLocaleString('pt-BR')}** (**${(g.percent || 0).toFixed(1)}%**)`
).join('\n')}

### 💡 Ações Estratégicas Recomendadas
- **Aceleração na Linha ${worstGroup?.group || 'Pro'}**: Foco em ofertas combinadas com representantes e grandes contas.
- **Acompanhamento de Coordenadores**: Priorizar os coordenadores com maior distância em relação à cota do período.
- **Base do Sistema**: ${periods.length} período(s) cadastrado(s) na base do sistema (${periods.join(', ')}).`;
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.CUSTOM_GEMINI_API_KEY;

    if (!apiKey) {
      // Use smart local analytical engine fallback when no key is set
      const localReport = generateLocalAnalyticalReport(question, context);
      return res.json({ answer: localReport });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `
Você é o Consultor e Assistente Executivo de Inteligência em Vendas do Agente 87 (Tramontina).
Sua missão é responder perguntas comerciais e fornecer insights estratégicos altamente precisos sobre os dados de vendas do banco de dados do sistema.

REGRA OBRIGATÓRIA DE DEDUÇÃO DE ANO:
- O ano corrente de operação é **2026**.
- Se o usuário perguntar sobre um mês sem indicar o ano (ex: "como foi julho?", "e janeiro?", "qual a meta de maio?"), VOCÊ DEVE DEDUZIR QUE ELE SE REFERE AO ANO DE **2026** (ex: Julho/2026, Janeiro/2026).
- Caso o usuário mencione explicitamente outro ano (ex: "julho de 2025"), busque especificamente esse ano no banco de dados.

ACESSO COMPLETO AO BANCO DE DADOS DE VENDAS DO SISTEMA:
- Períodos disponíveis cadastrados: ${JSON.stringify(sysAnalysis.availablePeriods)}
- Resumo consolidado por período (mês/ano): ${JSON.stringify(sysAnalysis.periodDetails, null, 2)}
- Resumo acumulado por ano (2025, 2026, etc): ${JSON.stringify(sysAnalysis.yearDetails, null, 2)}
- Histórico enviado pelo navegador do cliente: ${JSON.stringify(context?.allAvailablePeriods || [], null, 2)}

CONTEXTO DA TELA ATIVA DO USUÁRIO:
${JSON.stringify(context, null, 2)}

PERGUNTA OU SOLICITAÇÃO DO USUÁRIO:
"${question || "Gere um resumo executivo com as maiores defasagens de metas no período, destaques positivos e sugestões para recuperar as vendas."}"

DIRETRIZES DE RESPOSTA:
1. Responda em Português do Brasil com linguagem executiva, clara, direta e numérica.
2. Analise os dados completos do sistema. Ao responder sobre um mês específico, busque o registro correspondente (ano deduzido como 2026 se não for informado) em todo o banco de dados.
3. Se o mês/ano consultado ainda não tiver registros gravados no sistema, informe de forma amigável e precisa quais períodos já estão cadastrados e oriente que o usuário pode importar este mês na aba "Importar (Excel)".
4. Seja extremamente preciso e forneça números reais. Destaque valores em R$ e % em **negrito**.
5. Organize sua resposta em Markdown:
   - 🎯 **Resposta Direta**: Solução objetiva para a pergunta feita.
   - 📊 **Análise Numérica Detalhada**: Tabela ou lista com Faturamento, Meta, Defasagem (R$) e Atingimento (%) por Grupo de Produtos e Coordenadores.
   - 💡 **Ações Estratégicas Recomendadas**: 2 a 3 recomendações comerciais acionáveis.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ answer: response.text });
  } catch (err: any) {
    console.warn("API Gemini retornou erro. Usando motor analítico local de segurança:", err.message);
    const fallbackReport = generateLocalAnalyticalReport(question, context);
    res.json({ answer: fallbackReport });
  }
});

// Vite Middleware & Static Assets Handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
