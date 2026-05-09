import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import PinKeypad from '../components/Auth/PinKeypad';
import Logo from '../components/Logo';

const Unlock: React.FC = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();

  const handleUnlock = async (finalPin: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.post('/auth/unlock', { pin: finalPin });
      const { accessToken, refreshToken, user } = res.data;
      login(accessToken, refreshToken, user);
      showToast('Dashboard Unlocked', 'success');
    } catch (err: any) {
      setError(true);
      setPin('');
      showToast(err.response?.data?.error || 'Invalid PIN', 'error');
      setTimeout(() => setError(false), 500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pin.length === 6) {
      handleUnlock(pin);
    }
  }, [pin]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="mb-10 p-3 bg-blue-600 rounded shadow-lg">
          <Logo className="w-10 h-10 text-white" size={40} />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-xl font-bold text-text-primary tracking-tight uppercase">Dashboard Lock</h1>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Personnel Authorization Required</p>
        </div>

        <div className="bg-bg-secondary border border-border-light rounded-md p-8 w-full shadow-sm">
          <PinKeypad pin={pin} setPin={setPin} error={error} maxLength={6} />
          
          <div className="mt-8 text-center h-6 flex items-center justify-center">
            {loading && (
              <div className="text-blue-500 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center space-x-2 animate-pulse">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Syncing...</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex items-center space-x-2 opacity-30 grayscale">
           <div className="h-1 w-1 rounded-full bg-border-light" />
           <p className="text-[8px] font-bold text-text-muted uppercase tracking-[0.3em]">
             Authorized Access Only
           </p>
           <div className="h-1 w-1 rounded-full bg-border-light" />
        </div>
      </div>
    </div>
  );
};

export default Unlock;
