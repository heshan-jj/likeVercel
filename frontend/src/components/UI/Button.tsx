import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  className = '', 
  disabled, 
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';
  
  const variants = {
    primary: 'bg-accent-primary text-white hover:bg-accent-hover focus:ring-accent-primary shadow-sm shadow-accent-primary/20',
    secondary: 'bg-bg-tertiary/60 backdrop-blur-sm text-text-primary hover:bg-bg-tertiary focus:ring-bg-tertiary border border-border-light',
    outline: 'border border-border-light bg-bg-secondary/40 backdrop-blur-sm text-text-primary hover:bg-bg-tertiary focus:ring-accent-primary shadow-sm',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary focus:ring-bg-tertiary',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm shadow-red-500/20',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500 shadow-sm shadow-emerald-500/20',
  };

  const sizes = {
    sm: 'px-3 py-1 text-[11px]',
    md: 'px-4 py-2 text-xs',
    lg: 'px-6 py-2.5 text-sm',
    icon: 'p-2',
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </span>
      ) : children}
    </button>
  );
};

export default Button;
