import React from 'react';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden w-full relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Top Header */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30">
          <div className="flex items-center space-x-3">
             <div className="p-1 icon-grad-blue rounded-lg text-white">
                <Menu size={18} onClick={() => setIsSidebarOpen(true)} className="cursor-pointer" />
             </div>
             <span className="text-sm font-black tracking-tighter text-slate-900">likeVercel</span>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
            <X size={20} className={isSidebarOpen ? 'opacity-100' : 'opacity-0'} onClick={() => setIsSidebarOpen(false)} />
          </button>
        </header>
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
