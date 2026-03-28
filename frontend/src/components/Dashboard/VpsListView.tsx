import React from 'react';
import { Server, Loader2, ChevronRight, Activity, MapPin, Globe } from 'lucide-react';

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

interface VpsListViewProps {
  profiles: VPSProfile[];
  specs: Record<string, ServerSpecs>;
  fetchingSpecs: Set<string>;
  connecting: string | null;
  onNavigate: (id: string) => void;
  onConnect: (id: string, e: React.MouseEvent) => void;
  onDisconnect: (id: string, e: React.MouseEvent) => void;
}

const VpsListView: React.FC<VpsListViewProps> = ({ profiles, specs, fetchingSpecs, connecting, onNavigate, onConnect, onDisconnect }) => {
  return (
    <div className="space-y-4">
      {profiles.map((vps) => (
        <div 
          key={vps.id} 
          onClick={() => onNavigate(vps.id)}
          className="bg-[#0a1836] border border-[#6475a1]/10 rounded-[24px] p-5 hover:border-[#137fec]/30 transition-all cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-2xl ${vps.isConnected ? 'icon-grad-blue text-white shadow-lg' : 'bg-[#11244c] text-[#6475a1]'}`}>
                <Server size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-[#dee5ff] uppercase tracking-tight group-hover:text-[#137fec] transition-colors">
                  {vps.name}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#6475a1] opacity-70">{vps.host}</p>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-2">
              {vps.isConnected ? (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#f97386]/10 text-[#f97386] border border-[#f97386]/20 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f97386]" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Offline</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
             <div className="space-y-1">
                <div className="flex items-center space-x-1 text-[#6475a1]">
                   <MapPin size={10} />
                   <span className="text-[9px] font-bold uppercase tracking-widest">Region</span>
                </div>
                <p className="text-xs font-bold text-[#dee5ff]">
                   {vps.region || (vps.isConnected ? (specs[vps.id]?.region || 'DETECTING...') : '—')}
                </p>
             </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-[#6475a1]">
                  <Globe size={10} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Network</span>
                </div>
                <p className="text-[10px] font-black text-[#dee5ff] uppercase tracking-wider">IPv4 Stable</p>
              </div>
             <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-1 text-[#6475a1]">
                      <Activity size={10} />
                      <span className="text-[9px] font-bold uppercase tracking-widest">CPU Load</span>
                   </div>
                   <span className="text-[10px] font-black text-[#dee5ff]">
                      {fetchingSpecs.has(vps.id) ? '...' : (vps.isConnected ? `${specs[vps.id]?.cpuLoad || 0}%` : '0%')}
                   </span>
                </div>
                <div className="h-1.5 bg-[#11244c] rounded-full overflow-hidden">
                   <div 
                      className={`h-full rounded-full transition-all duration-1000 ${vps.isConnected ? 'bg-[#137fec]' : 'bg-[#6475a1]/20'}`}
                      style={{ width: `${vps.isConnected ? (specs[vps.id]?.cpuLoad || 0) : 0}%` }}
                   />
                </div>
             </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#6475a1]/10">
             <div className="flex items-center space-x-3">
                {!vps.isConnected ? (
                  <button 
                    onClick={(e) => onConnect(vps.id, e)}
                    disabled={connecting === vps.id}
                    className="flex items-center space-x-2 px-4 py-2 bg-[#137fec] hover:bg-[#1d6fee] text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-[#137fec]/20 active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                  >
                    {connecting === vps.id ? <Loader2 size={12} className="animate-spin" /> : "Connect"}
                  </button>
                ) : (
                  <button 
                    onClick={(e) => onDisconnect(vps.id, e)}
                    className="px-4 py-2 bg-[#11244c] hover:bg-[#f97386]/10 hover:text-[#f97386] text-[#6475a1] text-[10px] font-black rounded-xl transition-all active:scale-95 uppercase tracking-widest"
                  >
                    Disconnect
                  </button>
                )}
             </div>
             <div className="text-[#6475a1] group-hover:text-[#137fec] transition-colors p-2">
                <ChevronRight size={20} />
             </div>
          </div>
        </div>
      ))}

      {profiles.length === 0 && (
        <div className="py-20 text-center bg-[#0a1836]/30 border border-[#6475a1]/10 border-dashed rounded-[32px]">
          <Server size={48} className="mx-auto text-[#6475a1]/20 mb-4" />
          <p className="text-[10px] font-black text-[#6475a1] uppercase tracking-[0.2em]">No clusters detected</p>
        </div>
      )}
    </div>
  );
};

export default VpsListView;
