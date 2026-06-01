import React from 'react';
import { motion } from 'framer-motion';

export const BOMHealthChart = ({ data, healthyPercentage }) => {
  // SVG Donut calculations
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  
  let currentOffset = 0;
  
  return (
    <div className="bg-[#151821] border border-[#2A2E3D] rounded-xl">
      <div className="px-5 py-4 border-b border-[#2A2E3D]">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <span className="material-icons-outlined text-[#8B93A5] text-lg">health_and_safety</span>
          BOM Health
        </h2>
      </div>
      
      <div className="p-6 flex flex-col items-center">
        <div className="relative w-[140px] h-[140px]">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            {/* Background circle */}
            <circle 
              cx="70" cy="70" r={radius} 
              fill="none" 
              stroke="#2A2E3D" 
              strokeWidth="14" 
            />
            
            {/* Data segments */}
            {data.map((segment, index) => {
              const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -currentOffset;
              currentOffset += (segment.percentage / 100) * circumference;
              
              return (
                <motion.circle
                  key={segment.label}
                  cx="70" cy="70" r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="14"
                  strokeLinecap={segment.percentage > 0 ? "round" : "butt"}
                  strokeDasharray={strokeDasharray}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, delay: 0.2 + index * 0.1, ease: "easeOut" }}
                />
              );
            })}
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white font-sans">{healthyPercentage}%</span>
            <span className="text-xs text-[#8B93A5] font-medium">Healthy</span>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 w-full">
          {data.map((segment) => (
            <div key={segment.label} className="flex items-center gap-1.5 text-xs text-[#E2E8F0]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: segment.color }} />
              <span>{segment.label}</span>
              <span className="text-[#8B93A5]">({segment.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
