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
  Film,
  Music,
  X,
  Check,
  Loader2,
  Search
} from 'lucide-react';
import api from '../../utils/api';

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
  if (isDirectory) return <Folder size={16} className="text-blue-500" />;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'html', 'vue', 'svelte'].includes(ext))
    return <FileCode size={16} className="text-indigo-500" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext))
    return <ImageIcon size={16} className="text-pink-500" />;
  if (['zip', 'gz', 'tar', 'rar', '7z', 'bz2'].includes(ext))
    return <Archive size={16} className="text-amber-500" />;
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext))
    return <Film size={16} className="text-emerald-500" />;
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext))
    return <Music size={16} className="text-orange-500" />;
  if (['md', 'txt', 'log', 'json', 'yaml', 'yml', 'toml', 'xml', 'csv', 'env'].includes(ext))
    return <FileText size={16} className="text-text-muted" />;
  return <File size={16} className="text-text-muted" />;
}

const FileManager: React.FC<FileManagerProps> = ({ vpsId }) => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/vps/${vpsId}/files`, { params: { path } });
      setFiles(data.files);
      setCurrentPath(data.path);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load files');
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentPath);

    setUploadProgress(0);
    try {
      await api.post(`/vps/${vpsId}/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });
      fetchFiles(currentPath);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setActionLoading('mkdir');
    try {
      const newPath = currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`;
      await api.post(`/vps/${vpsId}/files/mkdir`, { path: newPath });
      setShowNewFolder(false);
      setNewFolderName('');
      fetchFiles(currentPath);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create directory');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (filePath: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    setActionLoading(filePath);
    try {
      await api.delete(`/vps/${vpsId}/files`, { params: { path: filePath } });
      fetchFiles(currentPath);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const response = await api.get(`/vps/${vpsId}/files/download`, {
        params: { path: filePath },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Download failed');
    }
  };

  const handleRename = async (oldPath: string) => {
    if (!renameValue.trim()) return;
    setActionLoading(oldPath);
    const parentDir = oldPath.split('/').slice(0, -1).join('/') || '/';
    const newPath = parentDir === '/' ? `/${renameValue}` : `${parentDir}/${renameValue}`;
    try {
      await api.put(`/vps/${vpsId}/files/rename`, { oldPath, newPath });
      setRenamingFile(null);
      setRenameValue('');
      fetchFiles(currentPath);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Rename failed');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search and Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-1 flex-1 min-w-0 bg-bg-secondary border border-border-light rounded-xl px-4 py-2.5 overflow-x-auto no-scrollbar shadow-inner">
          <button
            onClick={() => navigateTo('/')}
            className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all flex-shrink-0"
            title="Root Storage"
          >
            <Home size={16} />
          </button>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={14} className="text-text-muted/30 flex-shrink-0" />
              <button
                onClick={() => navigateTo('/' + breadcrumbs.slice(0, i + 1).join('/'))}
                className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all tracking-tight ${
                  i === breadcrumbs.length - 1 
                  ? 'text-text-primary bg-bg-tertiary/20 cursor-default shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/30'
                }`}
              >
                {crumb}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Global Search */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search filenames..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-secondary border border-border-light rounded-xl pl-9 pr-4 py-2.5 text-xs text-text-primary outline-none focus:border-blue-500/50 transition-all font-medium"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button onClick={navigateUp} className="p-2.5 bg-bg-tertiary/50 hover:bg-bg-tertiary text-text-secondary rounded-xl border border-border-light transition-all shadow-md">
            <ArrowUp size={18} />
          </button>
          <button onClick={() => fetchFiles(currentPath)} className="p-2.5 bg-bg-tertiary/50 hover:bg-bg-tertiary text-text-secondary rounded-xl border border-border-light transition-all shadow-md">
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
          </button>
          <div className="w-px h-6 bg-border-light mx-1" />
          <button onClick={() => setShowNewFolder(true)} className="p-2.5 bg-bg-tertiary/50 hover:bg-bg-tertiary text-text-secondary rounded-xl border border-border-light transition-all shadow-md">
            <FolderPlus size={18} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-xl active:scale-95">
            <Upload size={18} />
            <span className="hidden xl:inline">Upload</span>
          </button>
          <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" />
        </div>
      </div>

      {/* Progress and Warnings */}
      {uploadProgress !== null && (
        <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden shadow-inner">
           <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-between text-xs font-bold animate-in slide-in-from-top-2">
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded-md transition-all"><X size={16} /></button>
        </div>
      )}

      {showNewFolder && (
        <div className="p-4 bg-bg-secondary border border-blue-500/20 rounded-2xl flex items-center space-x-4 animate-in zoom-in-95 duration-200 shadow-xl">
           <Folder size={18} className="text-blue-500" />
           <input 
              autoFocus
              className="flex-1 bg-transparent border-none text-text-primary outline-none text-sm placeholder-text-muted font-mono"
              placeholder="New directory name..."
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowNewFolder(false);
              }}
           />
           <div className="flex space-x-2">
              <button 
                onClick={handleCreateFolder}
                className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
              >
                {actionLoading === 'mkdir' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              </button>
              <button 
                onClick={() => setShowNewFolder(false)}
                className="p-2 bg-text-muted/10 text-text-muted hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
           </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 bg-bg-secondary/40 rounded-[32px] border border-border-light overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-secondary/80 text-[10px] font-bold uppercase tracking-widest text-text-muted sticky top-0 z-10">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4 w-28 text-right">Size</th>
                <th className="px-6 py-4 w-36 text-right">Permissions</th>
                <th className="px-6 py-4 w-40 text-right">Modified</th>
                <th className="px-6 py-4 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-xs font-bold text-text-muted">
                    <div className="flex flex-col items-center">
                      <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
                      <span className="uppercase tracking-widest">Reading Storage...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-xs font-bold text-text-muted uppercase tracking-widest">
                    Directory is empty
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => (
                  <tr 
                    key={file.path}
                    className="group hover:bg-bg-tertiary/10 transition-colors cursor-default"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-xl bg-bg-tertiary/30 group-hover:bg-bg-tertiary/50 transition-colors shadow-inner">
                          {getFileIcon(file.name, file.isDirectory)}
                        </div>
                        {renamingFile === file.path ? (
                          <div className="flex-1 flex items-center space-x-2">
                             <input 
                                autoFocus
                                className="bg-bg-primary border border-blue-500/50 rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none font-mono"
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRename(file.path);
                                  if (e.key === 'Escape') setRenamingFile(null);
                                }}
                             />
                             <button onClick={() => handleRename(file.path)} className="text-emerald-500 p-1 hover:bg-emerald-500/10 rounded-md"><Check size={18} /></button>
                             <button onClick={() => setRenamingFile(null)} className="text-red-500 p-1 hover:bg-red-500/10 rounded-md"><X size={18} /></button>
                          </div>
                        ) : (
                          <span 
                            onClick={() => file.isDirectory && navigateTo(file.path)}
                            className={`text-xs font-bold truncate max-w-[300px] xl:max-w-md ${file.isDirectory ? 'text-text-primary cursor-pointer hover:text-blue-500' : 'text-text-secondary'}`}
                          >
                            {file.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-[10px] text-text-muted">
                      {file.isDirectory ? '—' : formatBytes(file.size)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-[10px] text-text-muted tracking-wider">
                      {file.permissions || '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-[10px] text-text-muted font-bold tracking-tight">
                      {timeAgo(file.modifiedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!file.isDirectory && (
                          <button onClick={() => handleDownload(file.path, file.name)} className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary/20 transition-colors" title="Download">
                            <Download size={14} />
                          </button>
                        )}
                        <button onClick={() => { setRenamingFile(file.path); setRenameValue(file.name); }} className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary/20 transition-colors" title="Rename">
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(file.path, file.name)} 
                          className="p-2 text-text-muted hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10" 
                          disabled={actionLoading === file.path}
                        >
                          {actionLoading === file.path ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-8 py-3 bg-bg-secondary border-t border-border-light flex items-center justify-between text-[10px] font-bold text-text-muted">
           <div className="flex items-center space-x-4">
              <span>{filteredFiles.length} items</span>
              <span className="h-1 w-1 bg-border-light rounded-full" />
              <span>{files.filter(f => f.isDirectory).length} folders</span>
           </div>
           <div className="flex items-center space-x-2">
              <span className="font-mono text-blue-500/80 lowercase">{currentPath}</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default FileManager;
