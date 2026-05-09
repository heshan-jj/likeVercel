import React, { useState, useEffect } from 'react';
import {
  KeyRound, Plus, Trash2, Copy, Check, Server, Loader2,
  ShieldCheck, AlertTriangle, ChevronDown, X,
  Wand2, Download, FileUp
} from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useKeys } from '../context/KeyContext';
import { useVps } from '../context/VpsContext';

interface SshKey {
  id: string;
  label: string;
  publicKey: string;
  fingerprint: string;
  createdAt: string;
  lastUsedAt: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseKeyType(publicKey: string): string {
  const prefix = publicKey.trim().split(/\s+/)[0] || '';
  if (prefix === 'ssh-ed25519') return 'Ed25519';
  if (prefix === 'ssh-rsa') return 'RSA';
  if (prefix === 'ecdsa-sha2-nistp256' || prefix === 'ecdsa-sha2-nistp384' || prefix === 'ecdsa-sha2-nistp521') return 'ECDSA';
  if (prefix === 'ssh-dss') return 'DSA';
  return prefix || 'Unknown';
}

function keyTypeBadgeColor(type: string) {
  if (type === 'Ed25519') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  if (type === 'RSA') return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  if (type === 'ECDSA') return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
  return 'text-text-muted bg-bg-tertiary border-border-light';
}

// ─────────────────────────────────────────────────────────────────────────────

const KeyManager: React.FC = () => {
  const { showToast } = useToast();
  const { keys, refreshKeys, loading: loadingKeys, setKeys } = useKeys();
  const { profiles: vps } = useVps();

  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<'paste' | 'generate'>('paste');
  const [addLabel, setAddLabel] = useState('');
  const [addPrivateKey, setAddPrivateKey] = useState('');
  const [addPublicKey, setAddPublicKey] = useState('');
  const [showPrivate, setShowPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState<string | null>(null);
  const [copiedGenKey, setCopiedGenKey] = useState(false);

  const [installKeyId, setInstallKeyId] = useState('');
  const [installVpsIds, setInstallVpsIds] = useState<string[]>([]);
  const [installing, setInstalling] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    refreshKeys();
  }, [refreshKeys]);

  const handleToggleForm = () => {
    setShowAddForm(v => !v);
    setAddLabel('');
    setAddPrivateKey('');
    setAddPublicKey('');
    setAddMode('paste');
    setGeneratedPrivateKey(null);
  };

  const handleSave = async () => {
    if (!addLabel.trim() || !addPrivateKey.trim()) return;
    setSaving(true);
    try {
      await api.post('/keys', {
        label: addLabel.trim(),
        privateKey: addPrivateKey.trim(),
        publicKey: addPublicKey.trim() || undefined,
      });
      showToast('SSH key saved', 'success');
      setShowAddForm(false);
      refreshKeys();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || 'Failed to save key', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!addLabel.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post('/keys/generate', { label: addLabel.trim() });
      showToast('Ed25519 key pair generated', 'success');
      setGeneratedPrivateKey(data.privateKey);
      setKeys(prev => [data.key, ...prev]);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || 'Key generation failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this SSH key?')) return;
    setDeleting(id);
    try {
      await api.delete(`/keys/${id}`);
      showToast('SSH key deleted', 'success');
      setKeys(prev => prev.filter(k => k.id !== id));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || 'Failed to delete key', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleCopy = async (key: SshKey) => {
    await navigator.clipboard.writeText(key.publicKey);
    setCopied(key.id);
    setTimeout(() => setCopied(null), 2000);
    showToast('Public key copied', 'success');
  };

  const toggleVpsSelection = (id: string) => {
    setInstallVpsIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const handleInstall = async () => {
    if (!installKeyId || installVpsIds.length === 0) return;
    setInstalling(true);
    try {
      const results = await Promise.allSettled(
        installVpsIds.map(vpsId => api.post(`/keys/${installKeyId}/install`, { vpsId }))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      showToast(`Installed on ${succeeded} server(s)`, succeeded > 0 ? 'success' : 'info');
      setKeys(prev => prev.map(k => k.id === installKeyId ? { ...k, lastUsedAt: new Date().toISOString() } : k));
      setInstallKeyId('');
      setInstallVpsIds([]);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || 'Install failed', 'error');
    } finally {
      setInstalling(false);
    }
  };

  const connectedVps = vps.filter(v => v.isConnected);

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-y-auto custom-scrollbar">
      {/* Header */}
      <header className="sticky top-0 z-30 px-6 py-6 flex items-end justify-between border-b border-border-light bg-bg-primary">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">
             <KeyRound size={12} />
             <span>Access Vault</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary uppercase">SSH Key Manager</h1>
        </div>
        <button
          onClick={handleToggleForm}
          className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded transition-all active:scale-95"
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          <span>{showAddForm ? 'Cancel' : 'New Key'}</span>
        </button>
      </header>

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Add Key Form */}
        {showAddForm && (
          <div className="bg-bg-secondary border border-border-light rounded-md p-6 space-y-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <KeyRound size={18} className="text-blue-500" />
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Provision Key</h2>
            </div>

            <div className="flex bg-bg-primary border border-border-light rounded p-1 w-fit">
              <button
                onClick={() => setAddMode('paste')}
                className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${addMode === 'paste' ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-text-primary'}`}
              >
                Paste Content
              </button>
              <button
                onClick={() => setAddMode('generate')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${addMode === 'generate' ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-text-primary'}`}
              >
                <Wand2 size={10} />
                <span>Generate New</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Key Label</label>
                <input
                  type="text"
                  value={addLabel}
                  onChange={e => setAddLabel(e.target.value)}
                  placeholder="e.g. Production Access Key"
                  className="w-full bg-bg-primary border border-border-light rounded px-3 py-2 text-text-primary outline-none focus:border-blue-500 font-bold text-xs"
                />
              </div>

              {addMode === 'paste' ? (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Private Payload</label>
                      <button
                        type="button"
                        onClick={() => setShowPrivate(v => !v)}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase"
                      >
                        {showPrivate ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                    <textarea
                      value={addPrivateKey}
                      onChange={e => setAddPrivateKey(e.target.value)}
                      rows={showPrivate ? 6 : 2}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      className="w-full bg-bg-primary border border-border-light rounded px-3 py-2 text-[10px] text-red-500 outline-none focus:border-blue-500 font-mono leading-tight resize-none transition-all"
                      style={{ filter: showPrivate ? 'none' : 'blur(4px)' }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Public Identity (Optional)</label>
                    <textarea
                      value={addPublicKey}
                      onChange={e => setAddPublicKey(e.target.value)}
                      rows={2}
                      placeholder="ssh-ed25519 AAAA..."
                      className="w-full bg-bg-primary border border-border-light rounded px-3 py-2 text-[10px] text-emerald-500 outline-none focus:border-blue-500 font-mono leading-tight resize-none"
                    />
                  </div>
                </>
              ) : generatedPrivateKey ? (
                <div className="space-y-3 bg-bg-primary border border-emerald-500/20 p-4 rounded">
                  <div className="flex items-center space-x-2 text-emerald-500">
                    <ShieldCheck size={14} />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Key pair ready. Capture private key below.</p>
                  </div>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={generatedPrivateKey}
                      rows={6}
                      className="w-full bg-bg-secondary border border-border-light rounded px-3 py-2 text-[10px] text-red-500 font-mono leading-tight resize-none"
                    />
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(generatedPrivateKey);
                        setCopiedGenKey(true);
                        setTimeout(() => setCopiedGenKey(false), 2000);
                      }}
                      className="absolute top-2 right-2 px-2 py-1 bg-bg-tertiary rounded text-[9px] font-bold text-text-muted hover:text-text-primary border border-border-light transition-all"
                    >
                      {copiedGenKey ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const blob = new Blob([generatedPrivateKey], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${addLabel.replace(/\s+/g, '_')}_id_ed25519`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-bg-tertiary border border-border-light rounded text-[10px] font-bold text-text-muted hover:text-text-primary transition-all"
                    >
                      <Download size={12} />
                      <span className="uppercase">Download File</span>
                    </button>
                    <button
                      onClick={() => { setGeneratedPrivateKey(null); setShowAddForm(false); }}
                      className="flex-1 text-right text-[10px] font-bold text-blue-500 hover:underline uppercase"
                    >
                      Dismiss →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-600/5 border border-blue-500/10 rounded">
                  <p className="text-[10px] text-text-muted font-medium">
                    A secure <span className="text-blue-500 font-bold uppercase tracking-wider">Ed25519</span> key pair will be generated. 
                    The private payload will be displayed <span className="text-text-primary font-bold">ONLY ONCE</span>.
                  </p>
                </div>
              )}
            </div>

            {!generatedPrivateKey && (
              <div className="flex items-center justify-between pt-4 border-t border-border-light">
                <div className="flex items-center space-x-2 text-amber-600 opacity-70">
                  <AlertTriangle size={12} />
                  <p className="text-[9px] font-bold uppercase tracking-wider">AES-256-GCM Encrypted</p>
                </div>
                <button
                  onClick={addMode === 'paste' ? handleSave : handleGenerate}
                  disabled={saving || !addLabel.trim() || (addMode === 'paste' && !addPrivateKey.trim())}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider rounded transition-all shadow-sm"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : 'Execute Provision'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Saved Keys List */}
        <div className="bg-bg-secondary border border-border-light rounded-md p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border-light pb-3 mb-2">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Registered Keys</h2>
            <span className="text-[10px] text-text-muted font-bold px-2 py-0.5 bg-bg-primary rounded border border-border-light">
              {keys.length} ENTRIES
            </span>
          </div>

          {loadingKeys ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-500 mb-2" />
              <span className="text-[10px] font-bold text-text-muted uppercase">Scanning vault...</span>
            </div>
          ) : keys.length === 0 ? (
            <div className="py-12 text-center text-text-muted">
              <KeyRound size={32} className="mx-auto opacity-20 mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Vault is empty</p>
            </div>
          ) : (
            <div className="overflow-hidden border border-border-light rounded">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-tertiary/40 border-b border-border-light">
                    <th className="px-4 py-2 text-[9px] font-bold text-text-muted uppercase">Key Label</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-text-muted uppercase hidden sm:table-cell">Type</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-text-muted uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {keys.map(key => {
                    const keyType = parseKeyType(key.publicKey);
                    return (
                      <tr key={key.id} className="bg-bg-primary hover:bg-bg-tertiary/20 transition-colors group">
                        <td className="px-4 py-3">
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-text-primary">{key.label}</span>
                              <span className="text-[10px] font-mono text-text-muted opacity-60">MD5:{key.fingerprint}</span>
                           </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                           <span className={`px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase ${keyTypeBadgeColor(keyType)}`}>
                             {keyType}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopy(key)}
                                className="p-1.5 hover:bg-bg-tertiary rounded text-text-muted hover:text-blue-500"
                                title="Copy Public Key"
                              >
                                {copied === key.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                              </button>
                              <button
                                onClick={() => handleDelete(key.id)}
                                disabled={deleting === key.id}
                                className="p-1.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-500"
                                title="Delete"
                              >
                                {deleting === key.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Deploy Public Key */}
        {keys.length > 0 && connectedVps.length > 0 && (
          <div className="bg-bg-secondary border border-border-light rounded-md p-6 space-y-4 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <FileUp size={18} className="text-blue-500" />
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Distribute Keys</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Target Public Key</label>
                    <div className="relative">
                      <select
                        value={installKeyId}
                        onChange={e => setInstallKeyId(e.target.value)}
                        className="w-full bg-bg-primary border border-border-light rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-blue-500 font-bold appearance-none cursor-pointer"
                      >
                        <option value="">— SELECT KEY —</option>
                        {keys.map(k => (
                          <option key={k.id} value={k.id}>{k.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                  </div>

                  <div className="p-3 bg-bg-primary border border-border-light rounded">
                     <p className="text-[10px] text-text-muted leading-tight font-medium">
                        Deployment will append the selected public identity to <code className="text-text-primary font-bold">~/.ssh/authorized_keys</code> on target nodes.
                     </p>
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Destination Cluster</label>
                  <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar border border-border-light rounded bg-bg-primary p-2">
                    {connectedVps.map(v => {
                      const checked = installVpsIds.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer transition-all ${
                            checked ? 'bg-blue-600/10' : 'hover:bg-bg-tertiary/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleVpsSelection(v.id)}
                            className="accent-blue-600 w-3.5 h-3.5"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-text-primary truncate uppercase">{v.name}</p>
                            <p className="text-[9px] text-text-muted font-mono">{v.host}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex justify-end pt-3">
                    <button
                      onClick={handleInstall}
                      disabled={installing || !installKeyId || installVpsIds.length === 0}
                      className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider rounded transition-all active:scale-95 shadow-sm"
                    >
                      {installing ? <Loader2 size={12} className="animate-spin" /> : <Server size={12} />}
                      <span>Distribute to {installVpsIds.length || '?'} Nodes</span>
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyManager;
