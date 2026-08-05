import React, { useEffect, useState } from 'react';
import { FolderKanban, Rocket, Database, HeartPulse, Server, ArrowRight, Box } from 'lucide-react';
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

export default function OverviewView() {
  const { data, navigate } = useConsole();
  const { projects, loading, error, refresh } = data;
  const [health, setHealth] = useState<any>(null);
  const [healthErr, setHealthErr] = useState('');

  useEffect(() => {
    api.healthCheck().then((h) => {
      setHealth(h);
    }).catch((e: any) => setHealthErr(e.message || 'Health check unavailable'));
  }, []);

  const totalApps = (projects || []).reduce((acc, p) => acc + (p.applications?.length || 0), 0);

  const recentProjects = [...(projects || [])].slice(0, 4);
  const healthy = health ? (health.status === 'ok' || health.healthy || health.status === 'healthy') : false;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard"
        subtitle="Overview of your infrastructure across all projects."
      />

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FolderKanban className="w-5 h-5 text-[#00459c]" />} label="Projects" value={projects.length} accent="bg-[#00459c]/10" onClick={() => navigate({ name: 'projects' })} />
        <StatCard icon={<Rocket className="w-5 h-5 text-violet-600" />} label="Applications" value={totalApps} accent="bg-violet-50" onClick={() => navigate({ name: 'applications' })} />
        <StatCard icon={<Database className="w-5 h-5 text-emerald-600" />} label="Databases" value={0} accent="bg-emerald-50" onClick={() => navigate({ name: 'databases' })} />
        <StatCard icon={<Server className="w-5 h-5 text-amber-600" />} label="Services" value={totalApps} accent="bg-amber-50" onClick={() => navigate({ name: 'projects' })} />
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
                      {p.applications?.length || 0} apps
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#00459c] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Rocket className="w-4 h-4" />, label: 'Deploy an Application', hint: 'Connect a git repo or Docker image', route: { name: 'projects' } as const },
          { icon: <Database className="w-4 h-4" />, label: 'Provision a Database', hint: 'Postgres, MySQL, Mongo, Redis & more', route: { name: 'databases' } as const },
          { icon: <Server className="w-4 h-4" />, label: 'Manage Servers', hint: 'Kubernetes cluster nodes', route: { name: 'servers' } as const },
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
