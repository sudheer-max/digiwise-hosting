import React, { useState } from 'react';
import { Rocket, GitBranch, Box, Copy, Check, ChevronRight, Plus, Globe, ExternalLink, Github, ShoppingCart } from 'lucide-react';
import { useConsole } from '../ConsoleShell';
import { SectionHeader, Loader, EmptyState, ErrorBanner, StatusPill, CopyField, PrimaryButton, GhostButton } from '../ui';
import CreateApplicationWizard from '../CreateApplicationWizard';

export default function ApplicationsView() {
  const { data, navigate } = useConsole();
  const { projects, loading, error, refresh, hasPaidPlan } = data;
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
        action={
          hasPaidPlan ? (
            <PrimaryButton onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Application</PrimaryButton>
          ) : (
            <a href="/checkout" className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 transition-colors">
              <ShoppingCart className="w-4 h-4" /> Purchase Plan to Deploy
            </a>
          )
        }
      />

      {showCreate && <CreateApplicationWizard onClose={() => setShowCreate(false)} onCreated={() => refresh()} />}

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {loading ? (
        <Loader label="Loading applications..." />
      ) : apps.length === 0 ? (
        <div className="bg-white border border-slate-200 shadow-sm p-10 text-center">
          <Rocket className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No applications yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Deploy a web service from an app image, GitHub repository, or use a template to get started in seconds.
          </p>
          <div className="flex items-center justify-center gap-3">
            <PrimaryButton onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> Deploy Application
            </PrimaryButton>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="bg-slate-50 border border-slate-200 p-4">
              <Box className="w-6 h-6 text-violet-500 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-700">App Image</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Deploy any service</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4">
              <Github className="w-6 h-6 text-slate-700 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-700">GitHub Repo</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Auto-build & deploy</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4">
              <Globe className="w-6 h-6 text-[#00459c] mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-700">Custom Build</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Your own Dockerfile</div>
            </div>
          </div>
        </div>
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
                  {app.replicas != null &&               <div className="text-[10px] font-bold text-slate-400">{app.replicas} copy(ies)</div>}
                  {app.externalUrl && (
                    <a href={app.externalUrl} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-[#00459c] hover:text-[#003882]">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
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
