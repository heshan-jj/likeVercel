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
    <div className="p-1 rounded bg-blue-500/10 text-blue-600">
      <Folder size={12} />
    </div>
  );
  
  const ext = name.split('.').pop()?.toLowerCase() || '';
  let colorClass = 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400';
  let icon = <File size={12} />;

  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'html', 'vue', 'svelte'].includes(ext)) {
    colorClass = 'bg-indigo-50 text-indigo-600';
    icon = <FileCode size={12} />;
  } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext)) {
    colorClass = 'bg-rose-50 text-rose-600';
    icon = <ImageIcon size={12} />;
  } else if (['zip', 'gz', 'tar', 'rar', '7z', 'bz2'].includes(ext)) {
    colorClass = 'bg-amber-50 text-amber-600';
    icon = <Archive size={12} />;
  } else if (['md', 'txt', 'log', 'json', 'yaml', 'yml', 'toml', 'xml', 'csv', 'env'].includes(ext)) {
    colorClass = 'bg-slate-50 text-slate-600';
    icon = <FileText size={12} />;
  }

  return (
    <div className={`p-1 rounded ${colorClass}`}>
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
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input 
            type="text" 
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-secondary border border-border-light rounded pl-8 pr-3 py-1.5 text-xs text-text-primary outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="flex items-center space-x-2">
          <button 
             onClick={() => navigateTo(currentPath)}
             className="p-1.5 bg-bg-tertiary hover:bg-bg-tertiary text-text-secondary rounded border border-border-light"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
             onClick={() => setShowNewFolder(true)}
             className="p-1.5 bg-bg-tertiary hover:bg-bg-tertiary text-text-secondary rounded border border-border-light"
             title="New Folder"
          >
            <FolderPlus size={14} />
          </button>
          <label className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer transition-all">
            <Upload size={14} />
            <input type="file" multiple className="hidden" onChange={handleInputChange} ref={fileInputRef} />
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded flex items-center justify-between text-xs font-bold">
          <div className="flex items-center space-x-2">
             <X size={16} />
             <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded"><X size={14} /></button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center space-x-1 text-xs font-bold overflow-hidden px-1">
        <button 
          onClick={() => navigateTo('/')}
          className="p-1 hover:bg-bg-tertiary rounded text-text-muted hover:text-blue-500 transition-colors"
        >
          <Home size={14} />
        </button>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={12} className="text-text-muted/30 shrink-0" />
            <button 
              onClick={() => navigateTo('/' + breadcrumbs.slice(0, i + 1).join('/'))}
              className="px-1.5 py-0.5 hover:bg-bg-tertiary rounded text-text-secondary hover:text-blue-500 transition-colors whitespace-nowrap"
            >
              {crumb}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* File List Table */}
      <div 
        className={`flex-1 overflow-auto border border-border-light rounded bg-bg-secondary/20 transition-all ${isDragging ? 'ring-2 ring-blue-500 bg-blue-500/5' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-light bg-bg-tertiary/40">
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase">Name</th>
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase hidden sm:table-cell text-right">Size</th>
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase hidden md:table-cell text-right">Modified</th>
              <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {currentPath !== '/' && (
              <tr 
                onClick={navigateUp}
                className="hover:bg-bg-tertiary/30 cursor-pointer group"
              >
                <td colSpan={4} className="px-4 py-2">
                   <div className="flex items-center space-x-3">
                     <div className="p-1 rounded bg-bg-tertiary text-text-muted">
                        <ArrowUp size={12} />
                     </div>
                     <span className="text-xs font-bold text-text-muted italic">..</span>
                   </div>
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                   <Loader2 size={24} className="text-blue-500 animate-spin mx-auto mb-2" />
                   <span className="text-[10px] font-bold text-text-muted uppercase">Indexing...</span>
                </td>
              </tr>
            ) : files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-text-muted text-xs font-bold">No files found.</td>
              </tr>
            ) : (
              files
                .filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .sort((a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0))
                .map((file) => (
                  <tr 
                    key={file.path} 
                    onClick={() => file.isDirectory && navigateTo(file.path)}
                    className="hover:bg-bg-tertiary/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-2">
                       <div className="flex items-center space-x-3">
                          <div className="shrink-0">{getFileIcon(file.name, file.isDirectory)}</div>
                          <span className="text-xs font-bold text-text-primary group-hover:text-blue-500 transition-colors truncate max-w-[200px]">{file.name}</span>
                       </div>
                    </td>
                    <td className="px-4 py-2 text-right text-[10px] font-mono text-text-muted hidden sm:table-cell">
                       {file.isDirectory ? 'DIR' : formatBytes(file.size)}
                    </td>
                    <td className="px-4 py-2 text-right text-[10px] font-bold text-text-muted hidden md:table-cell uppercase">
                       {timeAgo(file.modifiedAt)}
                    </td>
                    <td className="px-4 py-2 text-right">
                       <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!file.isDirectory && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDownload(file.path, file.name); }}
                              className="p-1 hover:bg-bg-tertiary rounded text-text-muted hover:text-blue-500"
                            >
                              <Download size={14} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setRenamingFile(file.path); setRenameValue(file.name); }}
                            className="p-1 hover:bg-bg-tertiary rounded text-text-muted hover:text-blue-500"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(file.path, file.name); }}
                            className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-500"
                          >
                            <Trash2 size={14} />
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
        <div className="p-3 bg-bg-secondary border border-blue-500/20 rounded shadow-lg">
           <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Streaming Payload</span>
              <span className="text-[10px] font-mono font-bold text-text-primary">{uploadProgress}%</span>
           </div>
           <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
           </div>
        </div>
      )}

      {/* Modals */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-primary w-full max-w-sm rounded border border-border-light shadow-2xl p-6">
            <h3 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-tight">Create New Folder</h3>
            <input
              autoFocus
              className="w-full bg-bg-secondary border border-border-light rounded px-3 py-2 text-xs font-mono mb-6 outline-none focus:border-blue-500"
              placeholder="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowNewFolder(false)} className="px-3 py-1.5 text-text-muted hover:text-text-primary text-xs font-bold">Cancel</button>
              <button 
                onClick={handleCreateFolder}
                disabled={actionLoading === 'mkdir' || !newFolderName.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs disabled:opacity-50"
              >
                {actionLoading === 'mkdir' ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {renamingFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-primary w-full max-w-sm rounded border border-border-light shadow-2xl p-6">
            <h3 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-tight">Rename Asset</h3>
            <input
              autoFocus
              className="w-full bg-bg-secondary border border-border-light rounded px-3 py-2 text-xs font-mono mb-6 outline-none focus:border-blue-500"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setRenamingFile(null)} className="px-3 py-1.5 text-text-muted hover:text-text-primary text-xs font-bold">Cancel</button>
              <button 
                onClick={handleRename}
                disabled={actionLoading === 'rename' || !renameValue.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs disabled:opacity-50"
              >
                {actionLoading === 'rename' ? <Loader2 size={14} className="animate-spin" /> : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeletePath && (
        <ConfirmModal
          title="Permanently Delete?"
          message={`Are you absolutely sure you want to remove "${confirmDeletePath.name}"? This action is irreversible.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeletePath(null)}
        />
      )}
    </div>
  );
};

export default FileManager;
