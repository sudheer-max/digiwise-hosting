import React, { useState } from 'react';
import { CreditCard, Download, Search, RefreshCw, Filter, ChevronDown, Trash2, ShieldCheck, Gift, ArrowRight, User } from 'lucide-react';
import { Invoice } from '../types';

export default function BillingView() {
  const [balance, setBalance] = useState(1240.50);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const invoices: Invoice[] = [
    { id: 'INV-92831', date: 'Sep 12, 2024', amount: 482.00, status: 'PAID', plan: 'Enterprise Cluster Sub' },
    { id: 'INV-92744', date: 'Aug 12, 2024', amount: 482.00, status: 'PAID', plan: 'Enterprise Cluster Sub' },
    { id: 'INV-91902', date: 'Jul 12, 2024', amount: 1250.00, status: 'PAID', plan: 'Global Storage Pool Provisioning' },
    { id: 'INV-91022', date: 'Jun 12, 2024', amount: 410.50, status: 'PAID', plan: 'Enterprise Cluster Sub' },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* 1. BREADCRUMBS & MAIN TITLE HEADER ROW */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          {/* Breadcrumb */}
          <div className="text-[10px] font-extrabold text-[#00459c] tracking-widest uppercase mb-1.5">
            DASHBOARD &gt; BILLING
          </div>
          <h1 className="text-3xl font-extrabold text-[#002866] tracking-tight font-display">
            Billing & Invoices
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-3xl leading-relaxed">
            Manage your cloud infrastructure subscriptions, review payment history, and update your enterprise payment methods from a single secure command center.
          </p>
        </div>

        {/* Top Right user profile + search */}
        <div className="flex items-center gap-3 self-stretch lg:self-auto">
          <div className="relative flex-1 lg:flex-none">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search resources..."
              className="bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs outline-none focus:border-[#00459c] w-full lg:w-48"
            />
          </div>
          <div className="w-9 h-9 rounded-full bg-[#00459c] text-white flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer">
            JD
          </div>
        </div>
      </div>

      {/* 2. CORE LAYOUT COLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: BALANCE CARDS & HISTORY */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top dual cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Card 1: Account Balance */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CURRENT ACCOUNT BALANCE</span>
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono block mt-1.5">
                  ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setBalance(prev => prev + 100)}
                  className="bg-[#00459c] hover:bg-[#003882] text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  ADD FUNDS
                </button>
                <button 
                  onClick={handleRefresh}
                  className={`border border-slate-200 hover:bg-slate-50 text-slate-600 p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 2: Next Billing Cycle */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">NEXT BILLING CYCLE</span>
                <span className="text-xl font-bold text-slate-800 block mt-2">
                  October 12, 2024
                </span>
                <p className="text-xs text-slate-400 mt-1">Estimated total: <strong className="text-slate-700 font-mono">$482.00</strong></p>
              </div>

              <a href="#usage-report" className="text-[#00459c] font-bold text-[10px] uppercase tracking-wider hover:underline flex items-center gap-1">
                VIEW USAGE REPORT <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

          {/* Table Container Card: Transaction History */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-[#002866] text-sm uppercase tracking-wider">
                Transaction History
              </h3>
              <button className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> FILTER
              </button>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-3 px-2">INVOICE ID</th>
                    <th className="py-3 px-2">DATE</th>
                    <th className="py-3 px-2">AMOUNT</th>
                    <th className="py-3 px-2">STATUS</th>
                    <th className="py-3 px-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="font-medium text-slate-700">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-2 font-mono font-bold text-[#00459c]">{inv.id}</td>
                      <td className="py-4 px-2 text-slate-500 font-mono">{inv.date}</td>
                      <td className="py-4 px-2 font-mono font-bold text-slate-900">${inv.amount.toFixed(2)}</td>
                      <td className="py-4 px-2">
                        <span className="bg-cyan-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-cyan-400">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button className="text-slate-400 hover:text-[#00459c] hover:bg-slate-50 p-1.5 rounded-lg transition-colors font-semibold text-[10px] inline-flex items-center gap-1 border border-slate-150">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load more button */}
            <button className="mt-6 w-full text-center text-slate-500 hover:text-slate-800 font-bold text-xs py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5">
              LOAD MORE TRANSACTIONS <ChevronDown className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: SIDEBAR METADATA */}
        <div className="space-y-6">
          
          {/* Payment Methods List */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-[#002866] text-xs uppercase tracking-wider">
              Payment Methods
            </h3>

            {/* Method 1: Visa Default */}
            <div className="border border-slate-200 rounded-2xl p-4 flex justify-between items-start hover:border-[#00459c] transition-all bg-slate-50/20">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-[#00459c] font-sans">VISA</span>
                  <span className="bg-[#00459c]/10 text-[#00459c] text-[8px] font-extrabold px-2 py-0.5 rounded">DEFAULT</span>
                </div>
                <div className="font-mono text-xs text-slate-600">••••  ••••  ••••  4242</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex gap-4">
                  <span>EXPIRES 12/26</span>
                  <span>JOHN DOE</span>
                </div>
              </div>
              <button className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Method 2: MC Secondary */}
            <div className="border border-slate-150 rounded-2xl p-4 flex justify-between items-start hover:border-[#00459c] transition-all">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-600 font-sans">Mastercard</span>
                </div>
                <div className="font-mono text-xs text-slate-600">••••  ••••  ••••  9012</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex gap-4">
                  <span>EXPIRES 08/25</span>
                  <span>DIGIWISE ENT.</span>
                </div>
              </div>
              <button className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Method 3: Razorpay UPI */}
            <div className="border border-slate-150 rounded-2xl p-4 flex justify-between items-center hover:border-[#00459c] transition-all">
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-bold text-slate-400 block">Razorpay UPI</span>
                <span className="font-semibold text-xs text-slate-800">Linked: user@okaxis</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
            </div>

            {/* Add New Method Button */}
            <button className="w-full border-2 border-dashed border-slate-200 hover:border-[#00459c] text-slate-500 hover:text-[#00459c] font-bold text-xs py-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-slate-50/50">
              + ADD NEW METHOD
            </button>
          </div>

          {/* Billing Profile Details Box (Dark blue background) */}
          <div className="bg-[#00459c] text-white border border-blue-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider border-b border-white/10 pb-2">
              Billing Profile
            </h3>
            
            <div className="space-y-4 text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-slate-300 font-sans text-[9px] uppercase tracking-wider block">ORGANIZATION</span>
                <span className="font-bold text-slate-100 text-[11px] block">DigiWise Cloud Solutions Ltd.</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-300 font-sans text-[9px] uppercase tracking-wider block">TAX ID / VAT</span>
                <span className="font-bold text-slate-100 text-[11px] block">GB123456789</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-300 font-sans text-[9px] uppercase tracking-wider block">ADDRESS</span>
                <span className="font-bold text-slate-100 text-[11px] leading-relaxed block">
                  128 Tech Plaza, Cyber City, London, EC1A 1BB
                </span>
              </div>
            </div>

            <button className="w-full border border-white/20 hover:bg-white/10 text-white font-bold text-xs py-3 rounded-xl transition-all uppercase tracking-wider">
              EDIT PROFILE
            </button>
          </div>

          {/* Referral Credit Box */}
          <div className="bg-slate-100 border border-slate-200 rounded-3xl p-5 shadow-sm flex items-start gap-3 text-slate-600">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-rose-500 flex-shrink-0">
              <Gift className="w-5 h-5 fill-rose-500/10" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-[#002866] text-xs">EARN CREDITS</h4>
              <p className="text-[11px] text-slate-500 leading-normal">Invite a team and get $50 in cloud credits.</p>
              <a href="#refer" className="text-[#00459c] font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-0.5 hover:underline mt-1">
                REFER NOW <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
