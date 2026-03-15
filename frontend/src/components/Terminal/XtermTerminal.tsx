import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';

interface XtermTerminalProps {
  vpsId: string;
}

const XtermTerminal: React.FC<XtermTerminalProps> = ({ vpsId }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0f172a', // Matches dashboard dark bg
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
    
    // Delay initial fit slightly to ensure DOM is fully rendered
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.warn('[Xterm] initial fit error:', e);
      }
    }, 100);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initialize socket
    const token = localStorage.getItem('accessToken');
    const socket = io('http://localhost:3001', {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Xterm] Socket.io connected. Requesting start-terminal.');
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
      console.log('[Xterm] Terminal session ready server-side.');
      term.write('\x1b[1;32m[SYSTEM] Terminal session established.\x1b[0m\r\n');
      term.focus();
    });

    socket.on('terminal-error', (msg: string) => {
      console.error('[Xterm] Server terminal error:', msg);
      term.write(`\r\n\x1b[1;31m[ERROR] ${msg}\x1b[0m\r\n`);
    });

    socket.on('terminal-closed', () => {
      term.write('\r\n\x1b[1;33m[SYSTEM] Terminal session closed.\x1b[0m\r\n');
    });

    socket.on('disconnect', () => {
      term.write('\r\n\x1b[1;31m[SYSTEM] Connection lost.\x1b[0m\r\n');
    });

    // Handle input
    term.onData((data) => {
      console.log('[Xterm] Emitting terminal-input:', JSON.stringify(data));
      socket.emit('terminal-input', data);
    });

    // Handle resize
    const handleResize = () => {
      try {
        fitAddon.fit();
        if (term.rows && term.cols) {
          socket.emit('terminal-resize', {
            rows: term.rows,
            cols: term.cols,
          });
        }
      } catch (e) {
        console.warn('[Xterm] resize fit error:', e);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      term.dispose();
    };
  }, [vpsId]);

  return (
    <div 
      ref={terminalRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '400px', 
        background: '#0f172a',
        padding: '10px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden'
      }} 
    />
  );
};

export default XtermTerminal;
