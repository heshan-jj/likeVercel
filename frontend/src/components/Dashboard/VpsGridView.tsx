import React from 'react';
import { Server, Trash2, Loader2, Power, PowerOff } from 'lucide-react';

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {profiles.map((vps) => (
        <div 
          key={vps.id}
          onClick={() => onNavigate(vps.id)}
          className="bg-bg-secondary p-4 rounded-md border border-border-light shadow-sm transition-all cursor-pointer hover:border-blue-500/50 group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-2 rounded ${vps.isConnected ? 'bg-blue-500/10 text-blue-500' : 'bg-bg-tertiary text-text-muted'}`}>
              <Server size={18} />
            </div>
            <button 
              onClick={(e) => onDelete(vps.id, vps.name, e)}
              className="p-1.5 text-text-muted hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-0.5 group-hover:text-blue-500 transition-colors uppercase tracking-tight">{vps.name}</h3>
            <p className="text-[10px] font-mono text-text-muted mb-4">{vps.username}@{vps.host}</p>
            <div className="mb-4 space-y-2">
              {/* CPU Bar */}
              <div>
                <div className="flex justify-between text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">
                  <span>CPU</span>
                  <span>{fetchingSpecs.has(vps.id) ? '...' : (vps.isConnected ? `${specs[vps.id]?.cpuLoad || 0}%` : '—')}</span>
                </div>
                <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${vps.isConnected ? 'bg-blue-500' : 'bg-border-light'}`}
                    style={{ width: `${vps.isConnected ? (specs[vps.id]?.cpuLoad || 0) : 0}%` }}
                  />
                </div>
              </div>
              {/* RAM Bar */}
              <div>
                <div className="flex justify-between text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">
                  <span>RAM</span>
                  <span>{fetchingSpecs.has(vps.id) ? '...' : (vps.isConnected ? `${specs[vps.id]?.ramLoad || 0}%` : '—')}</span>
                </div>
                <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${vps.isConnected ? 'bg-blue-500' : 'bg-border-light'}`}
                    style={{ width: `${vps.isConnected ? (specs[vps.id]?.ramLoad || 0) : 0}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border ${vps.isConnected ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${vps.isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="text-[9px] font-bold uppercase tracking-widest">{vps.isConnected ? 'Live' : 'Offline'}</span>
              </div>
              <div className="flex items-center space-x-1">
                {!vps.isConnected ? (
                  <button 
                    onClick={(e) => onConnect(vps.id, e)}
                    disabled={connecting === vps.id}
                    className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all active:scale-95"
                  >
                    {connecting === vps.id ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                  </button>
                ) : (
                  <button 
                    onClick={(e) => onDisconnect(vps.id, e)}
                    className="p-1.5 bg-bg-tertiary text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-all active:scale-95"
                  >
                    <PowerOff size={14} />
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
