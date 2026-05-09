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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { offlineCount } = useVps();
  const { totalKeys } = useKeys();
  const navigate = useNavigate();

  const navItems = [
    { 
      icon: <LayoutDashboard size={16} />, 
      label: 'Dashboard', 
      path: '/dashboard',
      badge: offlineCount > 0 ? { count: offlineCount, color: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' } : null 
    },
    { 
      icon: <Key size={16} />, 
      label: 'SSH Keys', 
      path: '/keys',
      badge: totalKeys > 0 ? { count: totalKeys, color: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]' } : null
    },
    { icon: <Settings size={16} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div className={`fixed lg:static inset-y-0 left-0 w-64 h-full bg-bg-secondary border-r border-border-light flex flex-col z-50 shrink-0 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      {/* Brand Header */}
      <div className="p-8 pb-6">
        <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="p-1.5 bg-blue-600 rounded text-white shadow-sm group-hover:scale-105 transition-transform">
            <Logo size={18} />
          </div>
          <span className="text-xl font-black tracking-tighter text-text-primary">likeVercel</span>
        </div>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">V2.1 Infrastructure</p>
        </div>

        {/* Action Button */}
        <div className="px-6 mb-8">
        <button
          onClick={() => navigate('/vps/add')}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
        >
          <Plus size={14} />
          <span>New Instance</span>
        </button>
        </div>


      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                isActive 
                ? 'bg-blue-500/10 text-blue-500 shadow-sm border border-blue-500/20 shadow-blue-500/5' 
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`
            }
          >
            <div className="flex items-center space-x-3">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] text-white font-black animate-in zoom-in-50 duration-300 ${item.badge.color}`}>
                {item.badge.count}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Support & Profile */}
      <div className="p-4 mt-auto border-t border-border-light bg-bg-tertiary/30">
        <div className="flex items-center space-x-3 p-3 bg-bg-primary dark:bg-white/[0.02] border border-border-light rounded-2xl shadow-sm">
          <div className="w-9 h-9 bg-orange-100 dark:bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400">
            <User size={14} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-text-primary truncate">Authorized Operator</p>
            <p className="text-[10px] text-text-muted font-medium">Session ID: {user?.id.slice(0, 8)}</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
