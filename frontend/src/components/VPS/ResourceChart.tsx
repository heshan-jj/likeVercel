import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Cpu, MemoryStick, Activity } from 'lucide-react';
import api from '../../utils/api';

interface ResourceChartProps {
  vpsId: string;
  isConnected: boolean;
  compact?: boolean;
}

const POLL_MS = 3000;

const ResourceChart: React.FC<ResourceChartProps> = ({ vpsId, isConnected, compact = false }) => {
  const [latest, setLatest] = useState<{ cpu: number; ram: number } | null>(null);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/vps/${vpsId}/usage`);
      setLatest({ cpu: d.cpu, ram: d.ram });
      setError('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Usage unavailable');
    }
  }, [vpsId]);

  useEffect(() => {
    if (!isConnected) { 
      setTimeout(() => setLatest(null), 0); 
      return; 
    }
    fetchUsage();
    intervalRef.current = setInterval(fetchUsage, POLL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isConnected, fetchUsage]);

  if (!isConnected) return null;

  if (error) return (
    <div className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest">{error}</div>
  );

  if (compact) {
    return (
      <div className="flex items-center space-x-4 bg-[#0a1836]/40 backdrop-blur-md border border-[#6475a1]/20 rounded-xl px-3 py-1.5 shadow-lg">
        <div className="flex items-center space-x-1.5">
          <Cpu size={12} className="text-[#137fec]" />
          <span className="text-[10px] font-black text-[#dee5ff]">{latest ? `${latest.cpu}%` : '--%'}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <MemoryStick size={12} className="text-[#10b981]" />
          <span className="text-[10px] font-black text-[#dee5ff]">{latest ? `${latest.ram}%` : '--%'}</span>
        </div>
        <Activity size={10} className="text-[#137fec] animate-pulse opacity-40 ml-1" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8">
      {/* Stat pills */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/10">
          <Cpu size={16} className="text-blue-500" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">CPU Usage</p>
          <div className="flex items-baseline space-x-1">
            <p className="text-xl font-black text-text-primary tracking-tighter">
              {latest ? `${latest.cpu}%` : '--%'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/10">
          <MemoryStick size={16} className="text-emerald-500" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">RAM Usage</p>
          <div className="flex items-baseline space-x-1">
            <p className="text-xl font-black text-text-primary tracking-tighter">
              {latest ? `${latest.ram}%` : '--%'}
            </p>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center space-x-2 px-3 py-1.5 bg-blue-500/5 rounded-full border border-blue-500/10">
        <Activity size={12} className="text-blue-500 animate-pulse" />
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Live telemetry</span>
      </div>
    </div>
  );
};

export default ResourceChart;
