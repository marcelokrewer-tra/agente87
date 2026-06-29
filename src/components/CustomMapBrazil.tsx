import React, { useState, useMemo } from 'react';
import { BRAZIL_STATES, StatePath } from './BrazilPaths';

interface CustomMapBrazilProps {
  selectedState: string | null;
  onStateSelect: (uf: string | null) => void;
  stateStats: Record<string, { quota: number; sales: number; repsCount: number }>;
}

export const CustomMapBrazil: React.FC<CustomMapBrazilProps> = ({
  selectedState,
  onStateSelect,
  stateStats
}) => {
  const [hoveredState, setHoveredState] = useState<StatePath | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const stateColors = useMemo(() => {
    const colors: Record<string, string> = {};
    BRAZIL_STATES.forEach(state => {
      const stats = stateStats[state.uf];
      if (!stats || stats.repsCount === 0) {
        colors[state.uf] = '#cbd5e1'; // Grey (no reps)
      } else {
        const { quota, sales } = stats;
        if (quota === 0) {
          colors[state.uf] = sales > 0 ? '#10b981' : '#cbd5e1';
        } else {
          const percent = (sales / quota) * 100;
          if (percent < 75) {
            colors[state.uf] = '#ef4444'; // Red (< 75%)
          } else if (percent < 100) {
            colors[state.uf] = '#eab308'; // Yellow (75% to 99%)
          } else {
            colors[state.uf] = '#10b981'; // Green (>= 100%)
          }
        }
      }
    });
    return colors;
  }, [stateStats]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - svgRect.left + 15,
      y: e.clientY - svgRect.top + 15
    });
  };

  const hoveredStats = useMemo(() => {
    if (!hoveredState) return null;
    return stateStats[hoveredState.uf] || { quota: 0, sales: 0, repsCount: 0 };
  }, [hoveredState, stateStats]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="relative w-full flex flex-col items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Desempenho por Regiões</h3>
          <p className="text-xs text-slate-400 mt-1">
            Selecione um estado no mapa para filtrar representantes e analisar os resultados regionais.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-[#cbd5e1] border border-slate-300" />
            <span className="text-slate-600 font-medium">Sem representantes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-[#ef4444] border border-red-600" />
            <span className="text-slate-600 font-medium">Crítico (&lt; 75%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-[#eab308] border border-yellow-600" />
            <span className="text-slate-600 font-medium">Alerta (75% - 99%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-[#10b981] border border-emerald-600" />
            <span className="text-slate-600 font-medium">Meta Atingida (&ge; 100%)</span>
          </div>
        </div>
      </div>

      <div 
        className="relative w-full max-w-[480px] aspect-square mx-auto"
        onMouseMove={handleMouseMove}
      >
        <svg
          version="1.1"
          x="0px"
          y="0px"
          viewBox="270 80 220 220"
          className="w-full h-full select-none overflow-visible"
        >
          <defs>
            {BRAZIL_STATES.filter(state => 
              ['PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA'].includes(state.uf)
            ).map((state) => (
              <clipPath key={`clip-${state.uf}`} id={`clip-${state.uf}`}>
                <path d={state.d1} />
              </clipPath>
            ))}
          </defs>
          <g>
            {BRAZIL_STATES.filter(state => 
              ['PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA'].includes(state.uf)
            ).sort((a, b) => {
              const aActive = a.uf === selectedState || a.uf === hoveredState?.uf;
              const bActive = b.uf === selectedState || b.uf === hoveredState?.uf;
              if (aActive && !bActive) return 1;
              if (!aActive && bActive) return -1;
              return 0;
            }).map((state) => {
              const isSelected = selectedState === state.uf;
              const isHovered = hoveredState?.uf === state.uf;
              const color = stateColors[state.uf];

              // Custom precise label coordinates centered inside each state shape
              const labelTransforms: Record<string, string> = {
                BA: 'matrix(1 0 0 1 360 215)',
                PI: 'matrix(1 0 0 1 348 145)',
                CE: 'matrix(1 0 0 1 394 126)',
                RN: 'matrix(1 0 0 1 425 133)',
                PB: 'matrix(1 0 0 1 424 148)',
                PE: 'matrix(1 0 0 1 411 163)',
                AL: 'matrix(1 0 0 1 429 179)',
                SE: 'matrix(1 0 0 1 418 187)',
              };

              const transformStr = labelTransforms[state.uf] || state.transform;
              const fontSizeStr = '4.5';

              return (
                <g
                  key={state.uf}
                  className="cursor-pointer group"
                  onClick={() => onStateSelect(isSelected ? null : state.uf)}
                  onMouseEnter={() => setHoveredState(state)}
                  onMouseLeave={() => setHoveredState(null)}
                >
                  {/* Outer shape with background color and default white border */}
                  <path
                    d={state.d1}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={0.8}
                    className="transition-all duration-200 group-hover:brightness-95"
                    style={{
                      transformOrigin: 'center',
                      filter: isSelected ? 'drop-shadow(0 2px 4px rgba(0, 26, 156, 0.25))' : undefined
                    }}
                  />

                  {/* Clean inner selection outline (clipped to only render inside the state) */}
                  {isSelected && (
                    <path
                      d={state.d1}
                      fill="none"
                      stroke="#001A9C"
                      strokeWidth={3}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      clipPath={`url(#clip-${state.uf})`}
                      className="pointer-events-none"
                    />
                  )}

                  {/* State Text labels with dynamic contrast */}
                  <text
                    transform={transformStr}
                    fontSize={fontSizeStr}
                    fontFamily="Inter, sans-serif"
                    fontWeight="bold"
                    fill={isSelected ? '#001A9C' : '#1e293b'}
                    className="pointer-events-none select-none transition-all duration-200"
                    textAnchor="middle"
                  >
                    {state.uf}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Dynamic Tooltip following mouse */}
        {hoveredState && hoveredStats && (
          <div
            className="absolute pointer-events-none z-50 bg-slate-900/95 text-white p-3.5 rounded-[20px] shadow-xl border border-slate-700/50 text-xs min-w-[210px] space-y-2 backdrop-blur-xs transition-opacity duration-150"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
              <span className="font-bold text-slate-200">{hoveredState.name}</span>
              <span className="bg-slate-700 text-[10px] px-1.5 py-0.5 rounded font-bold">{hoveredState.uf}</span>
            </div>
            
            {hoveredStats.repsCount > 0 ? (
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Representantes:</span>
                  <span className="font-bold text-white">{hoveredStats.repsCount}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Meta/Cota Total:</span>
                  <span className="font-semibold text-white">{formatCurrency(hoveredStats.quota)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Vendas Totais:</span>
                  <span className="font-semibold text-white">{formatCurrency(hoveredStats.sales)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800 mt-1">
                  <span className="text-[11px] text-slate-400 font-medium">% Venda:</span>
                  <span 
                    className={`font-black text-sm ${
                      hoveredStats.quota === 0 
                        ? 'text-emerald-400' 
                        : (hoveredStats.sales / hoveredStats.quota) >= 1
                        ? 'text-emerald-400'
                        : (hoveredStats.sales / hoveredStats.quota) >= 0.75
                        ? 'text-yellow-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {hoveredStats.quota > 0 
                      ? `${((hoveredStats.sales / hoveredStats.quota) * 100).toFixed(1)}%` 
                      : hoveredStats.sales > 0 ? '100%+' : '0.0%'
                    }
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 py-1 italic">
                Sem representantes cadastrados neste estado.
              </div>
            )}
          </div>
        )}
      </div>

      {selectedState && (
        <button
          onClick={() => onStateSelect(null)}
          className="mt-4 px-3.5 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
        >
          Limpar Filtro de Estado ({selectedState})
        </button>
      )}
    </div>
  );
};
