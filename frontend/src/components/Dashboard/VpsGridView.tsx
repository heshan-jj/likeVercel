import React from 'react';
import { Server, Trash2, Activity, Loader2, Power, PowerOff } from 'lucide-react';
import Skeleton from '../Skeleton';

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
  cpuLoad?: number;
  region?: string;
}

interface VpsGridViewProps {
  profiles: VPSProfile[];
  specs: Record<string, ServerSpecs>;
  fetchingSpecs: Set<string>;
  connecting: string | null;
  onNavigate: (id: string) => void;
  onConnect: (id: string, e: React.MouseEvent) => void;
  onDisconnect: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, name: string, e: React.MouseEvent) => void;
}

const VpsGridView: React.FC<VpsGridViewProps> = ({ profiles, specs, fetchingSpecs, connecting, onNavigate, onConnect, onDisconnect, onDelete }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {profiles.map((vps) => (
        <div 
          key={vps.id}
          onClick={() => onNavigate(vps.id)}
          className="bg-[#0a1836] p-6 rounded-[24px] border border-[#6475a1]/10 shadow-sm premium-card hover:border-[#137fec]/30 transition-all cursor-pointer group relative"
        >
          <div className="flex items-start justify-between mb-6">
            <div className={`p-4 rounded-2xl ${vps.isConnected ? 'icon-grad-blue text-white shadow-lg shadow-[#137fec]/20' : 'bg-[#11244c] text-[#6475a1]'}`}>
              <Server size={24} />
            </div>
            <button 
              onClick={(e) => onDelete(vps.id, vps.name, e)}
              className="p-2 text-[#6475a1] hover:text-[#f97386] transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
          <div>
            <h3 className="text-base font-black text-[#dee5ff] mb-1 group-hover:text-[#137fec] transition-colors uppercase tracking-tight">{vps.name}</h3>
            <p className="text-[10px] font-black text-[#6475a1] mb-5 uppercase tracking-widest opacity-70">{vps.username}@{vps.host}</p>
            
            <div className="flex items-center justify-between">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${vps.isConnected ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 'bg-[#f97386]/10 text-[#f97386] border border-[#f97386]/20'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${vps.isConnected ? 'bg-[#10b981] animate-pulse' : 'bg-[#f97386]'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{vps.isConnected ? 'Live' : 'Offline'}</span>
              </div>
              <div className="flex items-center space-x-2">
                {vps.isConnected && (
                  <div className="flex items-center space-x-1.5 mr-2">
                    <Activity size={14} className="text-[#137fec]" />
                    {fetchingSpecs.has(vps.id) ? (
                      <Skeleton className="h-3 w-8" />
                    ) : (
                      <span className="text-xs font-bold text-[#dee5ff]">{specs[vps.id]?.cpuLoad || 0}%</span>
                    )}
                  </div>
                )}
                {!vps.isConnected ? (
                  <button 
                    onClick={(e) => onConnect(vps.id, e)}
                    disabled={connecting === vps.id}
                    className="p-2 bg-[#137fec] text-white rounded-xl hover:bg-[#1d6fee] transition-all shadow-lg shadow-[#137fec]/20 active:scale-95"
                  >
                    {connecting === vps.id ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                  </button>
                ) : (
                  <button 
                    onClick={(e) => onDisconnect(vps.id, e)}
                    className="p-2 bg-[#11244c] text-[#6475a1] hover:text-[#f97386] hover:bg-[#f97386]/10 rounded-xl transition-all active:scale-95"
                  >
                    <PowerOff size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VpsGridView;
