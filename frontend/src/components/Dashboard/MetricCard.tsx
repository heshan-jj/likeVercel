import React from 'react';
import Skeleton from '../Skeleton';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'red';
  isLoading?: boolean;
  onClick?: () => void;
  active?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, sub, icon, color, isLoading, onClick, active = false }) => {
  const getGradClass = () => {
    switch (color) {
      case 'blue': return 'bg-gradient-to-br from-[#137fec] to-[#1d6fee] shadow-[0_4px_20px_rgba(19,127,236,0.3)] border border-white/20';
      case 'emerald': return 'bg-gradient-to-br from-[#10b981] to-[#059669] shadow-[0_4px_20px_rgba(16,185,129,0.3)] border border-white/20';
      default: return 'bg-gradient-to-br from-[#f97386] to-[#e11d48] shadow-[0_4px_20px_rgba(244,63,94,0.3)] border border-white/20';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-[#0a1836] p-7 rounded-[32px] border transition-all duration-500 group overflow-hidden relative active:scale-95 ${
        onClick ? 'cursor-pointer hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:border-[#137fec]/30' : ''
      } ${active ? 'border-[#137fec] ring-8 ring-[#137fec]/5 shadow-[0_0_40px_rgba(19,127,236,0.1)]' : 'border-[#6475a1]/10'}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#137fec]/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-[#137fec]/10 transition-colors" />
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl text-white ${getGradClass()}`}>
          {icon}
        </div>
        <span className="text-[9px] font-black text-[#6475a1] uppercase tracking-widest pt-1">{sub}</span>
      </div>
      <div>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-24" />
          </>
        ) : (
          <>
            <p className="text-3xl font-black text-[#dee5ff] tracking-tighter mb-0.5">{value}</p>
            <p className="text-xs font-bold text-[#6475a1] uppercase tracking-wider">{label}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
