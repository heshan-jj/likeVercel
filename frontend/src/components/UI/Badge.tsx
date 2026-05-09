import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'gray';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray', className = '' }) => {
  const variants = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
