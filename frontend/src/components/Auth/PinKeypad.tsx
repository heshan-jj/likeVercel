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
    <div className="flex flex-col items-center gap-8">
      {/* PIN Dots */}
      <div className={`flex gap-4 ${error ? 'animate-shake' : ''}`}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border-2 transition-all ${
              i < pin.length
                ? 'bg-blue-600 border-blue-600'
                : 'border-border-light bg-transparent opacity-30'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((key, index) => {
          if (key === '') return <div key={`empty-${index}`} />;
          
          if (key === 'delete') {
            return (
              <button
                key="delete"
                onClick={handleDelete}
                className="w-14 h-14 flex items-center justify-center rounded border border-border-light bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>
            );
          }

          return (
            <button
              key={key}
              onClick={() => handleNumberClick(key)}
              className="w-14 h-14 flex items-center justify-center rounded border border-border-light bg-bg-secondary hover:border-blue-500/50 hover:bg-bg-tertiary text-xl font-bold text-text-primary transition-all"
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
