'use client';

import { Bell, Search, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function TopStatusBar() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center flex-1">
        {/* Search barebone */}
        <div className="relative group max-w-sm w-full hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-lg leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-slate-900 sm:text-sm transition-all"
            placeholder="Search resources, jobs..."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Time display */}
        <div className="hidden md:flex flex-col items-end mr-4">
          <span className="text-xs font-medium text-slate-400">
            {currentTime ? currentTime.toLocaleDateString() : 'Loading...'}
          </span>
          <span className="text-sm font-bold text-slate-200 font-mono tracking-tight">
            {currentTime ? currentTime.toLocaleTimeString() : '00:00:00'}
          </span>
        </div>

        <button className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors relative">
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 border-2 border-slate-950" />
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        
        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center ml-2 cursor-pointer hover:bg-blue-600/30 transition-colors">
          <span className="text-xs font-bold text-blue-400">OP</span>
        </div>
      </div>
    </header>
  );
}
