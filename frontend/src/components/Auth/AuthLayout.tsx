import React from 'react';
import Logo from '../Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen w-full flex bg-[#060e20] text-[#dee5ff] font-sans transition-colors duration-500">
      {/* Left Panel - Marketing */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 border-r border-[#6475a1]/10 overflow-hidden bg-[#060e20]">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 z-0 opacity-[0.2]">
           <div className="absolute inset-0 kinetic-grid animate-grid"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-[#060e20] via-transparent to-[#060e20]/70"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-16">
            <div className="p-2 bg-[#137fec]/10 rounded-2xl border border-[#137fec]/20 blue-glow flex items-center justify-center overflow-hidden">
               <Logo size={32} />
            </div>
            <span className="text-xl font-bold tracking-tighter text-[#dee5ff]">likeVercel</span>
          </div>

          <div className="space-y-8 max-w-lg">
            <h1 className="text-7xl font-black leading-[1.05] tracking-tight text-[#dee5ff]">
              Deploy at the <br />
              <span className="kinetic-gradient-text">speed of thought.</span>
            </h1>
            <p className="text-xl text-[#99aad9] font-medium leading-relaxed max-w-md">
              Experience high-fidelity VPS operations with real-time telemetry and global scalability.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-12 border-t border-[#6475a1]/10">
          <p className="text-[10px] font-bold text-[#6475a1] uppercase tracking-[0.25em]">
            © 2026 likeVercel 
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-[#060e20]">
        <div className="w-full max-w-[420px] space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
          {/* Mobile Logo Header */}
          <div className="lg:hidden flex flex-col items-center space-y-4 mb-8">
            <div className="p-3 bg-[#137fec]/10 rounded-2xl border border-[#137fec]/20 blue-glow flex items-center justify-center">
               <Logo size={40} />
            </div>
            <span className="text-xl font-black tracking-tighter text-[#dee5ff] uppercase">likeVercel</span>
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl font-bold tracking-tight text-[#dee5ff]">{title}</h2>
            <p className="text-[#99aad9] text-base font-medium leading-relaxed">{subtitle}</p>
          </div>

          {children}
          
          <div className="flex justify-between items-center text-[9px] uppercase font-black tracking-[0.2em] text-[#6475a1]/40 pt-6 border-t border-[#6475a1]/10 mt-6">
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
