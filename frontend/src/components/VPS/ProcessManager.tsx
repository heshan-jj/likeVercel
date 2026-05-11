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
import Button from '../UI/Button';
import Input from '../UI/Input';
import Card from '../UI/Card';
import Badge from '../UI/Badge';

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
  let variant: 'emerald' | 'blue' | 'amber' | 'rose' | 'gray' = 'gray';
  switch (status) {
    case 'online':
    case 'running':
      variant = 'emerald';
      break;
    case 'stopping':
    case 'launching':
      variant = 'amber';
      break;
    case 'errored':
      variant = 'rose';
      break;
  }
  return (
    <div className="flex items-center space-x-2">
      <div className={`h-1.5 w-1.5 rounded-full ${variant === 'emerald' ? 'bg-emerald-500' : variant === 'amber' ? 'bg-amber-500' : variant === 'rose' ? 'bg-red-500' : 'bg-gray-500'} ${variant === 'emerald' ? 'animate-pulse' : ''}`} />
      <span className={`text-[10px] font-semibold tracking-tight ${variant === 'emerald' ? 'text-emerald-500' : variant === 'amber' ? 'text-amber-500' : variant === 'rose' ? 'text-red-500' : 'text-text-muted'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}

const ProcessManager: React.FC<ProcessManagerProps> = ({ vpsId }) => {
  const { showToast } = useToast();
  const logBodyRef = useRef<HTMLDivElement>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [unmanaged, setUnmanaged] = useState<UnmanagedProcess[]>([]);
  const [pm2Installed, setPm2Installed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logModal, setLogModal] = useState<{ id: string; name: string; logs: string } | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployForm, setDeployForm] = useState({ projectPath: '', port: '', command: '', processName: '' });
  const [deploying, setDeploying] = useState(false);
  const [installingPm2, setInstallingPm2] = useState(false);
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
      setPm2Installed(data.pm2Installed);
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

  const handleInstallPm2 = async () => {
    setInstallingPm2(true);
    setError('');
    try {
      await api.post(`/vps/${vpsId}/install-pm2`);
      showToast('PM2 installed successfully', 'success');
      fetchProcesses();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'PM2 installation failed');
    } finally {
      setInstallingPm2(false);
    }
  };

  const handleDeploy = async () => {
    if (!deployForm.projectPath.trim()) return;
    setDeploying(true);
    setError('');
    try {
      let projectPath = deployForm.projectPath.trim();
      // Ensure absolute path
      if (!projectPath.startsWith('/')) {
        projectPath = '/' + projectPath;
      }

      const body: DeployRequest = { projectPath };
      if (deployForm.port) body.port = parseInt(deployForm.port);
      if (deployForm.command) body.command = deployForm.command;
      if (deployForm.processName) body.processName = deployForm.processName;

      await api.post(`/vps/${vpsId}/processes/start`, body);
      setShowDeploy(false);
      setDeployForm({ projectPath: '', port: '', command: '', processName: '' });
      fetchProcesses();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string, details?: any[] } } };
      const data = error.response?.data;
      
      if (data?.details && Array.isArray(data.details)) {
        const messages = data.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ');
        setError(`Validation failed: ${messages}`);
      } else {
        setError(data?.error || 'Deployment failed');
      }
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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input 
            type="text" 
            placeholder="Search active clusters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-secondary border border-border-light rounded-lg pl-9 pr-4 py-2 text-xs text-text-primary outline-none focus:border-blue-500/50 shadow-sm"
          />
        </div>
        <Button 
          onClick={() => setShowDeploy(true)}
          size="sm"
          className="px-5 h-9"
        >
          <Plus size={16} className="mr-1.5" />
          <span>Provision Deployment</span>
        </Button>
      </div>

      {!pm2Installed && (
        <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-600">
              <Activity size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-700 tracking-tight">PM2 Runtime Not Detected</h4>
              <p className="text-[11px] text-amber-600/80 font-medium">PM2 is required for managed process orchestration, auto-restarts, and log streaming.</p>
            </div>
          </div>
          <Button 
            onClick={handleInstallPm2} 
            isLoading={installingPm2}
            variant="secondary"
            className="bg-amber-500 hover:bg-amber-600 text-white border-none px-6 h-10 shadow-lg shadow-amber-500/20"
          >
            <Plus size={16} className="mr-2" />
            <span>Install PM2 Globally</span>
          </Button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm">
          <div className="flex items-center space-x-3">
            <X size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {showDeploy && (
        <Card className="p-6 space-y-6" glass>
          <div className="flex items-center justify-between border-b border-border-light/60 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 shadow-inner">
                <Rocket size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-text-primary text-sm tracking-tight">Establish New Workload</h4>
                <p className="text-[11px] text-text-muted font-medium">Deploy an application to the current host</p>
              </div>
            </div>
            <button onClick={() => setShowDeploy(false)} className="p-1.5 text-text-muted hover:text-text-primary transition-all">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Host Filepath"
              placeholder="/var/www/app"
              value={deployForm.projectPath}
              onChange={(e) => setDeployForm({ ...deployForm, projectPath: e.target.value })}
              className="font-mono text-[11px]"
            />
            <Input
              label="Process Identifier (Alias)"
              placeholder="my-production-app"
              value={deployForm.processName}
              onChange={(e) => setDeployForm({ ...deployForm, processName: e.target.value })}
              className="font-mono text-[11px]"
            />
            <Input
              label="Ingress Port"
              placeholder="3000"
              type="number"
              value={deployForm.port}
              onChange={(e) => setDeployForm({ ...deployForm, port: e.target.value })}
              className="font-mono text-[11px]"
            />
            <Input
              label="Runtime Execution Command"
              placeholder="npm start"
              value={deployForm.command}
              onChange={(e) => setDeployForm({ ...deployForm, command: e.target.value })}
              className="font-mono text-[11px]"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="ghost" onClick={() => setShowDeploy(false)} size="sm">Cancel</Button>
            <Button 
              onClick={handleDeploy} 
              disabled={deploying || !deployForm.projectPath.trim()}
              isLoading={deploying}
              size="sm"
              className="px-8"
            >
              Execute Deployment
            </Button>
          </div>
        </Card>
      )}

      {/* Deployments Table */}
      <div className="flex-1 overflow-auto border border-border-light rounded-xl bg-bg-secondary/40 shadow-sm shadow-black/[0.02]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-light bg-bg-tertiary/20 backdrop-blur-sm">
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight">Node Integrity</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight">Identity</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight hidden md:table-cell">Target Path</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight">Port</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight text-right">Cluster Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center">
                    <Loader2 size={32} className="text-blue-500 animate-spin mb-4 opacity-80" />
                    <span className="text-[11px] font-semibold text-text-muted">Pulling workload telemetry...</span>
                  </div>
                </td>
              </tr>
            ) : filteredDeployments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center text-text-muted">
                  <Activity size={40} className="mx-auto opacity-10 mb-4" />
                  <p className="text-[11px] font-medium">No active managed deployments detected</p>
                </td>
              </tr>
            ) : (
              filteredDeployments.map((dep) => {
                const status = dep.actualStatus || dep.status;
                const isOnline = status === 'online' || status === 'running';
                
                return (
                  <tr key={dep.id} className="hover:bg-bg-tertiary/20 transition-colors group">
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      {getStatusBadge(status)}
                    </td>
                    <td className="px-5 py-2.5">
                       <span className="text-xs font-semibold text-text-primary group-hover:text-blue-500 transition-colors">{dep.processName}</span>
                    </td>
                    <td className="px-5 py-2.5 text-text-muted text-[11px] font-mono truncate max-w-[200px] hidden md:table-cell" title={dep.projectPath}>
                      {dep.projectPath}
                    </td>
                    <td className="px-5 py-2.5 text-text-muted text-[11px] font-mono">
                      {dep.port ? (
                        <span className="px-2 py-0.5 bg-blue-500/5 text-blue-500 border border-blue-500/10 rounded-md font-bold">{dep.port}</span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleViewLogs(dep.id, dep.processName)}
                          className="p-2 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-blue-500 transition-colors border border-transparent hover:border-border-light shadow-sm"
                          title="View Logs"
                        >
                          <ScrollText size={16} />
                        </button>
                        <button
                          onClick={() => handleViewEnv(dep)}
                          className="p-2 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-blue-500 transition-colors border border-transparent hover:border-border-light shadow-sm"
                          title="Configuration"
                        >
                          <SlidersHorizontal size={16} />
                        </button>
                        
                        <div className="w-px h-4 bg-border-light mx-2 opacity-50" />

                        {isOnline ? (
                          <>
                            <button
                              onClick={() => handleAction(dep.id, 'restart')}
                              className="p-2 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-amber-500 transition-colors border border-transparent hover:border-border-light shadow-sm"
                              disabled={actionLoading === `${dep.id}-restart`}
                              title="Restart"
                            >
                              {actionLoading === `${dep.id}-restart` ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                            </button>
                            <button
                              onClick={() => handleAction(dep.id, 'stop')}
                              className="p-2 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-red-500 transition-colors border border-transparent hover:border-border-light shadow-sm"
                              disabled={actionLoading === `${dep.id}-stop`}
                              title="Stop"
                            >
                              {actionLoading === `${dep.id}-stop` ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAction(dep.id, 'restart')}
                            className="p-2 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-emerald-500 transition-colors border border-transparent hover:border-border-light shadow-sm"
                            disabled={actionLoading === `${dep.id}-restart`}
                            title="Start"
                          >
                            {actionLoading === `${dep.id}-restart` ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                          </button>
                        )}

                        <button
                          onClick={() => handleAction(dep.id, 'delete')}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-500 transition-colors border border-transparent hover:border-red-500/20 shadow-sm"
                          disabled={actionLoading === `${dep.id}-delete`}
                          title="Purge"
                        >
                          {actionLoading === `${dep.id}-delete` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
        <div className="mt-8 space-y-3">
          <div className="flex items-center space-x-2 px-1">
            <Activity size={14} className="text-amber-500" />
            <h3 className="text-[11px] font-semibold text-amber-500 tracking-tight">Unmanaged Workloads Detected</h3>
          </div>
          <div className="overflow-hidden border border-amber-500/10 rounded-xl bg-amber-500/[0.02]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-500/10 bg-amber-500/5">
                  <th className="px-5 py-3 text-[10px] font-semibold text-amber-700 tracking-tight">Status</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-amber-700 tracking-tight">Identity</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-amber-700 tracking-tight">Type</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-amber-700 tracking-tight">Protocol</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-amber-700 tracking-tight text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {filteredUnmanaged.map((proc) => {
                  const actionKey = proc.pm_id !== undefined ? `adopt-${proc.pm_id}` : `adopt-${proc.processName}`;
                  return (
                    <tr key={proc.pm_id || `port-${proc.port}-${proc.pid}`} className="hover:bg-amber-500/5 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        {getStatusBadge(proc.status)}
                      </td>
                      <td className="px-5 py-3">
                         <span className="text-[11px] font-semibold text-text-primary">{proc.processName}</span>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="gray" className="font-mono text-[9px] px-2">{proc.type || 'unknown'}</Badge>
                      </td>
                      <td className="px-5 py-3 text-text-muted text-[11px] font-mono">
                        {proc.pm_id !== undefined ? `PM2:${proc.pm_id}` : proc.port ? `TCP:${proc.port}` : proc.pid ? `PID:${proc.pid}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button 
                          onClick={() => handleAdopt(proc)}
                          disabled={actionLoading === actionKey}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[10px] rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-6" onClick={() => !envModal.saving && setEnvModal(null)}>
          <div className="bg-bg-secondary/95 backdrop-blur-xl w-full max-w-2xl max-h-[85vh] rounded-[2rem] border border-border-light flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border-light/60 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                 <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500 shadow-inner">
                    <SlidersHorizontal size={22} />
                 </div>
                 <div>
                    <h3 className="text-lg font-semibold text-text-primary tracking-tight">Node Environment: {envModal.name}</h3>
                    <p className="text-[11px] text-text-muted font-mono">{envModal.path}/.env</p>
                 </div>
              </div>
              <button onClick={() => !envModal.saving && setEnvModal(null)} className="p-2 text-text-muted hover:text-text-primary transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {envModal.loading ? (
                <div className="h-48 flex flex-col items-center justify-center space-y-3">
                  <Loader2 size={32} className="text-blue-500 animate-spin opacity-60" />
                  <p className="text-text-muted font-semibold text-[11px]">Syncing environment data...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-3 mb-2">
                    <span className="text-[11px] font-semibold text-text-muted">Configuration Key</span>
                    <span className="text-[11px] font-semibold text-text-muted">Encrypted Value</span>
                  </div>

                  {Object.entries(envModal.vars).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                      <input
                        className="bg-bg-primary/40 border border-border-light rounded-lg px-3 py-2 text-[11px] font-mono text-text-primary outline-none focus:border-blue-500 shadow-inner"
                        defaultValue={key}
                        onBlur={(e) => {
                          if (e.target.value !== key) handleEnvChange(e.target.value, value, key);
                        }}
                        spellCheck={false}
                      />
                      <input
                        className="bg-bg-primary/40 border border-border-light rounded-lg px-3 py-2 text-[11px] font-mono text-text-primary outline-none focus:border-blue-500 shadow-inner"
                        value={value}
                        onChange={(e) => handleEnvChange(key, e.target.value)}
                        spellCheck={false}
                      />
                      <button
                        onClick={() => handleEnvDelete(key)}
                        className="p-2 text-text-muted hover:text-red-500 transition-colors hover:bg-red-500/5 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleEnvAddRow}
                    className="w-full mt-4 py-3 border border-dashed border-border-light hover:border-blue-500/40 hover:bg-blue-500/[0.02] rounded-xl text-[11px] font-semibold text-text-muted hover:text-blue-500 transition-all flex items-center justify-center space-x-2 group"
                  >
                    <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                    <span>Provision New Variable</span>
                  </button>
                </div>
              )}
            </div>

            {!envModal.loading && (
              <div className="p-6 border-t border-border-light/60 flex items-center justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => handleSaveEnv(false)}
                  disabled={envModal.saving}
                  isLoading={envModal.saving}
                  className="px-6"
                >
                  <Save size={14} className="mr-2" />
                  <span>Persist Only</span>
                </Button>
                <Button
                  onClick={() => handleSaveEnv(true)}
                  disabled={envModal.saving}
                  isLoading={envModal.saving}
                  className="px-8 shadow-blue-600/20"
                >
                  <RotateCcw size={14} className="mr-2" />
                  <span>Persist & Hot Reload</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-6" onClick={() => setLogModal(null)}>
          <div className="bg-bg-secondary/95 backdrop-blur-xl w-full max-w-5xl h-full max-h-[85vh] rounded-[2rem] border border-border-light flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border-light/60 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500 shadow-inner">
                   <ScrollText size={22} />
                </div>
                <div>
                   <h3 className="text-lg font-semibold text-text-primary tracking-tight">Host Logs: {logModal.name}</h3>
                   <p className="text-[11px] text-text-muted font-medium opacity-60">Real-time STDOUT/STDERR telemetry</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => handleViewLogs(logModal.id, logModal.name)}
                  className="p-2.5 hover:bg-bg-tertiary rounded-xl text-text-muted hover:text-blue-500 border border-transparent hover:border-border-light shadow-sm transition-all"
                  title="Refresh Log Stream"
                >
                  <RotateCcw size={18} className={logLoading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => setLogModal(null)}
                  className="p-2.5 hover:bg-red-500/10 hover:text-red-500 rounded-xl text-text-muted transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div ref={logBodyRef} className="flex-1 bg-[#09090b] p-6 overflow-auto font-mono text-[12px] leading-relaxed text-slate-300 selection:bg-blue-500/30 custom-scrollbar shadow-inner">
               {logLoading ? (
                 <div className="h-full flex flex-col items-center justify-center space-y-4">
                   <Loader2 size={40} className="text-blue-500 animate-spin opacity-40" />
                   <p className="text-text-muted font-semibold text-[11px] tracking-widest uppercase opacity-40">Streaming Data...</p>
                 </div>
               ) : (
                 <pre className="whitespace-pre-wrap break-all antialiased">
                   {logModal.logs || 'No log output detected from this node cluster.'}
                 </pre>
               )}
            </div>

            <div className="p-4 border-t border-border-light/60 flex items-center justify-between px-8 bg-bg-primary/40">
               <div className="flex items-center space-x-2 text-[10px] font-semibold text-text-muted">
                  <Clock size={14} className="opacity-50" />
                  <span>Telemetry Timestamp: {new Date().toLocaleTimeString()}</span>
               </div>
               <div className="flex items-center space-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-500 tracking-wider">LIVE FEED</span>
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
