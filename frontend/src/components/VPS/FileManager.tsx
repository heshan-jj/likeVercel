import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  File,
  ChevronRight,
  Home,
  Upload,
  FolderPlus,
  Download,
  Trash2,
  Edit3,
  RefreshCw,
  ArrowUp,
  FileText,
  FileCode,
  Image as ImageIcon,
  Archive,
  X,
  Loader2,
  Search
} from 'lucide-react';
import api from '../../utils/api';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../context/ToastContext';
import Button from '../UI/Button';
import Input from '../UI/Input';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
  permissions?: string;
}

interface FileManagerProps {
  vpsId: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getFileIcon(name: string, isDirectory: boolean) {
  if (isDirectory) return (
    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shadow-inner">
      <Folder size={14} />
    </div>
  );
  
  const ext = name.split('.').pop()?.toLowerCase() || '';
  let colorClass = 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400';
  let icon = <File size={14} />;

  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'html', 'vue', 'svelte'].includes(ext)) {
    colorClass = 'bg-indigo-50 text-indigo-600';
    icon = <FileCode size={14} />;
  } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext)) {
    colorClass = 'bg-rose-50 text-rose-600';
    icon = <ImageIcon size={14} />;
  } else if (['zip', 'gz', 'tar', 'rar', '7z', 'bz2'].includes(ext)) {
    colorClass = 'bg-amber-50 text-amber-500';
    icon = <Archive size={14} />;
  } else if (['md', 'txt', 'log', 'json', 'yaml', 'yml', 'toml', 'xml', 'csv', 'env'].includes(ext)) {
    colorClass = 'bg-slate-50 text-slate-600';
    icon = <FileText size={14} />;
  }

  return (
    <div className={`p-1.5 rounded-lg shadow-inner ${colorClass}`}>
      {icon}
    </div>
  );
}

const FileManager: React.FC<FileManagerProps> = ({ vpsId }) => {
  const { showToast } = useToast();
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDeletePath, setConfirmDeletePath] = useState<{ path: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/vps/${vpsId}/files`, { params: { path, systemAccess: true } });
      setFiles(data.files);
      setCurrentPath(data.path);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [vpsId]);

  useEffect(() => {
    fetchFiles('/');
  }, [fetchFiles]);

  const navigateTo = (path: string) => {
    fetchFiles(path);
  };

  const navigateUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    navigateTo(parent);
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  const handleUpload = async (filesToUpload: FileList | File[]) => {
    const fileArray = Array.from(filesToUpload);
    if (fileArray.length === 0) return;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', currentPath);
      setUploadProgress(0);
      try {
        await api.post(`/vps/${vpsId}/files/upload`, formData, {
        params: { systemAccess: true },
        headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
            }
          },
        });
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string } }; message: string };
        setError(`Upload failed for "${file.name}": ${error.response?.data?.error || error.message}`);
      }
    }
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast(fileArray.length === 1 ? `"${fileArray[0].name}" uploaded` : `${fileArray.length} files uploaded`, 'success');
    fetchFiles(currentPath);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleUpload(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setActionLoading('mkdir');
    try {
      const newPath = currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`;
      await api.post(`/vps/${vpsId}/files/mkdir`, { path: newPath, systemAccess: true });
      setShowNewFolder(false);
      setNewFolderName('');
      fetchFiles(currentPath);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create directory');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (filePath: string, fileName: string) => {
    setConfirmDeletePath({ path: filePath, name: fileName });
  };

  const confirmDelete = async () => {
    if (!confirmDeletePath) return;
    setActionLoading(confirmDeletePath.path);
    try {
      await api.delete(`/vps/${vpsId}/files`, { params: { path: confirmDeletePath.path, systemAccess: true } });
      showToast(`"${confirmDeletePath.name}" deleted`, 'success');
      fetchFiles(currentPath);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Delete failed');
    } finally {
      setActionLoading(null);
      setConfirmDeletePath(null);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const response = await api.get(`/vps/${vpsId}/files/download`, {
        params: { path: filePath, systemAccess: true },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || 'Download failed', 'error');
    }
  };

  const handleRename = async () => {
    if (!renamingFile || !renameValue.trim()) return;
    setActionLoading('rename');
    try {
      const parentPath = currentPath === '/' ? '' : currentPath;
      const newPath = `${parentPath}/${renameValue}`;
      await api.put(`/vps/${vpsId}/files/rename`, { oldPath: renamingFile, newPath, systemAccess: true });
      setRenamingFile(null);
      fetchFiles(currentPath);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Rename failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search and Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input 
            type="text" 
            placeholder="Search host file system..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-secondary border border-border-light rounded-lg pl-9 pr-4 py-2 text-xs text-text-primary outline-none focus:border-blue-500/50 shadow-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button 
             variant="secondary"
             onClick={() => navigateTo(currentPath)}
             size="sm"
             className="h-9 w-9 p-0"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button 
             variant="secondary"
             onClick={() => setShowNewFolder(true)}
             size="sm"
             className="h-9 w-9 p-0"
             title="New Folder"
          >
            <FolderPlus size={16} />
          </Button>
          <label className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-md flex items-center justify-center cursor-pointer transition-all shadow-sm active:scale-95">
            <Upload size={16} className="mr-2" />
            <span className="text-xs font-semibold">Upload</span>
            <input type="file" multiple className="hidden" onChange={handleInputChange} ref={fileInputRef} />
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm">
          <div className="flex items-center space-x-3">
             <X size={16} />
             <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded"><X size={14} /></button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center space-x-1 text-xs font-semibold overflow-hidden px-1">
        <button 
          onClick={() => navigateTo('/')}
          className="p-1.5 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-blue-500 transition-colors"
        >
          <Home size={14} />
        </button>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={14} className="text-text-muted/20 shrink-0" />
            <button 
              onClick={() => navigateTo('/' + breadcrumbs.slice(0, i + 1).join('/'))}
              className="px-2 py-1 hover:bg-bg-tertiary rounded-lg text-text-secondary hover:text-blue-500 transition-colors whitespace-nowrap tracking-tight"
            >
              {crumb}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* File List Table */}
      <div 
        className={`flex-1 overflow-auto border border-border-light rounded-xl bg-bg-secondary/40 transition-all shadow-sm shadow-black/[0.01] ${isDragging ? 'ring-2 ring-blue-500 bg-blue-500/5' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-light bg-bg-tertiary/20 backdrop-blur-sm">
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight">Identity</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight hidden sm:table-cell text-right">Size</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight hidden md:table-cell text-right">Last Modified</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-text-secondary tracking-tight text-right">Terminal Commands</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light/60">
            {currentPath !== '/' && (
              <tr 
                onClick={navigateUp}
                className="hover:bg-bg-tertiary/20 cursor-pointer group"
              >
                <td colSpan={4} className="px-5 py-3">
                   <div className="flex items-center space-x-3">
                     <div className="p-1.5 rounded-lg bg-bg-tertiary text-text-muted shadow-inner">
                        <ArrowUp size={14} />
                     </div>
                     <span className="text-[11px] font-semibold text-text-muted italic opacity-60">Navigate to parent</span>
                   </div>
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={4} className="py-20 text-center">
                   <Loader2 size={32} className="text-blue-500 animate-spin mx-auto mb-4 opacity-80" />
                   <span className="text-[11px] font-semibold text-text-muted">Indexing host partition...</span>
                </td>
              </tr>
            ) : files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
              <tr>
                <td colSpan={4} className="py-20 text-center text-text-muted">
                   <Folder size={40} className="mx-auto opacity-10 mb-4" />
                   <p className="text-[11px] font-medium">Directory is currently empty</p>
                </td>
              </tr>
            ) : (
              files
                .filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .sort((a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0))
                .map((file) => (
                  <tr 
                    key={file.path} 
                    onClick={() => file.isDirectory && navigateTo(file.path)}
                    className="hover:bg-bg-tertiary/20 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-2.5">
                       <div className="flex items-center space-x-4">
                          <div className="shrink-0">{getFileIcon(file.name, file.isDirectory)}</div>
                          <span className="text-xs font-semibold text-text-primary group-hover:text-blue-500 transition-colors truncate max-w-[200px] tracking-tight">{file.name}</span>
                       </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11px] font-mono text-text-muted hidden sm:table-cell opacity-70">
                       {file.isDirectory ? 'DIR' : formatBytes(file.size)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-muted hidden md:table-cell opacity-60">
                       {timeAgo(file.modifiedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                       <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!file.isDirectory && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDownload(file.path, file.name); }}
                              className="p-2 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-blue-500 border border-transparent hover:border-border-light shadow-sm transition-all"
                              title="Download"
                            >
                              <Download size={16} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setRenamingFile(file.path); setRenameValue(file.name); }}
                            className="p-2 hover:bg-bg-tertiary rounded-lg text-text-muted hover:text-blue-500 border border-transparent hover:border-border-light shadow-sm transition-all"
                            title="Rename"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(file.path, file.name); }}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-500 border border-transparent hover:border-red-500/20 shadow-sm transition-all"
                            title="Purge"
                          >
                            <Trash2 size={16} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {uploadProgress !== null && (
        <div className="p-4 bg-bg-secondary/90 backdrop-blur-md border border-blue-500/20 rounded-xl shadow-xl fixed bottom-6 right-6 w-72 animate-in slide-in-from-right-4">
           <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-blue-500 tracking-wider">UPSTREAM STREAM</span>
              <span className="text-[11px] font-mono font-bold text-text-primary">{uploadProgress}%</span>
           </div>
           <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
           </div>
        </div>
      )}

      {/* Modals */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-6" onClick={() => setShowNewFolder(false)}>
          <div className="bg-bg-secondary/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] border border-border-light shadow-2xl p-8 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary mb-6 tracking-tight">Provision Directory</h3>
            <Input
              autoFocus
              className="font-mono text-sm mb-8"
              placeholder="e.g. storage_v2"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setShowNewFolder(false)} size="sm">Cancel</Button>
              <Button 
                onClick={handleCreateFolder}
                disabled={actionLoading === 'mkdir' || !newFolderName.trim()}
                isLoading={actionLoading === 'mkdir'}
                size="sm"
                className="px-6"
              >
                Execute
              </Button>
            </div>
          </div>
        </div>
      )}

      {renamingFile && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-6" onClick={() => setRenamingFile(null)}>
          <div className="bg-bg-secondary/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] border border-border-light shadow-2xl p-8 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary mb-6 tracking-tight">Modify Asset Identity</h3>
            <Input
              autoFocus
              className="font-mono text-sm mb-8"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setRenamingFile(null)} size="sm">Cancel</Button>
              <Button 
                onClick={handleRename}
                disabled={actionLoading === 'rename' || !renameValue.trim()}
                isLoading={actionLoading === 'rename'}
                size="sm"
                className="px-6"
              >
                Execute
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmDeletePath && (
        <ConfirmModal
          title="Assumption of Purge"
          message={`Are you absolutely sure you want to remove "${confirmDeletePath.name}"? This action permanently wipes the host asset.`}
          confirmLabel="Execute Purge"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeletePath(null)}
        />
      )}
    </div>
  );
};

export default FileManager;
