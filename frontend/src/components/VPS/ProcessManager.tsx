import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Trash2,
  ScrollText,
  Plus,
  X,
  Loader2,
  Rocket,
  ChevronDown,
  Clock,
  FolderOpen,
  ExternalLink,
  Search,
  Activity,
  Filter,
  Maximize2
} from 'lucide-react';
import api from '../../utils/api';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../context/ToastContext';

interface Deployment {
  id: string;
  vpsId: string;
  projectPath: string;
  processName: string;
  port: number;
  status: string;
  startedAt: string | null;
  stoppedAt: string | null;
  createdAt: string;
  actualStatus?: string;
  cpu?: number;
  memory?: number;
  projectType?: string;
  url?: string;
}

interface UnmanagedProcess {
  processName: string;
  status: string;
  cpu: number;
  memory: number;
  pm_id?: number;
  port?: number;
  pid?: number;
  type?: 'pm2' | 'port';
}

interface ProcessManagerProps {
  vpsId: string;
}

interface DeployRequest {
  projectPath: string;
  port?: number;
  command?: string;
  processName?: string;
}

function getStatusClasses(status: string): string {
  switch (status) {
    case 'online':
    case 'running':
      return 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20';
    case 'stopping':
    case 'launching':
      return 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20';
    case 'errored':
      return 'bg-[#f97386]/10 text-[#f97386] border-[#f97386]/30';
    default:
      return 'bg-[#11244c] text-[#6475a1] border-[#6475a1]/10';
  }
}

function getDotColor(status: string): string {
  switch (status) {
    case 'online':
    case 'running':
      return 'bg-[#10b981]';
    case 'stopping':
    case 'launching':
      return 'bg-[#f59e0b]';
    default:
      return 'bg-[#f97386]';
  }
}

const ProcessManager: React.FC<ProcessManagerProps> = ({ vpsId }) => {
  const { showToast } = useToast();
  const logBodyRef = useRef<HTMLDivElement>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [unmanaged, setUnmanaged] = useState<UnmanagedProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logModal, setLogModal] = useState<{ id: string; name: string; logs: string } | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployForm, setDeployForm] = useState({ projectPath: '', port: '', command: '', processName: '' });
  const [deploying, setDeploying] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isFetching = useRef(false);

  const fetchProcesses = useCallback(async (silent = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/vps/${vpsId}/processes`);
      setDeployments(data.processes);
      setUnmanaged(data.unmanagedProcesses || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load processes');
    } finally {
      if (!silent) setLoading(false);
      isFetching.current = false;
    }
  }, [vpsId]);

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(() => fetchProcesses(true), 15000);
    return () => clearInterval(interval);
  }, [fetchProcesses]);

  const handleDeploy = async () => {
    if (!deployForm.projectPath.trim()) return;
    setDeploying(true);
    setError('');
    try {
      const body: DeployRequest = { projectPath: deployForm.projectPath };
      if (deployForm.port) body.port = parseInt(deployForm.port);
      if (deployForm.command) body.command = deployForm.command;
      if (deployForm.processName) body.processName = deployForm.processName;

      await api.post(`/vps/${vpsId}/processes/start`, body);
      setShowDeploy(false);
      setDeployForm({ projectPath: '', port: '', command: '', processName: '' });
      setShowAdvanced(false);
      fetchProcesses();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  const handleAction = async (deploymentId: string, action: 'stop' | 'restart' | 'delete') => {
    if (action === 'delete') {
      setConfirmDeleteId(deploymentId);
      return;
    }
    setActionLoading(`${deploymentId}-${action}`);
    try {
      await api.post(`/vps/${vpsId}/processes/${deploymentId}/${action}`);
      showToast(`Process ${action}ed`, 'success');
      fetchProcesses();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDeleteDeployment = async () => {
    if (!confirmDeleteId) return;
    setActionLoading(`${confirmDeleteId}-delete`);
    try {
      await api.delete(`/vps/${vpsId}/processes/${confirmDeleteId}`);
      showToast('Deployment removed', 'success');
      fetchProcesses();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to delete');
    } finally {
      setActionLoading(null);
      setConfirmDeleteId(null);
    }
  };

  const handleViewLogs = async (deploymentId: string, processName: string) => {
    setLogLoading(true);
    setLogModal({ id: deploymentId, name: processName, logs: '' });
    try {
      const { data } = await api.get(`/vps/${vpsId}/processes/${deploymentId}/logs`, {
        params: { lines: 200 },
      });
      setLogModal({ id: deploymentId, name: processName, logs: data.logs });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setLogModal({ id: deploymentId, name: processName, logs: `Error loading logs: ${error.response?.data?.error || error.message}` });
    } finally {
      setLogLoading(false);
    }
  };

  const handleAdopt = async (proc: UnmanagedProcess) => {
    const actionKey = proc.pm_id ? `adopt-${proc.pm_id}` : `adopt-${proc.port}`;
    setActionLoading(actionKey);
    try {
      await api.post(`/vps/${vpsId}/processes/adopt`, {
        pm_id: proc.pm_id,
        processName: proc.processName,
        port: proc.port,
        pid: proc.pid,
        type: proc.type,
      });
      showToast('Process adopted successfully', 'success');
      fetchProcesses();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || 'Adoption failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (logBodyRef.current && logModal?.logs) {
      logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
    }
  }, [logModal?.logs]);

  const filteredDeployments = deployments.filter(d => 
    d.processName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.projectPath.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUnmanaged = useMemo(() =>
    unmanaged.filter(p =>
      p.processName.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [unmanaged, searchTerm]
  );

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6475a1] group-focus-within:text-[#137fec] transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Filter processes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a1836]/40 backdrop-blur-md border border-[#6475a1]/10 rounded-xl pl-10 pr-4 py-2 text-[10px] text-[#dee5ff] outline-none focus:border-[#137fec]/30 transition-all font-black uppercase tracking-widest placeholder:text-[#6475a1]/50"
          />
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button className="p-2 text-[#6475a1] hover:text-[#137fec] transition-colors">
            <Filter size={18} />
          </button>
          <button 
            onClick={() => setShowDeploy(true)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-[#137fec] hover:bg-[#1d6fee] text-white text-[10px] font-black rounded-xl shadow-xl shadow-[#137fec]/20 active:scale-95 border border-[#137fec]/20 uppercase tracking-widest"
          >
            <Plus size={16} />
            <span>New App</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#f97386]/10 border border-[#f97386]/20 text-[#f97386] rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-3">
            <X size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-[#f97386]/20 rounded transition-all">
            <X size={14} />
          </button>
        </div>
      )}

      {showDeploy && (
        <div className="p-6 bg-[#0a1836] backdrop-blur-md border border-[#137fec]/20 rounded-2xl space-y-6 animate-in zoom-in-95 duration-200 shadow-2xl premium-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Rocket className="text-[#137fec]" size={20} />
              <h4 className="font-black text-[#dee5ff] uppercase tracking-[0.2em] text-[11px]">Initialize Deploy</h4>
            </div>
            <button onClick={() => setShowDeploy(false)} className="text-[#6475a1] hover:text-[#dee5ff] transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-black text-[#6475a1] mb-2 uppercase tracking-[0.2em]">Target Path</label>
              <div className="relative">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6475a1]/50" size={16} />
                <input
                  placeholder="/var/www/buffer-cluster"
                  value={deployForm.projectPath}
                  onChange={(e) => setDeployForm({ ...deployForm, projectPath: e.target.value })}
                  className="w-full bg-[#060e20]/60 border border-[#6475a1]/10 rounded-xl pl-10 pr-4 py-3 text-[10px] text-[#dee5ff] outline-none focus:border-[#137fec]/50 transition-all font-mono uppercase tracking-widest placeholder:text-[#6475a1]/30"
                />
              </div>
            </div>

            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-[9px] font-black text-[#6475a1] hover:text-[#dee5ff] transition-colors uppercase tracking-[0.2em]"
            >
              <ChevronDown size={14} className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
              <span>Advanced Protocol</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-[9px] font-black text-[#6475a1] mb-2 uppercase tracking-[0.2em]">Binding Port</label>
                  <input
                    placeholder="Auto"
                    type="number"
                    value={deployForm.port}
                    onChange={(e) => setDeployForm({ ...deployForm, port: e.target.value })}
                    className="w-full bg-[#060e20]/60 border border-[#6475a1]/10 rounded-xl px-4 py-3 text-[10px] text-[#dee5ff] outline-none focus:border-[#137fec]/50 transition-all font-mono uppercase tracking-widest placeholder:text-[#6475a1]/30"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-[#6475a1] mb-2 uppercase tracking-[0.2em]">Entry Call</label>
                  <input
                    placeholder="e.g. npm start"
                    value={deployForm.command}
                    onChange={(e) => setDeployForm({ ...deployForm, command: e.target.value })}
                    className="w-full bg-[#060e20]/60 border border-[#6475a1]/10 rounded-xl px-4 py-3 text-[10px] text-[#dee5ff] outline-none focus:border-[#137fec]/50 transition-all font-mono uppercase tracking-widest placeholder:text-[#6475a1]/30"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-black text-[#6475a1] mb-2 uppercase tracking-[0.2em]">Process Identifier (Optional)</label>
                  <input
                    placeholder="e.g. cluster-api"
                    value={deployForm.processName}
                    onChange={(e) => setDeployForm({ ...deployForm, processName: e.target.value })}
                    className="w-full bg-[#060e20]/60 border border-[#6475a1]/10 rounded-xl px-4 py-3 text-[10px] text-[#dee5ff] outline-none focus:border-[#137fec]/50 transition-all font-mono uppercase tracking-widest placeholder:text-[#6475a1]/30"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button onClick={() => setShowDeploy(false)} className="px-6 py-2 text-[#6475a1] hover:text-[#dee5ff] font-black text-[10px] transition-colors uppercase tracking-widest">Discard</button>
            <button 
              onClick={handleDeploy} 
              disabled={deploying || !deployForm.projectPath.trim()}
              className="px-8 py-2.5 bg-[#137fec] hover:bg-[#1d6fee] text-white font-black rounded-xl shadow-xl shadow-[#137fec]/20 text-[10px] transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              {deploying ? <Loader2 size={16} className="animate-spin" /> : 'Launch'}
            </button>
          </div>
        </div>
      )}

      {/* Deployments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 animate-pulse">
            <Loader2 size={48} className="text-[#137fec] animate-spin mb-6 opacity-30" />
            <span className="text-[#6475a1] font-black uppercase tracking-[0.3em] text-[9px]">Analyzing Workload Clusters...</span>
          </div>
        ) : (
          <>
            {filteredDeployments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 border border-dashed border-[#6475a1]/20 rounded-[32px] bg-[#0a1836]/20">
                <div className="p-6 bg-[#0a1836] rounded-full mb-6 border border-[#6475a1]/10">
                  <Rocket size={48} className="text-[#6475a1]/20" />
                </div>
                <h3 className="text-lg font-black text-[#dee5ff] mb-2 tracking-tight uppercase">No Active Deploys</h3>
                <p className="text-[#6475a1] text-center max-w-sm mb-10 text-[10px] font-black uppercase tracking-widest leading-relaxed">Initialize application clusters on target host to begin orchestration.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredDeployments.map((dep) => {
                  const status = dep.actualStatus || dep.status;
                  const isOnline = status === 'online' || status === 'running';
                  
                  return (
                    <div key={dep.id} className="group premium-card bg-[#0a1836]/40 backdrop-blur-md rounded-[22px] sm:rounded-[24px] border border-[#6475a1]/10 hover:border-[#137fec]/30 transition-all duration-300 overflow-hidden shadow-xl">
                      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
                        <div className="flex items-center space-x-4">
                          <div className={`p-4 rounded-2xl ${isOnline ? 'bg-[#137fec] text-white shadow-[0_0_20px_rgba(19,127,236,0.3)]' : 'bg-[#11244c] text-[#6475a1]'} transition-all shadow-inner border border-[#137fec]/10`}>
                             <Activity size={24} className={isOnline ? 'animate-pulse' : ''} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-3 mb-1.5">
                              <h5 className="font-black text-[#dee5ff] truncate max-w-[150px] sm:max-w-xs tracking-[0.1em] text-[11px] uppercase">{dep.processName}</h5>
                              <div className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border ${getStatusClasses(status)} shadow-sm`}>
                                 <div className={`h-1.5 w-1.5 rounded-full ${getDotColor(status)} ${isOnline ? 'animate-pulse shadow-[0_0_8px_currentColor]' : ''}`} />
                                 <span className="text-[9px] font-black uppercase tracking-widest">{status}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 text-[9px] font-black text-[#6475a1] tracking-[0.1em] uppercase">
                               <span className="flex items-center space-x-2"><FolderOpen size={10} className="text-[#137fec]" /> <span className="truncate max-w-[150px]">{dep.projectPath}</span></span>
                               <span className="flex items-center space-x-2"><ExternalLink size={10} className="text-[#137fec]" /> <span>Port: {dep.port}</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap gap-y-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0">
                          <button
                            onClick={() => handleViewLogs(dep.id, dep.processName)}
                            className="p-3 bg-[#11244c] hover:bg-[#137fec]/10 text-[#6475a1] hover:text-[#137fec] rounded-xl transition-all border border-[#6475a1]/10"
                            title="View Logs"
                          >
                            <ScrollText size={18} />
                          </button>
                          
                          {!isOnline ? (
                            <button
                              onClick={() => handleAction(dep.id, 'restart')}
                              className="p-3 bg-[#10b981] text-white hover:bg-[#059669] rounded-xl transition-all shadow-lg shadow-[#10b981]/10"
                              disabled={actionLoading === `${dep.id}-restart`}
                            >
                              {actionLoading === `${dep.id}-restart` ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleAction(dep.id, 'restart')}
                                className="p-3 bg-[#11244c] hover:bg-[#137fec]/10 text-[#6475a1] hover:text-[#137fec] rounded-xl transition-all border border-[#6475a1]/10"
                                disabled={actionLoading === `${dep.id}-restart`}
                                title="Restart"
                              >
                                {actionLoading === `${dep.id}-restart` ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                              </button>
                              <button
                                onClick={() => handleAction(dep.id, 'stop')}
                                className="p-3 bg-[#f97386]/10 hover:bg-[#f97386] hover:text-white text-[#f97386] rounded-xl transition-all border border-[#f97386]/20"
                                disabled={actionLoading === `${dep.id}-stop`}
                                title="Stop"
                              >
                                {actionLoading === `${dep.id}-stop` ? <Loader2 size={18} className="animate-spin" /> : <Square size={18} fill="currentColor" />}
                              </button>
                            </>
                          )}

                          <div className="w-px h-6 bg-[#6475a1]/10 mx-1" />

                          <button
                            onClick={() => handleAction(dep.id, 'delete')}
                            className="p-3 bg-[#11244c] hover:bg-[#f97386] hover:text-white text-[#6475a1] rounded-xl transition-all border border-[#6475a1]/10"
                            disabled={actionLoading === `${dep.id}-delete`}
                          >
                            {actionLoading === `${dep.id}-delete` ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Unmanaged Processes - Outside the managed deployments check */}
            {filteredUnmanaged.length > 0 && (
              <>
                <div className="flex items-center space-x-3 mt-12 mb-6 px-2">
                  <Activity className="text-[#f59e0b]" size={18} />
                  <h3 className="text-[10px] font-black text-[#6475a1] tracking-[0.2em] uppercase">External Workloads detected</h3>
                </div>
                {filteredUnmanaged.map((proc) => (
                  <div key={proc.pm_id || `port-${proc.port}`} className="group premium-card bg-[#0a1836]/40 backdrop-blur-md rounded-[22px] sm:rounded-[24px] border border-[#6475a1]/10 bg-[#f59e0b]/[0.02] hover:border-[#f59e0b]/30 transition-all duration-300 overflow-hidden shadow-xl">
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
                      <div className="flex items-center space-x-4">
                        <div className={`p-4 rounded-2xl ${proc.type === 'port' ? 'bg-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-[#6366f1] shadow-[0_0_20px_rgba(99,102,241,0.2)]'} text-white transition-all shadow-inner border border-[#dee5ff]/10`}>
                          <Activity size={24} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-3 mb-1.5">
                            <h5 className="font-black text-[#dee5ff] tracking-[0.1em] text-[11px] uppercase">{proc.processName}</h5>
                            <div className="px-2.5 py-0.5 rounded-full border bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b] text-[9px] font-black uppercase tracking-widest">
                               {proc.type === 'port' ? 'RAW PORT' : 'UNMANAGED'}
                            </div>
                          </div>
                          <p className="text-[9px] font-black text-[#6475a1] tracking-[0.1em] uppercase flex items-center space-x-2">
                             <span className={`h-1.5 w-1.5 rounded-full ${proc.status === 'online' || proc.status === 'running' ? 'bg-[#10b981]' : 'bg-[#f97386]'}`} />
                             <span>Status: {proc.status}</span>
                             <span className="opacity-20">/</span>
                             <span>{proc.pm_id ? `PM2 ID: ${proc.pm_id}` : `PORT: ${proc.port}`}</span>
                          </p>
                        </div>
                      </div>

                      <button 
                       onClick={() => handleAdopt(proc)}
                       disabled={actionLoading === (proc.pm_id ? `adopt-${proc.pm_id}` : `adopt-${proc.port}`)}
                       className="px-6 py-2.5 bg-[#137fec] hover:bg-[#1d6fee] text-white font-black text-[10px] rounded-xl transition-all border border-[#137fec]/20 shadow-xl shadow-[#137fec]/20 uppercase tracking-widest disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        {actionLoading === (proc.pm_id ? `adopt-${proc.pm_id}` : `adopt-${proc.port}`) ? <Loader2 size={14} className="animate-spin" /> : <span>Take Control</span>}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Log Modal */}
      {logModal && (
        <div className="fixed inset-0 bg-[#060e20]/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300" onClick={() => setLogModal(null)}>
          <div className="bg-[#0a1836] w-full max-w-5xl h-full max-h-[85vh] rounded-[32px] border border-[#6475a1]/20 flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#6475a1]/10 flex items-center justify-between bg-[#11244c]/40 rounded-t-[32px]">
              <div>
                <div className="flex items-center space-x-2 text-[#6475a1] text-[9px] font-black uppercase tracking-[0.2em] mb-1">
                  <ScrollText size={14} className="text-[#137fec]" />
                  <span>Interactive Cluster Stream</span>
                </div>
                <h3 className="text-lg font-black text-[#dee5ff] uppercase tracking-tight">{logModal.name}</h3>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => handleViewLogs(logModal.id, logModal.name)}
                  className="p-2.5 bg-[#11244c] hover:bg-[#137fec]/10 text-[#6475a1] hover:text-[#137fec] rounded-xl transition-all border border-[#6475a1]/10"
                >
                  <RotateCcw size={20} className={logLoading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => setLogModal(null)}
                  className="p-2.5 bg-[#11244c] hover:bg-[#f97386] text-[#6475a1] hover:text-white rounded-xl transition-all shadow-lg border border-[#6475a1]/10"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div ref={logBodyRef} className="flex-1 bg-black/40 p-8 overflow-auto no-scrollbar font-mono text-[11px] leading-relaxed text-[#dee5ff]/80 selection:bg-[#137fec]/30">
               {logLoading ? (
                 <div className="h-full flex flex-col items-center justify-center space-y-4">
                   <Loader2 size={48} className="text-[#137fec] animate-spin opacity-30" />
                   <p className="text-[#6475a1] font-black uppercase tracking-[0.3em] text-[9px]">Ingesting Stream Buffer...</p>
                 </div>
               ) : (
                 <pre className="whitespace-pre-wrap break-all uppercase tracking-tight">
                   {logModal.logs || 'No active buffer output detected for this process.'}
                 </pre>
               )}
            </div>

            <div className="p-5 border-t border-[#6475a1]/10 bg-[#11244c]/40 flex items-center justify-between px-8 rounded-b-[32px]">
               <div className="flex items-center space-x-3 text-[9px] font-black text-[#6475a1] uppercase tracking-[0.2em]">
                  <Clock size={14} className="text-[#137fec]" />
                  <span>Last Sync: {new Date().toLocaleTimeString()}</span>
               </div>
               <button className="flex items-center space-x-2 text-[9px] font-black text-[#137fec]/80 uppercase tracking-widest hover:text-[#137fec] transition-colors">
                  <Maximize2 size={14} />
                  <span>Full Stack View</span>
               </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Delete Deployment Modal */}
      {confirmDeleteId && (
        <ConfirmModal
          title="Delete Deployment"
          message="Remove this PM2 process permanently? The app will stop and the managed entry will be deleted."
          confirmLabel="Delete"
          danger
          onConfirm={confirmDeleteDeployment}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
};

export default ProcessManager;
