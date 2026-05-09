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
  const getColorClass = () => {
    switch (color) {
      case 'blue': return 'text-blue-500 bg-blue-500/10';
      case 'emerald': return 'text-emerald-500 bg-emerald-500/10';
      default: return 'text-red-500 bg-red-500/10';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-bg-secondary p-4 rounded-md border shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:border-blue-500/50' : ''
      } ${active ? 'border-blue-500' : 'border-border-light'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded ${getColorClass()}`}>
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 16 }) : icon}
        </div>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-tight pt-1">{sub}</span>
      </div>
      <div>
        {isLoading ? (
          <>
            <Skeleton className="h-6 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-text-primary tracking-tight">{value}</p>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{label}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
