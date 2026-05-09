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
      showToast('Dashboard unlocked', 'success');
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
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary p-6 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-sm flex flex-col items-center z-10">
        <div className="mb-10 p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20 animate-in zoom-in duration-700">
          <Logo className="w-10 h-10 text-white" size={40} />
        </div>

        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Dashboard Lock</h1>
          <p className="text-xs font-medium text-text-muted mt-2">Personnel authorization required to proceed</p>
        </div>

        <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border-light rounded-[2.5rem] p-10 w-full shadow-2xl shadow-black/[0.03] animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <PinKeypad pin={pin} setPin={setPin} error={error} maxLength={6} />
          
          <div className="mt-8 text-center h-6 flex items-center justify-center">
            {loading && (
              <div className="text-blue-500 text-[11px] font-semibold flex items-center space-x-3 animate-pulse">
                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Syncing cluster authorization...</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex items-center space-x-3 opacity-20 transition-opacity hover:opacity-40 duration-500">
           <div className="h-px w-6 bg-text-muted" />
           <p className="text-[10px] font-semibold text-text-muted tracking-widest uppercase">
             Secure Core v2.1
           </p>
           <div className="h-px w-6 bg-text-muted" />
        </div>
      </div>
    </div>
  );
};

export default Unlock;
