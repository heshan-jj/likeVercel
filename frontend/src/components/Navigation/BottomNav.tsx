import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Key, Plus, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();

  const navItems = [
    { icon: <LayoutDashboard size={22} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Key size={22} />, label: 'SSH Keys', path: '/keys' },
    { icon: <Settings size={22} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Left nav items */}
      {navItems.slice(0, 2).map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-1 text-[10px] font-bold transition-colors ${
              isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
            }`
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}

      {/* Center FAB — Add VPS */}
      <div className="flex-1 flex items-center justify-center pb-1">
        <button
          onClick={() => navigate('/vps/add')}
          className="w-12 h-12 icon-grad-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Right nav item */}
      {navItems.slice(2).map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-1 text-[10px] font-bold transition-colors ${
              isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
            }`
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
