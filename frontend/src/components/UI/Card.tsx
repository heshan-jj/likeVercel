import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  isPremium?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  const baseStyles = 'bg-bg-secondary border border-border-light shadow-sm rounded-md overflow-hidden';
  
  return (
    <div className={`${baseStyles} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
