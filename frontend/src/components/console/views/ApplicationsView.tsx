import React, { useState } from 'react';
import { Rocket, GitBranch, Box, Copy, Check, ChevronRight, Plus } from 'lucide-react';
import { useConsole } from '../ConsoleShell';
import { SectionHeader, Loader, EmptyState, ErrorBanner, StatusPill, CopyField, PrimaryButton } from '../ui';
import CreateApplicationWizard from '../CreateApplicationWizard';

export default function ApplicationsView() {
  const { data, navigate } = useConsole();
  const { projects, loading, error, refresh } = data;
  const [showCreate, setShowCreate] = useState(false);

  const apps = (projects || []).flatMap((p) =>
    (p.apps || []).map((a: any) => ({
      ...a,
      _projectName: p.name,
      _projectId: p.id,
    }))
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Applications"
        subtitle={`${apps.length} application(s) across all your projects.`}
        action={<PrimaryButton onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Application</PrimaryButton>}
      />

      {showCreate && <CreateApplicationWizard onClose={() => setShowCreate(false)} onCreated={() => refresh()} />}

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {loading ? (
        <Loader label="Loading applications..." />
      ) : apps.length === 0 ? (
        <EmptyState
          icon={<Rocket className="w-6 h-6" />}
          title="No applications"
          hint="Deploy a web service from a git repository or Docker image."
        />
      ) : (
        <div className="bg-white border border-slate-200 shadow-sm">
          {apps.map((app, idx) => {
            const st = (app.applicationStatus || app.status || 'IDLE').toUpperCase();
            const source = app.sourceType || app.buildType || 'unknown';
            return (
              <button
                key={`${app._projectId}-${app.name}`}
                onClick={() => navigate({ name: 'application', projectId: app._projectId, appName: app.name })}
                className={`w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors group ${idx > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-violet-50 flex items-center justify-center shrink-0">
                    <Rocket className="w-4.5 h-4.5 text-violet-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">{app.name}</span>
                      <StatusPill status={st} />
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <span className="font-sans">{app._projectName}</span>
                      {app.image && <><span className="text-slate-300">·</span><span>{app.image}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-400">
                    {app.repository && <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> {app.owner}/{app.repository}{app.branch ? `@${app.branch}` : ''}</span>}
                    {!app.repository && app.dockerImage && <span className="font-mono">{app.dockerImage}</span>}
                    <span className="uppercase font-bold text-slate-300 bg-slate-100 px-1.5 py-0.5">{source}</span>
                  </div>
                  {app.replicas != null && <span className="text-[10px] font-bold text-slate-400">{app.replicas} replica(s)</span>}
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#00459c]" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
