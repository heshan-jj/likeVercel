import React, { useState } from 'react';
import { KeyRound, Download, Copy, Check, Server, Loader2, ShieldCheck, AlertTriangle, ChevronDown } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

interface GeneratedKey {
  privateKey: string;
  publicKey: string;
}

const KeyManager: React.FC = () => {
  const { showToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<GeneratedKey | null>(null);
  const [copied, setCopied] = useState<'private' | 'public' | null>(null);
  const [privateDownloaded, setPrivateDownloaded] = useState(false);

  // For installing key on a VPS (user pastes VPS ID)
  const [installVpsId, setInstallVpsId] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedKey(null);
    setPrivateDownloaded(false);
    setInstallStatus(null);
    try {
      const { data } = await api.post('/vps/keys/generate');
      setGeneratedKey(data);
      showToast('Ed25519 keypair generated', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Key generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (type: 'private' | 'public', value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    showToast(`${type === 'public' ? 'Public' : 'Private'} key copied`, 'success');
  };

  const handleDownload = (type: 'private' | 'public', value: string) => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'private' ? 'likeVercel_ed25519.pem' : 'likeVercel_ed25519.pub';
    a.click();
    URL.revokeObjectURL(url);
    if (type === 'private') setPrivateDownloaded(true);
    showToast(`${type === 'private' ? 'Private' : 'Public'} key downloaded`, 'success');
  };

  const handleInstall = async () => {
    if (!generatedKey || !installVpsId.trim()) return;
    setInstalling(true);
    setInstallStatus(null);
    try {
      await api.post(`/vps/${installVpsId.trim()}/keys/install`, { publicKey: generatedKey.publicKey });
      setInstallStatus({ ok: true, msg: 'Key installed to ~/.ssh/authorized_keys on the remote server.' });
      showToast('Public key installed on VPS', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Install failed';
      setInstallStatus({ ok: false, msg });
      showToast(msg, 'error');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-y-auto custom-scrollbar">
      {/* Header */}
      <header className="sticky top-0 z-30 px-8 py-8 flex items-center justify-between border-b border-black/20 bg-bg-primary/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-text-primary mb-1">SSH Key Manager</h1>
          <p className="text-sm text-text-muted font-medium">Generate Ed25519 keypairs and deploy them to your servers</p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 bg-blue-600/10 border border-blue-600/20 rounded-2xl">
          <ShieldCheck size={16} className="text-blue-500" />
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Ed25519</span>
        </div>
      </header>

      <div className="p-8 space-y-8 max-w-3xl">
        {/* Generate Card */}
        <div className="glass-effect border border-border-light rounded-[32px] p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-text-primary tracking-tight mb-1">Generate New Keypair</h2>
              <p className="text-xs text-text-muted font-medium">
                Creates a secure Ed25519 keypair. Save your private key immediately — it will not be stored.
              </p>
            </div>
            <div className="p-3 bg-bg-secondary rounded-2xl border border-border-light">
              <KeyRound size={24} className="text-blue-500" />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center space-x-3 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition-all active:scale-95 shadow-xl shadow-blue-600/20"
          >
            {generating ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
            <span className="uppercase tracking-widest">{generating ? 'Generating...' : 'Generate Keypair'}</span>
          </button>
        </div>

        {/* Keys Display */}
        {generatedKey && (
          <div className="glass-effect border border-border-light rounded-[32px] p-8 space-y-6">
            <div className="flex items-center space-x-3 text-amber-500">
              <AlertTriangle size={16} />
              <p className="text-xs font-bold">Save your private key now — this is the only time it will be shown.</p>
            </div>

            {/* Public Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Public Key</span>
                <div className="flex space-x-2">
                  <button onClick={() => handleCopy('public', generatedKey.publicKey)} className="flex items-center space-x-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-bg-tertiary/70 text-text-muted hover:text-text-primary rounded-xl text-xs font-bold transition-all border border-border-light">
                    {copied === 'public' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copied === 'public' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button onClick={() => handleDownload('public', generatedKey.publicKey)} className="flex items-center space-x-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-bg-tertiary/70 text-text-muted hover:text-text-primary rounded-xl text-xs font-bold transition-all border border-border-light">
                    <Download size={12} /><span>.pub</span>
                  </button>
                </div>
              </div>
              <pre className="bg-bg-secondary border border-border-light rounded-2xl p-4 text-xs text-emerald-400 font-mono break-all whitespace-pre-wrap select-all leading-relaxed">
                {generatedKey.publicKey}
              </pre>
            </div>

            {/* Private Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Private Key</span>
                <div className="flex space-x-2">
                  <button onClick={() => handleCopy('private', generatedKey.privateKey)} className="flex items-center space-x-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-bg-tertiary/70 text-text-muted hover:text-text-primary rounded-xl text-xs font-bold transition-all border border-border-light">
                    {copied === 'private' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copied === 'private' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button onClick={() => handleDownload('private', generatedKey.privateKey)} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${privateDownloaded ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-600/20'}`}>
                    {privateDownloaded ? <Check size={12} /> : <Download size={12} />}
                    <span>{privateDownloaded ? 'Downloaded' : 'Download .pem'}</span>
                  </button>
                </div>
              </div>
              <pre className="bg-bg-secondary border border-red-500/20 rounded-2xl p-4 text-xs text-red-400 font-mono break-all whitespace-pre-wrap select-all leading-relaxed">
                {generatedKey.privateKey}
              </pre>
            </div>

            {/* Install to VPS */}
            <div className="border-t border-border-light pt-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Server size={16} className="text-text-muted" />
                <h3 className="text-sm font-bold text-text-primary">Deploy to Server</h3>
              </div>
              <p className="text-xs text-text-muted">The target VPS must already be connected in the Dashboard.</p>
              <div className="flex space-x-3">
                <div className="relative flex-1">
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Paste VPS ID (from Dashboard URL)"
                    value={installVpsId}
                    onChange={e => setInstallVpsId(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-light rounded-xl px-4 py-3 text-xs text-text-primary outline-none focus:border-blue-500/50 transition-all font-mono"
                  />
                </div>
                <button
                  onClick={handleInstall}
                  disabled={installing || !installVpsId.trim()}
                  className="flex items-center space-x-2 px-6 py-3 bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-50 text-text-primary font-bold text-xs rounded-xl transition-all border border-border-light"
                >
                  {installing ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />}
                  <span className="uppercase tracking-widest">Install</span>
                </button>
              </div>
              {installStatus && (
                <div className={`p-3 rounded-xl border text-xs font-bold ${installStatus.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                  {installStatus.msg}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyManager;
