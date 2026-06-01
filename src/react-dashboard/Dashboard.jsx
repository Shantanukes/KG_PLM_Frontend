import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Layout
import { Sidebar } from './layout/Sidebar';
import { TopBar } from './layout/TopBar';

// Components
import { StatCard } from './components/StatCard';
import { MyTasksTable } from './components/MyTasksTable';
import { BOMHealthChart } from './components/BOMHealthChart';
import { ChangeVelocityChart } from './components/ChangeVelocityChart';

// Data Selectors (Mocks)
import { 
  useKpiStats, 
  useMyTasks, 
  useBomHealth, 
  useChangeVelocity 
} from './store/mockSelectors';

export default function Dashboard() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Fetch data from Redux store (mocked here)
  const kpiStats = useKpiStats();
  const tasks = useMyTasks();
  const bomHealth = useBomHealth();
  const velocityData = useChangeVelocity();

  // Date for greeting
  const today = new Date().toLocaleDateString('en-GB', { 
    day: '2-digit', month: 'long', year: 'numeric' 
  });

  return (
    <div className="flex h-screen bg-[#0F1117] text-white font-sans overflow-hidden">
      
      <Sidebar 
        isExpanded={sidebarExpanded} 
        toggleSidebar={() => setSidebarExpanded(!sidebarExpanded)} 
        activeRoute="dashboard"
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <TopBar />

        {/* Main Content Area with Framer Motion Page Transition */}
        <AnimatePresence mode="wait">
          <motion.main 
            key="dashboard-page"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8"
          >
            <div className="max-w-[1400px] mx-auto w-full">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                  <p className="text-[#8B93A5] text-sm">
                    Welcome back. Here's your PLM overview for today — <strong className="text-white">{today}</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1D27] hover:bg-[#2A2E3D] border border-[#2A2E3D] text-[#E2E8F0] rounded-lg text-sm font-medium transition-colors">
                    <span className="material-icons-outlined text-[18px]">download</span>
                    Export Report
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <span className="material-icons-outlined text-[18px]">add</span>
                    New Part
                  </button>
                </div>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard stat={kpiStats.openEcr} />
                <StatCard stat={kpiStats.partsAwaiting} />
                <StatCard stat={kpiStats.partsReleased} />
                <StatCard stat={kpiStats.overdueTasks} />
              </div>

              {/* Main Grid: 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column (Span 2) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <MyTasksTable tasks={tasks} />
                  
                  {/* Additional wide components like "Recently Released Parts" could go here */}
                  <div className="bg-[#151821] border border-[#2A2E3D] rounded-xl flex items-center justify-center p-12 text-[#8B93A5] border-dashed">
                    <span className="text-sm font-medium">Recently Released Parts table would render here</span>
                  </div>
                </div>
                
                {/* Right Column (Span 1) */}
                <div className="flex flex-col gap-6">
                  <BOMHealthChart 
                    data={bomHealth.data} 
                    healthyPercentage={bomHealth.healthyPercentage} 
                  />
                  <ChangeVelocityChart 
                    velocityData={velocityData} 
                  />
                </div>
                
              </div>
            </div>
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
