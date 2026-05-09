import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io, Socket } from 'socket.io-client';
import { Maximize2, Minimize2, Eraser } from 'lucide-react';
import 'xterm/css/xterm.css';

interface XtermTerminalProps {
  vpsId: string;
  vpsHost?: string;
  vpsUsername?: string;
}

const XtermTerminal: React.FC<XtermTerminalProps> = ({ vpsId, vpsHost, vpsUsername }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleClear = () => {
    xtermRef.current?.clear();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(v => !v);
    // After toggling, re-fit after the transition
    setTimeout(() => fitAddonRef.current?.fit(), 150);
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0f172a',
        foreground: '#f8fafc',
        cursor: '#3b82f6',
        selectionBackground: 'rgba(59, 130, 246, 0.3)',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initialize socket
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const socket = io(baseUrl, {
      withCredentials: true,
    });

    socketRef.current = socket;

    // Function to sync dimensions
    const syncDimensions = () => {
      if (!term || !fitAddon) return;
      try {
        fitAddon.fit();
        if (term.rows && term.cols) {
          socket.emit('terminal-resize', {
            rows: term.rows,
            cols: term.cols,
          });
        }
      } catch (e) {
        console.warn('[Xterm] fit error:', e);
      }
    };

    socket.on('connect', () => {
      term.write('\x1b[1;32m[SYSTEM] Connected to terminal server...\x1b[0m\r\n');
      socket.emit('start-terminal', { vpsId });
    });

    socket.on('terminal-output', (data: string | ArrayBuffer) => {
      if (typeof data === 'string') {
        term.write(data);
      } else {
        term.write(new Uint8Array(data));
      }
    });

    socket.on('terminal-ready', () => {
      term.write('\x1b[1;32m[SYSTEM] Terminal session established.\x1b[0m\r\n');
      term.focus();
      // Important: fit and sync immediately after session is ready
      setTimeout(syncDimensions, 100);
    });

    socket.on('terminal-error', (msg: string) => {
      term.write(`\r\n\x1b[1;31m[ERROR] ${msg}\x1b[0m\r\n`);
    });

    socket.on('terminal-closed', () => {
      term.write('\r\n\x1b[1;33m[SYSTEM] Terminal session closed.\x1b[0m\r\n');
    });

    socket.on('connect_error', (err) => {
      console.error('[Xterm] Socket connection error:', err);
      term.write(`\r\n\x1b[1;31m[SYSTEM] Connection error: ${err.message}\x1b[0m\r\n`);
    });

    socket.on('error', (err) => {
      console.error('[Xterm] Socket error:', err);
      term.write(`\r\n\x1b[1;31m[SYSTEM] Socket error: ${err}\x1b[0m\r\n`);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Xterm] Socket disconnected:', reason);
      term.write(`\r\n\x1b[1;31m[SYSTEM] Connection lost: ${reason}\x1b[0m\r\n`);
    });

    term.onData((data) => {
      socket.emit('terminal-input', data);
    });

    // Use ResizeObserver instead of window resize for better accuracy within layout
    const resizeObserver = new ResizeObserver(() => {
      syncDimensions();
    });
    
    resizeObserver.observe(terminalRef.current);
    resizeObserverRef.current = resizeObserver;

    return () => {
      resizeObserver.disconnect();
      socket.disconnect();
      term.dispose();
    };
  }, [vpsId]);

  const hostLabel = vpsUsername && vpsHost ? `${vpsUsername}@${vpsHost}` : 'terminal';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-[200] rounded-none' : 'h-full rounded-2xl overflow-hidden'}`}
      style={{ background: '#0d1117' }}
    >
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/5 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* Traffic lights */}
          <div className="flex items-center space-x-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-amber-500/70" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
          </div>
          <span className="font-mono text-[11px] font-bold text-slate-400 tracking-tight select-none">
            {hostLabel}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleClear}
            title="Clear terminal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
          >
            <Eraser size={14} />
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* xterm.js container */}
      <div 
        ref={terminalRef} 
        style={{ 
          width: '100%', 
          flex: 1,
          minHeight: '0',
          background: '#0f172a',
          padding: '10px',
          overflow: 'hidden'
        }} 
      />
    </div>
  );
};

export default XtermTerminal;
