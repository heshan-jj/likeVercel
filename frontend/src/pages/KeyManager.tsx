import React, { useState, useEffect } from 'react';
import {
  KeyRound, Plus, Trash2, Copy, Check, Server, Loader2,
  ShieldCheck, AlertTriangle, ChevronDown, X,
  Wand2, Download
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

import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Card from '../components/UI/Card';
import Badge from '../components/UI/Badge';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseKeyType(publicKey: string): string {
  const prefix = publicKey.trim().split(/\s+/)[0] || '';
  if (prefix === 'ssh-ed25519') return 'Ed25519';
  if (prefix === 'ssh-rsa') return 'RSA';
  if (prefix === 'ecdsa-sha2-nistp256' || prefix === 'ecdsa-sha2-nistp384' || prefix === 'ecdsa-sha2-nistp521') return 'ECDSA';
  if (prefix === 'ssh-dss') return 'DSA';
  return prefix || 'Unknown';
}

function keyTypeBadgeVariant(type: string): 'emerald' | 'blue' | 'amber' | 'rose' | 'gray' {
  if (type === 'Ed25519') return 'emerald';
  if (type === 'RSA') return 'blue';
  if (type === 'ECDSA') return 'amber';
  return 'gray';
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
      <header className="sticky top-0 z-30 border-b border-border-light bg-bg-primary/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-end justify-between">
          <div>
            <div className="flex items-center space-x-2 text-[11px] font-semibold text-blue-500 mb-1">
               <KeyRound size={12} />
               <span>Access Vault</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">SSH Key Manager</h1>
          </div>
          <Button
            onClick={handleToggleForm}
            variant={showAddForm ? 'outline' : 'primary'}
            size="sm"
            className="px-5 py-2"
          >
            {showAddForm ? <X size={14} className="mr-2" /> : <Plus size={14} className="mr-2" />}
            <span>{showAddForm ? 'Cancel' : 'Provision Key'}</span>
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-8 max-w-4xl mx-auto w-full">
        {/* Add Key Form */}
        {showAddForm && (
          <Card className="p-6 space-y-6" glass>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                <KeyRound size={18} />
              </div>
              <h2 className="text-sm font-semibold text-text-primary">New Security Provision</h2>
              </div>

            <div className="flex bg-bg-primary/40 border border-border-light rounded-lg p-1 w-fit shadow-inner">
              <button
                onClick={() => setAddMode('paste')}
                className={`px-4 py-1.5 rounded-md text-[11px] font-semibold transition-all ${addMode === 'paste' ? 'bg-blue-600 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                Paste Content
              </button>
              <button
                onClick={() => setAddMode('generate')}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-[11px] font-semibold transition-all ${addMode === 'generate' ? 'bg-blue-600 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                <Wand2 size={12} />
                <span>Generate Pair</span>
              </button>
            </div>

            <div className="space-y-5">
              <Input
                label="Key Label"
                value={addLabel}
                onChange={e => setAddLabel(e.target.value)}
                placeholder="e.g. Production Access Key"
              />

              {addMode === 'paste' ? (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[11px] font-semibold text-text-secondary">Private Payload</label>
                      <button
                        type="button"
                        onClick={() => setShowPrivate(v => !v)}
                        className="text-[11px] font-semibold text-blue-500 hover:text-blue-400"
                      >
                        {showPrivate ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                    <textarea
                      value={addPrivateKey}
                      onChange={e => setAddPrivateKey(e.target.value)}
                      rows={showPrivate ? 6 : 2}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      className="w-full bg-bg-primary/40 border border-border-light rounded-lg px-3 py-2 text-[11px] text-red-500 outline-none focus:border-blue-500 font-mono leading-relaxed resize-none transition-all shadow-inner shadow-black/[0.02]"
                      style={{ filter: showPrivate ? 'none' : 'blur(4px)' }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-text-secondary px-1">Public Identity (Optional)</label>
                    <textarea
                      value={addPublicKey}
                      onChange={e => setAddPublicKey(e.target.value)}
                      rows={2}
                      placeholder="ssh-ed25519 AAAA..."
                      className="w-full bg-bg-primary/40 border border-border-light rounded-lg px-3 py-2 text-[11px] text-emerald-500 outline-none focus:border-blue-500 font-mono leading-relaxed resize-none shadow-inner shadow-black/[0.02]"
                    />
                  </div>
                </>
              ) : generatedPrivateKey ? (
                <div className="space-y-4 bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-xl">
                  <div className="flex items-center space-x-2 text-emerald-500">
                    <ShieldCheck size={16} />
                    <p className="text-[11px] font-semibold">Key pair ready. Capture private key below.</p>
                  </div>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={generatedPrivateKey}
                      rows={6}
                      className="w-full bg-bg-secondary border border-border-light rounded-lg px-3 py-2 text-[11px] text-red-500 font-mono leading-relaxed resize-none shadow-inner"
                    />
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(generatedPrivateKey);
                        setCopiedGenKey(true);
                        setTimeout(() => setCopiedGenKey(false), 2000);
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 bg-bg-tertiary rounded-md text-[10px] font-semibold text-text-muted hover:text-text-primary border border-border-light transition-all shadow-sm"
                    >
                      {copiedGenKey ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex items-center space-x-3">
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
                      className="flex items-center space-x-2 px-3 py-1.5 bg-bg-tertiary border border-border-light rounded-md text-[10px] font-semibold text-text-muted hover:text-text-primary transition-all shadow-sm"
                    >
                      <Download size={14} />
                      <span>Download File</span>
                    </button>
                    <button
                      onClick={() => { setGeneratedPrivateKey(null); setShowAddForm(false); }}
                      className="flex-1 text-right text-[11px] font-semibold text-blue-500 hover:underline"
                    >
                      Dismiss →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    A secure <span className="text-blue-500 font-semibold">Ed25519</span> key pair will be generated. 
                    The private payload will be displayed <span className="text-text-primary font-semibold underline underline-offset-4 decoration-blue-500/30">ONLY ONCE</span>.
                  </p>
                </div>
              )}
            </div>

            {!generatedPrivateKey && (
              <div className="flex items-center justify-between pt-5 border-t border-border-light">
                <div className="flex items-center space-x-2 text-amber-500 opacity-80">
                  <AlertTriangle size={14} />
                  <p className="text-[10px] font-semibold">AES-256-GCM Encrypted</p>
                </div>
                <Button
                  onClick={addMode === 'paste' ? handleSave : handleGenerate}
                  disabled={saving || !addLabel.trim() || (addMode === 'paste' && !addPrivateKey.trim())}
                  isLoading={saving}
                  size="md"
                  className="px-6"
                >
                  Execute Provision
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Saved Keys List */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-border-light pb-4">
            <h2 className="text-sm font-semibold text-text-primary">Registered Identities</h2>
            <Badge variant="gray" className="px-2 py-0.5">
              {keys.length} Entries
            </Badge>
          </div>

          {loadingKeys ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-500 mb-3 opacity-80" />
              <span className="text-[11px] font-medium text-text-muted">Scanning vault...</span>
            </div>
          ) : keys.length === 0 ? (
            <div className="py-16 text-center text-text-muted bg-bg-primary/20 rounded-xl border border-dashed border-border-light">
              <KeyRound size={40} className="mx-auto opacity-10 mb-3" />
              <p className="text-xs font-medium">Vault is currently empty</p>
            </div>
          ) : (
            <div className="overflow-hidden border border-border-light rounded-lg shadow-sm shadow-black/[0.01]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-tertiary/20 border-b border-border-light">
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary tracking-tight">Key Identity</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary tracking-tight hidden sm:table-cell text-center">Type</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-secondary tracking-tight text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {keys.map(key => {
                    const keyType = parseKeyType(key.publicKey);
                    return (
                      <tr key={key.id} className="bg-bg-secondary hover:bg-bg-tertiary/20 transition-colors group">
                        <td className="px-5 py-4">
                           <div className="flex flex-col">
                              <span className="text-xs font-semibold text-text-primary group-hover:text-blue-500 transition-colors">{key.label}</span>
                              <span className="text-[10px] font-mono text-text-muted opacity-60 mt-0.5">MD5:{key.fingerprint}</span>
                           </div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell text-center">
                           <Badge variant={keyTypeBadgeVariant(keyType)} className="px-2 font-mono text-[9px]">
                             {keyType}
                           </Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                           <div className="flex items-center justify-end space-x-2 sm:opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleCopy(key)}
                                className="p-2 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-blue-500 transition-colors border border-transparent hover:border-border-light"
                                title="Copy Public Key"
                              >
                                {copied === key.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                              </button>
                              <button
                                onClick={() => handleDelete(key.id)}
                                disabled={deleting === key.id}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-500 transition-colors border border-transparent hover:border-red-500/20"
                                title="Delete"
                              >
                                {deleting === key.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
        </Card>

        {/* Deploy Public Key */}
        {keys.length > 0 && connectedVps.length > 0 && (
          <Card className="p-6 space-y-5" glass>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                <KeyRound size={18} />
              </div>
              <h2 className="text-sm font-semibold text-text-primary">New Security Provision</h2>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-text-secondary px-1">Source Public Key</label>
                    <div className="relative">
                      <select
                        value={installKeyId}
                        onChange={e => setInstallKeyId(e.target.value)}
                        className="w-full bg-bg-primary/40 border border-border-light rounded-lg px-4 py-2.5 text-xs text-text-primary outline-none focus:border-blue-500 font-semibold appearance-none cursor-pointer shadow-sm"
                      >
                        <option value="">— Select source key —</option>
                        {keys.map(k => (
                          <option key={k.id} value={k.id}>{k.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                  </div>

                  <div className="p-4 bg-bg-primary/40 border border-border-light rounded-lg shadow-inner">
                     <p className="text-[11px] text-text-muted leading-relaxed">
                        Deployment will append the selected public identity to <code className="text-text-primary font-semibold bg-bg-tertiary px-1 rounded">authorized_keys</code> on target nodes.
                     </p>
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-text-secondary px-1">Destination Nodes</label>
                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar border border-border-light rounded-lg bg-bg-primary/40 p-3 shadow-inner">
                    {connectedVps.map(v => {
                      const checked = installVpsIds.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                            checked ? 'bg-blue-600/10 border-blue-500/20' : 'hover:bg-bg-tertiary/60 border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleVpsSelection(v.id)}
                            className="accent-blue-600 w-4 h-4 rounded"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-text-primary truncate">{v.name}</p>
                            <p className="text-[10px] text-text-muted font-mono opacity-70">{v.host}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleInstall}
                      disabled={installing || !installKeyId || installVpsIds.length === 0}
                      isLoading={installing}
                      size="sm"
                      className="px-6"
                    >
                      <Server size={14} className="mr-2" />
                      <span>Distribute to {installVpsIds.length || '?'} Nodes</span>
                    </Button>
                  </div>
               </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default KeyManager;
