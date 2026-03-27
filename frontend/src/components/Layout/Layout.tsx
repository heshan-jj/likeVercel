import React from 'react';
import Sidebar from './Sidebar';
import BottomNav from '../Navigation/BottomNav';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#060e20] overflow-hidden w-full relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Page Content — pb-20 on mobile accounts for BottomNav height */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative lg:pb-0 pb-20 pt-safe">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Layout;
