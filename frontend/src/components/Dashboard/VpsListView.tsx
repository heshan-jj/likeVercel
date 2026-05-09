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
    <div className="bg-bg-secondary border border-border-light rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-light bg-bg-tertiary/20">
              <th className="px-4 py-3 text-[11px] font-semibold text-text-secondary tracking-tight">Instance</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-secondary tracking-tight">Status</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-secondary tracking-tight hidden md:table-cell">Region</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-secondary tracking-tight hidden lg:table-cell">Host</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-secondary tracking-tight text-right hidden sm:table-cell">Resource Usage</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-secondary tracking-tight text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {profiles.map((vps) => (
              <tr 
                key={vps.id} 
                onClick={() => onNavigate(vps.id)}
                className="hover:bg-bg-tertiary/20 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-md ${vps.isConnected ? 'bg-blue-500/10 text-blue-500' : 'bg-bg-tertiary text-text-muted'}`}>
                      <Server size={14} />
                    </div>
                    <span className="text-xs font-semibold text-text-primary group-hover:text-blue-500 transition-colors">{vps.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {vps.isConnected ? (
                    <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md w-fit">
                      <div className="w-1 h-1 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-medium">Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 rounded-md w-fit">
                      <div className="w-1 h-1 rounded-full bg-red-500" />
                      <span className="text-[10px] font-medium">Offline</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-[11px] font-medium text-text-secondary hidden md:table-cell">
                  {vps.region || (vps.isConnected ? (specs[vps.id]?.region || 'Detecting...') : '—')}
                </td>
                <td className="px-4 py-3 text-[11px] font-mono text-text-muted hidden lg:table-cell">{vps.host}</td>
                <td className="px-4 py-3 text-right w-48 hidden sm:table-cell">
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center justify-end space-x-2 w-full">
                      <span className="text-[9px] font-medium text-text-muted">CPU</span>
                      <div className="flex-1 max-w-[80px] h-1 bg-bg-tertiary rounded-full overflow-hidden">
                        {fetchingSpecs.has(vps.id) ? (
                          <Skeleton className="h-full w-full" />
                        ) : (
                          <div 
                            className={`h-full transition-all duration-1000 ${vps.isConnected ? 'bg-blue-500' : 'bg-border-light'}`}
                            style={{ width: `${vps.isConnected ? (specs[vps.id]?.cpuLoad || 0) : 0}%` }}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-text-primary w-7 text-right">
                        {fetchingSpecs.has(vps.id) ? '...' : (vps.isConnected ? `${specs[vps.id]?.cpuLoad || 0}%` : '—')}
                      </span>
                    </div>
                    <div className="flex items-center justify-end space-x-2 w-full">
                      <span className="text-[9px] font-medium text-text-muted">RAM</span>
                      <div className="flex-1 max-w-[80px] h-1 bg-bg-tertiary rounded-full overflow-hidden">
                        {fetchingSpecs.has(vps.id) ? (
                          <Skeleton className="h-full w-full" />
                        ) : (
                          <div 
                            className={`h-full transition-all duration-1000 ${vps.isConnected ? 'bg-indigo-400' : 'bg-border-light'}`}
                            style={{ width: `${vps.isConnected ? (specs[vps.id]?.ramLoad || 0) : 0}%` }}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-text-primary w-7 text-right">
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
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold rounded-md disabled:opacity-50 shadow-sm"
                    >
                      {connecting === vps.id ? <Loader2 size={10} className="animate-spin" /> : "Connect"}
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => onDisconnect(vps.id, e)}
                      className="px-3 py-1 bg-bg-tertiary hover:bg-red-500 text-text-muted hover:text-white text-[10px] font-semibold rounded-md transition-all shadow-sm"
                    >
                      Disconnect
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-bg-tertiary/10 border-t border-border-light">
        <p className="text-[10px] font-medium text-text-muted tracking-tight">{profiles.length} Instances Managed</p>
      </div>
    </div>
  );
};

export default VpsListView;
