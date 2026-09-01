export interface SellOutRecord {
  id: string;
  cliente: string;
  coordenador: string;
  linha: string; // 'GERAL' | 'TRAMONTINA MULTI' | 'TRAMONTINA MASTER' | 'TRAMONTINA PRO'
  ano: number;
  meses: {
    janeiro: number;
    fevereiro: number;
    marco: number;
    abril: number;
    maio: number;
    junho: number;
    julho: number;
    agosto: number;
    setembro: number;
    outubro: number;
    novembro: number;
    dezembro: number;
  };
}

export const MONTH_KEYS = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
] as const;

export const MONTH_NAMES_PT = [
  { key: 'janeiro', label: 'Janeiro', short: 'Jan', num: 1 },
  { key: 'fevereiro', label: 'Fevereiro', short: 'Fev', num: 2 },
  { key: 'marco', label: 'Março', short: 'Mar', num: 3 },
  { key: 'abril', label: 'Abril', short: 'Abr', num: 4 },
  { key: 'maio', label: 'Maio', short: 'Mai', num: 5 },
  { key: 'junho', label: 'Junho', short: 'Jun', num: 6 },
  { key: 'julho', label: 'Julho', short: 'Jul', num: 7 },
  { key: 'agosto', label: 'Agosto', short: 'Ago', num: 8 },
  { key: 'setembro', label: 'Setembro', short: 'Set', num: 9 },
  { key: 'outubro', label: 'Outubro', short: 'Out', num: 10 },
  { key: 'novembro', label: 'Novembro', short: 'Nov', num: 11 },
  { key: 'dezembro', label: 'Dezembro', short: 'Dez', num: 12 }
] as const;

export const INITIAL_SELL_OUT_CSV = `CLIENTE;NOME COORDENADOR;SELL OUT;ANO;JANEIRO;FEVEREIRO;MARÇO;ABRIL;MAIO;JUNHO;JULHO;AGOSTO;SETEMBRO;OUTUBRO;NOVEMBRO;DEZEMBRO
MERCANTE;Adriano Almeida;GERAL;2025;R$ 1.542.067;R$ 945.354;R$ 1.831.517;R$ 725.631;R$ 1.386.212;R$ 499.243;R$ 1.352.921;R$ 929.389;R$ 1.073.000;R$ 1.671.000;R$ 1.280.256;R$ 1.118.882
MERCANTE;Adriano Almeida;TRAMONTINA MULTI;2025;R$ 1.261.157;R$ 798.013;R$ 1.622.663;R$ 557.892;R$ 1.238.470;R$ 419.666;R$ 1.041.958;R$ 772.228;R$ 910.000;R$ 1.536.000;R$ 1.089.134;R$ 989.127
MERCANTE;Adriano Almeida;TRAMONTINA MASTER;2025;R$ 280.910;R$ 147.341;R$ 208.854;R$ 167.739;R$ 147.742;R$ 79.577;R$ 310.963;R$ 157.161;R$ 163.000;R$ 135.000;R$ 191.122;R$ 129.755
MERCANTE;Adriano Almeida;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
IDB;Adriano Almeida;GERAL;2025;R$ 603.763;R$ 559.100;R$ 560.194;R$ 532.616;R$ 644.128;R$ 429.235;R$ 678.073;R$ 584.437;R$ 667.895;R$ 769.500;R$ 906.891;R$ 346.405
IDB;Adriano Almeida;TRAMONTINA MULTI;2025;R$ 469.724;R$ 458.696;R$ 423.398;R$ 395.010;R$ 476.994;R$ 337.120;R$ 491.675;R$ 431.958;R$ 531.773;R$ 638.840;R$ 795.922;R$ 255.656
IDB;Adriano Almeida;TRAMONTINA MASTER;2025;R$ 134.039;R$ 100.404;R$ 136.796;R$ 137.606;R$ 167.134;R$ 92.115;R$ 186.398;R$ 152.479;R$ 136.122;R$ 130.660;R$ 110.969;R$ 90.749
IDB;Adriano Almeida;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
ALMEIDA;Adriano Almeida;GERAL;2025;R$ 1.528.000;R$ 1.139.000;R$ 1.068.000;R$ 1.421.000;R$ 1.340.000;R$ 1.305.000;R$ 1.410.000;R$ 1.311.000;R$ 1.849.414;R$ 1.331.886;R$ 1.284.267;R$ 1.282.026
ALMEIDA;Adriano Almeida;TRAMONTINA MULTI;2025;R$ 1.262.000;R$ 917.000;R$ 905.000;R$ 1.249.000;R$ 1.172.000;R$ 1.120.000;R$ 1.218.000;R$ 1.113.000;R$ 1.702.000;R$ 1.196.194;R$ 1.060.988;R$ 1.094.944
ALMEIDA;Adriano Almeida;TRAMONTINA MASTER;2025;R$ 266.000;R$ 222.000;R$ 163.000;R$ 172.000;R$ 168.000;R$ 185.000;R$ 192.000;R$ 198.000;R$ 147.414;R$ 135.692;R$ 223.279;R$ 187.082
ALMEIDA;Adriano Almeida;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
DANTAS;Adriano Almeida;GERAL;2025;R$ 416.922;R$ 223.089;R$ 117.247;R$ 196.838;R$ 206.559;R$ 106.423;R$ 193.211;R$ 106.881;R$ 112.277;R$ 198.801;R$ 176.444;R$ 152.303
DANTAS;Adriano Almeida;TRAMONTINA MULTI;2025;R$ 356.622;R$ 169.529;R$ 84.495;R$ 157.483;R$ 156.526;R$ 73.940;R$ 160.375;R$ 85.594;R$ 90.712;R$ 161.102;R$ 125.467;R$ 95.344
DANTAS;Adriano Almeida;TRAMONTINA MASTER;2025;R$ 60.300;R$ 53.560;R$ 32.752;R$ 39.355;R$ 50.033;R$ 32.483;R$ 32.836;R$ 21.287;R$ 21.565;R$ 37.699;R$ 50.977;R$ 56.959
DANTAS;Adriano Almeida;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
MR;Adriano Almeida;GERAL;2025;R$ 450.668;R$ 362.350;R$ 405.520;R$ 400.178;R$ 870.315;R$ 518.550;R$ 565.489;R$ 1.072.348;R$ 537.773;R$ 595.168;R$ 457.348;R$ 333.975
MR;Adriano Almeida;TRAMONTINA MULTI;2025;R$ 370.814;R$ 310.924;R$ 336.109;R$ 342.610;R$ 811.205;R$ 461.583;R$ 507.127;R$ 1.014.806;R$ 453.672;R$ 517.968;R$ 389.750;R$ 284.248
MR;Adriano Almeida;TRAMONTINA MASTER;2025;R$ 79.854;R$ 51.426;R$ 69.411;R$ 57.568;R$ 59.110;R$ 56.967;R$ 58.362;R$ 57.542;R$ 84.101;R$ 77.200;R$ 67.598;R$ 49.727
MR;Adriano Almeida;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
LDF;Adriano Almeida;GERAL;2025;R$ 718.664;R$ 853.808;R$ 622.860;R$ 498.275;R$ 450.796;R$ 443.422;R$ 518.909;R$ 584.057;R$ 805.789;R$ 880.742;R$ 433.588;R$ 492.726
LDF;Adriano Almeida;TRAMONTINA MULTI;2025;R$ 647.619;R$ 798.705;R$ 519.684;R$ 415.188;R$ 353.989;R$ 355.311;R$ 400.351;R$ 507.676;R$ 721.588;R$ 807.685;R$ 392.775;R$ 426.199
LDF;Adriano Almeida;TRAMONTINA MASTER;2025;R$ 71.045;R$ 55.103;R$ 103.176;R$ 83.087;R$ 96.807;R$ 88.111;R$ 118.558;R$ 76.381;R$ 84.201;R$ 73.057;R$ 40.813;R$ 66.527
LDF;Adriano Almeida;TRAMONTINA PRO;2025;0;0;0;0;0;0;0;0;0;0;0;0
MERCANTE;Adriano Almeida;GERAL;2026;R$ 1.704.053;R$ 731.000;R$ 1.264.321;R$ 736.109;R$ 1.681.193;R$ 760.805;R$ 1.839.711;0;0;0;0;0
MERCANTE;Adriano Almeida;TRAMONTINA MULTI;2026;R$ 1.467.804;R$ 609.000;R$ 1.089.174;R$ 614.000;R$ 1.522.809;R$ 633.332;R$ 1.635.000;0;0;0;0;0
MERCANTE;Adriano Almeida;TRAMONTINA MASTER;2026;R$ 236.249;R$ 122.000;R$ 175.147;R$ 122.109;R$ 158.384;R$ 127.473;R$ 204.711;0;0;0;0;0
MERCANTE;Adriano Almeida;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
IDB;Adriano Almeida;GERAL;2026;R$ 544.151;R$ 427.501;R$ 539.311;R$ 492.166;R$ 596.141;R$ 564.838;R$ 788.190;0;0;0;0;0
IDB;Adriano Almeida;TRAMONTINA MULTI;2026;R$ 416.892;R$ 351.922;R$ 437.096;R$ 404.950;R$ 472.066;R$ 442.674;R$ 654.218;0;0;0;0;0
IDB;Adriano Almeida;TRAMONTINA MASTER;2026;R$ 127.259;R$ 75.579;R$ 102.215;R$ 87.216;R$ 124.075;R$ 122.164;R$ 133.972;0;0;0;0;0
IDB;Adriano Almeida;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
ALMEIDA;Adriano Almeida;GERAL;2026;R$ 1.733.000;R$ 1.046.000;R$ 2.719.149;R$ 1.462.373;R$ 1.410.144;R$ 2.329.420;R$ 2.464.212;0;0;0;0;0
ALMEIDA;Adriano Almeida;TRAMONTINA MULTI;2026;R$ 1.514.000;R$ 896.000;R$ 2.292.149;R$ 1.201.110;R$ 1.229.813;R$ 1.746.000;R$ 2.192.000;0;0;0;0;0
ALMEIDA;Adriano Almeida;TRAMONTINA MASTER;2026;R$ 219.000;R$ 150.000;R$ 427.000;R$ 261.263;R$ 180.331;R$ 583.420;R$ 272.212;0;0;0;0;0
ALMEIDA;Adriano Almeida;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
DANTAS;Adriano Almeida;GERAL;2026;R$ 210.095;R$ 148.331;R$ 433.028;R$ 291.791;R$ 451.407;R$ 462.329;R$ 268.551;0;0;0;0;0
DANTAS;Adriano Almeida;TRAMONTINA MULTI;2026;R$ 159.072;R$ 118.091;R$ 386.629;R$ 223.791;R$ 403.170;R$ 309.950;R$ 217.377;0;0;0;0;0
DANTAS;Adriano Almeida;TRAMONTINA MASTER;2026;R$ 51.023;R$ 30.240;R$ 46.399;R$ 68.000;R$ 48.237;R$ 152.379;R$ 51.174;0;0;0;0;0
DANTAS;Adriano Almeida;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
MR;Adriano Almeida;GERAL;2026;R$ 474.540;R$ 485.534;R$ 1.367.979;R$ 337.118;R$ 560.412;R$ 625.723;R$ 880.088;0;0;0;0;0
MR;Adriano Almeida;TRAMONTINA MULTI;2026;R$ 384.942;R$ 434.998;R$ 1.290.306;R$ 260.807;R$ 474.085;R$ 520.728;R$ 738.176;0;0;0;0;0
MR;Adriano Almeida;TRAMONTINA MASTER;2026;R$ 89.598;R$ 50.536;R$ 77.673;R$ 76.311;R$ 86.327;R$ 104.995;R$ 141.912;0;0;0;0;0
MR;Adriano Almeida;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0
LDF;Adriano Almeida;GERAL;2026;R$ 778.428;R$ 693.024;R$ 959.233;R$ 842.744;R$ 760.669;R$ 548.228;R$ 1.003.179;0;0;0;0;0
LDF;Adriano Almeida;TRAMONTINA MULTI;2026;R$ 714.735;R$ 616.840;R$ 833.602;R$ 756.677;R$ 597.114;R$ 443.271;R$ 874.744;0;0;0;0;0
LDF;Adriano Almeida;TRAMONTINA MASTER;2026;R$ 63.693;R$ 76.184;R$ 125.631;R$ 86.067;R$ 163.555;R$ 104.957;R$ 128.435;0;0;0;0;0
LDF;Adriano Almeida;TRAMONTINA PRO;2026;0;0;0;0;0;0;0;0;0;0;0;0`;

export function parseMonetaryValue(val: string | number | undefined): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(/\s/g, '').replace('R$', '');
  if (str === '' || str === '-' || str === '0') return 0;

  let cleaned = str;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes('.')) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      if (/\.\d{3}$/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseSellOutCSV(csvText: string): SellOutRecord[] {
  const lines = csvText.split('\n');
  const records: SellOutRecord[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect separator (; or \t or ,)
    let parts: string[] = [];
    if (line.includes(';')) {
      parts = line.split(';').map(p => p.trim());
    } else if (line.includes('\t')) {
      parts = line.split('\t').map(p => p.trim());
    } else {
      parts = line.split(',').map(p => p.trim());
    }

    if (parts.length < 4) continue;

    // Skip header line
    const col0 = parts[0].toUpperCase();
    if (col0.includes('CLIENTE') || col0.includes('NOME') || col0.includes('COORDENADOR')) {
      continue;
    }

    const cliente = parts[0] || 'Desconhecido';
    const coordenador = parts[1] || 'Sem Coordenador';
    const linha = (parts[2] || 'GERAL').toUpperCase();
    const ano = parseInt(parts[3]) || 2025;

    const meses = {
      janeiro: parseMonetaryValue(parts[4]),
      fevereiro: parseMonetaryValue(parts[5]),
      marco: parseMonetaryValue(parts[6]),
      abril: parseMonetaryValue(parts[7]),
      maio: parseMonetaryValue(parts[8]),
      junho: parseMonetaryValue(parts[9]),
      julho: parseMonetaryValue(parts[10]),
      agosto: parseMonetaryValue(parts[11]),
      setembro: parseMonetaryValue(parts[12]),
      outubro: parseMonetaryValue(parts[13]),
      novembro: parseMonetaryValue(parts[14]),
      dezembro: parseMonetaryValue(parts[15])
    };

    records.push({
      id: `${cliente}_${linha}_${ano}_${i}`,
      cliente,
      coordenador,
      linha,
      ano,
      meses
    });
  }

  return records;
}

const STORAGE_KEY_SELL_OUT = 'tramontina_sell_out_records_v1';

export function getStoredSellOutRecords(): SellOutRecord[] {
  if (typeof window === 'undefined') return parseSellOutCSV(INITIAL_SELL_OUT_CSV);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SELL_OUT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading sell out records from localStorage', e);
  }

  const initial = parseSellOutCSV(INITIAL_SELL_OUT_CSV);
  try {
    localStorage.setItem(STORAGE_KEY_SELL_OUT, JSON.stringify(initial));
  } catch (e) {
    console.error('Error saving initial sell out to localStorage', e);
  }
  return initial;
}

export function saveStoredSellOutRecords(records: SellOutRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SELL_OUT, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving sell out records to localStorage', e);
  }
}
