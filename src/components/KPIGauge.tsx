import React from 'react';
import { motion } from 'motion/react';

interface KPIGaugeProps {
  value: number; // 0 to whatever (maybe > 100)
  size?: number;
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
}

export const KPIGauge: React.FC<KPIGaugeProps> = ({
  value,
  size = 140,
  strokeWidth = 12,
  label,
  subLabel
}) => {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Cap visual percentage representation at 100% for the main circle, helper has overflow indicator
  const clampedValue = Math.min(value, 100);
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  // Determine active color style
  let progressColor = 'stroke-rose-500';
  let bgColor = 'bg-rose-50';
  let textColor = 'text-rose-600';
  let shadowClass = 'drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]';
  
  if (value >= 100) {
    progressColor = 'stroke-emerald-500';
    bgColor = 'bg-emerald-50';
    textColor = 'text-emerald-600';
    shadowClass = 'drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]';
  } else if (value >= 75) {
    progressColor = 'stroke-amber-500';
    bgColor = 'bg-amber-50';
    textColor = 'text-amber-600';
    shadowClass = 'drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]';
  }

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background track */}
        <svg className="w-full h-full -rotate-90">
          <circle
            className="stroke-slate-100"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Animated progress stroke */}
          <motion.circle
            className={`${progressColor} ${shadowClass}`}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>

        {/* Inner text metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-2xl font-extrabold tracking-tight text-slate-800"
          >
            {value.toFixed(1)}%
          </motion.span>
          {subLabel && (
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
              {subLabel}
            </span>
          )}
        </div>
      </div>
      
      {label && (
        <span className="mt-3 text-sm font-medium text-slate-600 text-center max-w-[150px] truncate">
          {label}
        </span>
      )}
    </div>
  );
};
