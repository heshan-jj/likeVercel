import React, { useEffect, useCallback } from 'react';

interface PinKeypadProps {
  pin: string;
  setPin: (pin: string) => void;
  maxLength?: number;
  error?: boolean;
}

const PinKeypad: React.FC<PinKeypadProps> = ({ pin, setPin, maxLength = 6, error }) => {
  const handleNumberClick = useCallback((num: string) => {
    if (pin.length < maxLength) {
      setPin(pin + num);
    }
  }, [maxLength, pin, setPin]);

  const handleDelete = useCallback(() => {
    setPin(pin.slice(0, -1));
  }, [pin, setPin]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumberClick, handleDelete]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <div className="flex flex-col items-center gap-12">
      {/* PIN Dots */}
      <div className={`flex gap-6 ${error ? 'animate-shake' : ''}`}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
              i < pin.length
                ? 'bg-blue-600 border-blue-600 scale-110 shadow-lg shadow-blue-600/30'
                : 'border-border-light bg-transparent opacity-40'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-5">
        {keys.map((key, index) => {
          if (key === '') return <div key={`empty-${index}`} />;
          
          if (key === 'delete') {
            return (
              <button
                key="delete"
                onClick={handleDelete}
                className="w-16 h-16 flex items-center justify-center rounded-2xl border border-border-light bg-bg-secondary/60 hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-all shadow-sm active:scale-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>
            );
          }

          return (
            <button
              key={key}
              onClick={() => handleNumberClick(key)}
              className="w-16 h-16 flex items-center justify-center rounded-2xl border border-border-light bg-bg-secondary/60 hover:border-blue-500/40 hover:bg-blue-500/5 text-2xl font-semibold text-text-primary transition-all shadow-sm active:scale-90"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PinKeypad;
