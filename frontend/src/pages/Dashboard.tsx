import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server,
  Zap,
  LayoutGrid,
  List,
  X,
  Search,
  RefreshCw,
  Power,
  Plus
} from 'lucide-react';
import api from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import MetricCard from '../components/Dashboard/MetricCard';
import VpsListView from '../components/Dashboard/VpsListView';
import VpsGridView from '../components/Dashboard/VpsGridView';
import Skeleton from '../components/Skeleton';
import Logo from '../components/Logo';

interface VPSProfile {
  id: string;
  name: string;
  host: string;
  username: string;
  port: number;
  authType: string;
  isConnected: boolean;
  region?: string;
}

interface ServerSpecs {
  os: string;
  cpu: string;
  ram: string;
  disk: string;
  cpuLoad?: number;
  region?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<VPSProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [specs, setSpecs] = useState<Record<string, ServerSpecs>>({});
  const [fetchingSpecs, setFetchingSpecs] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('dashboardViewMode') as 'grid' | 'list') || 'list';
  });
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  
  // New Filter & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name');
  const [refreshing, setRefreshing] = useState(false);
  const [connectingAll, setConnectingAll] = useState(false);

  const profilesRef = useRef<VPSProfile[]>([]);

  useEffect(() => {
    fetchProfiles();
    const specInterval = setInterval(() => {
      profilesRef.current.filter(p => p.isConnected).forEach(p => fetchSpecs(p.id));
    }, 30_000);
    return () => clearInterval(specInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep ref in sync with state so the interval always sees the latest profiles
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('dashboardViewMode', viewMode);
  }, [viewMode]);

  const fetchProfiles = async () => {
    try {
      const { data } = await api.get('/vps');
      setProfiles(data.profiles);
      profilesRef.current = data.profiles;
      data.profiles.forEach((p: VPSProfile) => {
        if (p.isConnected) fetchSpecs(p.id);
      });
    } catch {
      setError('Failed to load infrastructure nodes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchProfiles();
  };

  const fetchSpecs = async (id: string) => {
    setFetchingSpecs(prev => new Set(prev).add(id));
    try {
      // Get static hardware specs
      const { data: specsData } = await api.get(`/vps/${id}/specs`);
      
      // Get real-time usage (CPU/RAM %)
      try {
        const { data: usageData } = await api.get(`/vps/${id}/usage`);
        setSpecs(prev => ({ 
          ...prev, 
          [id]: { ...specsData, cpuLoad: usageData.cpu } 
        }));
      } catch {
        // Fallback if usage fails but specs worked
        setSpecs(prev => ({ ...prev, [id]: { ...specsData, cpuLoad: 0 } }));
      }
    } catch (err: unknown) {
      console.error('Failed to fetch node specs', err);
    } finally {
      setFetchingSpecs(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleConnect = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnecting(id);
    // Optimistic UI: Set isConnected to true in the local profiles state
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, isConnected: true } : p));
    
    try {
      await api.post(`/vps/${id}/connect`);
      showToast('Server connected successfully', 'success');
      // No need to fetchProfiles() immediately if we trust the change, 
      // but we do it to ensure DB consistency
      await fetchProfiles();
    } catch (err: unknown) {
      // Rollback on error
      const serverName = profiles.find(p => p.id === id)?.name || 'Node';
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, isConnected: false } : p));
      const error = err as { response?: { data?: { error?: string } } };
      const reason = error.response?.data?.error || 'Connection timed out or refused';
      setError(`Rollback: Connection to "${serverName}" failed. Your view was reverted to the last known state. Reason: ${reason}`);
      showToast(`${serverName} connection failed`, 'error');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic UI: Set isConnected to false locally
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, isConnected: false } : p));
    
    try {
      await api.post(`/vps/${id}/disconnect`);
      showToast('Server disconnected', 'info');
      await fetchProfiles();
    } catch (err: unknown) {
      // Rollback on error
      const serverName = profiles.find(p => p.id === id)?.name || 'Node';
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, isConnected: true } : p));
      const error = err as { response?: { data?: { error?: string } } };
      const reason = error.response?.data?.error || 'Unexpected error occurred';
      setError(`Rollback: Disconnect from "${serverName}" failed. Your view was reverted. Reason: ${reason}`);
      showToast(`${serverName} disconnect failed`, 'error');
    }
  };

  const handleConnectAll = async () => {
    const offlineProfiles = filteredProfiles.filter(p => !p.isConnected);
    if (offlineProfiles.length === 0) return;

    setConnectingAll(true);
    
    // Optimistic UI
    setProfiles(prev => prev.map(p => 
      offlineProfiles.some(op => op.id === p.id) ? { ...p, isConnected: true } : p
    ));

    try {
      await Promise.allSettled(
        offlineProfiles.map(p => api.post(`/vps/${p.id}/connect`))
      );
      showToast(`Attempted to connect ${offlineProfiles.length} servers`, 'info');
      await fetchProfiles();
    } catch (err) {
      console.error(err);
      setError('Bulk connection encountered errors');
      await fetchProfiles(); // Revert optimistic UI on error
    } finally {
      setConnectingAll(false);
    }
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({ id, name });
  };

  const confirmDeleteServer = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/vps/${confirmDelete.id}`);
      showToast(`"${confirmDelete.name}" removed`, 'success');
      fetchProfiles();
    } catch {
      setError('Decommission failed');
    } finally {
      setConfirmDelete(null);
    }
  };

  // Derived State: Filter and Sort
  const filteredProfiles = profiles
    .filter(p => {
      // Search
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.host.toLowerCase().includes(searchTerm.toLowerCase());
      // Filter
      const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'online' && p.isConnected) || 
                            (statusFilter === 'offline' && !p.isConnected);
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        // Sort by status: Online first, then offline
        if (a.isConnected === b.isConnected) {
           return a.name.localeCompare(b.name);
        }
        return a.isConnected ? -1 : 1;
      }
    });

  if (loading) return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="" value="" sub="" icon={null} color="blue" isLoading />
        <MetricCard label="" value="" sub="" icon={null} color="emerald" isLoading />
        <MetricCard label="" value="" sub="" icon={null} color="red" isLoading />
      </section>
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 bg-[#060e20] min-h-screen text-[#dee5ff]">
      {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
           <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-[0.4em] text-[#137fec] mb-1">
                 <div className="h-1 w-8 bg-[#137fec] rounded-full" />
                 <span>VPS Overview</span>
              </div>
              <h1 className="text-4xl font-black text-[#dee5ff] tracking-tight mb-1 uppercase">Servers</h1>
           </div>
           
           <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/vps/add')}
                className="flex items-center space-x-2 px-6 py-3.5 bg-[#137fec] hover:bg-[#1d6fee] text-white font-black text-[10px] rounded-2xl border border-[#137fec]/30 shadow-xl shadow-[#137fec]/20 transition-all active:scale-95 group uppercase tracking-widest"
              >
                <Plus size={16} />
                <span>Add new server</span>
              </button>
              <div className="p-3 bg-[#0a1836] rounded-2xl border border-[#6475a1]/10 shadow-lg hidden sm:block">
                 <Logo size={28} />
              </div>
           </div>
        </div>

      {error && (
        <div className="flex items-center justify-between p-4 bg-[#f97386]/10 text-[#f97386] border border-[#f97386]/20 rounded-2xl animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-3 text-sm font-bold">
            <X size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-[#f97386]/10 rounded-lg text-[#f97386]"><X size={14}/></button>
        </div>
      )}

      {/* Metrics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          label="Total Servers" 
          value={profiles.length} 
          sub="ALL REGIONS" 
          icon={<Server size={20} />} 
          color="blue" 
          onClick={() => setStatusFilter('all')}
          active={statusFilter === 'all'}
        />
        <MetricCard 
          label="Online Nodes" 
          value={profiles.filter(p => p.isConnected).length} 
          sub="ACTIVE" 
          icon={<Zap size={20} />} 
          color="emerald" 
          onClick={() => setStatusFilter('online')}
          active={statusFilter === 'online'}
        />
        <MetricCard 
          label="Offline Nodes" 
          value={profiles.filter(p => !p.isConnected).length} 
          sub="CRITICAL" 
          icon={<X size={20} />} 
          color="red" 
          onClick={() => setStatusFilter('offline')}
          active={statusFilter === 'offline'}
        />
      </section>

      {/* Active Instances Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-black text-[#dee5ff] tracking-tight">Active Instances</h2>
            {statusFilter !== 'all' && (
              <span className="px-2.5 py-1 bg-[#11244c] text-[#137fec] text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center space-x-1">
                <span>{statusFilter}</span>
                <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-[#f97386]"><X size={12} /></button>
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6475a1] group-focus-within:text-[#137fec] transition-colors" />
              <input 
                type="text" 
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 bg-[#0a1836] border border-[#6475a1]/10 rounded-xl pl-9 pr-4 py-2 text-xs text-[#dee5ff] outline-none focus:border-[#137fec]/30 transition-all font-bold placeholder:text-[#6475a1]/50 shadow-sm"
              />
            </div>

            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'status')}
              className="bg-[#0a1836] border border-[#6475a1]/10 rounded-xl px-3 py-2 text-xs font-bold text-[#99aad9] outline-none focus:border-[#137fec]/30 shadow-sm appearance-none cursor-pointer"
            >
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
            </select>

            {filteredProfiles.some(p => !p.isConnected) && (
              <button 
                onClick={handleConnectAll}
                disabled={connectingAll}
                className="flex items-center space-x-1 px-3 py-2 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981] hover:text-white rounded-xl text-xs font-bold transition-all border border-[#10b981]/20 disabled:opacity-50"
              >
                <Power size={14} />
                <span className="hidden sm:inline">{connectingAll ? 'Connecting...' : 'Connect All'}</span>
              </button>
            )}

            <button 
              onClick={handleManualRefresh}
              className="p-2 text-[#99aad9] hover:text-[#137fec] bg-[#0a1836] border border-[#6475a1]/10 rounded-xl shadow-sm transition-all text-xs font-bold"
              title="Refresh servers"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>

            <div className="flex bg-[#11244c]/40 p-1 rounded-2xl border border-[#6475a1]/10">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-[#137fec] shadow-[0_4px_15px_rgba(19,127,236,0.3)] text-white border border-[#137fec]/20' : 'text-[#6475a1] hover:text-[#99aad9]'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-[#137fec] shadow-[0_4px_15px_rgba(19,127,236,0.3)] text-white border border-[#137fec]/20' : 'text-[#6475a1] hover:text-[#99aad9]'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="p-12 text-center bg-[#0a1836]/30 border border-[#6475a1]/10 border-dashed rounded-[24px]">
             <p className="text-[#6475a1] font-bold tracking-widest uppercase text-xs">No clusters detected</p>
          </div>
        ) : viewMode === 'list' ? (
          <VpsListView 
            profiles={filteredProfiles}
            specs={specs}
            fetchingSpecs={fetchingSpecs}
            connecting={connecting}
            onNavigate={(id) => navigate(`/vps/${id}`)}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <VpsGridView 
            profiles={filteredProfiles}
            specs={specs}
            fetchingSpecs={fetchingSpecs}
            connecting={connecting}
            onNavigate={(id) => navigate(`/vps/${id}`)}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onDelete={handleDelete}
          />
        )}
      </section>

      {confirmDelete && (
        <ConfirmModal
          title="Decommission Node"
          message={`Permanently remove "${confirmDelete.name}"? This will delete all connection data.`}
          confirmLabel="Decommission"
          danger
          onConfirm={confirmDeleteServer}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;

