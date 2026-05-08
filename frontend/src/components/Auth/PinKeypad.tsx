import React from 'react';
import { motion } from 'framer-motion';

interface PinKeypadProps {
  pin: string;
  setPin: (pin: string) => void;
  maxLength?: number;
  error?: boolean;
}

const PinKeypad: React.FC<PinKeypadProps> = ({ pin, setPin, maxLength = 6, error }) => {
  const handleNumberClick = (num: string) => {
    if (pin.length < maxLength) {
      setPin(pin + num);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <div className="flex flex-col items-center gap-8">
      {/* PIN Dots */}
      <div className={`flex gap-4 ${error ? 'animate-shake' : ''}`}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              i < pin.length
                ? 'bg-accent-primary border-accent-primary scale-110 shadow-[0_0_10px_rgba(var(--accent-primary-rgb),0.5)]'
                : 'border-border-muted bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4">
        {keys.map((key, index) => {
          if (key === '') return <div key={`empty-${index}`} />;
          
          if (key === 'delete') {
            return (
              <motion.button
                key="delete"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                className="w-16 h-16 flex items-center justify-center rounded-2xl bg-bg-secondary border border-border-muted hover:border-accent-primary text-text-secondary hover:text-accent-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(var(--accent-primary-rgb), 0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNumberClick(key)}
              className="w-16 h-16 flex items-center justify-center rounded-2xl bg-bg-secondary border border-border-muted hover:border-accent-primary text-2xl font-semibold text-text-primary transition-colors"
            >
              {key}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default PinKeypad;
