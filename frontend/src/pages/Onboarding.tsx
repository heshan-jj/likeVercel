import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import PinKeypad from '../components/Auth/PinKeypad';
import Logo from '../components/Logo';

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1); // 1: Welcome, 2: Set PIN, 3: Confirm PIN
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();

  const handleSetPin = (val: string) => {
    setPin(val);
    if (val.length === 6) {
      setTimeout(() => setStep(3), 300);
    }
  };

  const handleConfirmPin = async (val: string) => {
    setConfirmPin(val);
    if (val.length === 6) {
      if (val !== pin) {
        setError(true);
        showToast('PINs do not match', 'error');
        setTimeout(() => {
          setConfirmPin('');
          setError(false);
        }, 500);
        return;
      }
      
      // Submit
      setLoading(true);
      try {
        const res = await api.post('/auth/setup', { pin: val });
        const { accessToken, refreshToken, user } = res.data;
        login(accessToken, refreshToken, user);
        showToast('System secured successfully', 'success');
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message || 'Setup failed';
        showToast(errorMsg, 'error');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 flex flex-col items-center z-10">
        <div className="mb-12 p-3.5 bg-blue-600 rounded-[1.5rem] shadow-xl shadow-blue-600/20 animate-in zoom-in duration-700">
          <Logo className="w-14 h-14 text-white" size={56} />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold text-text-primary mb-4 tracking-tight">Welcome to <span className="text-blue-600">likeVercel</span></h1>
              <p className="text-text-secondary mb-12 text-lg font-medium leading-relaxed">Let's secure your orchestration suite with a primary access passcode.</p>
              
              <button
                onClick={() => setStep(2)}
                className="w-full py-4 px-8 bg-blue-600 text-white rounded-[1.25rem] font-semibold text-lg hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
              >
                Get Started
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl font-semibold text-text-primary mb-2 tracking-tight">Create your PIN</h2>
                <p className="text-text-secondary font-medium text-sm opacity-80">Establish a 6-digit credential for your dashboard</p>
              </div>

              <div className="bg-bg-secondary/40 backdrop-blur-xl border border-border-light p-12 rounded-[3rem] w-full shadow-2xl shadow-black/[0.03]">
                <PinKeypad pin={pin} setPin={handleSetPin} maxLength={6} />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl font-semibold text-text-primary mb-2 tracking-tight">Confirm PIN</h2>
                <p className="text-text-secondary font-medium text-sm opacity-80">Re-enter your passcode to verify security</p>
              </div>

              <div className="bg-bg-secondary/40 backdrop-blur-xl border border-border-light p-12 rounded-[3rem] w-full relative shadow-2xl shadow-black/[0.03]">
                <PinKeypad pin={confirmPin} setPin={handleConfirmPin} error={error} maxLength={6} />
                
                <AnimatePresence>
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-bg-secondary/80 backdrop-blur-sm rounded-[3rem] flex flex-col items-center justify-center gap-5"
                    >
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-600/10" />
                      <p className="font-semibold text-blue-600 animate-pulse">Initializing System State...</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <button
                onClick={() => {
                  setStep(2);
                  setPin('');
                  setConfirmPin('');
                }}
                disabled={loading}
                className="mt-8 text-text-muted hover:text-text-primary transition-colors flex items-center justify-center gap-2 w-full font-semibold text-sm opacity-60 hover:opacity-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Modify previous entry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
