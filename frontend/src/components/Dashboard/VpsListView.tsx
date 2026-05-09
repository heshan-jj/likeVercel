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
    <div className="bg-bg-secondary border border-border-light rounded-md overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border-light bg-bg-tertiary/40">
            <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Instance</th>
            <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider hidden md:table-cell">Region</th>
            <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider hidden lg:table-cell">Address</th>
            <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right hidden sm:table-cell">Usage</th>
            <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {profiles.map((vps) => (
            <tr 
              key={vps.id} 
              onClick={() => onNavigate(vps.id)}
              className="hover:bg-bg-tertiary/30 cursor-pointer transition-colors group"
            >
              <td className="px-4 py-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded ${vps.isConnected ? 'bg-blue-500/10 text-blue-500' : 'bg-bg-tertiary text-text-muted'}`}>
                    <Server size={14} />
                  </div>
                  <span className="text-xs font-bold text-text-primary group-hover:text-blue-500 transition-colors uppercase tracking-tight">{vps.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                {vps.isConnected ? (
                  <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded w-fit">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 rounded w-fit">
                    <div className="w-1 h-1 rounded-full bg-red-500" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Offline</span>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-xs font-bold text-text-secondary tracking-tight hidden md:table-cell">
                {vps.region || (vps.isConnected ? (specs[vps.id]?.region || 'DETECTING...') : '—')}
              </td>
              <td className="px-4 py-3 text-xs font-mono text-text-muted hidden lg:table-cell">{vps.host}</td>
              <td className="px-4 py-3 text-right w-40 hidden sm:table-cell">
                <div className="flex flex-col items-end space-y-1.5">
                  <div className="flex items-center justify-end space-x-2 w-full">
                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">CPU</span>
                    <div className="flex-1 max-w-[60px] h-1 bg-bg-tertiary rounded-full overflow-hidden">
                      {fetchingSpecs.has(vps.id) ? (
                        <Skeleton className="h-full w-full" />
                      ) : (
                        <div 
                          className={`h-full transition-all duration-1000 ${vps.isConnected ? 'bg-blue-600' : 'bg-border-light'}`}
                          style={{ width: `${vps.isConnected ? (specs[vps.id]?.cpuLoad || 0) : 0}%` }}
                        />
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-text-primary w-6 text-right">
                      {fetchingSpecs.has(vps.id) ? '...' : (vps.isConnected ? `${specs[vps.id]?.cpuLoad || 0}%` : '—')}
                    </span>
                  </div>
                  <div className="flex items-center justify-end space-x-2 w-full">
                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">RAM</span>
                    <div className="flex-1 max-w-[60px] h-1 bg-bg-tertiary rounded-full overflow-hidden">
                      {fetchingSpecs.has(vps.id) ? (
                        <Skeleton className="h-full w-full" />
                      ) : (
                        <div 
                          className={`h-full transition-all duration-1000 ${vps.isConnected ? 'bg-purple-500' : 'bg-border-light'}`}
                          style={{ width: `${vps.isConnected ? (specs[vps.id]?.ramLoad || 0) : 0}%` }}
                        />
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-text-primary w-6 text-right">
                      {fetchingSpecs.has(vps.id) ? '...' : (vps.isConnected ? `${specs[vps.id]?.ramLoad || 0}%` : '—')}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                {!vps.isConnected ? (
                  <button 
                    onClick={(e) => onConnect(vps.id, e)}
                    disabled={connecting === vps.id}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold rounded disabled:opacity-50 uppercase tracking-widest"
                  >
                    {connecting === vps.id ? <Loader2 size={10} className="animate-spin" /> : "Connect"}
                  </button>
                ) : (
                  <button 
                    onClick={(e) => onDisconnect(vps.id, e)}
                    className="px-3 py-1 bg-bg-tertiary hover:bg-red-500 text-text-muted hover:text-white text-[9px] font-bold rounded uppercase tracking-widest transition-colors"
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
        <div className="py-12 text-center">
          <Server size={32} className="mx-auto text-border-light mb-2" />
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest">No instances detected</p>
        </div>
      )}
      <div className="px-4 py-2 bg-bg-tertiary/20 border-t border-border-light">
        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{profiles.length} Instances Registered</p>
      </div>
    </div>
  );
};

export default VpsListView;
