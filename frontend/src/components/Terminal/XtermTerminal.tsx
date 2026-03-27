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
        background: '#060e20', // Midnight Navy
        foreground: '#dee5ff', // High Contrast Blue
        cursor: '#137fec', // Brand Blue
        selectionBackground: 'rgba(19, 127, 236, 0.3)',
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
    const token = localStorage.getItem('accessToken');
    const socket = io(baseUrl, {
      auth: { token },
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

    socket.on('disconnect', () => {
      term.write('\r\n\x1b[1;31m[SYSTEM] Connection lost.\x1b[0m\r\n');
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
      className={`flex flex-col bg-[#060e20] ${isFullscreen ? 'fixed inset-0 z-[200] rounded-none' : 'h-full rounded-2xl overflow-hidden border border-[#6475a1]/10 shadow-2xl'}`}
    >
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a1836] border-b border-[#6475a1]/10 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* Traffic lights */}
          <div className="flex items-center space-x-1.5 opacity-60">
            <div className="h-2.5 w-2.5 rounded-full bg-[#f97386]" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
          </div>
          <span className="font-mono text-[10px] font-black text-[#6475a1] uppercase tracking-widest select-none">
            {hostLabel}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleClear}
            title="Clear terminal"
            className="p-1.5 rounded-lg text-[#6475a1] hover:text-[#dee5ff] hover:bg-[#137fec]/10 transition-all active:scale-90"
          >
            <Eraser size={14} />
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="p-1.5 rounded-lg text-[#6475a1] hover:text-[#dee5ff] hover:bg-[#137fec]/10 transition-all active:scale-90"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Special Characters Command Ribbon (Mobile Optimized) */}
      <div className="flex items-center space-x-1 px-2 py-1.5 bg-[#0a1836]/60 border-b border-[#6475a1]/5 overflow-x-auto no-scrollbar">
        {[
          { label: 'TAB', value: '\t' },
          { label: 'ESC', value: '\x1b' },
          { label: 'CTRL+C', value: '\x03' },
          { label: '/', value: '/' },
          { label: '-', value: '-' },
          { label: '|', value: '|' },
          { label: '$', value: '$' },
          { label: '↑', value: '\x1b[A' },
          { label: '↓', value: '\x1b[B' },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => socketRef.current?.emit('terminal-input', btn.value)}
            className="flex-shrink-0 px-3 py-1 bg-[#11244c] hover:bg-[#1d3a7d] text-[#dee5ff] text-[9px] font-black rounded-lg border border-[#6475a1]/10 transition-all active:scale-95 uppercase tracking-tighter"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* xterm.js container */}
      <div 
        ref={terminalRef} 
        className="flex-1 min-h-0 bg-[#060e20] p-2 overflow-hidden"
      />
    </div>
  );
};

export default XtermTerminal;
