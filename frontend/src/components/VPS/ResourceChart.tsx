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
    const initialFetch = setTimeout(() => fetchUsage(), 0);
    intervalRef.current = setInterval(fetchUsage, POLL_MS);
    return () => {
      clearTimeout(initialFetch);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isConnected, fetchUsage]);

  if (!isConnected) return null;

  if (error) return (
    <div className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest">{error}</div>
  );

  if (compact) {
    return (
      <div className="flex items-center space-x-4 bg-bg-secondary/40 backdrop-blur-md border border-border-light rounded-xl px-4 py-1.5 shadow-sm shadow-black/[0.02]">
        <div className="flex items-center space-x-2">
          <Cpu size={14} className="text-blue-500 opacity-80" />
          <span className="text-[11px] font-semibold text-text-muted mr-1">CPU</span>
          <span className="text-xs font-bold text-text-primary tabular-nums">{latest ? `${latest.cpu}%` : '--%'}</span>
        </div>
        <div className="w-px h-3 bg-border-light/60" />
        <div className="flex items-center space-x-2">
          <MemoryStick size={14} className="text-emerald-500 opacity-80" />
          <span className="text-[11px] font-semibold text-text-muted mr-1">RAM</span>
          <span className="text-xs font-bold text-text-primary tabular-nums">{latest ? `${latest.ram}%` : '--%'}</span>
        </div>
        <div className="w-px h-3 bg-border-light/60" />
        <Activity size={12} className="text-blue-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-10">
      {/* Stat pills */}
      <div className="flex items-center space-x-3.5">
        <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/10 shadow-inner">
          <Cpu size={18} className="text-blue-500" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-text-muted mb-0.5">Host CPU</p>
          <div className="flex items-baseline space-x-1">
            <p className="text-xl font-bold text-text-primary tracking-tight tabular-nums">
              {latest ? `${latest.cpu}%` : '--%'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3.5">
        <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/10 shadow-inner">
          <MemoryStick size={18} className="text-emerald-500" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-text-muted mb-0.5">Host RAM</p>
          <div className="flex items-baseline space-x-1">
            <p className="text-xl font-bold text-text-primary tracking-tight tabular-nums">
              {latest ? `${latest.ram}%` : '--%'}
            </p>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center space-x-2 px-4 py-1.5 bg-blue-500/5 rounded-full border border-blue-500/10 shadow-sm">
        <Activity size={12} className="text-blue-500 animate-pulse" />
        <span className="text-[11px] font-semibold text-blue-500 tracking-tight">Active Telemetry</span>
      </div>
    </div>
  );
};

export default ResourceChart;
