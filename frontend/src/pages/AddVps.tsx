import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Shield, ChevronDown } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useVps } from '../context/VpsContext';
import { useKeys } from '../context/KeyContext';
import type { SshKey } from '../context/KeyContext';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Card from '../components/UI/Card';

interface FormData {
  name: string;
  host: string;
  port: number;
  username: string;
  authType: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

const AddVps: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshProfiles } = useVps();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    host: '',
    port: 22,
    username: 'root',
    authType: 'password',
    password: '',
    privateKey: '',
    passphrase: ''
  });

  /* Saved keys */
  const { keys: savedKeys } = useKeys();
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [loadingKey, setLoadingKey] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 22 : value
    }));
  };

  const handleSelectKey = async (keyId: string) => {
    setSelectedKeyId(keyId);
    if (!keyId) {
      setFormData(prev => ({ ...prev, privateKey: '' }));
      return;
    }
    setLoadingKey(true);
    try {
      const { data } = await api.post(`/keys/${keyId}/use`);
      setFormData(prev => ({ ...prev, privateKey: data.privateKey }));
      showToast(`Key "${data.label}" loaded`, 'success');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || 'Failed to load key', 'error');
    } finally {
      setLoadingKey(false);
    }
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
      await refreshProfiles();
      showToast('Server added successfully', 'success');
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to add VPS endpoint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 min-h-full">
      <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors mb-8 group text-[11px] font-semibold tracking-tight"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        <span>Return to Dashboard</span>
      </button>

      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Register New Endpoint</h1>
        <p className="mt-1.5 text-text-secondary text-sm font-medium">Add a remote server connection to your management cluster.</p>
      </div>

      <Card className="p-8 relative" glass>
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg flex items-center space-x-3 text-[13px] font-semibold">
             <Shield size={16} />
             <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Input 
                label="Instance Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Production API Node" 
                required 
              />
            </div>

            <Input 
              label="Hostname / IP"
              name="host"
              value={formData.host}
              onChange={handleChange}
              className="font-mono"
              placeholder="192.168.1.1" 
              required 
            />
            
            <Input 
              label="Port"
              name="port"
              type="number"
              value={formData.port}
              onChange={handleChange}
              className="font-mono"
              required 
            />

            <div className="md:col-span-2">
              <Input 
                label="SSH Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="root" 
                required 
              />
            </div>

            <div className="md:col-span-2 space-y-2.5">
              <label className="text-[11px] font-semibold text-text-secondary ml-1">Authentication Protocol</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, authType: 'password' }))}
                  className={`py-2.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
                    formData.authType === 'password' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-bg-primary/40 border-border-light text-text-muted hover:border-blue-500/50'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, authType: 'privateKey' }))}
                  className={`py-2.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
                    formData.authType === 'privateKey' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-bg-primary/40 border-border-light text-text-muted hover:border-blue-500/50'
                  }`}
                >
                  SSH Key
                </button>
              </div>
            </div>

            {formData.authType === 'password' ? (
              <div className="md:col-span-2">
                <Input 
                  label="Access Password"
                  name="password"
                  type="password"
                  value={formData.password || ''}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required={formData.authType === 'password'}
                />
              </div>
            ) : (
              <div className="md:col-span-2 space-y-5 p-5 bg-bg-primary/30 border border-border-light rounded-xl shadow-inner">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-semibold text-text-secondary">Vault Key Selector</label>
                    <Link to="/keys" className="text-[10px] font-semibold text-blue-500 hover:underline">Manage Vault</Link>
                  </div>
                  {savedKeys.length === 0 ? (
                    <p className="text-[11px] text-text-muted font-medium px-1 opacity-60">No keys in vault.</p>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedKeyId}
                        onChange={e => handleSelectKey(e.target.value)}
                        className="w-full bg-bg-secondary border border-border-light focus:border-blue-500 rounded-lg px-4 py-2.5 text-text-primary outline-none transition-all font-semibold text-xs cursor-pointer appearance-none shadow-sm"
                      >
                        <option value="">— Select Saved Key —</option>
                        {savedKeys.map((k: SshKey) => (
                          <option key={k.id} value={k.id}>{k.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                  )}
                  {loadingKey && (
                    <div className="flex items-center space-x-2 mt-2 text-[10px] text-text-muted font-semibold animate-pulse px-1">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Fetching key from vault...</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-text-secondary px-1">Private Key Content</label>
                  <textarea 
                    name="privateKey"
                    value={formData.privateKey || ''}
                    onChange={handleChange}
                    className="w-full bg-bg-secondary border border-border-light focus:border-blue-500 rounded-lg px-4 py-3 text-text-primary outline-none transition-all font-mono text-[11px] leading-relaxed resize-none shadow-sm h-40" 
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" 
                  />
                </div>
                
                <Input 
                  label="Key Passphrase"
                  name="passphrase"
                  type="password"
                  value={formData.passphrase || ''}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border-light">
            <Button 
              variant="ghost"
              type="button"
              onClick={() => navigate('/dashboard')}
              className="font-semibold text-[11px]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={loading}
              className="px-8 py-2.5"
            >
              <Save size={16} className="mr-2" />
              Establish Connection
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddVps;
