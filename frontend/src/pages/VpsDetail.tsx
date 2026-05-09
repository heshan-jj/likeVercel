import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Terminal as TerminalIcon,
  Folder,
  Activity,
  ExternalLink,
  Globe2,
  Settings as SettingsIcon,
  PlugZap,
  Zap,
  Server
} from 'lucide-react';
import api from '../utils/api';
import XtermTerminal from '../components/Terminal/XtermTerminal';
import FileManager from '../components/VPS/FileManager';
import ProcessManager from '../components/VPS/ProcessManager';
import PortManager from '../components/VPS/PortManager';
import ProxyManager from '../components/VPS/ProxyManager';
import ResourceChart from '../components/VPS/ResourceChart';

// Shared offline state shown on all tabs when VPS is disconnected
const OfflineState: React.FC<{ label: string; onNavigate: () => void }> = ({ label, onNavigate }) => (
  <div className="bg-bg-secondary border border-border-light rounded-md p-12 text-center flex flex-col items-center justify-center space-y-6 h-full shadow-sm">
    <div className="p-4 bg-bg-primary rounded border border-border-light">
      <PlugZap size={24} className="text-text-muted/40" />
    </div>
    <div>
      <p className="text-sm font-bold text-text-primary mb-1 uppercase tracking-tight">{label}</p>
      <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Connection Required</p>
    </div>
    <button
      onClick={onNavigate}
      className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded uppercase tracking-widest shadow-sm transition-all"
    >
      Initialize Connection
    </button>
  </div>
);

type Tab = 'terminal' | 'files' | 'processes' | 'ports' | 'domains';

interface ServerSpecs {
  os: string;
  cpu: string;
  ram: string;
  disk: string;
  region?: string;
}

interface VpsProfile {
  id: string;
  name: string;
  host: string;
  username: string;
  port: number;
  authType: string;
  isConnected: boolean;
}

const VpsDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<VpsProfile | null>(null);
  const [specs, setSpecs] = useState<ServerSpecs | null>(null);
  const [loading, setLoading] = useState(true);
  
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    ['terminal', 'files', 'processes', 'ports', 'domains'].includes(initialTab || '') ? (initialTab as Tab) : 'terminal'
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/vps/${id}`);
        setProfile(data.profile);
        if (data.profile.isConnected) fetchSpecs();
      } catch {
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    const fetchSpecs = async () => {
      try {
        const { data } = await api.get(`/vps/${id}/specs`);
        setSpecs(data);
      } catch (err) {
        console.error('Failed to fetch specs', err);
      }
    };
    if (id) fetchProfile();
  }, [id, navigate]);

  if (loading) return (
    <div className="flex flex-col h-full bg-bg-primary items-center justify-center space-y-2">
       <Zap size={24} className="text-blue-500 animate-spin" />
       <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase">Syncing...</span>
    </div>
  );
  
  if (!profile) return null;

  const tabs = [
    { id: 'terminal', label: 'TERMINAL', icon: <TerminalIcon size={14} /> },
    { id: 'files', label: 'FILE SYSTEM', icon: <Folder size={14} /> },
    { id: 'processes', label: 'APP CLUSTERS', icon: <Activity size={14} /> },
    { id: 'ports', label: 'NETWORKING', icon: <ExternalLink size={14} /> },
    { id: 'domains', label: 'PROXIES', icon: <Globe2 size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Detail Header */}
      <div className="px-6 py-6 border-b border-border-light bg-bg-secondary/10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors mb-4 group text-[10px] font-bold uppercase tracking-wider"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span>Dashboard Overview</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded ${profile.isConnected ? 'bg-blue-600 text-white shadow-sm' : 'bg-bg-tertiary text-text-muted'} border border-border-light`}>
              <Server size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-text-primary tracking-tight uppercase">{profile.name}</h1>
                {profile.isConnected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 tracking-widest uppercase">
                    Live
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold bg-bg-tertiary text-text-muted border border-border-light tracking-widest uppercase">
                    Offline
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-text-muted font-mono text-[10px] font-bold uppercase tracking-tight">
                {profile.username}@{profile.host}:{profile.port} 
                {specs?.region && <span className="ml-3 text-blue-500 opacity-80 tracking-widest">• {specs.region}</span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {profile.isConnected && (
              <ResourceChart vpsId={profile.id} isConnected={profile.isConnected} compact={true} />
            )}
            <button 
              onClick={() => navigate(`/vps/${id}/edit`)}
              className="flex items-center space-x-2 px-4 py-1.5 bg-bg-secondary hover:bg-bg-tertiary text-text-primary font-bold text-[10px] uppercase rounded border border-border-light transition-all shadow-sm active:scale-95 group"
            >
              <SettingsIcon size={14} className="text-text-muted group-hover:text-blue-500 transition-colors" />
              <span>Modify Config</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 border-b border-border-light bg-bg-secondary/10 flex space-x-6 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center space-x-2 py-3 border-b-2 transition-all font-bold text-[10px] tracking-widest ${
                activeTab === tab.id 
                ? 'border-blue-500 text-blue-500' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-blue-500' : 'text-text-muted'}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 px-6 py-6 overflow-y-auto custom-scrollbar">
            {/* Map over tabs to keep them alive but hidden when not active */}
            <div className={`h-full ${activeTab !== 'terminal' ? 'hidden' : 'block'}`}>
              {!profile.isConnected ? (
                <OfflineState label="Terminal Locked" onNavigate={() => navigate('/dashboard')} />
              ) : (
                <div className="h-full rounded overflow-hidden border border-border-light shadow-sm">
                  <XtermTerminal
                    vpsId={profile.id}
                    vpsHost={profile.host}
                    vpsUsername={profile.username}
                  />
                </div>
              )}
            </div>
            
            {activeTab === 'files' && (
              <div className="h-full">
                {profile.isConnected ? (
                  <FileManager vpsId={profile.id} />
                ) : (
                  <OfflineState label="Storage Access Restricted" onNavigate={() => navigate('/dashboard')} />
                )}
              </div>
            )}
            
            {activeTab === 'processes' && (
              <div>
                {profile.isConnected ? (
                  <ProcessManager vpsId={profile.id} />
                ) : (
                  <OfflineState label="Workload Manager Dormant" onNavigate={() => navigate('/dashboard')} />
                )}
              </div>
            )}
            
            {activeTab === 'ports' && (
              <div className="h-full">
                {profile.isConnected ? (
                  <PortManager vpsId={profile.id} />
                ) : (
                  <OfflineState label="Core Connectivity Offline" onNavigate={() => navigate('/dashboard')} />
                )}
              </div>
            )}
            
            {activeTab === 'domains' && (
              <div className="h-full">
                {profile.isConnected ? (
                  <ProxyManager vpsId={profile.id} />
                ) : (
                  <OfflineState label="Proxy Service Unavailable" onNavigate={() => navigate('/dashboard')} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VpsDetail;
