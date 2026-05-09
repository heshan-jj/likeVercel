import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Shield, Trash2, ChevronDown } from 'lucide-react';

import api from '../utils/api';

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
    <div className="flex flex-col h-full bg-bg-primary items-center justify-center space-y-2">
       <Loader2 size={32} className="text-blue-500 animate-spin" />
       <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Pulling Config...</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 bg-bg-primary min-h-full">
      <button 
        onClick={() => navigate(`/vps/${id}`)}
        className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors mb-6 group text-[10px] font-bold uppercase tracking-wider"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        <span>Return to Node</span>
      </button>

      <div className="flex items-center justify-between mb-8 border-b border-border-light pb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight uppercase">Update Endpoint</h1>
          <p className="mt-1 text-text-secondary text-xs font-medium">Modify credentials and connection parameters.</p>
        </div>
        <button 
           onClick={handleDelete}
           className="p-2 text-red-600 hover:bg-red-500/10 rounded transition-all border border-red-500/20"
           title="Decommission Node"
        >
           <Trash2 size={18} />
        </button>
      </div>

      <div className="bg-bg-secondary rounded border border-border-light shadow-sm p-6 relative">
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded flex items-center space-x-2 text-xs font-bold">
             <Shield size={14} />
             <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Instance Name</label>
              <input 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded px-3 py-2 text-text-primary outline-none transition-all font-bold text-xs" 
                required 
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Hostname / IP</label>
              <input 
                name="host"
                value={formData.host}
                onChange={handleChange}
                className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded px-3 py-2 text-text-primary outline-none transition-all font-mono text-xs" 
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Port</label>
              <input 
                name="port"
                type="number"
                value={formData.port}
                onChange={handleChange}
                className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded px-3 py-2 text-text-primary outline-none transition-all font-mono text-xs" 
                required 
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">SSH Username</label>
              <input 
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded px-3 py-2 text-text-primary outline-none transition-all font-bold text-xs" 
                required 
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Authentication Protocol</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, authType: 'password' }))}
                  className={`p-2.5 rounded border text-[10px] font-bold uppercase transition-all ${
                    formData.authType === 'password' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-bg-primary border-border-light text-text-muted hover:border-blue-500/50'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, authType: 'privateKey' }))}
                  className={`p-2.5 rounded border text-[10px] font-bold uppercase transition-all ${
                    formData.authType === 'privateKey' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-bg-primary border-border-light text-text-muted hover:border-blue-500/50'
                  }`}
                >
                  SSH Key
                </button>
              </div>
            </div>

            <div className="md:col-span-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded flex items-start space-x-2">
               <Shield size={14} className="text-amber-600 opacity-50 shrink-0 mt-0.5" />
               <p className="text-[9px] leading-tight text-amber-600 font-bold uppercase tracking-wider">
                  SECURITY NOTE: LEAVE CREDENTIAL FIELDS BLANK TO MAINTAIN CURRENT NODE AUTHORIZATION.
               </p>
            </div>

            {formData.authType === 'password' ? (
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Update Password</label>
                <input 
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-bg-primary border border-border-light focus:border-blue-500 rounded px-3 py-2 text-text-primary outline-none transition-all font-bold text-xs" 
                  placeholder="Enter new password or leave blank"
                />
              </div>
            ) : (
              <div className="md:col-span-2 space-y-4 bg-bg-primary border border-border-light rounded p-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Vault Key Selector</label>
                    <Link to="/keys" className="text-[9px] font-bold text-blue-500 hover:underline uppercase">Manage Vault</Link>
                  </div>
                  {savedKeys.length === 0 ? (
                    <p className="text-[10px] text-text-muted font-bold opacity-60">No keys in vault.</p>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedKeyId}
                        onChange={e => handleSelectKey(e.target.value)}
                        className="w-full bg-bg-secondary border border-border-light focus:border-blue-500 rounded px-3 py-2 text-text-primary outline-none transition-all font-bold text-xs cursor-pointer appearance-none"
                      >
                        <option value="">— SELECT SAVED KEY —</option>
                        {savedKeys.map(k => (
                          <option key={k.id} value={k.id}>{k.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                  )}
                  {loadingKey && (
                    <div className="flex items-center space-x-2 mt-1 text-[9px] text-text-muted font-bold animate-pulse">
                      <Loader2 size={10} className="animate-spin" />
                      <span>REHYDRATING...</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Update Private Key</label>
                  <textarea 
                    name="privateKey"
                    value={formData.privateKey}
                    onChange={handleChange}
                    className="w-full bg-bg-secondary border border-border-light focus:border-blue-500 rounded px-3 py-2 text-text-primary outline-none transition-all font-mono text-[10px] leading-tight resize-none" 
                    rows={6}
                    placeholder="Paste new key content or leave blank" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Passphrase</label>
                  <input 
                    name="passphrase"
                    type="password"
                    value={formData.passphrase}
                    onChange={handleChange}
                    className="w-full bg-bg-secondary border border-border-light focus:border-blue-500 rounded px-3 py-2 text-text-primary outline-none transition-all font-bold text-xs" 
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border-light">
            <button 
              type="button" 
              onClick={() => navigate(`/vps/${id}`)}
              className="px-4 py-2 text-text-muted hover:text-text-primary text-[10px] font-bold uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-sm text-xs uppercase transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Sync Node</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVps;
