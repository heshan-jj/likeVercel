import React from 'react';
import FloatingNav from './FloatingNav';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-bg-primary overflow-x-hidden w-full relative">
      <FloatingNav />
      
      <main className="flex-1 flex flex-col w-full pt-20 md:pt-24 pb-12 relative animate-in fade-in slide-in-from-bottom-2 duration-700">
        {children}
      </main>
    </div>
  );
};

export default Layout;
