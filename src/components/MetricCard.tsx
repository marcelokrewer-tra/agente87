import React from 'react';
import { motion } from 'motion/react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: string; // e.g. 'emerald', 'amber', 'rose', 'sky'
  valueClassName?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  accentColor = 'sky',
  valueClassName
}) => {
  const accentClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100'
  }[accentColor] || 'bg-slate-50 text-slate-700 border-slate-100';

  const dotAccentClasses = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    sky: 'bg-sky-500',
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    teal: 'bg-teal-500',
    blue: 'bg-blue-500'
  }[accentColor] || 'bg-slate-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group"
    >
      {/* Decorative vertical line */}
      <div className={`absolute top-0 bottom-0 left-0 w-1 ${dotAccentClasses}`} />
      
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">{title}</p>
          <h3 className={`text-xl font-black tracking-tight font-sans transition-all group-hover:scale-[1.01] ${valueClassName || 'text-slate-900'}`}>{value}</h3>
          
          {trend && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.25 rounded font-extrabold ${
                trend.isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {trend.isPositive ? '+' : ''}{trend.value}
              </span>
            </div>
          )}
        </div>
        
        <div className={`p-2 rounded-lg border ${accentClasses} shadow-xs transition-transform duration-300 group-hover:rotate-6 shrink-0`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};
