import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server,
  Zap,
  LayoutGrid,
  List,
  X,
  Search,
  RefreshCw,
  Power
} from 'lucide-react';
import api from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import { useInfrastructure } from '../hooks/useInfrastructure';
import type { VPSProfile } from '../context/VpsContext';
import Skeleton from '../components/Skeleton';
import MetricCard from '../components/Dashboard/MetricCard';
import VpsListView from '../components/Dashboard/VpsListView';
import VpsGridView from '../components/Dashboard/VpsGridView';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { 
    profiles, 
    specs, 
    fetchingSpecs, 
    loading, 
    error: infrastructureError, 
    refreshProfiles, 
    setProfiles
  } = useInfrastructure(15000);

  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('dashboardViewMode') as 'grid' | 'list') || 'list';
  });
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name');
  const [refreshing, setRefreshing] = useState(false);
  const [connectingAll, setConnectingAll] = useState(false);

  useEffect(() => {
    localStorage.setItem('dashboardViewMode', viewMode);
  }, [viewMode]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    refreshProfiles().finally(() => setRefreshing(false));
  };

  const handleConnect = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnecting(id);
    setProfiles((prev: VPSProfile[]) => prev.map((p: VPSProfile) => p.id === id ? { ...p, isConnected: true } : p));
    
    try {
      await api.post(`/vps/${id}/connect`);
      showToast('Server connected', 'success');
      await refreshProfiles();
    } catch (err: unknown) {
      setProfiles((prev: VPSProfile[]) => prev.map((p: VPSProfile) => p.id === id ? { ...p, isConnected: false } : p));
      const error = err as { response?: { data?: { error?: string } } };
      setError(`Connection failed: ${error.response?.data?.error || ''}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProfiles((prev: VPSProfile[]) => prev.map((p: VPSProfile) => p.id === id ? { ...p, isConnected: false } : p));
    
    try {
      await api.post(`/vps/${id}/disconnect`);
      showToast('Server disconnected', 'info');
      await refreshProfiles();
    } catch (err: unknown) {
      setProfiles((prev: VPSProfile[]) => prev.map((p: VPSProfile) => p.id === id ? { ...p, isConnected: true } : p));
      const error = err as { response?: { data?: { error?: string } } };
      setError(`Disconnect failed: ${error.response?.data?.error || ''}`);
    }
  };

  const handleConnectAll = async () => {
    const offlineProfiles = filteredProfiles.filter((p: VPSProfile) => !p.isConnected);
    if (offlineProfiles.length === 0) return;

    setConnectingAll(true);
    setProfiles((prev: VPSProfile[]) => prev.map((p: VPSProfile) => 
      offlineProfiles.some((op: VPSProfile) => op.id === p.id) ? { ...p, isConnected: true } : p
    ));

    try {
      await Promise.allSettled(offlineProfiles.map((p: VPSProfile) => api.post(`/vps/${p.id}/connect`)));
      showToast(`Bulk connection triggered`, 'info');
      await refreshProfiles();
    } catch {
      setError('Bulk connection encountered errors');
      await refreshProfiles();
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
      refreshProfiles();
    } catch {
      setError('Decommission failed');
    } finally {
      setConfirmDelete(null);
    }
  };

  const filteredProfiles = profiles
    .filter((p: VPSProfile) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.host.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'online' && p.isConnected) || 
                            (statusFilter === 'offline' && !p.isConnected);
      return matchesSearch && matchesStatus;
    })
    .sort((a: VPSProfile, b: VPSProfile) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (a.isConnected === b.isConnected) return a.name.localeCompare(b.name);
      return a.isConnected ? -1 : 1;
    });

  if (loading) return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8">
      <div>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-3 w-48" />
      </div>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <MetricCard key={i} label="" value="" sub="" icon={<Server/>} color="blue" isLoading />)}
      </section>
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded" />)}
        </div>
      </div>
    </div>
  );

  const displayError = error || infrastructureError;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight uppercase">Infrastructure Overview</h1>
        <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-60">Real-time status of global cluster state</p>
      </div>

      {displayError && (
        <div className="flex items-center justify-between p-3 bg-red-500/10 text-red-600 border border-red-500/20 rounded shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-tight">
            <X size={14} />
            <span>{displayError}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded"><X size={12}/></button>
        </div>
      )}

      {/* Metrics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          label="Total Instances" 
          value={profiles.length} 
          sub="CLUSTER" 
          icon={<Server size={18} />} 
          color="blue" 
          onClick={() => setStatusFilter('all')}
          active={statusFilter === 'all'}
        />
        <MetricCard 
          label="Active Nodes" 
          value={profiles.filter((p: VPSProfile) => p.isConnected).length} 
          sub="STABLE" 
          icon={<Zap size={18} />} 
          color="emerald" 
          onClick={() => setStatusFilter('online')}
          active={statusFilter === 'online'}
        />
        <MetricCard 
          label="Idle / Offline" 
          value={profiles.filter((p: VPSProfile) => !p.isConnected).length} 
          sub="ACTION REQ." 
          icon={<X size={18} />} 
          color="red" 
          onClick={() => setStatusFilter('offline')}
          active={statusFilter === 'offline'}
        />
      </section>

      {/* Active Instances Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Active Instances</h2>
            {statusFilter !== 'all' && (
              <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${
                statusFilter === 'online' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'
              }`}>
                <span>{statusFilter}</span>
                <button onClick={() => setStatusFilter('all')} className="hover:opacity-50"><X size={10} /></button>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Input 
              placeholder="Filter nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={14} />}
              className="w-full sm:w-40 !py-1.5 text-xs"
            />

            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'status')}
              className="bg-bg-secondary border border-border-light rounded px-3 py-1.5 text-[10px] font-bold text-text-secondary outline-none focus:border-blue-500 shadow-sm appearance-none cursor-pointer uppercase tracking-wider"
            >
              <option value="name">Sort: Name</option>
              <option value="status">Sort: Status</option>
            </select>

            {filteredProfiles.some((p: VPSProfile) => !p.isConnected) && (
              <Button 
                variant="success"
                size="sm"
                onClick={handleConnectAll}
                isLoading={connectingAll}
                className="space-x-1 uppercase text-[10px]"
              >
                <Power size={12} />
                <span className="hidden sm:inline">Initialize All</span>
              </Button>
            )}

            <Button 
              variant="outline"
              size="icon"
              onClick={handleManualRefresh}
              className="h-8 w-8"
              title="Refresh servers"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </Button>

            <div className="flex bg-bg-tertiary p-1 rounded">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded transition-all ${viewMode === 'grid' ? 'bg-bg-secondary shadow-sm text-blue-500' : 'text-text-muted hover:text-text-primary'}`}
              >
                <LayoutGrid size={14} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1 rounded transition-all ${viewMode === 'list' ? 'bg-bg-secondary shadow-sm text-blue-500' : 'text-text-muted hover:text-text-primary'}`}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border-light rounded bg-bg-secondary/10">
             <p className="text-text-muted font-bold tracking-widest uppercase text-[10px]">No infrastructure nodes detected</p>
          </div>
        ) : viewMode === 'list' ? (
          <VpsListView 
            profiles={filteredProfiles}
            specs={specs}
            fetchingSpecs={fetchingSpecs}
            connecting={connecting}
            onNavigate={(id: string) => navigate(`/vps/${id}`)}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <VpsGridView 
            profiles={filteredProfiles}
            specs={specs}
            fetchingSpecs={fetchingSpecs}
            connecting={connecting}
            onNavigate={(id: string) => navigate(`/vps/${id}`)}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onDelete={handleDelete}
          />
        )}
      </section>

      {confirmDelete && (
        <ConfirmModal
          title="Decommission Node"
          message={`Permanently remove "${confirmDelete.name}" from your cluster? All configuration metadata will be purged.`}
          confirmLabel="Execute"
          danger
          onConfirm={confirmDeleteServer}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
