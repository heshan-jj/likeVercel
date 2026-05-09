import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Shield, Trash2, ChevronDown } from 'lucide-react';

import api from '../utils/api';

import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Card from '../components/UI/Card';

const EditVps: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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

  /* Saved keys */
  const [savedKeys, setSavedKeys] = useState<{ id: string; label: string; fingerprint: string }[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [loadingKey, setLoadingKey] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/vps/${id}`);
        const p = data.profile;
        setFormData({
          name: p.name,
          host: p.host,
          port: p.port,
          username: p.username,
          authType: p.authType,
          password: '',
          privateKey: '',
          passphrase: ''
        });
      } catch {
        setError('Failed to load VPS credentials');
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, [id]);

  useEffect(() => {
    api.get('/keys').then(({ data }) => setSavedKeys(data.keys)).catch(() => {});
  }, []);

  const handleSelectKey = async (keyId: string) => {
    setSelectedKeyId(keyId);
    if (!keyId) { setFormData(prev => ({ ...prev, privateKey: '' })); return; }
    setLoadingKey(true);
    try {
      const { data } = await api.post(`/keys/${keyId}/use`);
      setFormData(prev => ({ ...prev, privateKey: data.privateKey }));
    } catch { 
      /* silent */ 
    } finally { 
      setLoadingKey(false); 
    }
  };

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
      const payload: Record<string, string | number | undefined> = {
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        authType: formData.authType,
      };

      if (formData.authType === 'password' && formData.password) {
        payload.password = formData.password;
      } else if (formData.authType === 'privateKey' && formData.privateKey) {
        payload.privateKey = formData.privateKey;
        if (formData.passphrase) payload.passphrase = formData.passphrase;
      }

      await api.put(`/vps/${id}`, payload);
      navigate(`/vps/${id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to update VPS endpoint');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Permanently decommission node "${formData.name}"?`)) return;
    try {
      await api.delete(`/vps/${id}`);
      navigate('/dashboard');
    } catch {
      setError('Decommission failed');
    }
  };

  if (fetching) return (
    <div className="flex flex-col h-full bg-bg-primary items-center justify-center space-y-3">
       <Loader2 size={32} className="text-blue-500 animate-spin" />
       <span className="text-[11px] font-medium text-text-muted">Pulling cluster config...</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 min-h-full">
      <button 
        onClick={() => navigate(`/vps/${id}`)}
        className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors mb-8 group text-[11px] font-semibold tracking-tight"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        <span>Return to Instance</span>
      </button>

      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Update Endpoint</h1>
          <p className="mt-1.5 text-text-secondary text-sm font-medium">Modify credentials and connection parameters.</p>
        </div>
        <button 
           onClick={handleDelete}
           className="p-2.5 text-red-600 hover:bg-red-500/10 rounded-lg transition-all border border-red-500/20 shadow-sm"
           title="Decommission Node"
        >
           <Trash2 size={20} />
        </button>
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
                required 
              />
            </div>

            <Input 
              label="Hostname / IP"
              name="host"
              value={formData.host}
              onChange={handleChange}
              className="font-mono"
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

            <div className="md:col-span-2 p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-start space-x-3">
               <Shield size={16} className="text-amber-600 opacity-60 shrink-0 mt-0.5" />
               <p className="text-[11px] leading-relaxed text-amber-700 font-medium">
                  Leave credential fields blank to maintain current node authorization. Only update if you want to change the password or SSH key.
               </p>
            </div>

            {formData.authType === 'password' ? (
              <div className="md:col-span-2">
                <Input 
                  label="Update Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password or leave blank"
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
                        {savedKeys.map(k => (
                          <option key={k.id} value={k.id}>{k.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                  )}
                  {loadingKey && (
                    <div className="flex items-center space-x-2 mt-2 text-[10px] text-text-muted font-semibold animate-pulse px-1">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Rehydrating payload...</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-text-secondary px-1">Update Private Key</label>
                  <textarea 
                    name="privateKey"
                    value={formData.privateKey}
                    onChange={handleChange}
                    className="w-full bg-bg-secondary border border-border-light focus:border-blue-500 rounded-lg px-4 py-3 text-text-primary outline-none transition-all font-mono text-[11px] leading-relaxed resize-none shadow-sm h-40" 
                    placeholder="Paste new key content or leave blank" 
                  />
                </div>
                
                <Input 
                  label="Passphrase"
                  name="passphrase"
                  type="password"
                  value={formData.passphrase}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border-light">
            <Button 
              variant="ghost"
              onClick={() => navigate(`/vps/${id}`)}
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
              Sync Node
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditVps;
