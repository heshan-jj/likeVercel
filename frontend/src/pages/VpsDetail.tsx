import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Terminal as TerminalIcon,
  Folder,
  Activity,
  ExternalLink,
  Globe2,
  PlugZap,
  Zap,
  Pencil
} from 'lucide-react';
import Logo from '../components/Logo';
import api from '../utils/api';
import XtermTerminal from '../components/Terminal/XtermTerminal';
import FileManager from '../components/VPS/FileManager';
import ProcessManager from '../components/VPS/ProcessManager';
import PortManager from '../components/VPS/PortManager';
import ProxyManager from '../components/VPS/ProxyManager';
import ResourceChart from '../components/VPS/ResourceChart';

// Shared offline state shown on all tabs when VPS is disconnected
const OfflineState: React.FC<{ label: string; onNavigate: () => void }> = ({ label, onNavigate }) => (
  <div className="bg-[#0a1836]/60 backdrop-blur-xl rounded-[32px] p-16 text-center border border-[#6475a1]/10 flex flex-col items-center space-y-6 h-full justify-center">
    <div className="p-5 bg-[#11244c] rounded-full border border-[#6475a1]/10 shadow-lg shadow-[#137fec]/5">
      <PlugZap size={36} className="text-[#6475a1]/40" />
    </div>
    <div>
      <p className="text-sm font-black text-[#dee5ff] uppercase tracking-widest mb-2">{label}</p>
      <p className="text-xs text-[#6475a1] font-medium leading-relaxed">This VPS must be connected to access this feature.</p>
    </div>
    <button
      onClick={onNavigate}
      className="px-8 py-3 bg-[#137fec] hover:bg-[#1d6fee] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-xl shadow-[#137fec]/20"
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
    <div className="flex flex-col h-full bg-[#060e20] items-center justify-center space-y-4">
       <div className="relative">
          <Zap size={32} className="text-[#137fec] animate-pulse" />
          <div className="absolute inset-0 bg-[#137fec] blur-2xl opacity-20 animate-pulse" />
       </div>
       <span className="text-[10px] font-black tracking-[0.3em] text-[#6475a1] uppercase">Decrypting Pipeline...</span>
    </div>
  );
  
  if (!profile) return null;

  const tabs = [
    { id: 'terminal', label: 'Terminal', icon: <TerminalIcon size={16} /> },
    { id: 'files', label: 'File Manager', icon: <Folder size={16} /> },
    { id: 'processes', label: 'App Deploy', icon: <Activity size={16} /> },
    { id: 'ports', label: 'Port Mapping', icon: <ExternalLink size={16} /> },
    { id: 'domains', label: 'Proxies', icon: <Globe2 size={16} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#060e20]">
      {/* Detail Header */}
      <div className="px-8 py-6 border-b border-[#6475a1]/10 bg-[#0a1836]/30">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-[#6475a1] hover:text-[#dee5ff] transition-colors mb-5 group text-[10px] font-black uppercase tracking-widest"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span>Dashboard</span>
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 py-2">
          <div className="flex items-start space-x-6">
            <button 
              onClick={() => navigate(`/vps/${id}/edit`)}
              className={`relative p-5 rounded-[22px] ${profile.isConnected ? 'bg-[#137fec]/10 border-[#137fec]/20' : 'bg-[#11244c] border-[#6475a1]/10'} border flex items-center justify-center shadow-2xl transition-all active:scale-95 group overflow-hidden mt-1`}
            >
              <Logo size={32} className={profile.isConnected ? "blue-glow" : ""} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <Pencil size={14} className="text-white" />
              </div>
              <div className="absolute right-1 bottom-1 p-1 bg-[#137fec] rounded-md text-white shadow-sm opacity-60 group-hover:opacity-100 transition-opacity">
                 <Pencil size={8} className="stroke-[3px]" />
              </div>
            </button>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-4">
                  <h1 className="text-3xl font-black text-[#dee5ff] uppercase tracking-tight leading-none">{profile.name}</h1>
                  {profile.isConnected ? (
                    <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[9px] font-black bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 tracking-[0.2em] uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] mr-2.5 animate-pulse" />
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[9px] font-black bg-[#11244c] text-[#6475a1] border border-[#6475a1]/10 tracking-[0.2em] uppercase">
                      Offline
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-[#6475a1] font-mono text-[11px] font-bold tracking-tight">
                  <span className="opacity-70">{profile.username}@{profile.host}:{profile.port}</span>
                  {specs?.region && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-[#137fec] opacity-50" />
                      <span className="text-[#137fec] uppercase tracking-[0.2em] font-black">{specs.region}</span>
                    </>
                  )}
                </div>
              </div>
              
              {profile.isConnected && (
                <div className="w-fit">
                  <ResourceChart vpsId={profile.id} isConnected={profile.isConnected} compact={true} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-10 border-b border-[#6475a1]/10 bg-[#0a1836]/10 flex space-x-12 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center space-x-3 py-6 border-b-2 transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap ${
                activeTab === tab.id 
                ? 'border-[#137fec] text-[#137fec]' 
                : 'border-transparent text-[#6475a1] hover:text-[#dee5ff]'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-[#137fec]' : 'text-[#6475a1]'}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 px-10 py-10 overflow-y-auto no-scrollbar">
            {/* Map over tabs to keep them alive but hidden when not active */}
            <div className={`h-full ${activeTab !== 'terminal' ? 'hidden' : 'block'}`}>
              {!profile.isConnected ? (
                <div className="h-full bg-[#0a1836]/40 backdrop-blur-xl rounded-[32px] flex flex-col items-center justify-center p-12 text-center border border-[#6475a1]/10">
                  <div className="p-8 bg-[#11244c] rounded-full mb-8 border border-[#6475a1]/10 shadow-xl shadow-[#137fec]/5">
                    <TerminalIcon size={48} className="text-[#6475a1]/50" />
                  </div>
                  <h3 className="text-xl font-black text-[#dee5ff] mb-3 uppercase tracking-widest">Locked Pipeline</h3>
                  <p className="text-[#6475a1] max-w-sm mb-10 text-[10px] font-bold leading-relaxed uppercase tracking-wider">Initialize the transport layer from the dashboard to enable shell access.</p>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="px-10 py-4 bg-[#137fec] hover:bg-[#1d6fee] text-white font-black text-[10px] rounded-2xl transition-all shadow-xl shadow-[#137fec]/20 uppercase tracking-[0.2em]"
                  >
                    Authorize Session
                  </button>
                </div>
              ) : (
                <div className="h-full rounded-2xl overflow-hidden border border-[#6475a1]/10 shadow-2xl bg-[#060e20]">
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
              <div className="animate-in fade-in duration-500">
                {profile.isConnected ? (
                  <ProcessManager vpsId={profile.id} />
                ) : (
                  <OfflineState label="Workload Manager Dormant" onNavigate={() => navigate('/dashboard')} />
                )}
              </div>
            )}
            
            {activeTab === 'ports' && (
              <div className="animate-in fade-in duration-500 h-full">
                {profile.isConnected ? (
                  <PortManager vpsId={profile.id} />
                ) : (
                  <OfflineState label="Core Connectivity Offline" onNavigate={() => navigate('/dashboard')} />
                )}
              </div>
            )}
            
            {activeTab === 'domains' && (
              <div className="animate-in fade-in duration-500 h-full">
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
