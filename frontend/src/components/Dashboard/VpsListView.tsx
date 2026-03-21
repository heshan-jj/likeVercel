import React from 'react';
import { Server, Loader2 } from 'lucide-react';

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
  connecting: string | null;
  onNavigate: (id: string) => void;
  onConnect: (id: string, e: React.MouseEvent) => void;
  onDisconnect: (id: string, e: React.MouseEvent) => void;
}

const VpsListView: React.FC<VpsListViewProps> = ({ profiles, specs, connecting, onNavigate, onConnect, onDisconnect }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instance Name</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Region</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">IP Address</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">CPU Load</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {profiles.map((vps) => (
            <tr 
              key={vps.id} 
              onClick={() => onNavigate(vps.id)}
              className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
            >
              <td className="px-6 py-5">
                <div className="flex items-center space-x-4">
                  <div className={`p-2.5 rounded-xl ${vps.isConnected ? 'icon-grad-blue text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                    <Server size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{vps.name}</span>
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
              <td className="px-6 py-5 text-sm font-bold text-slate-500 tracking-tight">
                {vps.region || (vps.isConnected ? (specs[vps.id]?.region || 'DETECTING...') : '—')}
              </td>
              <td className="px-6 py-5 text-sm font-mono text-slate-400">{vps.host}</td>
              <td className="px-6 py-5 text-right w-48">
                <div className="flex items-center justify-end space-x-3">
                  <div className="flex-1 max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${vps.isConnected ? 'bg-blue-600' : 'bg-slate-300'}`}
                      style={{ width: `${vps.isConnected ? (specs[vps.id]?.cpuLoad || 0) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-900 w-8">{vps.isConnected ? `${specs[vps.id]?.cpuLoad || 0}%` : '0%'}</span>
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
                    className="px-4 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 text-[10px] font-black rounded-lg transition-all active:scale-95 uppercase tracking-widest"
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
          <Server size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No instances detected</p>
        </div>
      )}
      <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing {profiles.length} of {profiles.length} Instances</p>
      </div>
    </div>
  );
};

export default VpsListView;
