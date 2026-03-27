import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Key, Settings } from 'lucide-react';

const BottomNav: React.FC = () => {

  const navItems = [
    { icon: <LayoutDashboard size={22} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Key size={22} />, label: 'SSH Keys', path: '/keys' },
    { icon: <Settings size={22} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a1836]/80 backdrop-blur-xl border-t border-[#6475a1]/10 flex items-stretch transition-all duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Nav items spread evenly */}
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              isActive ? 'text-[#137fec]' : 'text-[#6475a1] hover:text-[#99aad9]'
            }`
          }
        >
          <div className="relative">
             {item.icon}
          </div>
          <span className="opacity-80">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
