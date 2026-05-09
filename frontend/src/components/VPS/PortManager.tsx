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
import Button from '../UI/Button';
import Input from '../UI/Input';
import Card from '../UI/Card';
import Badge from '../UI/Badge';

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
    <div className="flex flex-col space-y-8">
      {/* Port Checker Card */}
      <Card className="p-6 space-y-6" glass>
         <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 shadow-inner">
               <ShieldCheck size={18} />
            </div>
            <div>
               <h3 className="text-sm font-semibold text-text-primary tracking-tight">Security Port Auditor</h3>
               <p className="text-[11px] text-text-muted font-medium">Verify socket availability on the host</p>
            </div>
         </div>

         <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 w-full sm:max-w-xs">
               <Input
                type="number"
                placeholder="Ex. 8080"
                value={checkPort}
                onChange={(e) => setCheckPort(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckPort()}
                className="font-mono"
                icon={<Settings size={14} />}
              />
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
               <Button 
                  onClick={handleCheckPort} 
                  disabled={checking || !checkPort}
                  isLoading={checking}
                  size="sm"
                  className="px-6 h-9"
               >
                  <Search size={14} className="mr-1.5" />
                  <span>Execute Scan</span>
               </Button>
               <Button 
                  variant="secondary"
                  onClick={fetchPorts}
                  size="sm"
                  className="h-9 w-9 p-0"
               >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
               </Button>
            </div>
         </div>

         {checkResult && (
           <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-semibold animate-in slide-in-from-top-2 duration-300 ${
             checkResult.available 
             ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
             : 'bg-red-500/10 border-red-500/20 text-red-600'
           }`}>
             {checkResult.available ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
             <span>{checkResult.message}</span>
           </div>
         )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Managed Ports Section */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 px-1">
             <Activity size={14} className="text-emerald-500" />
             <h3 className="text-[11px] font-semibold text-text-secondary tracking-tight">Active Application Sockets</h3>
          </div>
          
          <div className="border border-border-light rounded-xl bg-bg-secondary/40 overflow-hidden shadow-sm shadow-black/[0.01]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-light bg-bg-tertiary/20">
                  <th className="px-4 py-3 text-[10px] font-semibold text-text-muted tracking-tight">Process Context</th>
                  <th className="px-4 py-3 text-[10px] font-semibold text-text-muted tracking-tight">Endpoint</th>
                  <th className="px-4 py-3 text-[10px] font-semibold text-text-muted tracking-tight text-right">Gateway</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/60">
                {managedPorts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-text-muted">
                       <p className="text-[11px] font-medium opacity-60">No active endpoint maps</p>
                    </td>
                  </tr>
                ) : (
                  managedPorts.map((mp) => (
                    <tr key={mp.port} className="hover:bg-bg-tertiary/20 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-text-primary group-hover:text-blue-500 transition-colors">{mp.processName}</span>
                          <span className="text-[10px] font-mono text-text-muted truncate max-w-[150px] opacity-60">{mp.projectPath}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="emerald" className="font-mono text-[9px] px-2 font-bold tracking-widest">
                          TCP:{mp.port}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a 
                          href={mp.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex p-2 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-emerald-500 transition-all border border-transparent hover:border-border-light shadow-sm"
                        >
                          <ArrowUpRight size={16} />
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
        <section className="space-y-3">
          <div className="flex items-center space-x-2 px-1">
             <Settings size={14} className="text-amber-500" />
             <h3 className="text-[11px] font-semibold text-text-secondary tracking-tight">Host Listener Topology</h3>
          </div>
          
          <div className="border border-border-light rounded-xl bg-bg-secondary/40 overflow-hidden shadow-sm shadow-black/[0.01]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-light bg-bg-tertiary/20">
                  <th className="px-4 py-3 text-[10px] font-semibold text-text-muted tracking-tight">Identifier</th>
                  <th className="px-4 py-3 text-[10px] font-semibold text-text-muted tracking-tight">Process State</th>
                  <th className="px-4 py-3 text-[10px] font-semibold text-text-muted tracking-tight text-right">Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/60">
                {activePortsMap.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-text-muted">
                       <p className="text-[11px] font-medium opacity-60">No host listeners detected</p>
                    </td>
                  </tr>
                ) : (
                  activePortsMap.map((map, idx) => (
                    <tr key={`${map.port}-${idx}`} className="hover:bg-bg-tertiary/20 transition-colors group">
                      <td className="px-4 py-3">
                         <Badge variant="amber" className="font-mono text-[9px] px-2 font-bold tracking-widest uppercase">
                           PORT:{map.port}
                         </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                           <span className="text-xs font-semibold text-text-primary truncate max-w-[150px]">{map.processName}</span>
                           <span className="text-[10px] font-mono text-text-muted opacity-60">PID:{map.pid || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                           {/* Only offer adoption if not already managed */}
                           {!managedPorts.some(mp => mp.port === map.port) && (
                             <button
                               onClick={() => handleAdopt(map)}
                               disabled={actionLoading === `adopt-${map.port}`}
                               className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[9px] rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
                               title="Assume management"
                             >
                               Adopt
                             </button>
                           )}
                           <button
                             onClick={() => handleKill(map.port)}
                             disabled={actionLoading === `kill-${map.port}`}
                             className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-500 transition-colors border border-transparent hover:border-red-500/20 shadow-sm"
                             title="Terminate Signal"
                           >
                             {actionLoading === `kill-${map.port}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-amber-500/[0.03] border border-amber-500/10 rounded-xl flex items-start space-x-3">
             <ShieldAlert size={16} className="text-amber-600/50 shrink-0 mt-0.5" />
             <p className="text-[11px] leading-relaxed text-amber-700 font-medium">
                Node Ingress: Direct host exposure should only be permitted for authorized bridge protocols and gateway sockets.
             </p>
          </div>
        </section>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-3">
             <ShieldAlert size={16} />
             <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded"><X size={16} /></button>
        </div>
      )}

      {/* Adopt Modal */}
      {confirmAdoptPort && (
        <ConfirmModal
          title="Assumption of Command"
          message={`Integrate the process on port ${confirmAdoptPort.port} (${confirmAdoptPort.processName}) into the management cluster? This will cycle the process under PM2 supervision.`}
          confirmLabel="Assume Command"
          onConfirm={confirmAdopt}
          onCancel={() => setConfirmAdoptPort(null)}
        />
      )}
    </div>
  );
};

export default PortManager;
