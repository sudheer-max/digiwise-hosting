import React, { useState } from 'react';
import { Search, BookOpen, PlusCircle, History, Globe, FileText, ArrowRight, Phone, MessageSquare, Headphones, ChevronRight, Check } from 'lucide-react';
import { SupportTicket } from '../types';

export default function SupportView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSupportTab, setActiveSupportTab] = useState<'overview' | 'open' | 'existing'>('overview');

  const [tickets, setTickets] = useState<SupportTicket[]>([
    { id: '1', subject: 'Inbound port 443 blocked on staging-web-front node', category: 'VPS Firewall', priority: 'HIGH', status: 'PENDING', date: 'Oct 24, 2024', replies: 1 },
    { id: '2', subject: 'SPF DNS Record propagation delay in domain-infra.cloud', category: 'DNS Zone', priority: 'MEDIUM', status: 'RESOLVED', date: 'Oct 22, 2024', replies: 3 },
    { id: '3', subject: 'Disk storage limit warning on production database master', category: 'Database Limit', priority: 'HIGH', status: 'OPEN', date: 'Oct 24, 2024', replies: 0 },
  ]);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('VPS Hosting');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [msg, setMsg] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState(false);

  const handleOpenTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !msg) return;

    const newTicket: SupportTicket = {
      id: 'TCK-' + Math.floor(100000 + Math.random() * 900000),
      subject: subject.trim(),
      category: category,
      priority: priority,
      status: 'OPEN',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      replies: 0,
    };

    setTickets([newTicket, ...tickets]);
    setSubject('');
    setMsg('');
    setSubmittedTicket(true);
    setTimeout(() => {
      setSubmittedTicket(false);
      setActiveSupportTab('overview');
    }, 2000);
  };

  const card = 'bg-white border border-slate-200 shadow-sm';
  const inputCls = 'w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#00459c] px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 font-semibold transition-colors';
  const selectCls = 'w-full bg-white border border-slate-200 focus:border-[#00459c] px-2 py-2 text-xs font-semibold outline-none text-slate-900 transition-colors';
  const labelCls = 'text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5';

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-10 bg-[#f5f7fb] text-slate-600 font-sans">

      {/* 1. TITLE & STATUS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Support Center</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-3xl">
            Enterprise-grade support for your mission-critical infrastructure. Manage tickets, browse docs, or speak with an engineer.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-700 px-4 py-2 border border-emerald-200 text-xs font-semibold tracking-wide self-start md:self-auto">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="uppercase font-bold text-[10px]">ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>

      {activeSupportTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 ${card} p-6 sm:p-8 flex flex-col justify-between space-y-6`}>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#00459c]/10 text-[#00459c] flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Knowledge Base</h2>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                    Self-service documentation for server configuration, API integration, and security best practices.
                  </p>
                </div>
                <div className="relative max-w-lg">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tutorials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={inputCls + ' pl-10'}
                  />
                </div>
              </div>
              <button className="self-start bg-[#00459c] hover:bg-[#003882] text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 transition-colors cursor-pointer">
                Browse Documentation
              </button>
            </div>

            <div className="flex flex-col gap-6">
              <div
                onClick={() => setActiveSupportTab('open')}
                className={`${card} p-6 hover:border-[#00459c]/50 transition-all cursor-pointer group flex items-start gap-4`}
              >
                <div className="w-12 h-12 bg-slate-100 text-[#00459c] flex items-center justify-center flex-shrink-0 group-hover:bg-[#00459c] group-hover:text-white transition-all">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#00459c] transition-colors">Open New Ticket</h3>
                  <p className="text-slate-500 text-xs font-medium">24/7 technical assistance</p>
                </div>
              </div>
              <div
                onClick={() => setActiveSupportTab('existing')}
                className="bg-[#00459c] text-white border border-[#003882] p-6 shadow-md hover:bg-[#003882] transition-all cursor-pointer group flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-white/10 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <History className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-sm">View Existing</h3>
                  <p className="text-white/70 text-xs font-medium">Check ticket status & history</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className={`${card} p-6`}>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#00459c]" /> GLOBAL REGIONAL HEALTH
              </h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="py-2.5">REGION</th>
                      <th className="py-2.5">INFRASTRUCTURE</th>
                      <th className="py-2.5">NETWORK</th>
                      <th className="py-2.5 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium text-slate-600">
                    <tr className="border-b border-slate-100">
                      <td className="py-3.5 font-bold text-slate-900">US-East-1 (Virginia)</td>
                      <td className="py-3.5 text-slate-500">Compute / Storage</td>
                      <td className="py-3.5 font-mono text-slate-500">100Gbps Mesh</td>
                      <td className="py-3.5 text-right">
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider border border-emerald-200">
                          STABLE
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3.5 font-bold text-slate-900">EU-West-2 (London)</td>
                      <td className="py-3.5 text-slate-500">Managed Cloud Platform</td>
                      <td className="py-3.5 font-mono text-slate-500">Private Peering</td>
                      <td className="py-3.5 text-right">
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider border border-emerald-200">
                          STABLE
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 font-bold text-slate-900">AP-South-1 (Mumbai)</td>
                      <td className="py-3.5 text-slate-500">CDN Edge Nodes</td>
                      <td className="py-3.5 font-mono text-slate-500">Tier-1 Fiber</td>
                      <td className="py-3.5 text-right">
                        <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider border border-amber-200">
                          MAINTENANCE
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`${card} p-6`}>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00459c]" /> POPULAR GUIDES
              </h3>
              <div className="space-y-4">
                {[
                  { title: 'Optimizing Redis for Scale', desc: 'Learn how to configure your memory clusters for maximum throughput.' },
                  { title: 'DDoS Mitigation Layers', desc: 'Strategies for implementing robust protection at the edge.' },
                  { title: 'Terraform Provider V3', desc: 'Migration guide for our latest infrastructure-as-code updates.' },
                ].map((guide) => (
                  <div key={guide.title} className="border border-slate-200 p-4 hover:border-[#00459c]/40 transition-colors bg-slate-50/40">
                    <h4 className="font-bold text-slate-900 text-sm">{guide.title}</h4>
                    <p className="text-slate-500 text-xs mt-1">{guide.desc}</p>
                    <a href="#" className="text-[#00459c] font-bold text-[10px] uppercase tracking-wider mt-3 inline-flex items-center gap-1 hover:gap-2 transition-all">
                      READ GUIDE <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${card} p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6`}>
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-[#00459c] text-white flex items-center justify-center flex-shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Dedicated Enterprise Support</h4>
                <p className="text-slate-500 text-xs mt-0.5">Average response time for Platinum tier: 12 minutes</p>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button className="flex-1 md:flex-none border border-[#00459c] text-[#00459c] hover:bg-[#00459c]/5 font-bold text-xs uppercase tracking-wider px-6 py-3 transition-all cursor-pointer">
                Live Chat
              </button>
              <button className="flex-1 md:flex-none bg-[#00459c] hover:bg-[#003882] text-white font-bold text-xs uppercase tracking-wider px-6 py-3 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                <Phone className="w-4 h-4" /> Call Support
              </button>
            </div>
          </div>
        </>
      )}

      {activeSupportTab === 'open' && (
        <div className={`${card} p-6 sm:p-8 max-w-2xl mx-auto`}>
          <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Open New Priority Ticket</h2>
              <p className="text-slate-500 text-xs mt-1">Our engineers will audit and respond in under 12 minutes.</p>
            </div>
            <button
              onClick={() => setActiveSupportTab('overview')}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>

          {submittedTicket ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Case Registered</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">Your technical ticket has been assigned a priority queue. Returning to overview...</p>
            </div>
          ) : (
            <form onSubmit={handleOpenTicket} className="space-y-5">
              <div>
                <label className={labelCls}>Subject / System Issue *</label>
                <input
                  type="text"
                  placeholder="e.g., Custom domain not resolving"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                    <option value="VPS Hosting">VPS Hosting</option>
                    <option value="DNS Zone">DNS Zone</option>
                    <option value="Database">Database Instance</option>
                    <option value="Billing">Billing & VAT</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priority SLA</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className={selectCls}>
                    <option value="LOW">LOW PRIORITY</option>
                    <option value="MEDIUM">MEDIUM SLA</option>
                    <option value="HIGH">CRITICAL HIGH (12 min)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Detailed Description *</label>
                <textarea
                  rows={5}
                  placeholder="Describe your server outputs, latency thresholds, or zone configurations..."
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  className={inputCls + ' resize-none'}
                  required
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-[#00459c] hover:bg-[#003882] text-white font-bold py-3 text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Submit Technical Case
              </button>
            </form>
          )}
        </div>
      )}

      {activeSupportTab === 'existing' && (
        <div className={`${card} p-6 sm:p-8 max-w-4xl mx-auto space-y-6`}>
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Active Case Registry Logs</h2>
              <p className="text-slate-500 text-xs mt-1">Review active threads and support logs.</p>
            </div>
            <button
              onClick={() => setActiveSupportTab('overview')}
              className="text-[#00459c] hover:underline font-bold text-xs uppercase tracking-wider"
            >
              ← Back
            </button>
          </div>

          <div className="space-y-4">
            {tickets.map((ticket) => {
              const isHigh = ticket.priority === 'HIGH';
              const isMed = ticket.priority === 'MEDIUM';
              const isResolved = ticket.status === 'RESOLVED';
              const isPending = ticket.status === 'PENDING';

              return (
                <div key={ticket.id} className="border border-slate-200 p-5 bg-slate-50/40 hover:border-[#00459c]/40 transition-colors">
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-200 pb-2 mb-2">
                    <span className="text-[10px] bg-white border border-slate-200 px-2.5 py-0.5 font-mono text-slate-500 font-bold">
                      {ticket.category}
                    </span>
                    <div className="flex gap-2 text-[9px] font-bold">
                      <span className={`px-2 py-0.5 uppercase border ${
                        isHigh ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        isMed ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {ticket.priority} SLA
                      </span>
                      <span className={`px-2 py-0.5 uppercase border ${
                        isResolved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        isPending ? 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm leading-snug">{ticket.subject}</h4>

                  <div className="mt-4 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                    <span>Registered: {ticket.date}</span>
                    <span>Replies: {ticket.replies} engineering comments</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
