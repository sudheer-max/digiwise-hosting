'use client';

import React from 'react';
import { Shield, Users, Globe, Zap, GitBranch, CheckCircle2, Container, Server, Boxes } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="animate-fade-in bg-[#f5f7fb] text-slate-600">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#002866] to-[#00459c] text-white py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:44px_44px]"></div>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-cyan-400/20 blur-[120px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-2 bg-[#00a2ff]/15 border border-[#00a2ff]/30 text-[#00c0ff] text-xs font-bold px-3 py-1.5 mb-6 uppercase tracking-wider font-mono">
            <Container className="w-3.5 h-3.5" /> About DigiWise
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight font-display">
            We handle the servers
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00c0ff] to-cyan-200">so you can focus on building.</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed mt-5">
            DigiWise is a cloud platform that deploys your applications, databases and websites
            on a fully managed infrastructure — so you can ship code without worrying about servers.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-200 bg-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: Container, value: 'K3s', label: 'Cloud Engine' },
            { icon: Users, value: '5M+', label: 'Apps Deployed' },
            { icon: Boxes, value: '100%', label: 'API Compatible' },
            { icon: Shield, value: '99.99%', label: 'Uptime SLA' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label}>
                <Icon className="w-6 h-6 text-[#00459c] mx-auto mb-3" />
                <div className="text-3xl font-extrabold text-[#00459c] font-mono">{stat.value}</div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
            <div>
              <span className="text-[#00459c] text-xs font-bold uppercase tracking-widest block mb-3 font-mono">Our Mission</span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display leading-tight">
                Enterprise-grade hosting, accessible to everyone.
              </h2>
              <p className="mt-5 text-slate-500 text-sm sm:text-base leading-relaxed">
                We believe hosting shouldn't require a DevOps team. DigiWise bundles auto-scaling, load balancing,
                SSL certificates, database management and backup into a single managed platform — giving every developer
                the power of enterprise infrastructure without the complexity.
              </p>
              <p className="mt-4 text-slate-500 text-sm sm:text-base leading-relaxed">
                From a startup deploying its first app to a business running multiple services
                at scale, DigiWise provides the tools, managed databases and deployment workflows
                teams need to move fast without breaking things.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Container, title: 'Managed Cloud Engine', desc: 'High-performance cloud infrastructure with full API compatibility and minimal overhead.' },
                { icon: GitBranch, title: 'Git-Based Deployments', desc: 'Push code and it goes live automatically. Roll back to any version in seconds.' },
                { icon: Server, title: 'Auto SSL & Load Balancing', desc: 'Automatic HTTPS certificates and smart traffic routing across your apps.' },
                { icon: Shield, title: 'Reliable Storage', desc: 'Redundant storage that keeps your data safe even if hardware fails.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="bg-white border border-slate-200 p-6 hover:border-[#00459c]/40 hover:shadow-md transition-all">
                    <Icon className="w-6 h-6 text-[#00459c] mb-4" />
                    <h3 className="text-slate-900 font-bold text-sm mb-1.5">{item.title}</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[#00459c] text-xs font-bold uppercase tracking-widest block mb-3 font-mono">Values</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">What we stand for</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Simple by Default', desc: 'Every feature starts with a developer who just wants to deploy. If it isn\'t simple, it isn\'t done.' },
              { title: 'Cloud-Native by Design', desc: 'Auto-scaling, health checks and managed databases are built in. Your apps run reliably from day one.' },
              { title: 'Full Transparency', desc: 'Status pages, live metrics and clear pricing. You always know exactly what\'s running and what it costs.' },
            ].map((val) => (
              <div key={val.title} className="bg-slate-50 border border-slate-200 p-7 hover:border-[#00459c]/40 transition-all">
                <div className="w-9 h-9 bg-[#00459c]/10 text-[#00459c] flex items-center justify-center mb-5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-slate-900 font-bold text-sm mb-2">{val.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Deploy your app today</h2>
          <p className="mt-4 text-slate-500 text-sm leading-relaxed">
            Get a fully managed cloud environment with auto-SSL, databases and scaling — running in under 60 seconds.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => router.push('/auth/signup')}
              className="bg-[#00459c] hover:bg-[#0057c0] text-white font-bold text-sm px-8 py-3.5 transition-colors cursor-pointer"
            >
              Get Started Free
            </button>
            <button
              onClick={() => router.push('/contact')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm px-8 py-3.5 border border-slate-200 transition-colors cursor-pointer"
            >
              Talk to Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
