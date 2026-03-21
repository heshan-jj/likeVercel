import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 24, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="100" height="100" rx="22" fill="#1d6fee"/>
      <path 
        d="M50 22L75 36V64L50 78L25 64V36L50 22Z" 
        stroke="white" 
        strokeWidth="7" 
        strokeLinejoin="round"
      />
      <path 
        d="M50 50V22M50 50L75 64M50 50L25 64" 
        stroke="white" 
        strokeWidth="7" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Logo;
