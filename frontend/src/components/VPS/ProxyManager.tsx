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
import Button from '../UI/Button';
import Input from '../UI/Input';
import Card from '../UI/Card';
import Badge from '../UI/Badge';

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
         <Card className="p-10 max-w-lg" glass>
            <div className="p-4 bg-blue-500/10 rounded-2xl w-fit mx-auto mb-8 text-blue-600 shadow-inner">
               <Globe size={48} />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-3 tracking-tight">Proxy Engine Missing</h3>
            <p className="text-text-muted mb-10 text-sm font-medium leading-relaxed">
              Edge routing and SSL protocols depend on the Nginx reverse proxy service. Establish this host protocol to continue orchestration.
            </p>
            <Button 
               onClick={handleInstallNginx} 
               disabled={installing}
               isLoading={installing}
               className="w-full py-3"
            >
               <Download size={18} className="mr-2" />
               <span>Initialize Nginx Runtime</span>
            </Button>
            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}
         </Card>
      </div>
    );
  }

  const managedConfigs = configs.filter(c => c.managed);
  const externalConfigs = configs.filter(c => !c.managed);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Area */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5 text-text-primary">
          <Globe size={18} className="text-blue-500" />
          <h3 className="text-xs font-semibold uppercase tracking-tight">Proxy Cluster</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
             variant="secondary"
             onClick={fetchConfigs}
             size="sm"
             className="h-9 w-9 p-0"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button 
             onClick={() => setShowForm(true)}
             size="sm"
             className="px-5 h-9"
          >
            <Plus size={16} className="mr-1.5" />
            <span>Map Domain</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm">
          <div className="flex items-center space-x-3">
             <ShieldAlert size={16} />
             <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded-lg"><X size={14} /></button>
        </div>
      )}

      {showForm && (
        <Card className="p-6 space-y-6" glass>
           <form onSubmit={handleCreate} className="space-y-6">
             <div className="flex items-center justify-between border-b border-border-light/60 pb-4">
                <div className="flex items-center space-x-3">
                   <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 shadow-inner">
                      <Zap size={18} />
                   </div>
                   <div>
                      <h4 className="text-sm font-semibold text-text-primary tracking-tight">New Routing Provision</h4>
                      <p className="text-[11px] text-text-muted font-medium">Map a public domain to a local host socket</p>
                   </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="text-text-muted hover:text-text-primary transition-all"
                >
                  <X size={20} />
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Target Domain"
                  placeholder="cloud.example.com"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className="font-mono text-[11px]"
                  required
                />
                <Input
                  label="Internal Ingress Port"
                  type="number"
                  placeholder="3000"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  className="font-mono text-[11px]"
                  required
                />
             </div>

             <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                     <input
                      type="checkbox"
                      checked={form.ssl}
                      onChange={(e) => setForm({ ...form, ssl: e.target.checked })}
                      className="rounded-md border-border-light text-blue-600 focus:ring-blue-500 w-5 h-5 transition-all shadow-inner"
                     />
                  </div>
                  <div>
                     <span className="text-xs font-semibold text-text-secondary tracking-tight">Automatic SSL Provisioning</span>
                     <p className="text-[10px] text-text-muted font-medium opacity-60">Issue Let's Encrypt certificate via Certbot</p>
                  </div>
                </label>

                <div className="flex items-center space-x-3">
                   <Button variant="ghost" type="button" onClick={() => setShowForm(false)} size="sm">Cancel</Button>
                   <button 
                     type="submit" 
                     disabled={creating || !form.domain || !form.port}
                     className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/20 text-xs transition-all active:scale-95 disabled:opacity-50"
                   >
                      {creating ? <Loader2 size={16} className="animate-spin" /> : 'Execute Route'}
                   </button>
                </div>
             </div>
           </form>
        </Card>
      )}

      {/* Config Table */}
      <div className="flex-1 overflow-auto border border-border-light rounded-xl bg-bg-secondary/40 shadow-sm shadow-black/[0.01]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-light bg-bg-tertiary/20 backdrop-blur-sm">
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight">Integrity</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight">Public Domain</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight">Socket Map</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight text-center">Encryption</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight text-right">Gateway Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <Loader2 size={32} className="text-blue-500 animate-spin mx-auto mb-4 opacity-80" />
                  <span className="text-[11px] font-semibold text-text-muted">Syncing routing topology...</span>
                </td>
              </tr>
            ) : managedConfigs.length === 0 && externalConfigs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center text-text-muted">
                  <Globe size={40} className="mx-auto opacity-10 mb-4" />
                  <p className="text-[11px] font-medium">No edge routes defined for this node</p>
                </td>
              </tr>
            ) : (
              <>
                {managedConfigs.map((cfg) => (
                  <tr key={cfg.domain} className="hover:bg-bg-tertiary/20 transition-colors group">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${cfg.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-[10px] font-semibold tracking-tight ${cfg.enabled ? 'text-emerald-600' : 'text-red-600'}`}>{cfg.enabled ? 'Active' : 'Dormant'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-text-primary text-xs font-mono truncate max-w-[200px]">
                      {cfg.domain}
                    </td>
                    <td className="px-5 py-4 text-[11px] font-mono font-bold">
                      <Badge variant="blue" className="px-2 py-0.5 tracking-widest uppercase text-[9px]">
                        L:{cfg.port}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-bold tracking-widest ${
                        cfg.ssl ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-inner'
                      }`}>
                        {cfg.ssl ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                        <span>{cfg.ssl ? 'TLS' : 'PLAIN'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={`${cfg.ssl ? 'https' : 'http'}://${cfg.domain}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-text-primary border border-transparent hover:border-border-light shadow-sm transition-all"
                        >
                          <ExternalLink size={16} />
                        </a>
                        
                        {!cfg.ssl && (
                          <button
                            onClick={() => handleEnableSSL(cfg.domain)}
                            disabled={actionLoading === `ssl-${cfg.domain}`}
                            className="p-2 hover:bg-bg-tertiary rounded-lg text-amber-600 hover:bg-amber-500/10 transition-colors border border-transparent hover:border-amber-500/20 shadow-sm"
                            title="Activate TLS"
                          >
                             {actionLoading === `ssl-${cfg.domain}` ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(cfg.domain)}
                          disabled={actionLoading === `delete-${cfg.domain}`}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-500 border border-transparent hover:border-red-500/20 shadow-sm transition-all"
                        >
                           {actionLoading === `delete-${cfg.domain}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {externalConfigs.length > 0 && (
                  <>
                    <tr className="bg-amber-500/5 backdrop-blur-sm">
                      <td colSpan={5} className="px-5 py-2 text-[10px] font-bold text-amber-600 tracking-widest uppercase border-y border-amber-500/10">
                        External Cluster Workloads
                      </td>
                    </tr>
                    {externalConfigs.map((cfg) => (
                      <tr key={cfg.domain} className="bg-amber-500/[0.02] hover:bg-amber-500/5 transition-colors group">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                            <span className="text-[10px] font-bold text-amber-600 tracking-tight">EXTERNAL</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-semibold text-text-primary text-xs font-mono">{cfg.domain}</td>
                        <td className="px-5 py-4">
                           <Badge variant="gray" className="font-mono text-[9px] px-2 opacity-60">PORT:{cfg.port}</Badge>
                        </td>
                        <td className="px-5 py-4 text-center">
                           <span className="text-[10px] text-text-muted font-mono opacity-50 truncate max-w-[120px] inline-block">{cfg.fileName}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button 
                            onClick={() => handleAdopt(cfg)}
                            disabled={actionLoading === `adopt-${cfg.domain}`}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[10px] rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {actionLoading === `adopt-${cfg.domain}` ? <Loader2 size={12} className="animate-spin" /> : 'Adopt Route'}
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
