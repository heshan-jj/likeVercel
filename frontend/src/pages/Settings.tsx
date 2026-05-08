import React, { useState } from 'react';
import {
  Settings as SettingsIcon, LogOut, Trash2, Lock,
  ChevronDown, ChevronUp, Sun, Moon, Monitor,
  Download, Shield, Loader2, Check, AlertTriangle, FileUp,
  Hash,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

/* ─── Types ─────────────────────────────────────────────── */
type Theme = 'dark' | 'light' | 'system';

/* ─── Component ──────────────────────────────────────────── */
const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  /* PIN change */
  const [showPinForm, setShowPinForm] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* Backup */
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /* Misc */
  const [purging, setPurging] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  /* ── Handlers ── */
  const handleChangeTheme = (t: Theme) => {
    setTheme(t);
  };

  const handleChangePin = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      setPinMsg({ type: 'error', text: 'All fields are required' }); return;
    }
    if (newPin !== confirmPin) {
      setPinMsg({ type: 'error', text: 'New PINs do not match' }); return;
    }
    if (!/^\d{4,6}$/.test(newPin)) {
      setPinMsg({ type: 'error', text: 'PIN must be 4-6 digits' }); return;
    }
    setPinSaving(true);
    setPinMsg(null);
    try {
      await api.put('/auth/pin', { currentPin, newPin });
      setPinMsg({ type: 'success', text: 'PIN updated successfully' });
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
      setTimeout(() => { setShowPinForm(false); setPinMsg(null); }, 2000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setPinMsg({ type: 'error', text: e.response?.data?.error || 'Failed to update PIN' });
    } finally {
      setPinSaving(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const { data } = await api.get('/auth/backup', { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `likeVercel-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setFeedback({ type: 'error', message: 'Failed to download backup' });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm('This will OVERWRITE your current database and existing data. The application will need to reload. Continue?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setRestoreLoading(true);
    setFeedback(null);
    const formData = new FormData();
    formData.append('backup', file);

    try {
      await api.post('/auth/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFeedback({ type: 'success', message: 'Database restored successfully! Reloading...' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setFeedback({
        type: 'error',
        message: e.response?.data?.error || 'Failed to restore database. Ensure it is a valid SQLite file.'
      });
    } finally {
      setRestoreLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRotateToken = async () => {
    try {
      setFeedback(null);
      const res = await api.post('/auth/refresh', {});
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      setFeedback({ type: 'success', message: 'Access token rotated successfully' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to rotate token' });
    }
  };

  const handlePurgeNodes = async () => {
    if (!window.confirm('This will permanently delete your dashboard setup and all data. Continue?')) return;
    setPurging(true);
    try {
      setFeedback(null);
      await api.delete('/auth/profile');
      logout();
    } catch {
      setFeedback({ type: 'error', message: 'Failed to purge system' });
    } finally { setPurging(false); }
  };

  const themeOptions: { value: Theme; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'system', label: 'System', Icon: Monitor },
  ];

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-y-auto custom-scrollbar">
      {/* Header */}
      <header className="sticky top-0 z-30 px-8 py-8 border-b border-border-light bg-bg-primary/80 backdrop-blur-xl flex items-end justify-between">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">
            <SettingsIcon size={12} />
            <span>System Preferences</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tighter text-text-primary">System Settings</h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center space-x-2 px-5 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold text-xs rounded-2xl transition-all active:scale-95"
        >
          <LogOut size={14} />
          <span>Lock Dashboard</span>
        </button>
      </header>

      <div className="p-8 space-y-8 max-w-3xl">
        {feedback && (
          <div className={`p-4 rounded-2xl text-sm font-bold ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            {feedback.message}
          </div>
        )}

        {/* ── Security Card ── */}
        <div className="glass-effect border border-border-light rounded-[32px] p-8 space-y-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Hash size={120} className="text-blue-600" />
          </div>
          <div className="flex items-center space-x-5">
            <div className="h-16 w-16 rounded-[24px] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-2xl shadow-xl">
              <Shield size={32} />
            </div>
            <div>
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Security Model</p>
              <h3 className="text-2xl font-bold text-text-primary tracking-tight">PIN Protection</h3>
              <p className="text-xs text-text-muted mt-0.5">Authorized Operator ID: {user?.id}</p>
            </div>
          </div>

          {/* Change PIN toggle */}
          <button
            onClick={() => { setShowPinForm(v => !v); setPinMsg(null); }}
            className="w-full flex items-center justify-between p-5 bg-bg-secondary border border-border-light rounded-2xl hover:bg-bg-primary transition-all group"
          >
            <div className="flex items-center space-x-3">
              <Lock size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-text-primary">Change Security PIN</span>
            </div>
            {showPinForm ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
          </button>

          {showPinForm && (
            <div className="space-y-4 p-5 bg-bg-secondary border border-border-light rounded-2xl animate-in fade-in duration-200">
              {pinMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${pinMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {pinMsg.type === 'success' ? <Check size={13} /> : <AlertTriangle size={13} />}
                  <span>{pinMsg.text}</span>
                </div>
              )}
              <div className="space-y-3">
                {[
                  { label: 'Current PIN', value: currentPin, set: setCurrentPin },
                  { label: 'New PIN', value: newPin, set: setNewPin },
                  { label: 'Confirm New PIN', value: confirmPin, set: setConfirmPin },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">{label}</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={value}
                      onChange={e => set(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-bg-primary border border-border-light rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-blue-500/50 transition-all font-bold tracking-widest"
                      placeholder="••••••"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleChangePin}
                  disabled={pinSaving}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  {pinSaving ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
                  <span>{pinSaving ? 'Saving...' : 'Update PIN'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Appearance ── */}
        <div className="glass-effect border border-border-light rounded-[32px] p-8 space-y-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-bg-secondary border border-border-light rounded-2xl">
              <Sun size={16} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary tracking-tight">Appearance</h2>
              <p className="text-xs text-text-muted">Choose your preferred color scheme</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => handleChangeTheme(value)}
                className={`flex flex-col items-center space-y-2 p-4 rounded-2xl border transition-all ${
                  theme === value
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-400'
                    : 'bg-bg-secondary border-border-light text-text-muted hover:border-blue-500/20'
                }`}
              >
                <Icon size={18} className={theme === value ? 'text-blue-400' : 'text-text-muted'} />
                <span className="text-xs font-bold">{label}</span>
                {theme === value && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* ── Security + Data ── */}
        <div className="glass-effect border border-border-light rounded-[32px] p-8 space-y-4">
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2.5 bg-bg-secondary border border-border-light rounded-2xl">
              <Shield size={16} className="text-text-muted" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary tracking-tight">Security & Data</h2>
              <p className="text-xs text-text-muted">Token rotation, backups, and account actions</p>
            </div>
          </div>

          <button
            onClick={handleRotateToken}
            className="w-full flex items-center justify-between p-5 bg-bg-secondary border border-border-light rounded-2xl hover:bg-bg-primary transition-all group"
          >
            <div className="flex items-center space-x-3">
              <Lock size={14} className="text-text-muted group-hover:text-blue-500 transition-colors" />
              <span className="text-xs font-bold text-text-primary">Rotate Access Token</span>
            </div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Run</span>
          </button>

          <button
            onClick={handleBackup}
            disabled={backupLoading}
            className="w-full flex items-center justify-between p-5 bg-bg-secondary border border-border-light rounded-2xl hover:bg-bg-primary transition-all disabled:opacity-60 group"
          >
            <div className="flex items-center space-x-3">
              <Download size={14} className="text-text-muted group-hover:text-blue-500 transition-colors" />
              <div className="text-left">
                <p className="text-xs font-bold text-text-primary">Download Database Backup</p>
                <p className="text-[10px] text-text-muted mt-0.5">Downloads a copy of the local SQLite database</p>
              </div>
            </div>
            {backupLoading ? <Loader2 size={14} className="animate-spin text-text-muted" /> : <Download size={14} className="text-text-muted opacity-40" />}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleRestore}
            accept=".sqlite,.db"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={restoreLoading}
            className="w-full flex items-center justify-between p-5 bg-bg-secondary border border-border-light rounded-2xl hover:bg-bg-primary transition-all disabled:opacity-60 group"
          >
            <div className="flex items-center space-x-3">
              <FileUp size={14} className="text-text-muted group-hover:text-amber-500 transition-colors" />
              <div className="text-left">
                <p className="text-xs font-bold text-text-primary">Restore Database Backup</p>
                <p className="text-[10px] text-text-muted mt-0.5">Upload a .sqlite file to replace the current database</p>
              </div>
            </div>
            {restoreLoading ? <Loader2 size={14} className="animate-spin text-text-muted" /> : <FileUp size={14} className="text-text-muted opacity-40" />}
          </button>
        </div>

        {/* ── Danger Zone ── */}
        <div className="glass-effect border border-red-500/10 rounded-[32px] p-8 space-y-4">
          <div className="flex items-center space-x-2 text-red-500/60 mb-1">
            <Trash2 size={14} />
            <h2 className="text-xs font-bold uppercase tracking-widest">Danger Zone</h2>
          </div>
          <button
            onClick={handlePurgeNodes}
            disabled={purging}
            className="w-full p-5 bg-red-500/5 hover:bg-red-500 hover:text-white text-red-500 text-xs font-bold rounded-2xl border border-red-500/20 transition-all text-left group disabled:opacity-60 flex items-center justify-between"
          >
            <div>
              Factory Reset System
              <p className="text-[10px] font-medium opacity-60 mt-1">This action wipes all data and reverts to onboarding.</p>
            </div>
            {purging && <Loader2 size={14} className="animate-spin" />}
          </button>
        </div>

        {/* Spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
};

export default Settings;