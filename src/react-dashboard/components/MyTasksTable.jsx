import React from 'react';

export const MyTasksTable = ({ tasks }) => {
  return (
    <div className="bg-[#151821] border border-[#2A2E3D] rounded-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2E3D]">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <span className="material-icons-outlined text-[#8B93A5] text-lg">assignment</span>
          My Tasks
        </h2>
        <span className="bg-[#2A2E3D] text-[#E2E8F0] text-xs px-2.5 py-1 rounded-full font-medium">
          {tasks.length} pending
        </span>
      </div>
      
      <div className="divide-y divide-[#2A2E3D] max-h-[400px] overflow-y-auto custom-scrollbar">
        {tasks.map((task) => (
          <div key={task.id} className="p-4 hover:bg-[#1A1D27] transition-colors flex items-center gap-4 group">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.isOverdue ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-emerald-500'}`} />
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#F8FAFC] truncate">{task.title}</div>
              <div className="text-xs text-[#8B93A5] mt-1 flex items-center gap-1.5 truncate">
                <span className="font-mono text-[11px] text-[#94A3B8]">{task.meta}</span>
                <span>&bull;</span>
                <span>{task.submitter}</span>
                <span>&bull;</span>
                <span className={`font-medium ${task.isOverdue ? 'text-red-400' : 'text-emerald-400'}`}>{task.age}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {task.actions.includes('Approve') && (
                <button className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-xs px-3 py-1.5 rounded transition-colors font-medium">
                  Approve
                </button>
              )}
              {task.actions.includes('Reject') && (
                <button className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-xs px-3 py-1.5 rounded transition-colors font-medium">
                  Reject
                </button>
              )}
              {task.actions.length === 1 && !task.actions.includes('Approve') && !task.actions.includes('Reject') && (
                <button className="bg-[#2A2E3D] text-[#E2E8F0] hover:bg-[#3B4255] border border-[#3B4255] text-xs px-3 py-1.5 rounded transition-colors font-medium">
                  {task.actions[0]}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
