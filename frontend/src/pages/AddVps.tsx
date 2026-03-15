import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import api from '../utils/api';

const AddVps: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: 'root',
    authType: 'password',
    password: '',
    privateKey: '',
    passphrase: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 22 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Clean up body based on authType
      const payload = {
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        authType: formData.authType,
        password: formData.authType === 'password' ? formData.password : undefined,
        privateKey: formData.authType === 'privateKey' ? formData.privateKey : undefined,
        passphrase: formData.authType === 'privateKey' && formData.passphrase ? formData.passphrase : undefined,
      };

      await api.post('/vps', payload);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add VPS endpoint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button 
        className="btn-link" 
        onClick={() => navigate('/dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="flex-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Add New Endpoint</h1>
          <p className="text-secondary">Configure a new remote server connection to manage your services.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--space-8)' }}>
        {error && (
          <div style={{ padding: 'var(--space-4)', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Connection Name</label>
              <input 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field" 
                placeholder="e.g. Production Web Server" 
                required 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Hostname / IP</label>
              <input 
                name="host"
                value={formData.host}
                onChange={handleChange}
                className="input-field" 
                placeholder="192.168.1.100 or example.com" 
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Port</label>
              <input 
                name="port"
                type="number"
                value={formData.port}
                onChange={handleChange}
                className="input-field" 
                required 
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Username</label>
              <input 
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input-field" 
                placeholder="root" 
                required 
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Authentication Type</label>
              <select 
                name="authType"
                value={formData.authType}
                onChange={handleChange}
                className="input-field"
                style={{ appearance: 'auto', background: 'var(--bg-primary)' }}
              >
                <option value="password">Password</option>
                <option value="privateKey">SSH Key</option>
              </select>
            </div>

            {formData.authType === 'password' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Password</label>
                <input 
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field" 
                  placeholder="Leave empty for passwordless setups" 
                />
              </div>
            )}

            {formData.authType === 'privateKey' && (
              <>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Private Key</label>
                  <textarea 
                    name="privateKey"
                    value={formData.privateKey}
                    onChange={handleChange}
                    className="input-field" 
                    rows={6}
                    style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----" 
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Key Passphrase (Optional)</label>
                  <input 
                    name="passphrase"
                    type="password"
                    value={formData.passphrase}
                    onChange={handleChange}
                    className="input-field" 
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              Save Connection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVps;
