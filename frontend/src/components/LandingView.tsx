import React from 'react';
import {
  Rocket, Database, LayoutTemplate, ShieldCheck, HardDrive, Timer, ArrowRight,
  CheckCircle2, Zap, Sparkles, Server, Cpu, Network, Boxes, Container
} from 'lucide-react';

interface LandingViewProps {
  onSelectPlan: (planName: string, price: number) => void;
}

const TEMPLATES = [
  { name: 'Next.js', tag: 'React Framework', icon: '▲' },
  { name: 'Express', tag: 'Node API Server', icon: '⬡' },
  { name: 'WordPress', tag: 'PHP + MySQL', icon: 'W' },
  { name: 'Django', tag: 'Python Web', icon: 'D' },
  { name: 'Rails', tag: 'Ruby on Rails', icon: 'R' },
  { name: 'PostgreSQL', tag: 'CloudNativePG', icon: 'P' },
  { name: 'MongoDB', tag: 'Percona Operator', icon: 'M' },
  { name: 'Redis', tag: 'Spotahome Operator', icon: 'R' },
  { name: 'Spring Boot', tag: 'Java Microservices', icon: 'S' },
  { name: 'Vue', tag: 'SPA Framework', icon: 'V' },
  { name: 'FastAPI', tag: 'Python API', icon: 'F' },
  { name: 'Go', tag: 'Compiled Services', icon: 'G' },
];

const features = [
  {
    icon: Container,
    title: 'Managed Cloud Engine',
    desc: 'High-performance cloud infrastructure with auto-scaling, load balancing, and full API compatibility.',
  },
  {
    icon: Database,
    title: 'Managed Databases',
    desc: 'PostgreSQL, MongoDB, and Redis — fully managed with automatic backups, failover, and monitoring.',
  },
  {
    icon: LayoutTemplate,
    title: 'Git-Based Deployments',
    desc: 'Push code to Git and it goes live automatically. Roll back to any version in seconds.',
  },
  {
    icon: ShieldCheck,
    title: 'Auto SSL & Routing',
    desc: 'Automatic HTTPS certificates on every service. Smart traffic routing with zero configuration.',
  },
  {
    icon: HardDrive,
    title: 'Reliable Storage',
    desc: 'Redundant storage that keeps your data safe. Resize volumes on the fly without downtime.',
  },
  {
    icon: Server,
    title: 'Private Container Registry',
    desc: 'Store and manage your app images privately with vulnerability scanning and access controls.',
  },
];

export default function LandingView({ onSelectPlan }: LandingViewProps) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in bg-[#f5f7fb] text-slate-600">

      {/* 1. HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#002866] to-[#00459c] text-white py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:44px_44px]"></div>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-400/20 blur-[120px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto flex flex-col items-center">
            <span className="inline-flex items-center gap-2 bg-[#00a2ff]/15 border border-[#00a2ff]/30 text-[#00c0ff] text-xs font-bold px-3 py-1.5 mb-6 uppercase tracking-wider font-mono">
              <Sparkles className="w-3.5 h-3.5" /> Cloud-Powered
            </span>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] font-display">
              Enterprise Hosting
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00c0ff] to-cyan-200">
                without the complexity.
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">
              DigiWise runs a fully managed cloud platform with auto-SSL, reliable storage,
              Git-based deployments, and managed databases. Deploy to production in seconds.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => onSelectPlan('Trial', 0)}
                className="bg-[#00c0ff] hover:bg-white text-[#002866] font-bold text-sm px-8 py-3.5 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4" /> Deploy Your App
              </button>
              <button
                onClick={() => scrollTo('pricing')}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-8 py-3.5 border border-white/20 transition-colors cursor-pointer"
              >
                View Pricing
              </button>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-slate-200">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Full API access</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Git-based deployments</span>
            </div>
          </div>

          {/* Terminal Mockup */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="bg-white border border-slate-200 shadow-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
                <span className="w-3 h-3 bg-rose-400"></span>
                <span className="w-3 h-3 bg-amber-400"></span>
                <span className="w-3 h-3 bg-emerald-400"></span>
                <span className="ml-3 text-[10px] text-slate-500 font-mono">digiwise — production environment</span>
              </div>
              <div className="p-5 text-xs font-mono leading-relaxed bg-[#f8fafc]">
                <p className="text-slate-500"><span className="text-emerald-600">$</span> digiwise status --env production</p>
                <p className="text-slate-700 mt-1"><span className="text-[#00459c]">✓</span> api              Running</p>
                <p className="text-slate-700"><span className="text-[#00459c]">✓</span> postgresql       Running</p>
                <p className="text-slate-700"><span className="text-[#00459c]">✓</span> redis            Running</p>
                <p className="mt-1 text-slate-900"><span className="text-emerald-600">→</span> All services synced <span className="text-[#00459c] font-bold">production</span> — healthy</p>
                <p className="text-slate-400">Engine: K3s v1.31 · Nodes: 3 · CPU: 47% · Memory: 62%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS ROW */}
      <section className="border-y border-slate-200 bg-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 'K3s', label: 'Cloud Engine' },
              { value: '99.99%', label: 'Uptime SLA' },
              { value: '3', label: 'Database Types' },
              { value: '100%', label: 'API Compatible' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-extrabold text-[#00459c] font-mono">{stat.value}</div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FEATURES GRID */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[#00459c] text-xs font-bold uppercase tracking-widest block mb-3 font-mono">Platform</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
              Full hosting stack, managed for you
            </h2>
            <p className="mt-3 text-slate-500 text-sm sm:text-base leading-relaxed">
              Every component — cloud engine, SSL, storage, registry, deployments and databases — managed with production defaults.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-white border border-slate-200 p-6 hover:border-[#00459c]/40 hover:shadow-md transition-all group">
                  <div className="w-11 h-11 bg-[#00459c]/10 text-[#00459c] flex items-center justify-center mb-4 group-hover:bg-[#00459c] group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-slate-900 font-bold text-sm mb-1.5">{feature.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. TEMPLATES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
            <div className="max-w-xl">
              <span className="text-[#00459c] text-xs font-bold uppercase tracking-widest block mb-3 font-mono">Templates</span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
                One-click deployments
              </h2>
              <p className="mt-3 text-slate-500 text-sm leading-relaxed">
                Full-stack apps, APIs, microservices and managed databases — deployed and running in under a minute.
              </p>
            </div>
            <button
              onClick={() => onSelectPlan('Trial', 0)}
              className="text-[#00459c] font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 hover:gap-2.5 transition-all cursor-pointer"
            >
              Deploy a Template <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => onSelectPlan('Trial', 0)}
                className="bg-slate-50 border border-slate-200 p-4 text-left hover:border-[#00459c]/40 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="w-9 h-9 bg-white border border-slate-200 text-[#00459c] font-mono font-bold flex items-center justify-center mb-3">
                  {tpl.icon}
                </div>
                <div className="text-slate-900 font-bold text-sm">{tpl.name}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{tpl.tag}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5. MANAGED DATABASES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="text-[#00459c] text-xs font-bold uppercase tracking-widest block mb-3 font-mono">Managed Databases</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
                Production databases, zero hassle
              </h2>
              <p className="mt-4 text-slate-500 text-sm sm:text-base leading-relaxed max-w-lg">
                Managed database clusters with automatic failover,
                daily backups, and private networking — all running on your cloud environment.
              </p>
              <div className="mt-7 flex flex-col gap-3 text-sm text-slate-700">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>PostgreSQL with high-availability and auto-failover</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>MongoDB with sharding and replication</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Redis with Sentinel-based high availability</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'PostgreSQL', sub: 'Managed PostgreSQL', desc: 'Automatic failover, daily backups and point-in-time recovery.', color: 'text-sky-600' },
                { name: 'MongoDB', sub: 'Managed MongoDB', desc: 'Sharded clusters with automatic scaling and replication.', color: 'text-emerald-600' },
                { name: 'Redis', sub: 'Managed Redis', desc: 'High-availability caching with automatic failover and persistence.', color: 'text-rose-600' },
                { name: 'Storage', sub: 'Reliable Storage', desc: 'Redundant block storage across all nodes.', color: 'text-purple-600' },
              ].map((db) => (
                <div key={db.name} className="bg-white border border-slate-200 p-5 hover:border-[#00459c]/40 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <div className={`text-xs font-bold uppercase tracking-wide font-mono ${db.color}`}>{db.name}</div>
                    <Database className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-slate-900 font-bold text-sm mt-2">{db.sub}</div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{db.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRICING */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[#00459c] text-xs font-bold uppercase tracking-widest block mb-3 font-mono">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
              One flat plan. Unlimited services.
            </h2>
            <p className="mt-3 text-slate-500 text-sm sm:text-base leading-relaxed">
              No per-VM prices, no surprises. Every account starts free and includes 4 services
              for 30 days — then a flat $10/month keeps everything running, unlimited.
            </p>
          </div>

          {/* Featured FREE Trial card */}
          <div className="max-w-lg mx-auto bg-white border-2 border-[#00459c] shadow-lg relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00459c] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider whitespace-nowrap">
              Start Free
            </span>
            <div className="p-8 text-center">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Trial</div>
              <div className="mt-3 flex items-baseline justify-center">
                <span className="text-5xl font-extrabold text-slate-900 font-mono">$0</span>
                <span className="text-sm text-slate-500 ml-1.5">/first 30 days</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Up to 4 services · apps, databases &amp; workers</p>

              <div className="my-6 border-t border-slate-100"></div>

              <ul className="text-left space-y-3 text-xs text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /><span><strong className="text-slate-800">Full cloud stack</strong> — cloud engine, SSL, storage, deployments, databases</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /><span><strong className="text-slate-800">30-day free trial</strong> — full platform for 30 days, no card required</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /><span><strong className="text-slate-800">Then upgrade</strong> — flat $10/mo, unlimited services</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /><span><strong className="text-slate-800">Everything included</strong> — SSL, Git deployments, databases, monitoring, zero config</span></li>
              </ul>

              <button
                onClick={() => onSelectPlan('Trial', 0)}
                className="mt-8 w-full bg-[#00459c] hover:bg-[#003577] text-white font-bold text-sm py-3.5 transition-colors cursor-pointer"
              >
                Start Building
              </button>
            </div>
          </div>

          {/* How billing works after the trial */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 max-w-lg mx-auto gap-4">
            <div className="bg-slate-50 border border-slate-200 p-5 text-center">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Free Trial</div>
              <div className="mt-1 text-xl font-extrabold text-slate-900 font-mono">$0<span className="text-xs text-slate-500 font-medium"> · 30 days</span></div>
              <div className="text-[11px] text-slate-500 mt-1">Up to 4 services, full cloud stack</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-5 text-center">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Pro</div>
              <div className="mt-1 text-xl font-extrabold text-slate-900 font-mono">$10<span className="text-xs text-slate-500 font-medium">/mo</span></div>
              <div className="text-[11px] text-slate-500 mt-1">Unlimited services, flat monthly</div>
              <button
                onClick={() => onSelectPlan('Pro', 10)}
                className="mt-4 w-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 transition-colors cursor-pointer"
              >
                Upgrade
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400 max-w-lg mx-auto">
            After your free month, upgrade to Pro for a flat $10/mo with unlimited services.
            Cancel anytime — your projects stay yours.
          </p>
        </div>
      </section>

      {/* 7. CTA */}
      <section className="relative overflow-hidden bg-[#00459c] py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:44px_44px]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="text-[#00c0ff] text-xs font-bold uppercase tracking-widest block mb-4 font-mono">
            <Rocket className="inline w-4 h-4 -mt-0.5 mr-1.5" /> Get started in seconds
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
            Ship your app. We handle the rest.
          </h2>
          <p className="mt-4 text-slate-200 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Join developers deploying on DigiWise. Free to start — deploy your first app in under 60 seconds.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => onSelectPlan('Trial', 0)}
              className="bg-white text-[#00459c] font-bold text-sm px-9 py-3.5 transition-colors cursor-pointer flex items-center justify-center gap-2 hover:bg-slate-50"
            >
              <Rocket className="w-4 h-4" /> Deploy Your App
            </button>
            <button
              onClick={() => scrollTo('features')}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-9 py-3.5 border border-white/20 transition-colors cursor-pointer"
            >
              Explore Platform
            </button>
          </div>
          <p className="mt-6 text-[11px] text-slate-200 flex items-center justify-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            $10/mo Pro after your free month · No credit card required · Cancel anytime
          </p>
        </div>
      </section>

    </div>
  );
}
