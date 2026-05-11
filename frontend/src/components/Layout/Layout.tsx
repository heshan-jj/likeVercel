import React from 'react';
import { useLocation } from 'react-router-dom';
import FloatingNav from './FloatingNav';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  // Hide nav on VPS Detail page (/vps/:id) but NOT on /vps/add or /vps/:id/edit
  const isVpsDetail = /^\/vps\/[^/]+$/.test(location.pathname) && !location.pathname.endsWith('/add');
  const isKeypad = location.pathname === '/unlock' || location.pathname === '/onboarding';
  
  const hideNav = isVpsDetail || isKeypad;

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary overflow-x-hidden w-full relative">
      {!hideNav && <FloatingNav />}
      
      <main className={`flex-1 flex flex-col w-full pb-12 relative animate-in fade-in slide-in-from-bottom-2 duration-700 ${hideNav ? 'pt-0' : 'pt-20 md:pt-24'}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
