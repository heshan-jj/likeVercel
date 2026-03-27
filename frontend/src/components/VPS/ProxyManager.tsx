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
  ArrowRight,
  Download,
  Lock,
  Zap,
  CheckCircle,
  HelpCircle
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
      <div className="flex flex-col items-center justify-center h-full py-20 px-8 text-center animate-in fade-in duration-500">
         <div className="p-10 bg-[#0a1836]/40 backdrop-blur-xl border border-[#6475a1]/10 rounded-[32px] shadow-2xl relative max-w-lg">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-6 bg-[#137fec] rounded-3xl shadow-2xl shadow-[#137fec]/40 border border-[#137fec]/20">
               <Globe size={48} className="text-white" />
            </div>
            
            <h3 className="text-xl font-black text-[#dee5ff] mt-10 mb-4 tracking-[0.1em] uppercase">Proxy core missing</h3>
            <p className="text-[#6475a1] mb-10 leading-relaxed font-black tracking-widest text-[10px] uppercase">
              Edge routing and SSL protocols depend on the Nginx reverse proxy service. Establish this host protocol to continue.
            </p>
            
            <button 
               onClick={handleInstallNginx} 
               disabled={installing}
               className="w-full flex items-center justify-center space-x-3 px-8 py-4 bg-[#137fec] hover:bg-[#1d6fee] text-white font-black text-[10px] rounded-2xl shadow-2xl shadow-[#137fec]/20 transition-all active:scale-95 disabled:opacity-50 border border-[#137fec]/20"
            >
               {installing ? <Loader2 size={24} className="animate-spin" /> : <><Download size={20} /> <span className="uppercase tracking-[0.2em]">Initialize Nginx</span></>}
            </button>
            
            {error && <p className="mt-6 text-[#f97386] font-black bg-[#f97386]/5 p-4 rounded-xl border border-[#f97386]/20 text-[10px] uppercase tracking-widest">{error}</p>}
         </div>
      </div>
    );
  }

  const managedConfigs = configs.filter(c => c.managed);
  const externalConfigs = configs.filter(c => !c.managed);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#6475a1] mb-1">
             <div className="h-1 w-1 rounded-full bg-[#137fec] animate-pulse" />
             <span>Edge Gateway Suite</span>
          </div>
          <h3 className="text-xl font-black text-[#dee5ff] tracking-[0.1em] uppercase">Proxy Cluster</h3>
        </div>
        
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button 
             onClick={fetchConfigs}
             className="p-3 bg-[#11244c] hover:bg-[#137fec]/10 text-[#6475a1] hover:text-[#137fec] rounded-xl transition-all border border-[#6475a1]/10 shadow-md"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
             onClick={() => setShowForm(true)}
             className="flex-1 sm:flex-none flex items-center justify-center space-x-3 px-6 py-3 bg-[#137fec] hover:bg-[#1d6fee] text-white text-[10px] font-black rounded-xl shadow-xl shadow-[#137fec]/20 active:scale-95 border border-[#137fec]/20 uppercase tracking-widest"
          >
            <Plus size={20} />
            <span>Map Domain</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#f97386]/10 border border-[#f97386]/20 text-[#f97386] rounded-2xl flex items-center justify-between text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4">
          <div className="flex items-center space-x-3">
             <ShieldAlert size={20} />
             <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-[#f97386]/20 rounded-lg"><X size={18} /></button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#0a1836]/40 backdrop-blur-xl rounded-[32px] border border-[#137fec]/20 p-8 shadow-2xl space-y-8 animate-in slide-in-from-top-4 duration-300 relative z-20">
           <div className="flex items-center justify-between border-b border-[#6475a1]/10 pb-6 -mx-2">
              <div className="flex items-center space-x-3">
                 <div className="p-2 bg-[#137fec] rounded-xl shadow-lg shadow-[#137fec]/20 border border-[#137fec]/20">
                    <Zap className="text-white" size={18} />
                 </div>
                 <h4 className="text-[11px] font-black text-[#dee5ff] tracking-widest uppercase">New Routing Rule</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="p-2 text-[#6475a1] hover:text-[#dee5ff] hover:bg-[#11244c] rounded-xl transition-all border border-transparent hover:border-[#6475a1]/10"
              >
                <X size={20} />
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-end">
              <div className="md:col-span-3">
                 <label className="block text-[9px] font-black text-[#6475a1] mb-3 uppercase tracking-[0.2em] pl-1">Target Domain</label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-[#11244c] text-[#6475a1] rounded-lg group-focus-within:bg-[#137fec] group-focus-within:text-white transition-all border border-[#6475a1]/10 group-focus-within:border-[#137fec]/20">
                       <Globe size={14} />
                    </div>
                    <input
                      className="w-full bg-[#060e20]/60 border border-[#6475a1]/10 rounded-2xl pl-14 pr-4 py-4 text-[11px] text-[#dee5ff] outline-none focus:border-[#137fec]/30 focus:ring-4 focus:ring-[#137fec]/5 transition-all font-mono shadow-inner uppercase tracking-widest"
                      placeholder="cloud.example.com"
                      value={form.domain}
                      onChange={(e) => setForm({ ...form, domain: e.target.value })}
                      required
                    />
                 </div>
              </div>
              
              <div className="hidden md:flex justify-center pb-5 text-text-muted opacity-40">
                 <ArrowRight size={20} />
              </div>

              <div className="md:col-span-3">
                 <label className="block text-[9px] font-black text-[#6475a1] mb-3 uppercase tracking-[0.2em] pl-1">Internal Port</label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-[#11244c] text-[#6475a1] rounded-lg group-focus-within:bg-[#137fec] group-focus-within:text-white transition-all border border-[#6475a1]/10 group-focus-within:border-[#137fec]/20">
                       <Zap size={14} />
                    </div>
                    <input
                      className="w-full bg-[#060e20]/60 border border-[#6475a1]/10 rounded-2xl pl-14 pr-4 py-4 text-[11px] text-[#dee5ff] outline-none focus:border-[#137fec]/30 focus:ring-4 focus:ring-[#137fec]/5 transition-all font-mono shadow-inner uppercase tracking-widest"
                      type="number"
                      placeholder="3000"
                      value={form.port}
                      onChange={(e) => setForm({ ...form, port: e.target.value })}
                      required
                    />
                 </div>
              </div>
           </div>

           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4 border-t border-[#6475a1]/10 -mx-2 px-2">
              <label 
                className={`cursor-pointer group flex items-center space-x-4 p-4 pr-10 rounded-2xl border transition-all ${
                  form.ssl 
                  ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' 
                  : 'bg-[#060e20]/40 border-[#6475a1]/10 text-[#6475a1] hover:border-[#6475a1]/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.ssl}
                  onChange={(e) => setForm({ ...form, ssl: e.target.checked })}
                  className="hidden"
                />
                <div className={`p-2.5 rounded-xl transition-all shadow-lg border ${form.ssl ? 'bg-[#10b981] text-white border-[#10b981]/20' : 'bg-[#11244c] border-[#6475a1]/10'}`}>
                   {form.ssl ? <ShieldCheck size={18} /> : <Lock size={18} />}
                </div>
                <div>
                   <span className="block font-black text-[11px] tracking-widest uppercase">Auto SSL</span>
                   <span className="block text-[8px] font-black uppercase tracking-widest opacity-60">Let's Encrypt</span>
                </div>
              </label>
 
               <div className="flex items-center space-x-3">
                  <button 
                    type="button" 
                    className="px-6 py-3 text-[#6475a1] hover:text-[#f97386] font-black text-[10px] transition-colors rounded-xl hover:bg-[#f97386]/5 uppercase tracking-widest" 
                    onClick={() => setShowForm(false)}
                  >
                     Discard Changes
                  </button>
                  <button 
                    type="submit" 
                    className="px-10 py-4 bg-[#137fec] hover:bg-[#1d6fee] text-white font-black rounded-2xl shadow-xl shadow-[#137fec]/20 text-[10px] transition-all active:scale-95 disabled:opacity-50 min-w-[180px] uppercase tracking-[0.2em] border border-[#137fec]/20"
                    disabled={creating || !form.domain || !form.port}
                  >
                     {creating ? <Loader2 size={20} className="animate-spin" /> : 'Map Active Route'}
                  </button>
               </div>
            </div>
 
            <div className="flex items-center space-x-3 px-5 py-4 bg-[#0a1836]/20 border border-[#6475a1]/10 border-dashed rounded-2xl">
               <div className="p-1.5 bg-[#137fec]/10 rounded-lg">
                 <HelpCircle size={16} className="text-[#137fec]" />
               </div>
               <p className="text-[9px] text-[#6475a1] leading-relaxed tracking-widest font-black uppercase">
                 <span className="text-[#dee5ff] mr-1">Pre-Validation:</span>
                 DNS CNAME or A-Record must resolve to this host before SSL activation.
               </p>
            </div>
        </form>
      )}

      {/* Config List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <Loader2 size={32} className="text-[#137fec] animate-spin mb-4" />
            <span className="text-[#6475a1] font-black uppercase tracking-[0.3em] text-[10px]">Syncing proxy cluster...</span>
          </div>
        ) : managedConfigs.length === 0 && externalConfigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 border border-dashed border-[#6475a1]/20 rounded-[32px] bg-[#0a1836]/10">
            <div className="p-8 bg-[#0a1836]/40 rounded-3xl mb-8 border border-[#6475a1]/10 shadow-inner">
              <Globe size={56} className="text-[#6475a1]/20" />
            </div>
            <h3 className="text-lg font-black text-[#dee5ff] mb-3 tracking-widest uppercase">No connectors defined</h3>
            <p className="text-[#6475a1] text-center max-w-sm mb-12 text-[10px] font-black leading-relaxed uppercase tracking-widest">Map custom domains to internal host ports with automatic TLS protocols.</p>
          </div>
        ) : (
          <>
            {managedConfigs.map((cfg) => (
              <div key={cfg.domain} className="group bg-[#0a1836]/40 backdrop-blur-md rounded-[32px] border border-[#6475a1]/10 hover:border-[#137fec]/30 transition-all duration-300 overflow-hidden shadow-2xl">
                 <div className="p-6 sm:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div className="flex items-center space-x-5">
                       <div className={`p-5 rounded-2xl ${cfg.enabled ? 'bg-[#137fec]/10' : 'bg-[#11244c]'} shadow-inner border border-[#6475a1]/10`}>
                          <Globe size={28} className={cfg.enabled ? 'text-[#137fec]' : 'text-[#6475a1]'} />
                       </div>
                       <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                             <h4 className="text-[14px] font-black text-[#dee5ff] tracking-widest font-mono truncate max-w-[300px] uppercase">{cfg.domain}</h4>
                             <div className={`flex items-center mt-0.5 space-x-1 px-2.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${
                                cfg.ssl ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20' : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'
                             }`}>
                                {cfg.ssl ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                                <span>{cfg.ssl ? 'SSL Enforced' : 'Unsecured'}</span>
                             </div>
                          </div>
                          <div className="flex items-center space-x-3 text-[9px] font-black font-mono">
                             <span className="text-[#6475a1] uppercase tracking-[0.2em] bg-black/20 px-2 py-0.5 rounded-lg border border-[#6475a1]/10">Backend</span>
                             <span className="text-[#137fec] tracking-widest">127.0.0.1:{cfg.port}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center justify-between xl:justify-end gap-4 border-t xl:border-t-0 border-[#6475a1]/10 pt-6 xl:pt-0">
                       <div className="flex items-center space-x-2 mr-3 hidden 2xl:flex">
                          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border ${
                             cfg.enabled ? 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]' : 'bg-[#f97386]/10 border-[#f97386]/20 text-[#f97386]'
                          }`}>
                             <CheckCircle size={14} />
                             <span className="text-[8px] font-black uppercase tracking-widest">{cfg.enabled ? 'Active' : 'Idle'}</span>
                          </div>
                       </div>

                       <div className="flex items-center space-x-2">
                          <a 
                            href={`${cfg.ssl ? 'https' : 'http'}://${cfg.domain}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-3 bg-[#11244c] hover:bg-[#137fec]/10 text-[#6475a1] hover:text-[#137fec] rounded-xl transition-all border border-[#6475a1]/10 shadow-inner"
                          >
                            <ExternalLink size={20} />
                          </a>
                          
                          {!cfg.ssl && (
                            <button
                              onClick={() => handleEnableSSL(cfg.domain)}
                              disabled={actionLoading === `ssl-${cfg.domain}`}
                              className="flex items-center space-x-2 px-6 py-3 bg-[#f59e0b]/10 hover:bg-[#f59e0b] text-[#f59e0b] hover:text-white font-black tracking-widest text-[10px] rounded-xl border border-[#f59e0b]/20 transition-all active:scale-95 uppercase"
                            >
                               {actionLoading === `ssl-${cfg.domain}` ? <Loader2 size={16} className="animate-spin" /> : <><Lock size={16} /> <span>SSL Activate</span></>}
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(cfg.domain)}
                            disabled={actionLoading === `delete-${cfg.domain}`}
                            className="p-3 bg-[#11244c] hover:bg-[#f97386]/20 hover:text-[#f97386] text-[#6475a1] rounded-xl transition-all border border-[#6475a1]/10"
                          >
                             {actionLoading === `delete-${cfg.domain}` ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
            ))}

            {externalConfigs.length > 0 && (
              <>
                <div className="flex items-center space-x-3 mt-10 mb-4 px-1">
                  <Zap className="text-[#f59e0b]" size={18} />
                  <h3 className="text-[10px] font-black text-[#6475a1] uppercase tracking-[0.3em]">External Host Proxies detected</h3>
                </div>
                {externalConfigs.map((cfg) => (
                  <div key={cfg.domain} className="group bg-[#0a1836]/40 backdrop-blur-md rounded-[32px] border border-[#6475a1]/10 bg-[#f59e0b]/[0.02] hover:border-[#f59e0b]/30 transition-all duration-300 overflow-hidden shadow-2xl">
                    <div className="p-6 sm:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                      <div className="flex items-center space-x-5">
                        <div className="p-5 rounded-2xl bg-[#f59e0b]/10 shadow-inner border border-[#f59e0b]/20">
                          <Globe size={28} className="text-[#f59e0b]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                             <h4 className="text-[14px] font-black text-[#dee5ff] tracking-widest font-mono uppercase truncate">{cfg.domain}</h4>
                             <div className="px-2.5 py-0.5 rounded-full border bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b] text-[8px] font-black uppercase tracking-widest">
                                External Rule
                             </div>
                          </div>
                          <div className="flex items-center space-x-3 text-[9px] font-black font-mono text-[#6475a1]">
                             <span className="uppercase tracking-widest">Mapped to: {cfg.port}</span>
                             <span className="h-1 w-1 rounded-full bg-[#6475a1]/30" />
                             <span className="uppercase tracking-tight">File: {cfg.fileName}</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleAdopt(cfg)}
                        disabled={actionLoading === `adopt-${cfg.domain}`}
                        className="px-8 py-3 bg-[#137fec] hover:bg-[#1d6fee] text-white font-black text-[10px] rounded-xl transition-all border border-[#137fec]/20 shadow-xl shadow-[#137fec]/20 uppercase tracking-[0.2em] disabled:opacity-50 flex items-center space-x-2"
                      >
                        {actionLoading === `adopt-${cfg.domain}` ? <Loader2 size={16} className="animate-spin" /> : <span>Take Control</span>}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProxyManager;
