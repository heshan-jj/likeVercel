import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  X,
  Loader2,
  Settings,
  Activity,
  ArrowUpRight,
  Trash2
} from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../ConfirmModal';
interface ManagedPort {
  id: string;
  port: number;
  processName: string;
  projectPath: string;
  url: string;
}

interface ActivePortMap {
  port: number;
  pid: string | null;
  processName: string;
}

interface PortManagerProps {
  vpsId: string;
}

const PortManager: React.FC<PortManagerProps> = ({ vpsId }) => {
  const { showToast } = useToast();
  const [activePortsMap, setActivePortsMap] = useState<ActivePortMap[]>([]);
  const [managedPorts, setManagedPorts] = useState<ManagedPort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkPort, setCheckPort] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ available: boolean; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Adoption state
  const [confirmAdoptPort, setConfirmAdoptPort] = useState<ActivePortMap | null>(null);

  const fetchPorts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/vps/${vpsId}/ports`);
      setActivePortsMap(data.activePortsMap || []);
      setManagedPorts(data.managedPorts);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load ports');
    } finally {
      setLoading(false);
    }
  }, [vpsId]);


  useEffect(() => {
    fetchPorts();
  }, [fetchPorts]);

  const handleCheckPort = async () => {
    if (!checkPort) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const { data } = await api.post(`/vps/${vpsId}/ports/check`, { port: checkPort });
      setCheckResult(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleKill = async (port: number) => {
    if (!confirm(`Kill the process listening on port ${port}?`)) return;
    setActionLoading(`kill-${port}`);
    try {
      await api.delete(`/vps/${vpsId}/ports/${port}/kill`);
      showToast(`Process on port ${port} killed`, 'success');
      fetchPorts();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || 'Kill failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdopt = (port: ActivePortMap) => {
    setConfirmAdoptPort(port);
  };

  const confirmAdopt = async () => {
    if (!confirmAdoptPort) return;
    const { port, pid, processName } = confirmAdoptPort;
    setActionLoading(`adopt-${port}`);
    try {
      await api.post(`/vps/${vpsId}/processes/adopt`, {
        port,
        pid,
        processName,
        type: 'port'
      });
      showToast(`Process on port ${port} adopted`, 'success');
      setConfirmAdoptPort(null);
      fetchPorts();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || 'Adoption failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Port Checker Card */}
      <div className="bg-bg-secondary p-6 rounded-md border border-border-light shadow-sm">
         <div className="flex items-center space-x-2 mb-6">
            <ShieldCheck size={18} className="text-blue-500" />
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-tight">Security Port Auditor</h3>
         </div>

         <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full sm:max-w-xs">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[8px] font-bold uppercase tracking-widest">Port</span>
               <input
                type="number"
                placeholder="Ex. 8080"
                value={checkPort}
                onChange={(e) => setCheckPort(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckPort()}
                className="w-full bg-bg-primary border border-border-light rounded pl-12 pr-3 py-1.5 text-xs text-text-primary outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
               <button 
                  onClick={handleCheckPort} 
                  disabled={checking || !checkPort}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded disabled:opacity-50"
               >
                  {checking ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  <span>Scan</span>
               </button>
               <button 
                  onClick={fetchPorts}
                  className="p-1.5 bg-bg-tertiary hover:bg-bg-tertiary text-text-secondary rounded border border-border-light"
               >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
               </button>
            </div>
         </div>

         {checkResult && (
           <div className={`mt-4 p-3 rounded border flex items-center space-x-2 text-xs ${
             checkResult.available 
             ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
             : 'bg-red-500/10 border-red-500/20 text-red-600'
           }`}>
             {checkResult.available ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
             <span className="font-bold">{checkResult.message}</span>
           </div>
         )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Managed Ports Section */}
        <section className="space-y-2">
          <div className="flex items-center space-x-2 px-1">
             <Activity className="text-emerald-500" size={16} />
             <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Public Service Sockets</h3>
          </div>
          
          <div className="border border-border-light rounded-md bg-bg-secondary/20 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-light bg-bg-tertiary/40">
                  <th className="px-3 py-2 text-[9px] font-bold text-text-muted uppercase">Process</th>
                  <th className="px-3 py-2 text-[9px] font-bold text-text-muted uppercase">Socket</th>
                  <th className="px-3 py-2 text-[9px] font-bold text-text-muted uppercase text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {managedPorts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-text-muted text-xs">No active endpoint maps.</td>
                  </tr>
                ) : (
                  managedPorts.map((mp) => (
                    <tr key={mp.port} className="hover:bg-bg-tertiary/30 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-text-primary">{mp.processName}</span>
                          <span className="text-[9px] font-mono text-text-muted truncate max-w-[120px]">{mp.projectPath}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] font-mono font-bold text-emerald-600">PORT:{mp.port}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <a 
                          href={mp.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-block p-1.5 hover:bg-bg-tertiary rounded text-text-muted hover:text-emerald-600"
                        >
                          <ArrowUpRight size={14} />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* System Listening Ports Section */}
        <section className="space-y-2">
          <div className="flex items-center space-x-2 px-1">
             <Settings className="text-amber-500" size={16} />
             <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Host Listening Grid</h3>
          </div>
          
          <div className="border border-border-light rounded-md bg-bg-secondary/20 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-light bg-bg-tertiary/40">
                  <th className="px-3 py-2 text-[9px] font-bold text-text-muted uppercase">Socket</th>
                  <th className="px-3 py-2 text-[9px] font-bold text-text-muted uppercase">Process</th>
                  <th className="px-3 py-2 text-[9px] font-bold text-text-muted uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {activePortsMap.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-text-muted text-xs">No listening ports detected.</td>
                  </tr>
                ) : (
                  activePortsMap.map((map, idx) => (
                    <tr key={`${map.port}-${idx}`} className="hover:bg-bg-tertiary/30 transition-colors group">
                      <td className="px-3 py-2">
                         <span className="text-[10px] font-mono font-bold text-amber-600 uppercase">PORT:{map.port}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-text-primary truncate max-w-[120px]">{map.processName}</span>
                           <span className="text-[9px] font-mono text-text-muted opacity-60">PID: {map.pid || '—'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end space-x-1">
                           {/* Only offer adoption if not already managed */}
                           {!managedPorts.some(mp => mp.port === map.port) && (
                             <button
                               onClick={() => handleAdopt(map)}
                               disabled={actionLoading === `adopt-${map.port}`}
                               className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[8px] rounded uppercase disabled:opacity-50"
                               title="Take control of this port"
                             >
                               Adopt
                             </button>
                           )}
                           <button
                             onClick={() => handleKill(map.port)}
                             disabled={actionLoading === `kill-${map.port}`}
                             className="p-1.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-500 transition-colors"
                             title="Kill Process"
                           >
                             {actionLoading === `kill-${map.port}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded flex items-start space-x-2">
             <ShieldAlert size={14} className="text-amber-500/60 mt-0.5 shrink-0" />
             <p className="text-[9px] leading-tight text-amber-600/70 font-bold">
                Traffic Audit Note: Only authorized ingress ports should be exposed to public gateway protocols.
             </p>
          </div>
        </section>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded flex items-center justify-between text-xs font-bold">
          <div className="flex items-center space-x-2">
             <ShieldAlert size={16} />
             <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded"><X size={14} /></button>
        </div>
      )}

      {/* Adopt Modal */}
      {confirmAdoptPort && (
        <ConfirmModal
          title="Take Control of Port"
          message={`Would you like to bring the process on port ${confirmAdoptPort.port} (${confirmAdoptPort.processName}) under LikeVercel management? This will restart the process under PM2.`}
          confirmLabel="Take Control"
          onConfirm={confirmAdopt}
          onCancel={() => setConfirmAdoptPort(null)}
        />
      )}
    </div>
  );
};

export default PortManager;
