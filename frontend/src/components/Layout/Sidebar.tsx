import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  LayoutDashboard, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Moon, 
  Sun, 
  LogOut,
  KeyRound
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  
  return (
    <aside 
      className={`${collapsed ? 'w-16' : 'w-64'} h-full flex-shrink-0 flex flex-col border-r border-border-light bg-bg-primary transition-all duration-300 shadow-2xl z-20 relative`} 
      id="sidebar"
    >
      {/* Brand Header + Collapse Toggle */}
      <div className={`p-4 pb-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} relative overflow-visible`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3 pr-6'} min-w-0`}>
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20 flex-shrink-0">
            <Zap size={24} className="text-white" fill="currentColor" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xl font-bold tracking-tighter text-text-primary truncate">likeVercel</span>
              <span className="text-xs font-bold text-text-muted tracking-[0.1em] -mt-1 ml-1 uppercase opacity-60">v2.0 Beta</span>
            </div>
          )}
        </div>
        {/* Collapse toggle — absolutely positioned within header to avoid layout push/overlap */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all flex-shrink-0 border border-border-light shadow-sm z-30"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="px-4 py-4">
        <div className="h-px w-full bg-border-light" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar py-2">
        {!collapsed && (
          <p className="px-3 text-xs font-bold text-text-muted uppercase tracking-[0.1em] mb-3 mt-4 opacity-70">System Menu</p>
        )}
        
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `group flex items-center ${collapsed ? 'justify-center px-2' : 'px-4'} py-2.5 text-sm font-bold rounded-xl transition-all ${
            isActive 
            ? 'sidebar-active text-blue-500 bg-blue-500/10' 
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary shadow-sm'
          }`}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <LayoutDashboard className={`h-4 w-4 flex-shrink-0 ${!collapsed ? 'mr-3' : ''}`} />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink 
          to="/keys" 
          className={({ isActive }) => `group flex items-center ${collapsed ? 'justify-center px-2' : 'px-4'} py-2.5 text-sm font-bold rounded-xl transition-all ${
            isActive 
            ? 'sidebar-active text-blue-500 bg-blue-500/10' 
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary shadow-sm'
          }`}
          title={collapsed ? 'SSH Keys' : undefined}
        >
          <KeyRound className={`h-4 w-4 flex-shrink-0 ${!collapsed ? 'mr-3' : ''}`} />
          {!collapsed && <span>SSH Keys</span>}
        </NavLink>

        <div className={`${collapsed ? 'py-2' : 'py-6'}`}>
          {!collapsed && (
            <p className="px-3 text-xs font-bold text-text-muted uppercase tracking-[0.1em] mb-3 opacity-70">General</p>
          )}
          {collapsed && <div className="h-px w-full bg-border-light mb-3" />}
           
          <NavLink 
            to="/settings" 
            className={({ isActive }) => `group flex items-center ${collapsed ? 'justify-center px-2' : 'px-4'} py-2.5 text-sm font-bold rounded-xl transition-all ${
              isActive 
              ? 'sidebar-active text-blue-500 bg-blue-500/10' 
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary shadow-sm'
            }`}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings className={`h-4 w-4 flex-shrink-0 ${!collapsed ? 'mr-3' : ''}`} />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        </div>
      </nav>

      {/* User Footer Area */}
      <div className={`p-4 border-t border-border-light bg-bg-secondary/20 ${collapsed ? 'flex flex-col items-center space-y-3' : ''}`}>
        {!collapsed ? (
          <>
            <div className="flex items-center space-x-4 mb-4 group cursor-pointer">
              <div className="relative flex-shrink-0">
                 <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-lg shadow-lg group-hover:scale-105 transition-transform">
                   {user?.name?.charAt(0).toUpperCase() || 'U'}
                 </div>
                 <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-bg-primary shadow-emerald-500/50 shadow-lg"></div>
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-text-primary truncate">{user?.name || 'Authorized User'}</p>
                <p className="text-[11px] text-text-muted truncate font-bold tracking-tight opacity-70">{user?.email || 'unidentified_identity'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-xs font-bold text-text-secondary bg-bg-tertiary/40 hover:bg-bg-tertiary/70 hover:text-text-primary rounded-xl transition-all"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
              <button 
                onClick={logout} 
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 text-xs font-bold text-text-secondary bg-bg-tertiary/40 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all active:scale-95"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-sm shadow-lg">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-bg-primary"></div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 text-text-secondary bg-bg-tertiary/40 hover:bg-bg-tertiary/70 hover:text-text-primary rounded-xl transition-all"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button 
              onClick={logout} 
              className="p-2 text-text-secondary bg-bg-tertiary/40 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all active:scale-95"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
