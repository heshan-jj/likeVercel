import React, { useState } from 'react';
import {
  Settings as SettingsIcon, LogOut, Trash2, Lock,
  ChevronDown, ChevronUp, Sun, Moon, Monitor,
  Download, Shield, Loader2, Check, AlertTriangle, FileUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import Badge from '../components/UI/Badge';

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
      <header className="sticky top-0 z-30 border-b border-border-light bg-bg-primary/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 py-6 flex items-end justify-between">
          <div>
            <div className="flex items-center space-x-2 text-[11px] font-semibold text-blue-500 mb-1">
              <SettingsIcon size={12} />
              <span>System Preferences</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">System Settings</h1>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-600 px-5"
          >
            <LogOut size={14} className="mr-2" />
            <span>Lock Session</span>
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-8 max-w-2xl mx-auto w-full">
        {feedback && (
          <div className={`p-4 rounded-lg border text-sm font-semibold animate-in fade-in slide-in-from-top-2 ${feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
            {feedback.message}
          </div>
        )}

        {/* Security Card */}
        <Card className="p-6 space-y-6" glass>
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-muted mb-0.5">Security Model</p>
              <h3 className="text-lg font-semibold text-text-primary tracking-tight">PIN Protection</h3>
              <p className="text-[10px] text-text-muted font-mono opacity-60">OP_ID: {user?.id.slice(0, 12)}...</p>
            </div>
          </div>

          <button
            onClick={() => { setShowPinForm(v => !v); setPinMsg(null); }}
            className="w-full flex items-center justify-between p-4 bg-bg-primary/40 border border-border-light rounded-xl hover:bg-bg-tertiary/60 transition-all shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <Lock size={16} className="text-blue-500" />
              <span className="text-sm font-semibold text-text-primary tracking-tight">Modify Security PIN</span>
            </div>
            {showPinForm ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
          </button>

          {showPinForm && (
            <div className="space-y-5 p-5 bg-bg-primary/30 border border-border-light rounded-xl shadow-inner animate-in zoom-in-95 duration-200">
              {pinMsg && (
                <div className={`p-2.5 rounded-lg text-[11px] font-semibold flex items-center space-x-2 ${pinMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                  {pinMsg.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                  <span>{pinMsg.text}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Current PIN', value: currentPin, set: setCurrentPin },
                  { label: 'New PIN', value: newPin, set: setNewPin },
                  { label: 'Confirm PIN', value: confirmPin, set: setConfirmPin },
                ].map(({ label, value, set }) => (
                  <div key={label} className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-text-secondary px-1">{label}</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={value}
                      onChange={e => set(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-bg-secondary border border-border-light rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-blue-500 font-semibold tracking-[0.4em] text-center shadow-sm"
                      placeholder="••••••"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleChangePin}
                  disabled={pinSaving}
                  isLoading={pinSaving}
                  size="sm"
                  className="px-6"
                >
                  <Shield size={14} className="mr-2" />
                  <span>Update PIN</span>
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Appearance Card */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
              <Sun size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Interface Theme</h2>
              <p className="text-[11px] text-text-muted font-medium">Select your preferred visual profile</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => handleChangeTheme(value)}
                className={`flex items-center justify-center space-x-2.5 p-3 rounded-xl border transition-all shadow-sm ${
                  theme === value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-bg-primary/40 border-border-light text-text-secondary hover:border-blue-500/50'
                }`}
              >
                <Icon size={16} />
                <span className="text-[11px] font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Security & Data Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Maintenance & Persistence</h2>
              <p className="text-[11px] text-text-muted font-medium">Manage access tokens and local database</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRotateToken}
              className="w-full flex items-center justify-between p-4 bg-bg-primary/40 border border-border-light rounded-xl hover:bg-bg-tertiary/60 transition-all shadow-sm group"
            >
              <div className="flex items-center space-x-3">
                <Lock size={16} className="text-text-muted group-hover:text-blue-500 transition-colors" />
                <span className="text-sm font-semibold text-text-primary tracking-tight">Rotate Access Token</span>
              </div>
              <Badge variant="blue" className="px-3">Execute</Badge>
            </button>

            <button
              onClick={handleBackup}
              disabled={backupLoading}
              className="w-full flex items-center justify-between p-4 bg-bg-primary/40 border border-border-light rounded-xl hover:bg-bg-tertiary/60 transition-all shadow-sm disabled:opacity-60 group"
            >
              <div className="flex items-center space-x-3 text-left">
                <Download size={16} className="text-text-muted group-hover:text-blue-500 transition-colors" />
                <div>
                  <p className="text-sm font-semibold text-text-primary tracking-tight">Download Data Snapshot</p>
                  <p className="text-[11px] text-text-muted font-medium">Export SQLite database for backup</p>
                </div>
              </div>
              {backupLoading ? <Loader2 size={16} className="animate-spin text-text-muted" /> : <Download size={16} className="text-text-muted opacity-30" />}
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
              className="w-full flex items-center justify-between p-4 bg-bg-primary/40 border border-border-light rounded-xl hover:bg-bg-tertiary/60 transition-all shadow-sm disabled:opacity-60 group"
            >
              <div className="flex items-center space-x-3 text-left">
                <FileUp size={16} className="text-text-muted group-hover:text-blue-500 transition-colors" />
                <div>
                  <p className="text-sm font-semibold text-text-primary tracking-tight">Restore Data Snapshot</p>
                  <p className="text-[11px] text-text-muted font-medium">Inject state from external .sqlite file</p>
                </div>
              </div>
              {restoreLoading ? <Loader2 size={16} className="animate-spin text-text-muted" /> : <FileUp size={16} className="text-text-muted opacity-30" />}
            </button>
          </div>
        </Card>

        {/* Danger Zone */}
        <div className="bg-red-500/[0.03] border border-red-500/10 rounded-2xl p-6 space-y-4 shadow-sm shadow-red-500/[0.02]">
          <div className="flex items-center space-x-2 text-red-600/80 mb-1">
            <Trash2 size={16} />
            <h2 className="text-[11px] font-semibold tracking-wider uppercase opacity-80">Advanced / Destructive</h2>
          </div>
          <button
            onClick={handlePurgeNodes}
            disabled={purging}
            className="w-full p-5 bg-bg-secondary hover:bg-red-600 hover:text-white text-red-600 rounded-xl border border-red-500/20 transition-all text-left flex items-center justify-between shadow-sm group"
          >
            <div className="space-y-1">
              <span className="text-sm font-semibold group-hover:text-white">Factory Reset System</span>
              <p className="text-[11px] font-medium opacity-70 group-hover:opacity-100">Permanently wipe all nodes, keys, and configurations. Reverts to fresh install.</p>
            </div>
            {purging ? <Loader2 size={20} className="animate-spin" /> : <AlertTriangle size={20} />}
          </button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center space-x-3 text-[10px] font-medium text-text-muted pb-12 opacity-40">
           <div className="h-px w-8 bg-border-light" />
           <span>Instance Version 2.1 • Production Environment</span>
           <div className="h-px w-8 bg-border-light" />
        </div>
      </div>
    </div>
  );
};

export default Settings;
