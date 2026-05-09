import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">{label}</label>}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors">
            {icon}
          </div>
        )}
        <input 
          className={`w-full bg-bg-secondary border border-border-light rounded-xl ${icon ? 'pl-10' : 'px-4'} pr-4 py-2.5 text-sm text-text-primary outline-none focus:border-accent-primary/40 focus:ring-4 focus:ring-accent-primary/5 transition-all font-bold placeholder:text-text-muted shadow-sm ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] font-bold text-red-500 ml-1 uppercase tracking-widest">{error}</p>}
    </div>
  );
};

export default Input;
