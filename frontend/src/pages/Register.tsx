import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { UserPlus, UserCheck, Lock, Mail, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      login(data.accessToken, data.refreshToken, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      const detailedError = err.response?.data?.details?.[0]?.message;
      setError(detailedError || err.response?.data?.error || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4 relative overflow-hidden py-16">
      {/* Background Elements */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/[0.04] blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-blue-500/[0.04] blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="p-4 bg-emerald-600 rounded-[28px] shadow-2xl shadow-emerald-600/20 mb-6 transition-all hover:scale-105 duration-500">
            <UserPlus size={48} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-text-primary tracking-tighter">
             likeVercel
          </h2>
          <p className="mt-2 text-text-muted font-bold tracking-[0.1em] uppercase text-[10px] opacity-60">Create a new account</p>
        </div>

        <div className="glass-effect p-10 rounded-[32px] border border-border-light shadow-2xl relative">
          <div className="mb-10 text-left">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight mb-1.5">Local Admin Setup</h3>
            <p className="text-text-secondary text-xs font-medium opacity-80">Create the primary admin account for your local app.</p>
          </div>

          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl text-[11px] font-bold flex items-start space-x-3 animate-in slide-in-from-top-2 duration-300">
            <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
            <span className="leading-relaxed">Warning: This app runs entirely on your local machine. Your deployment configurations and keys are stored locally. Do not share your database file.</span>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-500/5 border border-red-500/10 text-red-600 rounded-2xl text-[11px] font-bold flex items-center space-x-3 animate-in slide-in-from-top-2 duration-300">
              <ShieldCheck size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2.5">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] ml-1">Full Name</label>
              <div className="relative group">
                <UserCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg-primary/50 border border-border-light focus:border-emerald-500/50 rounded-2xl px-12 py-3.5 text-text-primary text-xs font-bold outline-none transition-all focus:ring-8 focus:ring-emerald-500/[0.04]"
                  placeholder="Your name"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] ml-1">Email Address</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-bg-primary/50 border border-border-light focus:border-emerald-500/50 rounded-2xl px-12 py-3.5 text-text-primary text-xs font-bold outline-none transition-all focus:ring-8 focus:ring-emerald-500/[0.04]"
                  placeholder="email@example.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] ml-1">Password</label>
              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg-primary/50 border border-border-light focus:border-emerald-500/50 rounded-2xl px-12 py-3.5 text-text-primary text-xs font-bold outline-none transition-all focus:ring-8 focus:ring-emerald-500/[0.04]"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-2xl shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3 tracking-widest uppercase text-[11px]"
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <span>Sign Up</span>}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-border-light text-center">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Already have an account? <Link to="/login" className="text-emerald-600 hover:text-emerald-700 transition-colors ml-1 font-black">Login here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
