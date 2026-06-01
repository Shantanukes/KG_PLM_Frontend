import React, { useState } from 'react';
import { useUserAvatar } from '../store/mockSelectors';

export const TopBar = () => {
  const avatar = useUserAvatar();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <header className="h-16 border-b border-[#2A2E3D] bg-[#0F1117]/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-6">
      
      {/* Breadcrumb / Left */}
      <div className="flex items-center gap-2 text-sm text-[#8B93A5]">
        <span className="material-icons-outlined text-[18px]">home</span>
        <span>/</span>
        <span className="text-[#E2E8F0] font-medium">Dashboard</span>
      </div>

      {/* Global Search (Center) */}
      <div className="flex-1 max-w-xl px-8">
        <div className={`relative flex items-center transition-all ${isFocused ? 'ring-1 ring-emerald-500 rounded-lg bg-[#151821]' : 'bg-[#151821] rounded-lg border border-[#2A2E3D]'}`}>
          <span className="material-icons-outlined absolute left-3 text-[#8B93A5] text-[18px]">search</span>
          <input 
            type="text" 
            placeholder="Search parts, drawings, ECRs, models..." 
            className="w-full bg-transparent border-none py-2 pl-10 pr-12 text-sm text-white placeholder-[#5E667B] focus:outline-none rounded-lg"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          <div className="absolute right-2 flex items-center">
            <kbd className="hidden sm:inline-block border border-[#2A2E3D] bg-[#1A1D27] text-[#8B93A5] text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm">
              Ctrl+K
            </kbd>
          </div>
        </div>
      </div>

      {/* Actions / Right */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-[#8B93A5] hover:text-white transition-colors">
          <span className="material-icons-outlined">notifications_none</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0F1117]"></span>
        </button>
        <button className="p-2 text-[#8B93A5] hover:text-white transition-colors">
          <span className="material-icons-outlined">help_outline</span>
        </button>
        
        <div className="w-px h-6 bg-[#2A2E3D] mx-1"></div>
        
        <button className="flex items-center gap-2 hover:bg-[#1A1D27] p-1.5 rounded-lg transition-colors">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold">
            {avatar}
          </div>
          <span className="material-icons-outlined text-[#8B93A5] text-[16px]">expand_more</span>
        </button>
      </div>

    </header>
  );
};
