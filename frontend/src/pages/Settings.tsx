import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Lock, 
  Palette, 
  Moon, 
  Sun, 
  ShieldCheck, 
  Save, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../utils/api';

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const [name, setName] = useState(user?.name || '');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.put('/auth/profile', { name });
      updateUser({ name: data.user.name });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setPassLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await api.put('/auth/password', { 
        currentPassword: passwords.current, 
        newPassword: passwords.new 
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: 'var(--space-12)' }}>
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Settings</h1>
        <p className="text-secondary">Manage your application preferences and security settings.</p>
      </header>

      {message.text && (
        <div style={{ 
          padding: 'var(--space-4)', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: 'var(--space-6)',
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--space-3)',
          background: message.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
          color: message.type === 'success' ? 'var(--success)' : 'var(--error)',
          border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
          opacity: 0.9
        }}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        
        {/* Appearance Section */}
        <section className="glass-panel" style={{ padding: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            <Palette className="text-accent" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Appearance</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontWeight: 500, marginBottom: '4px' }}>Theme</h3>
              <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Switch between light and dark modes.</p>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={toggleTheme}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: '120px', justifyContent: 'center' }}
            >
              {theme === 'dark' ? <><Sun size={18} /> Light Mode</> : <><Moon size={18} /> Dark Mode</>}
            </button>
          </div>
        </section>

        {/* Profile Section */}
        <section className="glass-panel" style={{ padding: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            <User className="text-accent" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Profile Information</h2>
          </div>
          
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-2)' }}>Email Address</label>
              <input 
                className="input-field" 
                type="email" 
                value={user?.email || ''} 
                disabled 
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
              <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 'var(--space-2)' }}>Email address cannot be changed currently.</p>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-2)' }}>Full Name</label>
              <input 
                className="input-field" 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" type="submit" disabled={loading || name === user?.name}>
                {loading ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                Update Profile
              </button>
            </div>
          </form>
        </section>

        {/* Security Section */}
        <section className="glass-panel" style={{ padding: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            <Lock className="text-accent" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Security</h2>
          </div>
          
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-2)' }}>Current Password</label>
              <input 
                className="input-field" 
                type="password" 
                value={passwords.current}
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                autoComplete="current-password"
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-2)' }}>New Password</label>
                <input 
                  className="input-field" 
                  type="password" 
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-2)' }}>Confirm New Password</label>
                <input 
                  className="input-field" 
                  type="password" 
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  autoComplete="new-password"
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-primary" 
                type="submit" 
                disabled={passLoading || !passwords.current || !passwords.new || passwords.new !== passwords.confirm}
              >
                {passLoading ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
                Change Password
              </button>
            </div>
          </form>
        </section>
      </div>
      
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default Settings;
