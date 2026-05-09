import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server,
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
import { useInfrastructure } from '../hooks/useInfrastructure';
import type { VPSProfile } from '../context/VpsContext';
import Skeleton from '../components/Skeleton';
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
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Sleek Unified Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary tracking-tight">Infrastructure</h1>
            <div className="flex items-center mt-1 space-x-2">
              <span className="text-[11px] font-medium text-text-secondary">
                {profiles.length} Instances
              </span>
              <span className="text-[11px] text-text-muted">•</span>
              <span className="flex items-center space-x-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded text-[10px] font-semibold">
                <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                <span>{profiles.filter(p => p.isConnected).length} Active</span>
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64 lg:w-80">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input 
              placeholder="Search host or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-secondary border border-border-light rounded-md pl-8 pr-3 py-2 text-xs text-text-primary outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* View Mode & Sort Toggle */}
            <div className="flex bg-bg-secondary border border-border-light p-1 rounded-md shadow-sm">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-bg-tertiary text-blue-600' : 'text-text-muted hover:text-text-primary'}`}
                title="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-bg-tertiary text-blue-600' : 'text-text-muted hover:text-text-primary'}`}
                title="List View"
              >
                <List size={15} />
              </button>
            </div>

            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'status')}
                className="bg-bg-secondary border border-border-light rounded-md pl-3 pr-8 py-2 text-[11px] font-semibold text-text-secondary outline-none focus:border-blue-500 appearance-none cursor-pointer shadow-sm min-w-[100px]"
              >
                <option value="name">A-Z</option>
                <option value="status">Status</option>
              </select>
              <LayoutGrid size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>

            <div className="h-6 w-px bg-border-light mx-1" />

            {profiles.some(p => !p.isConnected) && (
              <Button 
                variant="success"
                size="sm"
                onClick={handleConnectAll}
                isLoading={connectingAll}
                className="h-9 px-3 text-[11px] font-semibold shadow-sm"
              >
                <Power size={12} className="mr-1.5" />
                Initialize All
              </Button>
            )}
            
            <Button 
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="h-9 w-9 !p-0 shadow-sm"
              title="Refresh"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </div>

      {displayError && (
        <div className="flex items-center justify-between p-3 bg-red-500/10 text-red-600 border border-red-500/20 rounded shadow-sm text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <X size={14} />
            <span>{displayError}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded"><X size={12}/></button>
        </div>
      )}

      {/* Main View Area */}
      <div className="min-h-[400px]">
        {filteredProfiles.length === 0 ? (
          <div className="p-24 text-center border border-dashed border-border-light rounded-lg bg-bg-secondary/10 flex flex-col items-center">
             <Server size={32} className="text-text-muted/30 mb-4" />
             <p className="text-text-muted font-medium text-xs">No active infrastructure nodes matching criteria</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {viewMode === 'list' ? (
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
          </div>
        )}
      </div>

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
