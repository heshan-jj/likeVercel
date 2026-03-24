import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server,
  Zap,
  LayoutGrid,
  List,
  X
} from 'lucide-react';
import api from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import MetricCard from '../components/Dashboard/MetricCard';
import VpsListView from '../components/Dashboard/VpsListView';
import VpsGridView from '../components/Dashboard/VpsGridView';
import Skeleton from '../components/Skeleton';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
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
    }
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
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, isConnected: false } : p));
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Connection failed');
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
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, isConnected: true } : p));
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Disconnection failed');
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
    <div className="p-8 max-w-[1600px] mx-auto space-y-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Overview</h1>
        <p className="text-slate-500 text-sm font-medium">Real-time status of your global infrastructure clusters.</p>
      </div>

      {error && (
        <div className="flex items-center justify-between p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-3 text-sm font-bold">
            <X size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded-lg"><X size={14}/></button>
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
        />
        <MetricCard 
          label="Online Nodes" 
          value={profiles.filter(p => p.isConnected).length} 
          sub="ACTIVE" 
          icon={<Zap size={20} />} 
          color="emerald" 
        />
        <MetricCard 
          label="Offline Nodes" 
          value={profiles.filter(p => !p.isConnected).length} 
          sub="CRITICAL" 
          icon={<X size={20} />} 
          color="red" 
        />
      </section>

      {/* Active Instances Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Active Instances</h2>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <VpsListView 
            profiles={profiles}
            specs={specs}
            fetchingSpecs={fetchingSpecs}
            connecting={connecting}
            onNavigate={(id) => navigate(`/vps/${id}`)}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <VpsGridView 
            profiles={profiles}
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

