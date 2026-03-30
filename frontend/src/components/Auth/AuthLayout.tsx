import React from 'react';
import Logo from '../Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen w-full flex bg-bg-primary text-text-primary font-sans overflow-hidden">
      {/* Left Panel - Marketing */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 border-r border-border-light overflow-hidden bg-bg-secondary">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 z-0 opacity-[0.4]">
           <div className="absolute inset-0 kinetic-grid animate-grid opacity-20"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-transparent to-bg-secondary/70"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-16">
            <div className="p-2 bg-blue-600/5 rounded-2xl border border-blue-600/10 blue-glow flex items-center justify-center overflow-hidden">
               <Logo size={32} />
            </div>
            <span className="text-xl font-bold tracking-tighter text-text-primary">likeVercel</span>
          </div>

          <div className="space-y-8 max-w-lg">
            <h1 className="text-7xl font-black leading-[1.05] tracking-tight text-text-primary">
              Deploy at the <br />
              <span className="kinetic-gradient-text">speed of thought.</span>
            </h1>
            <p className="text-xl text-text-secondary font-medium leading-relaxed max-w-md">
              Experience high-fidelity VPS operations with real-time telemetry and global scalability.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-12 border-t border-border-light">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.25em]">
            © 2026 likeVercel 
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-bg-primary">
        <div className="w-full max-w-[420px] space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold tracking-tight text-text-primary">{title}</h2>
            <p className="text-text-secondary text-base font-medium leading-relaxed">{subtitle}</p>
          </div>

          {children}
          
          <div className="flex justify-between items-center text-[9px] uppercase font-black tracking-[0.2em] text-text-muted pt-6 border-t border-border-light mt-6">
             <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/20"></div>
               
             </div>
             <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm shadow-blue-500/20"></div>
                
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
