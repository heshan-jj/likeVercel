import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      // Reset error state after animation
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
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-primary/5 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 flex flex-col items-center z-10"
      >
        <div className="mb-12">
          <Logo className="w-16 h-16" />
        </div>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Secure Access</h1>
          <p className="text-text-secondary">Enter your 6-digit PIN to unlock the dashboard</p>
        </div>

        <div className="glass-effect p-12 rounded-[2.5rem] w-full">
          <PinKeypad pin={pin} setPin={setPin} error={error} maxLength={6} />
          
          <div className="mt-8 text-center h-6">
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-accent-primary font-medium flex items-center justify-center gap-2"
                >
                  <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                  Verifying Security...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-12 text-text-muted text-sm">
          LikeVercel Security Protocol Active
        </p>
      </motion.div>
    </div>
  );
};

export default Unlock;
