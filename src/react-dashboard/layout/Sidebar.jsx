import React from 'react';
import { motion } from 'framer-motion';
import { useUserRole, useUserName, useUserAvatar } from '../store/mockSelectors';

export const Sidebar = ({ isExpanded, toggleSidebar, activeRoute = 'dashboard' }) => {
  const role = useUserRole();
  const userName = useUserName();
  const avatar = useUserAvatar();

  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'parts', icon: 'category', label: 'Parts' },
    { id: 'bom', icon: 'account_tree', label: 'BOM' },
    { id: 'release', icon: 'description', label: 'Part Release' },
    { id: 'workflows', icon: 'route', label: 'My Inbox' },
    { id: 'changes', icon: 'published_with_changes', label: 'Change Management' },
    { id: 'reports', icon: 'analytics', label: 'Reports', roles: ['Admin/IT Head', 'COE Head'] },
    { id: 'admin', icon: 'admin_panel_settings', label: 'Admin', roles: ['Admin/IT Head'] },
  ];

  const visibleNavItems = navItems.filter(item => !item.roles || item.roles.includes(role));

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isExpanded ? 240 : 64 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-screen bg-[#0F1117] border-r border-[#2A2E3D] flex flex-col flex-shrink-0 z-20 sticky top-0"
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#2A2E3D] overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            KG
          </div>
          <motion.div 
            initial={false}
            animate={{ opacity: isExpanded ? 1 : 0, display: isExpanded ? 'block' : 'none' }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-white font-bold leading-tight text-sm">Kinetic Green</div>
            <div className="text-emerald-500 text-xs font-medium">Smart PLM</div>
          </motion.div>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden custom-scrollbar">
        <nav className="flex flex-col gap-1 px-2">
          {visibleNavItems.map(item => (
            <div 
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap
                ${activeRoute === item.id 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'text-[#8B93A5] hover:bg-[#1A1D27] hover:text-white'
                }
              `}
              title={!isExpanded ? item.label : undefined}
            >
              <span className="material-icons-outlined text-[20px] flex-shrink-0">{item.icon}</span>
              <motion.span 
                initial={false}
                animate={{ opacity: isExpanded ? 1 : 0, display: isExpanded ? 'block' : 'none' }}
                className="text-sm font-medium tracking-wide"
              >
                {item.label}
              </motion.span>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / Toggle */}
      <div className="border-t border-[#2A2E3D] p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-3 whitespace-nowrap px-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1A1D27] border border-[#2A2E3D] text-[#E2E8F0] flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {avatar}
            </div>
            <motion.div 
              initial={false}
              animate={{ opacity: isExpanded ? 1 : 0, display: isExpanded ? 'block' : 'none' }}
              className="min-w-0"
            >
              <div className="text-sm text-white font-medium truncate">{userName}</div>
              <div className="text-xs text-[#8B93A5] truncate">{role}</div>
            </motion.div>
          </div>
        </div>
        <button 
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-2 text-[#8B93A5] hover:text-white hover:bg-[#1A1D27] rounded transition-colors"
        >
          <span className="material-icons-outlined text-[20px]">
            {isExpanded ? 'menu_open' : 'menu'}
          </span>
        </button>
      </div>
    </motion.aside>
  );
};
