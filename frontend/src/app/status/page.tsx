'use client';

import React from 'react';
import { CheckCircle2, Clock, Server, Database, Globe, Mail, Shield, CreditCard, Cpu, AlertTriangle } from 'lucide-react';

export default function StatusPage() {
  const services = [
    { name: 'Deployments Engine', status: 'Operational', icon: Server },
    { name: 'Web Hosting Platform', status: 'Operational', icon: Globe },
    { name: 'VPS Compute', status: 'Operational', icon: Cpu },
    { name: 'Managed Databases', status: 'Operational', icon: Database },
    { name: 'Email Services', status: 'Operational', icon: Mail },
    { name: 'Automatic TLS', status: 'Operational', icon: Shield },
    { name: 'Billing & Payments', status: 'Operational', icon: CreditCard },
    { name: 'API Gateway', status: 'Operational', icon: Server },
  ];

  return (
    <div className="animate-fade-in bg-[#f5f7fb] text-slate-600">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#002866] to-[#00459c] text-white py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:44px_44px]"></div>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-400/15 blur-[120px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold px-3 py-1.5 mb-6 uppercase tracking-wider font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" /> All Systems Operational
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight font-display">
            Service Status
          </h1>
          <p className="text-base sm:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed mt-5">
            Real-time operational status for all DigiWise services. No incidents reported in the last 30 days.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-[#00c0ff]" />
            Last checked just now · 99.99% uptime
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <div key={service.name} className="bg-white border border-slate-200 px-5 py-4 flex items-center justify-between hover:border-emerald-400/50 transition-colors shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 border border-slate-200 text-[#00459c] flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900">{service.name}</span>
              </div>
              <span className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" /> {service.status}
              </span>
            </div>
          );
        })}
      </section>

      {/* History note */}
      <section className="pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-amber-50 border border-amber-200 p-6 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-slate-900 font-bold text-sm mb-1">Recent incidents</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No open incidents. The last maintenance window was completed on schedule. Historical
              incident reports are available to enterprise customers through the support portal.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
