import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  X, 
  Activity, 
  Globe, 
  MapPin, 
  Calendar, 
  MousePointerClick, 
  Laptop, 
  Clock, 
  RefreshCw,
  Users,
  Eye,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { fetchAnalyticsStats, logAnalyticsEvent, AnalyticsStats } from '../lib/analytics';

interface AnalyticsDashboardProps {
  isFirebaseConnected: boolean;
}

export function AnalyticsDashboard({ isFirebaseConnected }: AnalyticsDashboardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'regioes' | 'features' | 'tecnologia' | 'logs'>('geral');

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('analytics_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'mak.0708') {
      setIsAuthenticated(true);
      sessionStorage.setItem('analytics_auth', 'true');
      setPasswordError(null);
      setPasswordInput('');
    } else {
      setPasswordError('Senha incorreta. Verifique os dados e tente novamente.');
    }
  };

  const loadStats = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await fetchAnalyticsStats();
      setStats(data);
    } catch (e) {
      console.error("Error loading analytics stats", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadStats();
    }
  }, [isOpen, isAuthenticated, isFirebaseConnected]);

  const toggleModal = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Log event that user opened the analytics panel
      logAnalyticsEvent('tab_view', 'Painel de Analytics');
    }
  };

  // Helper to format percentage
  const getPercentage = (value: number, total: number) => {
    if (!total) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  return (
    <div className="flex justify-center mt-4">
      {/* Footer trigger button */}
      <button
        type="button"
        id="btn-footer-analytics"
        onClick={toggleModal}
        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 hover:text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer border border-slate-200 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
      >
        <BarChart3 className="w-4 h-4 text-sky-600 animate-pulse" />
        <span>Métricas & Analytics do Painel</span>
      </button>

      {/* Analytics Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-center text-sky-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Audit & Analytics do Sistema</h2>
                    <p className="text-[11px] text-slate-500 font-medium">Mapeamento de acessos regionais, frequência diária e uso de recursos do painel</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadStats}
                    disabled={isLoading}
                    title="Atualizar dados"
                    className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-500' : ''}`} />
                  </button>
                  <button 
                    onClick={toggleModal}
                    className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-400 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {!isAuthenticated ? (
                /* Password protection screen */
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/30 min-h-[400px]">
                  <div className="max-w-md w-full bg-white p-8 border border-slate-200/80 rounded-2xl shadow-3xs text-center space-y-6">
                    <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-3xs">
                      <Lock className="w-5 h-5 text-amber-600 animate-pulse" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-800">Acesso Restrito ao Analytics</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Este painel de métricas contém registros de logs de auditoria interna, acessos regionais por geolocalização IP e telemetria de uso. Digite a senha de acesso para prosseguir.
                      </p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          type="password"
                          placeholder="Digite a senha..."
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all text-slate-800 font-bold"
                          autoFocus
                        />
                      </div>

                      {passwordError && (
                        <div className="text-red-600 bg-red-50 text-[11px] font-bold px-3 py-2.5 border border-red-100 rounded-xl text-left flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                          <span>{passwordError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold rounded-xl transition-all shadow-xs hover:shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verificar Senha</span>
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <>
                  {/* Navigation Sub-Tabs */}
                  <div className="flex gap-1.5 px-6 pt-3 pb-3 border-b border-slate-100 bg-slate-50/20 overflow-x-auto">
                <button
                  onClick={() => setActiveSubTab('geral')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeSubTab === 'geral' 
                      ? 'bg-slate-900 text-white shadow-3xs' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  Visão Geral
                </button>
                <button
                  onClick={() => setActiveSubTab('regioes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeSubTab === 'regioes' 
                      ? 'bg-slate-900 text-white shadow-3xs' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  Regiões de Acesso
                </button>
                <button
                  onClick={() => setActiveSubTab('features')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeSubTab === 'features' 
                      ? 'bg-slate-900 text-white shadow-3xs' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  Funções Mais Utilizadas
                </button>
                <button
                  onClick={() => setActiveSubTab('tecnologia')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeSubTab === 'tecnologia' 
                      ? 'bg-slate-900 text-white shadow-3xs' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  Navegadores & OS
                </button>
                <button
                  onClick={() => setActiveSubTab('logs')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeSubTab === 'logs' 
                      ? 'bg-slate-900 text-white shadow-3xs' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  Histórico Recente
                </button>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {isLoading && !stats ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-8 h-8 border-3 border-sky-500/25 border-t-sky-500 rounded-full animate-spin" />
                    <p className="text-xs text-slate-500 font-medium">Sincronizando estatísticas com a nuvem...</p>
                  </div>
                ) : !stats ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    Nenhum registro de acesso encontrado.
                  </div>
                ) : (
                  <motion.div 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* SUB-TAB 1: VISÃO GERAL */}
                    {activeSubTab === 'geral' && (
                      <div className="space-y-6">
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-3xs">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Total de Visitas</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-slate-850">{stats.totalVisits}</span>
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Ativo</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-2 font-medium">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              Sessões únicas computadas
                            </div>
                          </div>

                          <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-3xs">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Cidades Ativas</span>
                            <span className="text-2xl font-black text-slate-850">{Object.keys(stats.visitsByCity).length}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-2 font-medium">
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              Polos regionais conectados
                            </div>
                          </div>

                          <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-3xs">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Ações Registradas</span>
                            <span className="text-2xl font-black text-slate-850">
                              {stats.recentEvents.length > 0 ? stats.recentEvents.length : 1}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-2 font-medium">
                              <MousePointerClick className="w-3.5 h-3.5 text-slate-400" />
                              Cliques e interações mapeadas
                            </div>
                          </div>
                        </div>

                        {/* Frequência de Acesso por Dia */}
                        <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-3xs space-y-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-sky-500" />
                            <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Frequência Diária (Visitas por Dia)</h3>
                          </div>

                          {Object.keys(stats.visitsByDay).length === 0 ? (
                            <p className="text-center py-6 text-slate-400 text-xs font-medium">Aguardando logs para consolidar histórico de dias.</p>
                          ) : (
                            <div className="space-y-3">
                              {Object.entries(stats.visitsByDay)
                                .sort((a, b) => b[0].localeCompare(a[0])) // show newest dates first
                                .slice(0, 7) // max 7 days in general overview
                                .map(([date, count]) => {
                                  // Format date to local readable
                                  const parts = date.split('-');
                                  const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
                                  
                                  const maxVal = Math.max(...Object.values(stats.visitsByDay).map(v => Number(v)), 1);
                                  const pctWidth = `${(Number(count) / maxVal) * 100}%`;

                                  return (
                                    <div key={date} className="flex items-center justify-between text-xs font-medium text-slate-700">
                                      <span className="w-24 shrink-0 font-mono text-[11px] text-slate-500">{formattedDate}</span>
                                      <div className="flex-1 mx-4 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: pctWidth }}
                                          className="bg-sky-500 h-full rounded-full"
                                        />
                                      </div>
                                      <span className="w-12 text-right font-bold text-slate-800">{count} {count === 1 ? 'visita' : 'visitas'}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 2: REGIÕES DE ACESSO */}
                    {activeSubTab === 'regioes' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Estados / Regiões */}
                        <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-3xs space-y-4">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-sky-500" />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Acessos por Estado (UF)</h3>
                          </div>

                          <div className="space-y-3">
                              {Object.keys(stats.visitsByRegion).length === 0 ? (
                              <p className="text-center py-6 text-slate-400 text-xs">Nenhum estado detectado ainda.</p>
                            ) : (
                              Object.entries(stats.visitsByRegion)
                                .sort((a, b) => Number(b[1]) - Number(a[1]))
                                .map(([region, count]) => {
                                  const totalRegionEvents = Object.values(stats.visitsByRegion).reduce((a, b) => Number(a) + Number(b), 0);
                                  const pctWidth = getPercentage(Number(count), Number(totalRegionEvents));

                                  return (
                                    <div key={region} className="space-y-1">
                                      <div className="flex justify-between text-xs font-bold text-slate-700">
                                        <div className="flex items-center gap-1.5">
                                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                          <span>{region}</span>
                                        </div>
                                        <span>{count} ({pctWidth})</span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: pctWidth }}
                                          className="bg-emerald-500 h-full rounded-full"
                                        />
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>

                        {/* Cidades */}
                        <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-3xs space-y-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-500" />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Top Cidades Ativas</h3>
                          </div>

                          <div className="space-y-3">
                            {Object.keys(stats.visitsByCity).length === 0 ? (
                              <p className="text-center py-6 text-slate-400 text-xs">Nenhuma cidade detectada.</p>
                            ) : (
                              Object.entries(stats.visitsByCity)
                                .sort((a, b) => Number(b[1]) - Number(a[1]))
                                .slice(0, 6)
                                .map(([city, count]) => {
                                  const totalCityEvents = Object.values(stats.visitsByCity).reduce((a, b) => Number(a) + Number(b), 0);
                                  const pctWidth = getPercentage(Number(count), Number(totalCityEvents));

                                  return (
                                    <div key={city} className="space-y-1">
                                      <div className="flex justify-between text-xs font-bold text-slate-700">
                                        <span>{city}</span>
                                        <span>{count} ({pctWidth})</span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: pctWidth }}
                                          className="bg-sky-500 h-full rounded-full"
                                        />
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 3: FUNÇÕES MAIS UTILIZADAS */}
                    {activeSubTab === 'features' && (
                      <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-3xs space-y-4">
                        <div className="flex items-center gap-2">
                          <MousePointerClick className="w-4 h-4 text-indigo-500" />
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Rank de Recursos & Funções Utilizadas</h3>
                        </div>

                        <div className="space-y-3.5">
                          {Object.keys(stats.mostUsedFeatures).length === 0 ? (
                            <p className="text-center py-6 text-slate-400 text-xs">Nenhuma interação registrada ainda além das visitas iniciais.</p>
                          ) : (
                            Object.entries(stats.mostUsedFeatures)
                              .sort((a, b) => Number(b[1]) - Number(a[1]))
                              .map(([feature, count]) => {
                                const totalFeatureEvents = Object.values(stats.mostUsedFeatures).reduce((a, b) => Number(a) + Number(b), 0);
                                const pctWidth = getPercentage(Number(count), Number(totalFeatureEvents));

                                return (
                                  <div key={feature} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs text-slate-700 font-medium">
                                      <span className="font-bold text-slate-800">{feature}</span>
                                      <span className="text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md text-[10px]">
                                        {count} clicks ({pctWidth})
                                      </span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: pctWidth }}
                                        className="bg-indigo-500 h-full rounded-full"
                                      />
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 4: TECNOLOGIA */}
                    {activeSubTab === 'tecnologia' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Navegadores */}
                        <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-3xs space-y-4">
                          <div className="flex items-center gap-2">
                            <Laptop className="w-4 h-4 text-indigo-500" />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Navegadores Utilizados</h3>
                          </div>

                          <div className="space-y-3">
                            {Object.keys(stats.browsers).length === 0 ? (
                              <p className="text-center py-6 text-slate-400 text-xs">Nenhum navegador registrado.</p>
                            ) : (
                              Object.entries(stats.browsers)
                                .sort((a, b) => Number(b[1]) - Number(a[1]))
                                .map(([browser, count]) => {
                                  const totalBrowserEvents = Object.values(stats.browsers).reduce((a, b) => Number(a) + Number(b), 0);
                                  const pctWidth = getPercentage(Number(count), Number(totalBrowserEvents));

                                  return (
                                    <div key={browser} className="space-y-1">
                                      <div className="flex justify-between text-xs font-bold text-slate-700">
                                        <span>{browser}</span>
                                        <span>{count} ({pctWidth})</span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: pctWidth }}
                                          className="bg-sky-500 h-full rounded-full"
                                        />
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>

                        {/* Sistemas Operacionais */}
                        <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-3xs space-y-4">
                          <div className="flex items-center gap-2">
                            <Laptop className="w-4 h-4 text-emerald-500" />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Sistemas Operacionais</h3>
                          </div>

                          <div className="space-y-3">
                            {Object.keys(stats.osList).length === 0 ? (
                              <p className="text-center py-6 text-slate-400 text-xs">Nenhum SO registrado.</p>
                            ) : (
                              Object.entries(stats.osList)
                                .sort((a, b) => Number(b[1]) - Number(a[1]))
                                .map(([os, count]) => {
                                  const totalOSEvents = Object.values(stats.osList).reduce((a, b) => Number(a) + Number(b), 0);
                                  const pctWidth = getPercentage(Number(count), Number(totalOSEvents));

                                  return (
                                    <div key={os} className="space-y-1">
                                      <div className="flex justify-between text-xs font-bold text-slate-700">
                                        <span>{os}</span>
                                        <span>{count} ({pctWidth})</span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: pctWidth }}
                                          className="bg-emerald-500 h-full rounded-full"
                                        />
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 5: RECENT EVENTS */}
                    {activeSubTab === 'logs' && (
                      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-3xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                          <Clock className="w-4 h-4 text-slate-500" />
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Linha do Tempo (Logs de Auditoria Recentes)</h3>
                        </div>

                        <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                          {stats.recentEvents.length === 0 ? (
                            <p className="p-6 text-center text-slate-400 text-xs">Nenhuma atividade registrada.</p>
                          ) : (
                            stats.recentEvents.map((evt) => {
                              const timeStr = new Date(evt.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                              const dateStr = new Date(evt.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                              
                              let typeLabel = 'Ação';
                              let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                              
                              if (evt.type === 'session_start') {
                                typeLabel = 'Visita';
                                badgeColor = 'bg-sky-50 text-sky-700 border-sky-100';
                              } else if (evt.type === 'tab_view') {
                                typeLabel = 'Visualização';
                                badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                              } else if (evt.type === 'data_import') {
                                typeLabel = 'Importação';
                                badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
                              } else if (evt.type === 'presentation_export') {
                                typeLabel = 'Exportação';
                                badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                              } else if (evt.type === 'data_save') {
                                typeLabel = 'Gravação';
                                badgeColor = 'bg-purple-50 text-purple-700 border-purple-100';
                              }

                              return (
                                <div key={evt.id} className="p-3.5 hover:bg-slate-50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs leading-relaxed transition-colors">
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">
                                      {dateStr} {timeStr}
                                    </span>
                                    <span className={`px-2 py-0.5 border text-[9px] uppercase tracking-wider font-extrabold rounded-md ${badgeColor}`}>
                                      {typeLabel}
                                    </span>
                                    <span className="text-slate-700 font-medium">
                                      {evt.type === 'tab_view' && evt.details ? `Visualizou aba "${evt.details}"` : ''}
                                      {evt.type === 'session_start' && `Acessou o sistema de ${evt.city || 'Desconhecido'} - ${evt.region_code || ''}`}
                                      {evt.type === 'data_import' && `Importou planilha com ${evt.details || 'dados'}`}
                                      {evt.type === 'presentation_export' && `Exportou apresentação de vendas`}
                                      {evt.type === 'data_save' && `Salvou dados de ${evt.details || 'período'}`}
                                      {evt.type === 'custom_name_save' && `Salvou nomes customizados de representantes`}
                                      {evt.type === 'location_save' && `Salvou mapeamento de estados`}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-300" />
                                    {evt.city || 'Desconhecido'} ({evt.region_code || 'UF'})
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
                </>
              )}

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Banco de Dados:</span>
                  {isFirebaseConnected ? (
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Firebase Ativo</span>
                  ) : (
                    <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Local Cache</span>
                  )}
                </div>
                <button
                  onClick={toggleModal}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  Fechar Painel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
