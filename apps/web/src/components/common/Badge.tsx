import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'hot' | 'warm' | 'cold' | 'success' | 'warning' | 'danger' | 'info' | 'simulated' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const styles = {
    hot: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    warm: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    cold: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    simulated: 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-mono tracking-wider font-bold',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${styles} ${className}`}
    >
      {children}
    </span>
  );
};
