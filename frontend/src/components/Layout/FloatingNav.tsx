import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Key, 
  Settings, 
  Plus,
  User
} from 'lucide-react';
import Logo from '../Logo';
import { useAuth } from '../../context/AuthContext';
import { useVps } from '../../context/VpsContext';
import { useKeys } from '../../context/KeyContext';

const FloatingNav: React.FC = () => {
  const { user } = useAuth();
  const { offlineCount } = useVps();
  const { totalKeys } = useKeys();
  const navigate = useNavigate();

  const navItems = [
    { 
      icon: <LayoutDashboard size={14} />, 
      label: 'Dashboard', 
      path: '/dashboard',
      badge: offlineCount > 0 ? offlineCount : null,
      badgeColor: 'bg-red-500'
    },
    { 
      icon: <Key size={14} />, 
      label: 'SSH Keys', 
      path: '/keys',
      badge: totalKeys > 0 ? totalKeys : null,
      badgeColor: 'bg-blue-500'
    },
    { 
      icon: <Settings size={14} />, 
      label: 'Settings', 
      path: '/settings' 
    },
  ];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-4">
      <nav className="bg-bg-secondary/80 backdrop-blur-md border border-border-light rounded-full shadow-lg px-2 py-1.5 flex items-center space-x-1 sm:space-x-2">
        {/* Logo Section */}
        <div 
          className="flex items-center space-x-2 px-3 py-1 cursor-pointer group border-r border-border-light mr-1" 
          onClick={() => navigate('/')}
        >
          <div className="p-1 bg-blue-600 rounded text-white shadow-sm group-hover:scale-105 transition-transform">
            <Logo size={14} />
          </div>
          <span className="text-sm font-bold tracking-tight text-text-primary hidden sm:inline">likeVercel</span>
        </div>

        {/* Links Section */}
        <div className="flex items-center space-x-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                  isActive 
                  ? 'bg-blue-500/10 text-blue-500' 
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`
              }
            >
              {item.icon}
              <span className="hidden md:inline">{item.label}</span>
              {item.badge !== null && (
                <span className={`flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[8px] text-white font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Action Section */}
        <div className="flex items-center space-x-1 pl-1 border-l border-border-light ml-1">
          <button
            onClick={() => navigate('/vps/add')}
            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-sm transition-all active:scale-95 flex items-center justify-center group"
            title="New Instance"
          >
            <Plus size={14} className="group-hover:rotate-90 transition-transform" />
          </button>
          
          <div className="h-8 w-8 bg-bg-tertiary rounded-full flex items-center justify-center text-text-muted border border-border-light ml-1 overflow-hidden" title={`Session: ${user?.id.slice(0, 8)}`}>
            <User size={14} />
          </div>
        </div>
      </nav>
    </div>
  );
};

export default FloatingNav;
