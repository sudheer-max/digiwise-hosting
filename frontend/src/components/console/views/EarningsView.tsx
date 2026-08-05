import React from 'react';
import { Wallet, TrendingUp, Users, Share2 } from 'lucide-react';
import { SectionHeader, Card, StatusPill } from '../ui';

export default function EarningsView() {
  const totalEarned = 0;
  const pending = 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Earnings"
        subtitle="Payments from your referred teams and partners."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm p-5">
          <div className="w-9 h-9 bg-[#00459c]/10 flex items-center justify-center mb-3"><Wallet className="w-4 h-4 text-[#00459c]" /></div>
          <div className="text-2xl font-display font-bold text-slate-900">${totalEarned.toFixed(2)}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total earned</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm p-5">
          <div className="w-9 h-9 bg-amber-50 flex items-center justify-center mb-3"><TrendingUp className="w-4 h-4 text-amber-600" /></div>
          <div className="text-2xl font-display font-bold text-slate-900">${pending.toFixed(2)}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Pending payout</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm p-5">
          <div className="w-9 h-9 bg-emerald-50 flex items-center justify-center mb-3"><Users className="w-4 h-4 text-emerald-600" /></div>
          <div className="text-2xl font-display font-bold text-slate-900">0</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Active referrals</div>
        </div>
      </div>

      <Card title="Referral program" icon={<Share2 className="w-4 h-4 text-[#00459c]" />}>
        <div className="flex items-center justify-between gap-3 border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-600">Your referral link is ready once you have an active plan.</span>
          <StatusPill status="locked" />
        </div>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Earn credit for every team that signs up through your link. The Earnings program is
          available to accounts with an active paid plan.
        </p>
      </Card>
    </div>
  );
}
