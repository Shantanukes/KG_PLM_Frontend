import React, { useEffect, useState } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';

const Counter = ({ from = 0, to, duration = 1 }) => {
  const [count, setCount] = useState(from);
  const controls = useAnimation();
  
  useEffect(() => {
    let startTime;
    let animationFrame;
    
    const animate = (time) => {
      if (!startTime) startTime = time;
      const progress = (time - startTime) / (duration * 1000);
      
      if (progress < 1) {
        // Ease-out expo
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setCount(Math.round(from + (to - from) * easeProgress));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(to);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [from, to, duration]);

  return <span>{count}</span>;
};

export const StatCard = ({ stat }) => {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-[#151821] border border-[#2A2E3D] rounded-xl p-5 flex flex-col justify-between overflow-hidden relative cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg bg-opacity-10 flex items-center justify-center ${stat.color.replace('text-', 'bg-').replace('-500', '-500/10')} ${stat.color}`}>
          <span className="material-icons-outlined text-xl">{stat.icon}</span>
        </div>
        <div className="flex items-center gap-1">
          {stat.deltaType === 'up' && <span className="material-icons-outlined text-emerald-500 text-sm">trending_up</span>}
          {stat.deltaType === 'down' && <span className="material-icons-outlined text-red-500 text-sm">trending_down</span>}
          {stat.deltaType === 'neutral' && <span className="material-icons-outlined text-blue-500 text-sm">trending_flat</span>}
          <span className={`text-xs font-medium ${
            stat.deltaType === 'up' ? 'text-emerald-500' : stat.deltaType === 'down' ? 'text-red-500' : 'text-blue-500'
          }`}>{stat.delta}</span>
        </div>
      </div>
      
      <div>
        <h3 className="text-3xl font-semibold text-white tracking-tight mb-1 font-sans">
          <Counter from={0} to={stat.value} duration={0.8} />
        </h3>
        <p className="text-[#8B93A5] text-sm font-medium">{stat.label}</p>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-[#1A1D27]">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${stat.fill}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${stat.barColor}`}
        />
      </div>
    </motion.div>
  );
};
