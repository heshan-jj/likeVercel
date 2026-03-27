import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  X,
  Loader2,
  Globe,
  Settings,
  Zap,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import api from '../../utils/api';

interface ManagedPort {
  port: number;
  processName: string;
  projectPath: string;
  url: string;
}

interface PortManagerProps {
  vpsId: string;
}

const PortManager: React.FC<PortManagerProps> = ({ vpsId }) => {
  const [activePorts, setActivePorts] = useState<number[]>([]);
  const [managedPorts, setManagedPorts] = useState<ManagedPort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkPort, setCheckPort] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ port: number; available: boolean; message: string } | null>(null);

  const fetchPorts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/vps/${vpsId}/ports`);
      setActivePorts(data.activePorts);
      setManagedPorts(data.managedPorts);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load ports');
    } finally {
      setLoading(false);
    }
  }, [vpsId]);

  useEffect(() => {
    fetchPorts();
  }, [fetchPorts]);

  const handleCheckPort = async () => {
    if (!checkPort) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const { data } = await api.post(`/vps/${vpsId}/ports/check`, { port: checkPort });
      setCheckResult(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-500">
      {/* Port Checker Card */}
      <div className="bg-[#0a1836]/40 backdrop-blur-md rounded-[32px] p-8 border border-[#6475a1]/10 relative overflow-hidden group shadow-2xl premium-card">
         <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
            <Zap size={96} className="text-[#137fec]" />
         </div>
         
         <div className="flex items-center space-x-3 mb-8">
            <div className="p-2.5 bg-[#137fec]/10 text-[#137fec] rounded-xl border border-[#137fec]/20">
               <ShieldCheck size={20} />
            </div>
            <h3 className="text-[11px] font-black text-[#dee5ff] uppercase tracking-[0.2em]">Security Port Auditor</h3>
         </div>

         <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center relative z-10">
            <div className="relative flex-1 w-full sm:max-w-xs">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6475a1] text-[9px] font-black uppercase tracking-widest">Port</span>
               <input
                type="number"
                placeholder="Ex. 8080"
                value={checkPort}
                onChange={(e) => setCheckPort(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckPort()}
                className="w-full bg-[#060e20]/60 border border-[#6475a1]/10 rounded-2xl pl-16 pr-4 py-3 text-[10px] text-[#dee5ff] outline-none focus:border-[#137fec]/30 transition-all font-mono shadow-inner uppercase tracking-widest"
              />
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
               <button 
                  onClick={handleCheckPort} 
                  disabled={checking || !checkPort}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-8 py-3 bg-[#137fec] hover:bg-[#1d6fee] text-white text-[10px] font-black rounded-xl transition-all shadow-xl shadow-[#137fec]/20 active:scale-95 disabled:opacity-50 uppercase tracking-widest border border-[#137fec]/20"
               >
                  {checking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  <span>Scan</span>
               </button>
               <button 
                  onClick={fetchPorts}
                  className="p-3 bg-[#11244c] hover:bg-[#137fec]/10 text-[#6475a1] hover:text-[#137fec] rounded-xl transition-all border border-[#6475a1]/10 shadow-lg"
               >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
               </button>
            </div>
         </div>

         {checkResult && (
           <div className={`mt-6 p-4 rounded-2xl border flex items-center space-x-3 animate-in slide-in-from-top-4 ${
             checkResult.available 
             ? 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]' 
             : 'bg-[#f97386]/10 border-[#f97386]/20 text-[#f97386]'
           }`}>
             {checkResult.available ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
             <span className="text-[10px] font-black uppercase tracking-widest leading-relaxed">{checkResult.message}</span>
           </div>
         )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Managed Ports Section */}
        <section className="space-y-4">
          <div className="flex items-center space-x-3 px-1">
             <Activity className="text-[#10b981]" size={18} />
             <h3 className="text-[10px] font-black text-[#6475a1] uppercase tracking-[0.2em]">Public Service Sockets</h3>
          </div>
          
          <div className="space-y-3">
            {managedPorts.length === 0 ? (
              <div className="p-12 text-center text-[9px] font-black text-[#6475a1] bg-[#0a1836]/40 backdrop-blur-md rounded-[32px] border border-[#6475a1]/10 border-dashed uppercase tracking-[0.3em]">
                 No active endpoint maps.
              </div>
            ) : (
              managedPorts.map((mp) => (
                <div key={mp.port} className="group bg-[#0a1836]/40 backdrop-blur-md rounded-[24px] p-4 border border-[#6475a1]/10 hover:border-[#10b981]/30 transition-all flex items-center justify-between shadow-xl">
                  <div className="flex items-center space-x-4">
                     <div className="p-3 bg-[#10b981]/10 text-[#10b981] rounded-xl group-hover:bg-[#10b981]/20 transition-colors border border-[#10b981]/10">
                        <Globe size={20} />
                     </div>
                     <div className="min-w-0">
                        <h4 className="text-[11px] font-black text-[#dee5ff] uppercase tracking-tight truncate max-w-[150px] md:max-w-xs">{mp.processName}</h4>
                        <div className="flex items-center mt-1 space-x-3">
                           <span className="text-[9px] font-mono font-black text-[#10b981] bg-[#10b981]/5 px-2 py-0.5 rounded-lg border border-[#10b981]/10 uppercase">Port {mp.port}</span>
                           <span className="text-[8px] font-black text-[#6475a1] truncate max-w-[100px] font-mono uppercase tracking-tighter opacity-60">{mp.projectPath}</span>
                        </div>
                     </div>
                  </div>
                  <a 
                    href={mp.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 bg-[#11244c] hover:bg-[#10b981] hover:text-white text-[#6475a1] rounded-xl transition-all border border-[#6475a1]/10 shadow-inner"
                  >
                    <ArrowUpRight size={18} />
                  </a>
                </div>
              ))
            )}
          </div>
        </section>

        {/* System Listening Ports Section */}
        <section className="space-y-4">
          <div className="flex items-center space-x-3 px-1">
             <Settings className="text-[#f59e0b]" size={18} />
             <h3 className="text-[10px] font-black text-[#6475a1] uppercase tracking-[0.2em]">Host Listening Grid</h3>
          </div>
          
          <div className="bg-[#0a1836]/40 backdrop-blur-md rounded-[32px] border border-[#6475a1]/10 p-6 shadow-xl min-h-[160px] flex items-center justify-center">
            {activePorts.length === 0 ? (
              <div className="flex flex-col items-center space-y-3 opacity-[0.2]">
                 <Settings size={32} className="text-[#6475a1]" />
                 <p className="text-[#6475a1] font-black uppercase tracking-[0.3em] text-[9px]">No listening detection</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 w-full">
                {activePorts.map((port) => (
                  <span key={port} className="px-3 py-1.5 bg-[#060e20] border border-[#6475a1]/10 rounded-xl text-[11px] font-black font-mono text-[#f59e0b] shadow-2xl hover:border-[#f59e0b]/40 transition-all cursor-default group hover:scale-110">
                    {port}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="px-5 py-3 bg-[#f59e0b]/5 border border-[#f59e0b]/10 rounded-2xl flex items-start space-x-3">
             <ShieldAlert size={16} className="text-[#f59e0b]/40 mt-0.5" />
             <p className="text-[9px] leading-relaxed text-[#f59e0b]/60 font-black tracking-widest uppercase">
                Traffic Audit Note: Only authorized ingress ports should be exposed to public gateway protocols.
             </p>
          </div>
        </section>
      </div>

      {error && (
        <div className="p-4 bg-[#f97386]/10 border border-[#f97386]/20 text-[#f97386] rounded-2xl flex items-center justify-between text-[10px] font-black uppercase tracking-widest animate-in shake-1">
          <div className="flex items-center space-x-3">
             <ShieldAlert size={18} />
             <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-[#f97386]/20 rounded-lg transition-all"><X size={16} /></button>
        </div>
      )}
    </div>
  );
};

export default PortManager;
