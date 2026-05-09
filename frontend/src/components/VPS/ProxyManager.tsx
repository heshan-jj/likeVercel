import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  X,
  ExternalLink,
  RefreshCw,
  Download,
  Lock,
  Zap
} from 'lucide-react';
import api from '../../utils/api';

interface ProxyConfig {
  domain: string;
  port: number;
  ssl: boolean;
  enabled: boolean;
  fileName: string;
  managed: boolean;
}

interface ProxyManagerProps {
  vpsId: string;
}

const ProxyManager: React.FC<ProxyManagerProps> = ({ vpsId }) => {
  const [configs, setConfigs] = useState<ProxyConfig[]>([]);
  const [nginxInstalled, setNginxInstalled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ domain: '', port: '', ssl: false });
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/vps/${vpsId}/proxy`);
      setConfigs(data.configs);
      setNginxInstalled(data.nginxInstalled);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load proxy configs');
    } finally {
      setLoading(false);
    }
  }, [vpsId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleInstallNginx = async () => {
    setInstalling(true);
    setError('');
    try {
      await api.post(`/vps/${vpsId}/proxy/install-nginx`);
      setNginxInstalled(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to install Nginx');
    } finally {
      setInstalling(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.domain || !form.port) return;
    setCreating(true);
    setError('');
    try {
      const res = await api.post(`/vps/${vpsId}/proxy`, {
        domain: form.domain,
        port: parseInt(form.port),
        ssl: form.ssl,
      });
      if (res.data.sslError) {
        setError(`Proxy created, but SSL failed: ${res.data.sslError}`);
      }
      setShowForm(false);
      setForm({ domain: '', port: '', ssl: false });
      fetchConfigs();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create proxy');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (domain: string) => {
    if (!confirm(`Remove proxy config for ${domain}?`)) return;
    setActionLoading(`delete-${domain}`);
    try {
      await api.delete(`/vps/${vpsId}/proxy/${domain}`);
      fetchConfigs();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to delete proxy');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnableSSL = async (domain: string) => {
    setActionLoading(`ssl-${domain}`);
    setError('');
    try {
      await api.post(`/vps/${vpsId}/proxy/${domain}/ssl`);
      fetchConfigs();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'SSL setup failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdopt = async (cfg: ProxyConfig) => {
    setActionLoading(`adopt-${cfg.domain}`);
    try {
      await api.post(`/vps/${vpsId}/proxy/adopt`, {
        domain: cfg.domain,
        fileName: cfg.fileName,
      });
      fetchConfigs();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to adopt proxy');
    } finally {
      setActionLoading(null);
    }
  };

  if (!loading && !nginxInstalled) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
         <div className="p-8 bg-bg-secondary border border-border-light rounded-md shadow-sm max-w-lg">
            <Globe size={48} className="text-blue-500 mx-auto mb-6" />
            <h3 className="text-lg font-bold text-text-primary mb-2 uppercase tracking-tight">Proxy core missing</h3>
            <p className="text-text-muted mb-8 text-xs font-bold leading-relaxed">
              Edge routing and SSL protocols depend on the Nginx reverse proxy service. Establish this host protocol to continue.
            </p>
            <button 
               onClick={handleInstallNginx} 
               disabled={installing}
               className="w-full flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded transition-all disabled:opacity-50"
            >
               {installing ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> <span>INITIALIZE NGINX</span></>}
            </button>
            {error && <p className="mt-4 text-red-500 font-bold bg-red-500/10 p-3 rounded border border-red-500/20 text-[10px]">{error}</p>}
         </div>
      </div>
    );
  }

  const managedConfigs = configs.filter(c => c.managed);
  const externalConfigs = configs.filter(c => !c.managed);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header Area */}
      <div className="flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-2 text-text-primary">
          <Globe size={18} className="text-blue-500" />
          <h3 className="text-xs font-bold uppercase tracking-tight">Proxy Cluster</h3>
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button 
             onClick={fetchConfigs}
             className="p-1.5 bg-bg-tertiary hover:bg-bg-tertiary text-text-secondary rounded border border-border-light shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
             onClick={() => setShowForm(true)}
             className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-sm"
          >
            <Plus size={14} />
            <span>Map Domain</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded flex items-center justify-between text-xs font-bold">
          <div className="flex items-center space-x-2">
             <ShieldAlert size={16} />
             <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded-lg"><X size={14} /></button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-bg-secondary rounded-md border border-blue-500/20 p-4 shadow-sm space-y-4 relative z-20">
           <div className="flex items-center justify-between border-b border-border-light pb-2">
              <div className="flex items-center space-x-2">
                 <Zap className="text-blue-500" size={16} />
                 <h4 className="text-xs font-bold text-text-primary tracking-tight">New Routing Rule</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="text-text-muted hover:text-text-primary transition-all"
              >
                <X size={16} />
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Target Domain</label>
                 <input
                    className="w-full bg-bg-primary border border-border-light rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-blue-500 font-mono shadow-sm"
                    placeholder="cloud.example.com"
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                    required
                 />
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Internal Port</label>
                 <input
                    className="w-full bg-bg-primary border border-border-light rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-blue-500 font-mono shadow-sm"
                    type="number"
                    placeholder="3000"
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: e.target.value })}
                    required
                 />
              </div>
           </div>

           <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.ssl}
                  onChange={(e) => setForm({ ...form, ssl: e.target.checked })}
                  className="rounded border-border-light text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Auto SSL (Let's Encrypt)</span>
              </label>

              <div className="flex items-center space-x-2">
                 <button 
                   type="button" 
                   className="px-3 py-1.5 text-text-muted hover:text-text-primary text-xs font-bold" 
                   onClick={() => setShowForm(false)}
                 >
                    Cancel
                 </button>
                 <button 
                   type="submit" 
                   className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-sm text-xs transition-all disabled:opacity-50"
                   disabled={creating || !form.domain || !form.port}
                 >
                    {creating ? <Loader2 size={14} className="animate-spin" /> : 'Create Route'}
                 </button>
              </div>
           </div>
        </form>
      )}

      {/* Config Table */}
      <div className="flex-1 overflow-auto border border-border-light rounded-md bg-bg-secondary/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-light bg-bg-tertiary/40">
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase">Status</th>
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase">Domain</th>
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase">Map</th>
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase">SSL</th>
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <Loader2 size={24} className="text-blue-500 animate-spin mx-auto mb-2" />
                  <span className="text-[10px] font-bold text-text-muted uppercase">Syncing configs...</span>
                </td>
              </tr>
            ) : managedConfigs.length === 0 && externalConfigs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-text-muted text-xs font-bold">No connectors defined.</td>
              </tr>
            ) : (
              <>
                {managedConfigs.map((cfg) => (
                  <tr key={cfg.domain} className="hover:bg-bg-tertiary/30 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${cfg.enabled ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">{cfg.enabled ? 'Active' : 'Idle'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 font-bold text-text-primary text-xs font-mono truncate max-w-[200px]">
                      {cfg.domain}
                    </td>
                    <td className="px-4 py-2 text-[10px] font-mono font-bold">
                      <span className="text-text-muted mr-1 opacity-50">L:</span>
                      <span className="text-blue-500">{cfg.port}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase w-fit ${
                        cfg.ssl ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {cfg.ssl ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                        <span>{cfg.ssl ? 'SSL' : 'NONE'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end space-x-1">
                        <a 
                          href={`${cfg.ssl ? 'https' : 'http'}://${cfg.domain}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-bg-tertiary rounded text-text-muted hover:text-text-primary"
                        >
                          <ExternalLink size={14} />
                        </a>
                        
                        {!cfg.ssl && (
                          <button
                            onClick={() => handleEnableSSL(cfg.domain)}
                            disabled={actionLoading === `ssl-${cfg.domain}`}
                            className="p-1.5 hover:bg-bg-tertiary rounded text-amber-600 hover:bg-amber-500/10 transition-colors"
                            title="Activate SSL"
                          >
                             {actionLoading === `ssl-${cfg.domain}` ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(cfg.domain)}
                          disabled={actionLoading === `delete-${cfg.domain}`}
                          className="p-1.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-500"
                        >
                           {actionLoading === `delete-${cfg.domain}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {externalConfigs.length > 0 && (
                  <>
                    <tr className="bg-amber-500/5">
                      <td colSpan={5} className="px-4 py-1.5 text-[9px] font-bold text-amber-600 uppercase tracking-widest border-y border-amber-500/10">
                        External Workloads
                      </td>
                    </tr>
                    {externalConfigs.map((cfg) => (
                      <tr key={cfg.domain} className="bg-amber-500/[0.02] hover:bg-amber-500/5 transition-colors">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span className="text-[9px] font-bold uppercase text-amber-600">External</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 font-bold text-text-primary text-xs font-mono">{cfg.domain}</td>
                        <td className="px-4 py-2 text-[10px] font-mono text-text-muted">P:{cfg.port}</td>
                        <td className="px-4 py-2 text-[9px] text-text-muted font-mono truncate max-w-[120px]">{cfg.fileName}</td>
                        <td className="px-4 py-2 text-right">
                          <button 
                            onClick={() => handleAdopt(cfg)}
                            disabled={actionLoading === `adopt-${cfg.domain}`}
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9px] rounded uppercase disabled:opacity-50"
                          >
                            {actionLoading === `adopt-${cfg.domain}` ? <Loader2 size={10} className="animate-spin" /> : 'Adopt'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProxyManager;
