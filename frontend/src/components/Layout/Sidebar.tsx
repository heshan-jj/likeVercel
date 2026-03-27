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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Key size={20} />, label: 'SSH Keys', path: '/keys' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
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

      <div className={`fixed lg:static inset-y-0 left-0 w-64 h-full bg-[#0a1836] border-r border-[#6475a1]/10 flex flex-col z-50 shrink-0 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      {/* Brand Header */}
      <div className="p-8 pb-6">
        <div className="flex items-center space-x-3 mb-1 cursor-pointer group" onClick={() => navigate('/dashboard')}>
          <div className="p-1.5 icon-grad-blue rounded-lg text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <Logo size={24} />
          </div>
          <span className="text-xl font-black tracking-tighter text-[#dee5ff]">likeVercel</span>
        </div>
        <p className="text-[10px] font-bold text-[#6475a1] uppercase tracking-widest pl-1">Infrastructure V2.1</p>
      </div>

      {/* Action Button */}
      <div className="px-6 mb-8">
        <button 
          onClick={() => navigate('/vps/add')}
          className="w-full py-3 icon-grad-blue hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center space-x-2 border border-blue-400/20"
        >
          <Plus size={16} />
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
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                isActive 
                ? 'bg-[#137fec]/10 text-[#137fec] border border-[#137fec]/20' 
                : 'text-[#6475a1] hover:bg-[#11244c] hover:text-[#dee5ff]'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Support & Profile */}
      <div className="p-4 mt-auto border-t border-[#6475a1]/10 bg-[#060e20]/30">
        <div className="flex items-center space-x-3 p-3 bg-[#0a1836] border border-[#6475a1]/10 rounded-2xl shadow-sm">
          <div className="w-9 h-9 bg-[#137fec]/10 rounded-xl flex items-center justify-center text-[#137fec]">
            <User size={18} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-[#dee5ff] truncate">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-[#6475a1] font-medium uppercase tracking-widest">Admin Access</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
