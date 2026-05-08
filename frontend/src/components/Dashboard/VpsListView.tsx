import React from 'react';
import { Server, Loader2 } from 'lucide-react';
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
  ramLoad?: number;
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
    <div className="bg-bg-secondary border border-border-light rounded-[24px] overflow-hidden shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-light bg-bg-tertiary/40">
            <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Instance Name</th>
            <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest hidden md:table-cell">Region</th>
            <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest hidden lg:table-cell">IP Address</th>
            <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right hidden sm:table-cell">Usage (CPU/RAM)</th>
            <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light/50">
          {profiles.map((vps) => (
            <tr 
              key={vps.id} 
              onClick={() => onNavigate(vps.id)}
              className="hover:bg-bg-tertiary/30 cursor-pointer transition-colors group"
            >
              <td className="px-6 py-5">
                <div className="flex items-center space-x-4">
                  <div className={`p-2.5 rounded-xl ${vps.isConnected ? 'icon-grad-blue text-white shadow-md' : 'bg-bg-tertiary text-text-muted'}`}>
                    <Server size={18} />
                  </div>
                  <span className="text-sm font-bold text-text-primary group-hover:text-blue-500 transition-colors uppercase tracking-tight">{vps.name}</span>
                </div>
              </td>
              <td className="px-6 py-5">
                {vps.isConnected ? (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full w-fit">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-red-50 text-red-500 border border-red-100 rounded-full w-fit">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Offline</span>
                  </div>
                )}
              </td>
              <td className="px-6 py-5 text-sm font-bold text-text-secondary tracking-tight hidden md:table-cell">
                {vps.region || (vps.isConnected ? (specs[vps.id]?.region || 'DETECTING...') : '—')}
              </td>
              <td className="px-6 py-5 text-sm font-mono text-text-muted hidden lg:table-cell">{vps.host}</td>
              <td className="px-6 py-5 text-right w-48 hidden sm:table-cell">
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center justify-end space-x-2 w-full">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">CPU</span>
                    <div className="flex-1 max-w-[80px] h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      {fetchingSpecs.has(vps.id) ? (
                        <Skeleton className="h-full w-full" />
                      ) : (
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${vps.isConnected ? 'bg-blue-600' : 'bg-border-light'}`}
                          style={{ width: `${vps.isConnected ? (specs[vps.id]?.cpuLoad || 0) : 0}%` }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-text-primary w-6 text-right">
                      {fetchingSpecs.has(vps.id) ? '...' : (vps.isConnected ? `${specs[vps.id]?.cpuLoad || 0}%` : '—')}
                    </span>
                  </div>
                  <div className="flex items-center justify-end space-x-2 w-full">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">RAM</span>
                    <div className="flex-1 max-w-[80px] h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      {fetchingSpecs.has(vps.id) ? (
                        <Skeleton className="h-full w-full" />
                      ) : (
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${vps.isConnected ? 'bg-purple-500' : 'bg-border-light'}`}
                          style={{ width: `${vps.isConnected ? (specs[vps.id]?.ramLoad || 0) : 0}%` }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-text-primary w-6 text-right">
                      {fetchingSpecs.has(vps.id) ? '...' : (vps.isConnected ? `${specs[vps.id]?.ramLoad || 0}%` : '—')}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5 text-right">
                {!vps.isConnected ? (
                  <button 
                    onClick={(e) => onConnect(vps.id, e)}
                    disabled={connecting === vps.id}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-lg transition-all shadow-md shadow-blue-600/10 active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                  >
                    {connecting === vps.id ? <Loader2 size={12} className="animate-spin" /> : "Connect"}
                  </button>
                ) : (
                  <button 
                    onClick={(e) => onDisconnect(vps.id, e)}
                    className="px-4 py-1.5 bg-bg-tertiary hover:bg-red-500/10 hover:text-red-500 text-text-muted text-[10px] font-black rounded-lg transition-all active:scale-95 uppercase tracking-widest"
                  >
                    Disconnect
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {profiles.length === 0 && (
        <div className="py-20 text-center">
          <Server size={48} className="mx-auto text-border-light mb-4" />
          <p className="text-sm font-bold text-text-muted uppercase tracking-widest">No instances detected</p>
        </div>
      )}
      <div className="px-6 py-4 bg-bg-tertiary/30 border-t border-border-light">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Showing {profiles.length} of {profiles.length} Instances</p>
      </div>
    </div>
  );
};

export default VpsListView;
