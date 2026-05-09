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
  Clock,
  Search,
  Activity,
  SlidersHorizontal,
  Save
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
  type?: 'pm2' | 'port' | 'systemctl';
  description?: string;
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

function getStatusBadge(status: string): React.ReactNode {
  let colorClass = 'bg-gray-500';
  switch (status) {
    case 'online':
    case 'running':
      colorClass = 'bg-emerald-500';
      break;
    case 'stopping':
    case 'launching':
      colorClass = 'bg-amber-500';
      break;
    case 'errored':
      colorClass = 'bg-red-500';
      break;
  }
  return (
    <div className="flex items-center space-x-2">
      <div className={`h-2 w-2 rounded-full ${colorClass}`} />
      <span className="text-[10px] font-bold uppercase tracking-tight">{status}</span>
    </div>
  );
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
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmAdoptProc, setConfirmAdoptProc] = useState<UnmanagedProcess | null>(null);

  // Env Vars modal state
  interface EnvModalState {
    id: string;
    name: string;
    path: string;
    vars: Record<string, string>;
    loading: boolean;
    saving: boolean;
  }
  const [envModal, setEnvModal] = useState<EnvModalState | null>(null);

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

  const handleAdopt = (proc: UnmanagedProcess) => {
    setConfirmAdoptProc(proc);
  };

  const confirmAdopt = async () => {
    if (!confirmAdoptProc) return;
    const proc = confirmAdoptProc;
    const actionKey = proc.pm_id !== undefined ? `adopt-${proc.pm_id}` : `adopt-${proc.processName}`;
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
      setConfirmAdoptProc(null);
      fetchProcesses();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || 'Adoption failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewEnv = async (dep: Deployment) => {
    setEnvModal({ id: dep.id, name: dep.processName, path: dep.projectPath, vars: {}, loading: true, saving: false });
    try {
      const { data } = await api.get(`/vps/${vpsId}/env`, { params: { path: dep.projectPath } });
      setEnvModal(prev => prev ? { ...prev, vars: data.env, loading: false } : null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      showToast(e.response?.data?.error || 'Failed to load .env file', 'error');
      setEnvModal(null);
    }
  };

  const handleSaveEnv = async (restart: boolean) => {
    if (!envModal) return;
    setEnvModal(prev => prev ? { ...prev, saving: true } : null);
    try {
      await api.put(`/vps/${vpsId}/env`, { env: envModal.vars }, { params: { path: envModal.path } });
      showToast('.env file saved', 'success');
      if (restart) {
        await api.post(`/vps/${vpsId}/processes/${envModal.id}/restart`);
        showToast('Process restarted to apply changes', 'success');
        fetchProcesses();
      }
      setEnvModal(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      showToast(e.response?.data?.error || 'Failed to save .env file', 'error');
      setEnvModal(prev => prev ? { ...prev, saving: false } : null);
    }
  };

  const handleEnvChange = (key: string, value: string, oldKey?: string) => {
    if (!envModal) return;
    const next = { ...envModal.vars };
    if (oldKey && oldKey !== key) {
      delete next[oldKey];
    }
    next[key] = value;
    setEnvModal(prev => prev ? { ...prev, vars: next } : null);
  };

  const handleEnvDelete = (key: string) => {
    if (!envModal) return;
    const next = { ...envModal.vars };
    delete next[key];
    setEnvModal(prev => prev ? { ...prev, vars: next } : null);
  };

  const handleEnvAddRow = () => {
    if (!envModal) return;
    // Find a unique placeholder key
    let i = 1;
    while (`NEW_VAR_${i}` in envModal.vars) i++;
    handleEnvChange(`NEW_VAR_${i}`, '');
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
    <div className="flex flex-col h-full space-y-4">
      {/* Search and Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input 
            type="text" 
            placeholder="Search processes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-secondary border border-border-light rounded-md pl-8 pr-3 py-1.5 text-xs text-text-primary outline-none focus:border-blue-500/50"
          />
        </div>
        <button 
          onClick={() => setShowDeploy(true)}
          className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded"
        >
          <Plus size={14} />
          <span>New App</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <X size={14} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded">
            <X size={12} />
          </button>
        </div>
      )}

      {showDeploy && (
        <div className="p-4 bg-bg-secondary border border-blue-500/20 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-border-light pb-2">
            <div className="flex items-center space-x-2">
              <Rocket className="text-blue-500" size={16} />
              <h4 className="font-bold text-text-primary text-xs">Deploy New Application</h4>
            </div>
            <button onClick={() => setShowDeploy(false)} className="text-text-muted hover:text-text-primary">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">Target Path</label>
              <input
                placeholder="/var/www/app"
                value={deployForm.projectPath}
                onChange={(e) => setDeployForm({ ...deployForm, projectPath: e.target.value })}
                className="w-full bg-bg-primary border border-border-light rounded px-3 py-2 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">Process Name (Optional)</label>
              <input
                placeholder="my-app"
                value={deployForm.processName}
                onChange={(e) => setDeployForm({ ...deployForm, processName: e.target.value })}
                className="w-full bg-bg-primary border border-border-light rounded px-3 py-2 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">Port (Optional)</label>
              <input
                placeholder="3000"
                type="number"
                value={deployForm.port}
                onChange={(e) => setDeployForm({ ...deployForm, port: e.target.value })}
                className="w-full bg-bg-primary border border-border-light rounded px-3 py-2 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">Start Command (Optional)</label>
              <input
                placeholder="npm start"
                value={deployForm.command}
                onChange={(e) => setDeployForm({ ...deployForm, command: e.target.value })}
                className="w-full bg-bg-primary border border-border-light rounded px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button onClick={() => setShowDeploy(false)} className="px-4 py-1.5 text-text-muted hover:text-text-primary text-xs font-bold">Cancel</button>
            <button 
              onClick={handleDeploy} 
              disabled={deploying || !deployForm.projectPath.trim()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs disabled:opacity-50"
            >
              {deploying ? <Loader2 size={14} className="animate-spin" /> : 'Deploy'}
            </button>
          </div>
        </div>
      )}

      {/* Deployments Table */}
      <div className="flex-1 overflow-auto border border-border-light rounded-lg bg-bg-secondary/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-light bg-bg-tertiary/50">
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase">Status</th>
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase">Name</th>
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase">Path</th>
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase">Port</th>
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <div className="flex flex-col items-center">
                    <Loader2 size={24} className="text-blue-500 animate-spin mb-2" />
                    <span className="text-[10px] font-bold text-text-muted uppercase">Loading workloads...</span>
                  </div>
                </td>
              </tr>
            ) : filteredDeployments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-text-muted text-xs">
                  No active deployments found.
                </td>
              </tr>
            ) : (
              filteredDeployments.map((dep) => {
                const status = dep.actualStatus || dep.status;
                const isOnline = status === 'online' || status === 'running';
                
                return (
                  <tr key={dep.id} className="hover:bg-bg-tertiary/30 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap">
                      {getStatusBadge(status)}
                    </td>
                    <td className="px-4 py-2 font-bold text-text-primary text-xs">
                      {dep.processName}
                    </td>
                    <td className="px-4 py-2 text-text-muted text-xs font-mono truncate max-w-[200px]" title={dep.projectPath}>
                      {dep.projectPath}
                    </td>
                    <td className="px-4 py-2 text-text-muted text-xs">
                      {dep.port || '-'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleViewLogs(dep.id, dep.processName)}
                          className="p-1.5 hover:bg-bg-tertiary rounded text-text-muted hover:text-text-primary transition-colors"
                          title="View Logs"
                        >
                          <ScrollText size={14} />
                        </button>
                        <button
                          onClick={() => handleViewEnv(dep)}
                          className="p-1.5 hover:bg-bg-tertiary rounded text-text-muted hover:text-text-primary transition-colors"
                          title="Env Vars"
                        >
                          <SlidersHorizontal size={14} />
                        </button>
                        
                        <div className="w-px h-3 bg-border-light mx-1" />

                        {isOnline ? (
                          <>
                            <button
                              onClick={() => handleAction(dep.id, 'restart')}
                              className="p-1.5 hover:bg-bg-tertiary rounded text-text-muted hover:text-amber-500 transition-colors"
                              disabled={actionLoading === `${dep.id}-restart`}
                              title="Restart"
                            >
                              {actionLoading === `${dep.id}-restart` ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                            </button>
                            <button
                              onClick={() => handleAction(dep.id, 'stop')}
                              className="p-1.5 hover:bg-bg-tertiary rounded text-text-muted hover:text-red-500 transition-colors"
                              disabled={actionLoading === `${dep.id}-stop`}
                              title="Stop"
                            >
                              {actionLoading === `${dep.id}-stop` ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAction(dep.id, 'restart')}
                            className="p-1.5 hover:bg-bg-tertiary rounded text-text-muted hover:text-emerald-500 transition-colors"
                            disabled={actionLoading === `${dep.id}-restart`}
                            title="Start"
                          >
                            {actionLoading === `${dep.id}-restart` ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                          </button>
                        )}

                        <button
                          onClick={() => handleAction(dep.id, 'delete')}
                          className="p-1.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-500 transition-colors"
                          disabled={actionLoading === `${dep.id}-delete`}
                          title="Delete"
                        >
                          {actionLoading === `${dep.id}-delete` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Unmanaged Processes Table */}
      {filteredUnmanaged.length > 0 && (
        <div className="mt-8 space-y-2">
          <div className="flex items-center space-x-2 px-1 text-amber-500">
            <Activity size={14} />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Unmanaged Workloads Detected</h3>
          </div>
          <div className="overflow-auto border border-amber-500/20 rounded-lg bg-amber-500/[0.02]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-500/10 bg-amber-500/5">
                  <th className="px-4 py-2 text-[10px] font-bold text-amber-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-amber-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-amber-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-amber-500 uppercase">Identifier</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-amber-500 uppercase">Description</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-amber-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {filteredUnmanaged.map((proc) => {
                  const actionKey = proc.pm_id !== undefined ? `adopt-${proc.pm_id}` : `adopt-${proc.processName}`;
                  return (
                    <tr key={proc.pm_id || `port-${proc.port}-${proc.pid}`} className="hover:bg-amber-500/5 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap">
                        {getStatusBadge(proc.status)}
                      </td>
                      <td className="px-4 py-2 font-bold text-text-primary text-xs">
                        {proc.processName}
                      </td>
                      <td className="px-4 py-2 text-text-muted text-xs font-mono uppercase">
                        {proc.type || 'unknown'}
                      </td>
                      <td className="px-4 py-2 text-text-muted text-xs font-mono">
                        {proc.pm_id !== undefined ? `PM2:${proc.pm_id}` : proc.port ? `PORT:${proc.port}` : proc.pid ? `PID:${proc.pid}` : '-'}
                      </td>
                      <td className="px-4 py-2 text-text-muted text-[10px] italic truncate max-w-[150px]">
                        {proc.description || '-'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button 
                          onClick={() => handleAdopt(proc)}
                          disabled={actionLoading === actionKey}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-white font-bold text-[10px] rounded uppercase disabled:opacity-50"
                        >
                          {actionLoading === actionKey ? <Loader2 size={12} className="animate-spin" /> : 'Adopt'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Env Vars Modal */}
      {envModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => !envModal.saving && setEnvModal(null)}>
          <div className="bg-bg-primary w-full max-w-2xl max-h-[85vh] rounded-lg border border-border-light flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border-light flex items-center justify-between bg-bg-secondary rounded-t-lg">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Environment Variables: {envModal.name}</h3>
                <p className="text-[10px] text-text-muted font-mono">{envModal.path}/.env</p>
              </div>
              <button onClick={() => !envModal.saving && setEnvModal(null)} className="p-1.5 hover:bg-bg-tertiary rounded">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {envModal.loading ? (
                <div className="h-48 flex flex-col items-center justify-center space-y-2">
                  <Loader2 size={24} className="text-blue-500 animate-spin" />
                  <p className="text-text-muted font-bold uppercase text-[10px]">Loading .env...</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-2 mb-1">
                    <span className="text-[9px] font-bold uppercase text-text-muted">Key</span>
                    <span className="text-[9px] font-bold uppercase text-text-muted">Value</span>
                  </div>

                  {Object.entries(envModal.vars).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center group">
                      <input
                        className="bg-bg-secondary border border-border-light rounded px-2 py-1.5 text-xs font-mono text-text-primary outline-none focus:border-blue-500"
                        defaultValue={key}
                        onBlur={(e) => {
                          if (e.target.value !== key) handleEnvChange(e.target.value, value, key);
                        }}
                        spellCheck={false}
                      />
                      <input
                        className="bg-bg-secondary border border-border-light rounded px-2 py-1.5 text-xs font-mono text-text-primary outline-none focus:border-blue-500"
                        value={value}
                        onChange={(e) => handleEnvChange(key, e.target.value)}
                        spellCheck={false}
                      />
                      <button
                        onClick={() => handleEnvDelete(key)}
                        className="p-1.5 text-text-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleEnvAddRow}
                    className="w-full mt-2 py-2 border border-dashed border-border-light hover:border-blue-500/40 rounded text-[10px] font-bold text-text-muted hover:text-blue-400 transition-all flex items-center justify-center space-x-2"
                  >
                    <Plus size={12} />
                    <span>Add Variable</span>
                  </button>
                </div>
              )}
            </div>

            {!envModal.loading && (
              <div className="p-4 border-t border-border-light bg-bg-secondary rounded-b-lg flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleSaveEnv(false)}
                  disabled={envModal.saving}
                  className="px-4 py-1.5 bg-bg-tertiary hover:bg-bg-tertiary/70 text-text-secondary font-bold rounded text-xs border border-border-light disabled:opacity-50 flex items-center space-x-2"
                >
                  {envModal.saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  <span>Save Only</span>
                </button>
                <button
                  onClick={() => handleSaveEnv(true)}
                  disabled={envModal.saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs disabled:opacity-50 flex items-center space-x-2"
                >
                  {envModal.saving ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                  <span>Save & Restart</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setLogModal(null)}>
          <div className="bg-bg-primary w-full max-w-5xl h-full max-h-[80vh] rounded-lg border border-border-light flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border-light flex items-center justify-between bg-bg-secondary">
              <div className="flex items-center space-x-2">
                <ScrollText size={16} className="text-blue-500" />
                <h3 className="text-sm font-bold text-text-primary">Process Logs: {logModal.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleViewLogs(logModal.id, logModal.name)}
                  className="p-1.5 hover:bg-bg-tertiary rounded text-text-muted"
                >
                  <RotateCcw size={16} className={logLoading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => setLogModal(null)}
                  className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded text-text-muted"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <div ref={logBodyRef} className="flex-1 bg-[#0c0c0c] p-4 overflow-auto font-mono text-[11px] leading-relaxed text-gray-300 selection:bg-blue-500/30">
               {logLoading ? (
                 <div className="h-full flex flex-col items-center justify-center space-y-2">
                   <Loader2 size={32} className="text-blue-500 animate-spin opacity-50" />
                   <p className="text-text-muted font-bold uppercase text-[10px]">Fetching logs...</p>
                 </div>
               ) : (
                 <pre className="whitespace-pre-wrap break-all">
                   {logModal.logs || 'No log output detected.'}
                 </pre>
               )}
            </div>

            <div className="p-3 border-t border-border-light bg-bg-secondary flex items-center justify-between px-4">
               <div className="flex items-center space-x-2 text-[10px] font-bold text-text-muted uppercase">
                  <Clock size={12} />
                  <span>Last Refresh: {new Date().toLocaleTimeString()}</span>
               </div>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Action Modals */}
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
      {confirmAdoptProc && (
        <ConfirmModal
          title="Take Control"
          message={
            confirmAdoptProc?.type === 'systemctl'
              ? `Adopting a systemctl service (${confirmAdoptProc?.processName}) is currently not natively supported. Would you like to stop the service and restart it under PM2 manually?`
              : confirmAdoptProc?.type === 'port' 
              ? `Adopting this raw port process requires RESTARTING it under PM2 management. A brief outage will occur. Are you sure you want to take control of ${confirmAdoptProc?.processName}?`
              : `Bring this existing PM2 process (${confirmAdoptProc?.processName}) under LikeVercel management?`
          }
          confirmLabel="Take Control"
          onConfirm={confirmAdopt}
          onCancel={() => setConfirmAdoptProc(null)}
        />
      )}
    </div>
  );
};

export default ProcessManager;
