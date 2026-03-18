import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Terminal, Shield } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

const AddVps: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: 'root',
    authType: 'password',
    password: '',
    privateKey: '',
    passphrase: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 22 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        authType: formData.authType,
        password: formData.authType === 'password' ? formData.password : undefined,
        privateKey: formData.authType === 'privateKey' ? formData.privateKey : undefined,
        passphrase: formData.authType === 'privateKey' && formData.passphrase ? formData.passphrase : undefined,
      };

      await api.post('/vps', payload);
      showToast('Server added successfully', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add VPS endpoint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 bg-bg-primary min-h-full">
      <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors mb-8 group font-bold text-xs uppercase tracking-widest"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold">Back to Dashboard</span>
      </button>

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Add New Endpoint</h1>
        <p className="mt-2 text-text-secondary text-sm font-medium">Configure a new remote server connection to manage your services.</p>
      </div>

      <div className="glass-effect rounded-2xl overflow-hidden p-8 border border-border-light shadow-2xl relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Terminal size={120} className="text-text-primary" />
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center space-x-3 text-xs font-bold">
             <Shield size={18} className="text-red-500" />
             <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-widest">Connection Name</label>
              <input 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded-xl px-4 py-3 text-text-primary outline-none transition-all focus:ring-4 focus:ring-blue-500/5 font-bold" 
                placeholder="e.g. Production Web Server" 
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-widest">Hostname / IP</label>
              <input 
                name="host"
                value={formData.host}
                onChange={handleChange}
                className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded-xl px-4 py-3 text-text-primary outline-none transition-all focus:ring-4 focus:ring-blue-500/5 font-mono text-sm" 
                placeholder="192.168.1.100" 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-widest">SSH Port</label>
              <input 
                name="port"
                type="number"
                value={formData.port}
                onChange={handleChange}
                className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded-xl px-4 py-3 text-text-primary outline-none transition-all focus:ring-4 focus:ring-blue-500/5 font-mono text-sm" 
                required 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-widest">Username</label>
              <input 
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded-xl px-4 py-3 text-text-primary outline-none transition-all focus:ring-4 focus:ring-blue-500/5 font-bold" 
                placeholder="root" 
                required 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-muted mb-3 uppercase tracking-widest">Authentication Type</label>
              <div className="grid grid-cols-2 gap-4">
                <label 
                  className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 transition-all ${
                    formData.authType === 'password' 
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500 shadow-xl shadow-blue-500/5' 
                    : 'border-border-light bg-bg-tertiary/20 text-text-muted hover:border-text-secondary'
                  }`}
                >
                  <input type="radio" name="authType" value="password" checked={formData.authType === 'password'} onChange={handleChange} className="hidden" />
                  <div className={`p-2 rounded-lg ${formData.authType === 'password' ? 'bg-blue-600 text-white' : 'bg-bg-tertiary text-text-muted'}`}>
                    <Save size={18} />
                  </div>
                  <span className="font-bold text-xs uppercase tracking-widest">Password</span>
                </label>
                <label 
                  className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 transition-all ${
                    formData.authType === 'privateKey' 
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500 shadow-xl shadow-blue-500/5' 
                    : 'border-border-light bg-bg-tertiary/20 text-text-muted hover:border-text-secondary'
                  }`}
                >
                  <input type="radio" name="authType" value="privateKey" checked={formData.authType === 'privateKey'} onChange={handleChange} className="hidden" />
                  <div className={`p-2 rounded-lg ${formData.authType === 'privateKey' ? 'bg-blue-600 text-white' : 'bg-bg-tertiary text-text-muted'}`}>
                    <Shield size={18} />
                  </div>
                  <span className="font-bold text-xs uppercase tracking-widest">SSH Key</span>
                </label>
              </div>
            </div>

            {formData.authType === 'password' && (
              <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-widest">SSH Password</label>
                <input 
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded-xl px-4 py-3 text-text-primary outline-none transition-all focus:ring-4 focus:ring-blue-500/5 font-bold" 
                  placeholder="Enter Password" 
                />
              </div>
            )}

            {formData.authType === 'privateKey' && (
              <div className="md:col-span-2 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-widest">Private Key Content</label>
                  <textarea 
                    name="privateKey"
                    value={formData.privateKey}
                    onChange={handleChange}
                    className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded-xl px-4 py-3 text-text-primary outline-none transition-all focus:ring-4 focus:ring-blue-500/5 font-mono text-xs leading-relaxed" 
                    rows={8}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-widest">Key Passphrase (Optional)</label>
                  <input 
                    name="passphrase"
                    type="password"
                    value={formData.passphrase}
                    onChange={handleChange}
                    className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded-xl px-4 py-3 text-text-primary outline-none transition-all focus:ring-4 focus:ring-blue-500/5 font-bold" 
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-4 pt-8 border-t border-border-light mt-8">
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 text-text-secondary hover:text-text-primary font-bold transition-all hover:bg-bg-tertiary/20 rounded-xl"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex items-center space-x-2 px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              <span>Save Connection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVps;
