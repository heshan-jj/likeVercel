import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Server, Activity, TerminalSquare, FolderOpen } from 'lucide-react';
import api from '../utils/api';

interface VpsProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: string;
  isConnected: boolean;
  lastConnectedAt: string | null;
}

const Dashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<VpsProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchProfiles = async () => {
    try {
      const { data } = await api.get('/vps');
      setProfiles(data.profiles);
    } catch (err: any) {
      setError('Failed to load VPS profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleConnect = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/vps/${id}/connect`);
      fetchProfiles(); // Refresh status
    } catch (error) {
      console.error('Connection failed', error);
      alert('Connection failed. Please check credentials.');
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '100%' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="flex-between" style={{ marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Dashboard</h1>
          <p className="text-secondary">Overview of your VPS deployments</p>
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/vps/add')}
        >
          <Plus size={20} />
          Add Endpoint
        </button>
      </div>

      {error && <div className="text-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--space-6)' }}>
        {profiles.length === 0 ? (
          <div className="glass-panel flex-center" style={{ padding: 'var(--space-8)', gridColumn: '1 / -1', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Server size={48} className="text-muted" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 500 }}>No VPS Endpoints</h3>
            <p className="text-secondary">Add your first VPS to start deploying applications.</p>
            <button className="btn btn-primary" onClick={() => navigate('/vps/add')}>
              <Plus size={20} /> Add VPS
            </button>
          </div>
        ) : (
          profiles.map((vps) => (
            <div 
              key={vps.id} 
              className="glass-panel" 
              style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: 'var(--space-6)' }}
              onClick={() => navigate(`/vps/${vps.id}`)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ padding: 'var(--space-2)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <Server size={24} className="text-accent" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>{vps.name}</h3>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {vps.username}@{vps.host}:{vps.port}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: vps.isConnected ? 'var(--success)' : 'var(--error)' 
                  }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {vps.isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
                {!vps.isConnected ? (
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1 }}
                    onClick={(e) => handleConnect(vps.id, e)}
                  >
                    Connect
                  </button>
                ) : (
                  <>
                    <button 
                      className="btn btn-secondary" 
                      style={{ flex: 1 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/vps/${vps.id}?tab=terminal`); }}
                    >
                      <TerminalSquare size={16} /> Terminal
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ flex: 1 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/vps/${vps.id}?tab=files`); }}
                    >
                      <FolderOpen size={16} /> Files
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ flex: 1 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/vps/${vps.id}?tab=processes`); }}
                    >
                      <Activity size={16} /> Processes
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
