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
  const baseStyles = 'inline-flex items-center justify-center rounded font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-accent-primary text-white hover:bg-accent-hover focus:ring-accent-primary shadow-sm',
    secondary: 'bg-bg-tertiary text-text-primary hover:bg-opacity-80 focus:ring-bg-tertiary',
    outline: 'border border-border-light bg-transparent text-text-primary hover:bg-bg-primary focus:ring-accent-primary',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary focus:ring-bg-tertiary',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500 shadow-sm',
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-[11px]',
    md: 'px-3.5 py-1.5 text-xs',
    lg: 'px-5 py-2 text-sm',
    icon: 'p-1.5',
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
