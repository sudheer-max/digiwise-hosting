import React, { useEffect, useState } from 'react';
import {
  FolderKanban, Rocket, Database, HeartPulse, Server, ArrowRight, Box,
  Cpu, Workflow, LineChart, Warehouse, Camera, ExternalLink, Globe
} from 'lucide-react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import { SectionHeader, Card, Loader, ErrorBanner, StatusPill } from '../ui';

function StatCard({ icon, label, value, accent, onClick }: {
  icon: React.ReactNode; label: string; value: number; accent: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-slate-200 shadow-sm p-5 text-left transition-all hover:border-[#00459c]/40 hover:shadow-md cursor-pointer group"
    >
      <div className={`w-10 h-10 ${accent} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-3xl font-display font-bold text-slate-900">{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1">
        {label} <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

interface InfraService {
  name: string;
  url: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  status: 'checking' | 'online' | 'offline';
}

const INFRA_SERVICES: Omit<InfraService, 'status'>[] = [
  { name: 'ArgoCD', url: 'https://argocd.digiwisesoftech.com', icon: <Workflow className="w-4 h-4" />, color: '#E8563D', bgColor: '#E8563D15' },
  { name: 'Grafana', url: 'https://grafana.digiwisesoftech.com', icon: <LineChart className="w-4 h-4" />, color: '#F46800', bgColor: '#F4680015' },
  { name: 'Harbor', url: 'https://harbor.digiwisesoftech.com', icon: <Warehouse className="w-4 h-4" />, color: '#4495D7', bgColor: '#4495D715' },
  { name: 'Prometheus', url: 'https://prometheus.digiwisesoftech.com', icon: <Camera className="w-4 h-4" />, color: '#E6522C', bgColor: '#E6522C15' },
];

export default function OverviewView() {
  const { data, navigate } = useConsole();
  const { projects, loading, error, refresh } = data;
  const [health, setHealth] = useState<any>(null);
  const [healthErr, setHealthErr] = useState('');
  const [infraStatuses, setInfraStatuses] = useState<Record<string, 'checking' | 'online' | 'offline'>>({});
  const [totalDbs, setTotalDbs] = useState(0);

  useEffect(() => {
    api.healthCheck().then((h) => {
      setHealth(h);
    }).catch((e: any) => setHealthErr(e.message || 'Health check unavailable'));
  }, []);

  useEffect(() => {
    if (!projects || projects.length === 0) return;
    const loadDbCount = async () => {
      let count = 0;
      for (const p of projects) {
        try {
          const dbs = await api.listDatabases(p.k8sNamespace);
          if (Array.isArray(dbs)) count += dbs.length;
        } catch { /* skip */ }
      }
      setTotalDbs(count);
    };
    loadDbCount();
  }, [projects]);

  useEffect(() => {
    const check = async () => {
      const statuses: Record<string, 'checking' | 'online' | 'offline'> = {};
      for (const s of INFRA_SERVICES) {
        statuses[s.name] = 'checking';
      }
      setInfraStatuses({ ...statuses });

      const results = await Promise.allSettled(
        INFRA_SERVICES.map(async (s) => {
          try {
            await fetch(s.url, { method: 'HEAD', mode: 'no-cors' });
            return { name: s.name, status: 'online' as const };
          } catch {
            return { name: s.name, status: 'offline' as const };
          }
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled') {
          statuses[r.value.name] = r.value.status;
        }
      }
      setInfraStatuses({ ...statuses });
    };
    check();
  }, []);

  const totalApps = (projects || []).reduce((acc, p) => acc + (p.apps?.length || 0), 0);

  const recentProjects = [...(projects || [])].slice(0, 4);
  const healthy = health ? (health.status === 'ok' || health.healthy || health.status === 'healthy') : false;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard"
        subtitle="Overview of your infrastructure across all projects."
      />

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FolderKanban className="w-5 h-5 text-[#00459c]" />} label="Projects" value={projects.length} accent="bg-[#00459c]/10" onClick={() => navigate({ name: 'projects' })} />
        <StatCard icon={<Rocket className="w-5 h-5 text-violet-600" />} label="Applications" value={totalApps} accent="bg-violet-50" onClick={() => navigate({ name: 'applications' })} />
        <StatCard icon={<Database className="w-5 h-5 text-emerald-600" />} label="Databases" value={totalDbs} accent="bg-emerald-50" onClick={() => navigate({ name: 'databases' })} />
        <StatCard icon={<Server className="w-5 h-5 text-amber-600" />} label="Services" value={INFRA_SERVICES.length} accent="bg-amber-50" onClick={() => navigate({ name: 'infrastructure' })} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health card */}
        <Card title="Platform Health" icon={<HeartPulse className="w-4 h-4 text-[#00459c]" />} className="lg:col-span-1">
          {healthErr ? (
            <div className="text-xs text-rose-600">{healthErr}</div>
          ) : !health ? (
            <Loader label="Checking..." />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">API</span>
                <StatusPill status={healthy ? 'healthy' : 'degraded'} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Kubernetes</span>
                <StatusPill status={healthy ? 'healthy' : 'degraded'} />
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {INFRA_SERVICES.map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <span style={{ color: s.color }}>{s.icon}</span> {s.name}
                    </span>
                    <StatusPill status={infraStatuses[s.name] === 'online' ? 'healthy' : infraStatuses[s.name] === 'checking' ? 'pending' : 'stopped'} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Recent projects */}
        <Card
          title="Recent Projects"
          icon={<FolderKanban className="w-4 h-4 text-[#00459c]" />}
          className="lg:col-span-2"
          action={
            <button onClick={() => navigate({ name: 'projects' })} className="text-[10px] font-bold uppercase tracking-wider text-[#00459c] hover:underline cursor-pointer">
              View all
            </button>
          }
        >
          {loading ? (
            <Loader label="Loading projects..." />
          ) : recentProjects.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              <Box className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              No projects yet. Create your first project to start deploying.
            </div>
          ) : (
            <div className="space-y-2">
              {recentProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate({ name: 'project', projectId: p.id })}
                  className="w-full flex items-center justify-between gap-3 border border-slate-100 hover:border-[#00459c]/40 px-4 py-3 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-[#00459c]/10 flex items-center justify-center shrink-0">
                      <FolderKanban className="w-4 h-4 text-[#00459c]" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-sm font-bold text-slate-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{p.k8sNamespace || p.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5">
                      {p.apps?.length || 0} apps
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#00459c] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Infrastructure Services */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#00459c]" /> Infrastructure
          </h2>
          <button onClick={() => navigate({ name: 'infrastructure' })} className="text-[10px] font-bold uppercase tracking-wider text-[#00459c] hover:underline cursor-pointer">
            View all
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {INFRA_SERVICES.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 shadow-sm p-4 hover:border-[#00459c]/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 flex items-center justify-center" style={{ backgroundColor: s.bgColor, color: s.color }}>
                  {s.icon}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#00459c] transition-colors" />
              </div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-[#00459c] transition-colors">{s.name}</div>
              <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{s.url.replace('https://', '')}</div>
              <div className="mt-2">
                <StatusPill status={infraStatuses[s.name] === 'online' ? 'healthy' : infraStatuses[s.name] === 'checking' ? 'pending' : 'stopped'} />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Rocket className="w-4 h-4" />, label: 'Deploy an Application', hint: 'Connect a git repo or Docker image', route: { name: 'projects' } as const },
          { icon: <Database className="w-4 h-4" />, label: 'Provision a Database', hint: 'Postgres, MySQL, Mongo, Redis & more', route: { name: 'databases' } as const },
          { icon: <Globe className="w-4 h-4" />, label: 'Infrastructure', hint: 'ArgoCD, Grafana, Harbor, Prometheus', route: { name: 'infrastructure' } as const },
        ].map((q) => (
          <button
            key={q.label}
            onClick={() => navigate(q.route as any)}
            className="bg-white border border-slate-200 shadow-sm p-5 text-left hover:border-[#00459c]/40 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 bg-slate-50 border border-slate-200 flex items-center justify-center text-[#00459c] mb-3 group-hover:bg-[#00459c] group-hover:text-white transition-colors">
              {q.icon}
            </div>
            <div className="text-sm font-bold text-slate-900">{q.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{q.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
