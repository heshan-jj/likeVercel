import React from 'react';
import Sidebar from './Sidebar';
import TopProgressBar from '../TopProgressBar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen w-full overflow-hidden flex bg-bg-primary text-text-primary">
      <TopProgressBar />
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
