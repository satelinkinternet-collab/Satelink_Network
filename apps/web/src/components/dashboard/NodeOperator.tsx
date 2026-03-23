'use client';

import { Database, Coins, ArrowRightFromLine, Award } from 'lucide-react';
import { useState } from 'react';

export default function NodeOperator({ isLoading }: { isLoading: boolean }) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Mock data for operator specific view
  const earnings = 1250.45;
  const jobsProcessed = 45280;

  const handleClaim = async () => {
    setIsClaiming(true);
    // Simulate API call
    setTimeout(() => setIsClaiming(false), 1500);
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    // Simulate API call
    setTimeout(() => setIsWithdrawing(false), 1500);
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      
      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Database className="w-5 h-5 text-indigo-400" />
        Node Operator
      </h2>

      <div className="space-y-4">
        {/* Earnings Card */}
        <div className="bg-slate-950/60 border border-indigo-500/20 rounded-lg p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-400 flex items-center gap-1.5 mb-1">
              <Coins className="w-4 h-4 text-emerald-400" />
              Unclaimed Earnings
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              ${earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <button 
            onClick={handleClaim}
            disabled={isClaiming || earnings <= 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isClaiming ? 'Claiming...' : 'Claim'}
          </button>
        </div>

        {/* Stats & Withdraw */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-4">
            <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-amber-400" />
              Jobs Processed
            </div>
            <div className="text-lg font-semibold text-white">
              {jobsProcessed.toLocaleString()}
            </div>
          </div>
          
          <button 
            onClick={handleWithdraw}
            disabled={isWithdrawing}
            className="bg-slate-950/50 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-white rounded-lg p-4 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50"
          >
            <ArrowRightFromLine className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium">Withdraw</span>
          </button>
        </div>
      </div>
    </div>
  );
}
