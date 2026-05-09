import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', glass = false }) => {
  const baseStyles = 'border border-border-light shadow-sm rounded-xl overflow-hidden transition-all';
  const glassStyles = glass 
    ? 'bg-bg-secondary/60 backdrop-blur-md' 
    : 'bg-bg-secondary shadow-md shadow-black/[0.02]';
  
  return (
    <div className={`${baseStyles} ${glassStyles} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
