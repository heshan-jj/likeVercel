import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { UserPlus, UserCheck, Lock, Mail, Loader2, ShieldCheck, Zap } from 'lucide-react';

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
      setError(err.response?.data?.error || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4 relative overflow-hidden py-16">
      {/* Subtle Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/[0.03] blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/[0.03] blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="p-5 bg-emerald-600 rounded-[32px] shadow-2xl shadow-emerald-600/20 mb-6 transition-transform hover:scale-105 duration-500">
            <UserPlus size={56} className="text-white" />
          </div>
          <h2 className="text-4xl font-black text-text-primary tracking-tighter uppercase flex items-center space-x-3">
             <Zap className="text-emerald-600" size={32} />
             <span>Join System</span>
          </h2>
          <p className="mt-3 text-text-muted font-bold tracking-widest uppercase text-[10px] opacity-70">Initialize Deployment Profile</p>
        </div>

        <div className="glass-effect p-10 rounded-[40px] border border-black/5 shadow-2xl relative">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <UserCheck size={140} className="text-text-primary" />
          </div>

          <div className="mb-10">
            <h3 className="text-3xl font-bold text-text-primary tracking-tight mb-2">Initialize Unit</h3>
            <p className="text-text-secondary text-sm font-medium">Configure new operator identity.</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-500/5 border border-red-500/10 text-red-600 rounded-2xl text-xs font-bold flex items-center space-x-3 animate-in slide-in-from-top-2 duration-300">
              <ShieldCheck size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Operator Alias</label>
              <div className="relative group">
                <UserCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg-primary border border-black/5 focus:border-emerald-500 rounded-2xl px-12 py-4 text-text-primary text-sm font-bold outline-none transition-all focus:ring-8 focus:ring-emerald-500/[0.03]"
                  placeholder="Full Name"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Secure Email</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-bg-primary border border-black/5 focus:border-emerald-500 rounded-2xl px-12 py-4 text-text-primary text-sm font-bold outline-none transition-all focus:ring-8 focus:ring-emerald-500/[0.03]"
                  placeholder="operator@system.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Master Keyphrase</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg-primary border border-black/5 focus:border-emerald-500 rounded-2xl px-12 py-4 text-text-primary text-sm font-bold outline-none transition-all focus:ring-8 focus:ring-emerald-500/[0.03]"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-4.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-2xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3 tracking-widest uppercase text-xs"
              disabled={loading}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <><span>Finalize Identity</span> <Zap size={16} fill="currentColor" /></>}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-black/5 text-center">
            <p className="text-xs font-bold text-text-muted">
              Already Identified? <Link to="/login" className="text-emerald-600 hover:text-emerald-700 transition-colors ml-1 decoration-2 underline-offset-4">Authenticate at Terminal</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
