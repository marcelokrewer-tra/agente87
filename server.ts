import express from "express";
import path from "path";
import fs from "fs";
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

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "monthly_sales_db.json");

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

  // Pre-seed June 2026 (the current active period)
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
  return db;
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
