'use client';

import React from 'react';
import { Book, Server, Globe, Lock, Database, HelpCircle, Search, ArrowRight, Zap, Terminal, GitBranch } from 'lucide-react';

const articles = [
  { icon: Server, title: 'Getting Started with Deploys', desc: 'Connect a repo and ship your first app with automatic Nixpacks detection.', cat: 'Guides' },
  { icon: Database, title: 'Managed Database Setup', desc: 'Provision PostgreSQL, MySQL, Redis or MongoDB clusters in seconds.', cat: 'Databases' },
  { icon: Globe, title: 'Custom Domains & TLS', desc: 'Point a domain, attach a custom domain and let automatic TLS handle HTTPS.', cat: 'Networking' },
  { icon: Lock, title: 'Security & Compliance', desc: 'Encryption, private networking, audit logs and SOC 2 readiness.', cat: 'Security' },
  { icon: GitBranch, title: 'Deploy Hooks & CI/CD', desc: 'Automate builds, run migrations and promote environments on every push.', cat: 'Automation' },
  { icon: Terminal, title: 'CLI & REST API', desc: 'Manage services, volumes and cron jobs programmatically.', cat: 'API' },
];

const quickLinks = [
  { icon: Zap, label: 'Deploy a template', desc: 'One-click full-stack apps' },
  { icon: Server, label: 'Workers & cron', desc: 'Background jobs without a server' },
  { icon: HelpCircle, label: 'Troubleshooting', desc: 'Common errors and fixes' },
];

function KnowledgeBasePage() {
  return (
    <div className="animate-fade-in bg-[#f5f7fb] text-slate-600">
      {/* Hero with search */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#002866] to-[#00459c] text-white py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:44px_44px]"></div>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-cyan-400/20 blur-[120px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-2 bg-[#00a2ff]/15 border border-[#00a2ff]/30 text-[#00c0ff] text-xs font-bold px-3 py-1.5 mb-6 uppercase tracking-wider font-mono">
            <Book className="w-3.5 h-3.5" /> Documentation
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight font-display">
            Documentation
          </h1>
          <p className="text-base sm:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed mt-5">
            Guides and tutorials to help you deploy faster and operate like a platform team.
          </p>
          <div className="mt-9 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search docs, guides and APIs..."
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 focus:bg-white focus:text-slate-900 pl-11 pr-4 py-3 text-sm text-white outline-none placeholder:text-slate-300 transition-colors"
              />
              <span className="absolute right-4 top-3.5 text-[10px] font-mono text-slate-300 border border-white/20 px-1.5 py-0.5">/</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a key={link.label} href="/kb" className="group bg-slate-50 border border-slate-200 p-5 hover:border-[#00459c]/40 hover:bg-white hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-[#00459c]" />
                    <div>
                      <div className="text-slate-900 font-bold text-sm">{link.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{link.desc}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#00459c] transition-colors" />
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* Articles grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article, i) => {
            const Icon = article.icon;
            return (
              <div key={i} className="group bg-white border border-slate-200 p-6 hover:border-[#00459c]/40 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-[#00459c]/10 text-[#00459c] flex items-center justify-center group-hover:bg-[#00459c] group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border border-slate-200 px-2 py-0.5">
                    {article.cat}
                  </span>
                </div>
                <h3 className="text-slate-900 font-bold text-sm mb-1.5">{article.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{article.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[#00459c] text-[10px] font-bold uppercase tracking-wider group-hover:gap-2 transition-all">
                  Read Guide <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default KnowledgeBasePage;
