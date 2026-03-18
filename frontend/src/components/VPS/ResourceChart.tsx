import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Cpu, MemoryStick, Activity } from 'lucide-react';
import api from '../../utils/api';

interface DataPoint {
  t: string;
  cpu: number;
  ram: number;
}

interface ResourceChartProps {
  vpsId: string;
  isConnected: boolean;
}

const MAX_POINTS = 30;
const POLL_MS = 3000;

const ResourceChart: React.FC<ResourceChartProps> = ({ vpsId, isConnected }) => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [latest, setLatest] = useState<{ cpu: number; ram: number } | null>(null);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/vps/${vpsId}/usage`);
      const point: DataPoint = {
        t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        cpu: d.cpu,
        ram: d.ram,
      };
      setLatest({ cpu: d.cpu, ram: d.ram });
      setData(prev => [...prev.slice(-MAX_POINTS + 1), point]);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Usage unavailable');
    }
  }, [vpsId]);

  useEffect(() => {
    if (!isConnected) { setData([]); setLatest(null); return; }
    fetchUsage();
    intervalRef.current = setInterval(fetchUsage, POLL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isConnected, fetchUsage]);

  if (!isConnected) return null;

  if (error) return (
    <div className="text-xs text-text-muted text-center py-4 opacity-60">{error}</div>
  );

  return (
    <div className="space-y-4">
      {/* Stat pills */}
      <div className="flex items-center gap-6">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-500/10 rounded-lg">
            <Cpu size={14} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">CPU</p>
            <p className="text-lg font-bold text-text-primary tracking-tight leading-none">
              {latest ? `${latest.cpu}%` : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg">
            <MemoryStick size={14} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">RAM</p>
            <p className="text-lg font-bold text-text-primary tracking-tight leading-none">
              {latest ? `${latest.ram}%` : '—'}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center space-x-1.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">
          <Activity size={12} className="text-blue-500 animate-pulse" />
          <span>Live</span>
        </div>
      </div>

      {/* Chart */}
      {data.length > 1 && (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, left: -32, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  padding: '8px 12px',
                }}
                formatter={(val, name) => [`${val ?? 0}%`, String(name).toUpperCase()]}
                labelStyle={{ display: 'none' }}
              />
              <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} fill="url(#cpuGrad)" dot={false} />
              <Area type="monotone" dataKey="ram" stroke="#10b981" strokeWidth={2} fill="url(#ramGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ResourceChart;
