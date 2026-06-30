export interface SalesRecord {
  id: string; // Unique row ID
  age: number;
  repId: number;
  repName: string;
  coordId: number;
  coordName: string;
  emp: string; // Company prefix (e.g. CUT, GAR)
  linha: string; // Line of business (e.g. Utilidades, Ferramentas)
  groupId: number;
  groupName: string;
  quotaCD: number;
  faturadoCD: number;
  pctCD: number;
  quotaVP: number;
  faturadoVP: number;
  pctVP: number;
  quotaTotal: number;
  faturadoTotal: number;
  pctTotal: number;
  pendenteCD: number;
  pendenteVP: number;
  faturadoEPendente: number;
  pctFaturadoEPendente: number;
  defasagem: number;
  valorVendaCD: number;
  valorVendaVP: number;
  valorVendaTotal: number;
  pctVenda: number;
  previaValue?: number;
  pedidosNovos?: number;
  month?: number;
}

export interface RepresentativeSummary {
  repId: number;
  repName: string;
  coordName: string;
  totalQuota: number;
  totalFaturado: number;
  totalFaturadoCD: number;
  totalFaturadoVP: number;
  totalVendido: number;
  pctTotal: number;
  pctVenda: number;
  defasagem: number;
  recordsCount: number;
}

export interface CoordinatorSummary {
  coordId: number;
  coordName: string;
  totalQuota: number;
  totalFaturado: number;
  totalFaturadoCD: number;
  totalFaturadoVP: number;
  defasagem: number;
  repsCount: number;
  pctTotal: number;
}

export interface EnterpriseSummary {
  emp: string;
  totalQuota: number;
  totalFaturado: number;
  defasagem: number;
  pctTotal: number;
}

export interface ProductLineSummary {
  linha: string;
  totalQuota: number;
  totalFaturado: number;
  defasagem: number;
  pctTotal: number;
}
