import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useVps, type VPSProfile } from '../context/VpsContext';

export interface ServerSpecs {
  os: string;
  cpu: string;
  ram: string;
  disk: string;
  cpuLoad?: number;
  ramLoad?: number;
  region?: string;
}

export const useInfrastructure = (pollInterval = 30000) => {
  const { profiles, refreshProfiles, setProfiles, loading, error: contextError } = useVps();
  const [specs, setSpecs] = useState<Record<string, ServerSpecs>>({});
  const [fetchingSpecs, setFetchingSpecs] = useState<Set<string>>(new Set());
  const [fetchingUsage, setFetchingUsage] = useState<Set<string>>(new Set());
  const profilesRef = useRef<VPSProfile[]>(profiles);

  useEffect(() => {
    profilesRef.current = profiles;
    
    // Auto-fetch HARDWARE specs for newly connected profiles that don't have them
    profiles.forEach(p => {
      if (p.isConnected && !specs[p.id]?.os && !fetchingSpecs.has(p.id)) {
        fetchHardwareSpecs(p.id);
      }
    });
  }, [profiles]); // Only re-run when profiles list changes

  const fetchHardwareSpecs = async (id: string) => {
    setFetchingSpecs(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      const { data: specsData } = await api.get(`/vps/${id}/specs`);
      setSpecs(prev => ({ 
        ...prev, 
        [id]: { ...prev[id], ...specsData } 
      }));
      // Immediately fetch usage too
      fetchUsage(id);
    } catch (err) {
      console.error(`Failed to fetch hardware specs for ${id}`, err);
    } finally {
      setFetchingSpecs(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const fetchUsage = async (id: string) => {
    if (fetchingUsage.has(id)) return;
    setFetchingUsage(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      const { data: usageData } = await api.get(`/vps/${id}/usage`);
      setSpecs(prev => ({ 
        ...prev, 
        [id]: { ...prev[id], cpuLoad: usageData.cpu, ramLoad: usageData.ram } 
      }));
    } catch (err) {
      console.error(`Failed to fetch usage for ${id}`, err);
    } finally {
      setFetchingUsage(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  useEffect(() => {
    // Initial profiles fetch
    refreshProfiles();

    // Polling interval: refresh profiles and only fetch DYNAMIC usage
    const interval = setInterval(() => {
      refreshProfiles();
      profilesRef.current.filter(p => p.isConnected).forEach(p => fetchUsage(p.id));
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, refreshProfiles]);

  return {
    profiles,
    specs,
    fetchingSpecs,
    loading,
    error: contextError,
    refreshProfiles,
    setProfiles,
    fetchSpecs: fetchHardwareSpecs, // Keep name for compatibility
    fetchUsage
  };
};
