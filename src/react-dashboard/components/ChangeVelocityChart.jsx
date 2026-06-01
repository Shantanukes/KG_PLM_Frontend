import React from 'react';
import { motion } from 'framer-motion';

export const ChangeVelocityChart = ({ velocityData }) => {
  return (
    <div className="bg-[#151821] border border-[#2A2E3D] rounded-xl flex flex-col">
      <div className="px-5 py-4 border-b border-[#2A2E3D]">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <span className="material-icons-outlined text-[#8B93A5] text-lg">speed</span>
          Change Velocity (30d)
        </h2>
      </div>
      
      <div className="p-6">
        <div className="h-[100px] flex items-end justify-between gap-2 border-b border-[#2A2E3D] pb-2 mb-2">
          {velocityData.weeks.map((week, index) => {
            // Calculate a color gradient based on value for visual interest (using tailwind blues)
            const getBlueColor = (val) => {
              if (val > 80) return 'bg-blue-600';
              if (val > 60) return 'bg-blue-500';
              if (val > 40) return 'bg-blue-400';
              return 'bg-blue-300';
            };
            
            return (
              <div key={week.label} className="w-full flex flex-col items-center gap-2 group">
                <div className="w-full bg-[#1A1D27] rounded-sm relative flex items-end h-[80px]">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${week.value}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: "easeOut" }}
                    className={`w-full rounded-sm ${getBlueColor(week.value)} group-hover:brightness-110 transition-all`}
                  />
                </div>
                <span className="text-[10px] text-[#8B93A5] font-medium">{week.label}</span>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div>
            <div className="text-[11px] text-[#8B93A5] mb-0.5">ECRs Raised</div>
            <div className="text-lg font-semibold text-white">{velocityData.stats.ecrsRaised}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#8B93A5] mb-0.5">ECNs Closed</div>
            <div className="text-lg font-semibold text-emerald-500">{velocityData.stats.ecnsClosed}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#8B93A5] mb-0.5">Avg Cycle</div>
            <div className="text-lg font-semibold text-blue-500">{velocityData.stats.avgCycle}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
