import React, { useState } from 'react';
import {
  Settings as SettingsIcon, LogOut, Trash2, Lock,
  ChevronDown, ChevronUp, Sun, Moon, Monitor,
  Download, Shield, Loader2, Check, AlertTriangle, FileUp
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
      await api.post('/auth/refresh');
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
      <header className="sticky top-0 z-30 px-6 py-6 border-b border-border-light bg-bg-primary flex items-end justify-between">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">
            <SettingsIcon size={12} />
            <span>System Preferences</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary uppercase">System Settings</h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center space-x-2 px-4 py-1.5 bg-red-500/10 text-red-600 hover:bg-red-600 hover:text-white font-bold text-xs rounded transition-all active:scale-95"
        >
          <LogOut size={14} />
          <span>Lock Session</span>
        </button>
      </header>

      <div className="p-6 space-y-6 max-w-2xl">
        {feedback && (
          <div className={`p-3 rounded border text-xs font-bold ${feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
            {feedback.message}
          </div>
        )}

        {/* Security Card */}
        <div className="bg-bg-secondary border border-border-light rounded-md p-6 space-y-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded bg-blue-600/10 flex items-center justify-center text-blue-600">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Security Model</p>
              <h3 className="text-lg font-bold text-text-primary tracking-tight">PIN Protection</h3>
              <p className="text-[10px] text-text-muted font-mono">OP_ID: {user?.id}</p>
            </div>
          </div>

          <button
            onClick={() => { setShowPinForm(v => !v); setPinMsg(null); }}
            className="w-full flex items-center justify-between p-3 bg-bg-primary border border-border-light rounded hover:bg-bg-tertiary transition-all"
          >
            <div className="flex items-center space-x-3">
              <Lock size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-text-primary uppercase tracking-tight">Modify Security PIN</span>
            </div>
            {showPinForm ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
          </button>

          {showPinForm && (
            <div className="space-y-4 p-4 bg-bg-primary border border-border-light rounded">
              {pinMsg && (
                <div className={`p-2 rounded text-[10px] font-bold flex items-center space-x-2 ${pinMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                  {pinMsg.type === 'success' ? <Check size={12} /> : <AlertTriangle size={12} />}
                  <span>{pinMsg.text}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Current PIN', value: currentPin, set: setCurrentPin },
                  { label: 'New PIN', value: newPin, set: setNewPin },
                  { label: 'Confirm PIN', value: confirmPin, set: setConfirmPin },
                ].map(({ label, value, set }) => (
                  <div key={label} className="space-y-1">
                    <label className="block text-[9px] font-bold text-text-muted uppercase tracking-wider">{label}</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={value}
                      onChange={e => set(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-bg-secondary border border-border-light rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-blue-500 font-bold tracking-widest"
                      placeholder="••••••"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleChangePin}
                  disabled={pinSaving}
                  className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider rounded transition-all active:scale-95"
                >
                  {pinSaving ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                  <span>{pinSaving ? 'Processing...' : 'Apply Changes'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Appearance Card */}
        <div className="bg-bg-secondary border border-border-light rounded-md p-6 space-y-4 shadow-sm">
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 bg-blue-600/10 rounded">
              <Sun size={14} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Appearance</h2>
              <p className="text-[10px] text-text-muted font-medium">Select interface visual profile</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => handleChangeTheme(value)}
                className={`flex items-center justify-center space-x-2 p-2.5 rounded border transition-all ${
                  theme === value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-bg-primary border-border-light text-text-secondary hover:border-blue-500/50'
                }`}
              >
                <Icon size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Security & Data Card */}
        <div className="bg-bg-secondary border border-border-light rounded-md p-6 space-y-3 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-blue-600/10 rounded">
              <Shield size={14} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Security & Data</h2>
              <p className="text-[10px] text-text-muted font-medium">Manage access and local persistence</p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleRotateToken}
              className="w-full flex items-center justify-between p-3 bg-bg-primary border border-border-light rounded hover:bg-bg-tertiary transition-all"
            >
              <div className="flex items-center space-x-3">
                <Lock size={14} className="text-text-muted" />
                <span className="text-xs font-bold text-text-primary uppercase tracking-tight">Rotate Access Token</span>
              </div>
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">Execute</span>
            </button>

            <button
              onClick={handleBackup}
              disabled={backupLoading}
              className="w-full flex items-center justify-between p-3 bg-bg-primary border border-border-light rounded hover:bg-bg-tertiary transition-all disabled:opacity-60"
            >
              <div className="flex items-center space-x-3">
                <Download size={14} className="text-text-muted" />
                <div className="text-left">
                  <p className="text-xs font-bold text-text-primary uppercase tracking-tight">Download Snapshot</p>
                  <p className="text-[9px] text-text-muted font-medium">Local SQLite persistence backup</p>
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
              className="w-full flex items-center justify-between p-3 bg-bg-primary border border-border-light rounded hover:bg-bg-tertiary transition-all disabled:opacity-60"
            >
              <div className="flex items-center space-x-3">
                <FileUp size={14} className="text-text-muted" />
                <div className="text-left">
                  <p className="text-xs font-bold text-text-primary uppercase tracking-tight">Restore Snapshot</p>
                  <p className="text-[9px] text-text-muted font-medium">Inject persistent state from .sqlite</p>
                </div>
              </div>
              {restoreLoading ? <Loader2 size={14} className="animate-spin text-text-muted" /> : <FileUp size={14} className="text-text-muted opacity-40" />}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 border border-red-500/10 rounded-md p-6 space-y-3">
          <div className="flex items-center space-x-2 text-red-600 mb-1">
            <Trash2 size={14} />
            <h2 className="text-[10px] font-bold uppercase tracking-widest">Danger Zone</h2>
          </div>
          <button
            onClick={handlePurgeNodes}
            disabled={purging}
            className="w-full p-4 bg-bg-secondary hover:bg-red-600 hover:text-white text-red-600 text-[10px] font-bold rounded border border-red-500/20 transition-all text-left flex items-center justify-between uppercase tracking-wider"
          >
            <div>
              Factory Reset System
              <p className="text-[9px] font-medium opacity-70 mt-1 normal-case tracking-normal">This action wipes all data and reverts to onboarding state.</p>
            </div>
            {purging ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
          </button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center space-x-2 text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] pb-8 opacity-50">
           <div className="h-1 w-1 rounded-full bg-border-light" />
           <span>Production Environment</span>
           <div className="h-1 w-1 rounded-full bg-border-light" />
        </div>
      </div>
    </div>
  );
};

export default Settings;