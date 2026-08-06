import React, { useState, useEffect, useCallback } from 'react';
import { Hammer, GitBranch, Play, Loader2, CheckCircle2, XCircle, Clock, Terminal, Trash2, ExternalLink } from 'lucide-react';
import api from '../../../lib/api';
import { GhostButton, PrimaryButton, ErrorBanner, StatusPill, Modal } from '../ui';

interface Build {
  name: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  message?: string;
  imageTag?: string;
  startTime?: string;
  endTime?: string;
}

export default function BuildPipelinePanel({ projectId, appName }: { projectId: string; appName: string }) {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTrigger, setShowTrigger] = useState(false);
  const [repoURL, setRepoURL] = useState('');
  const [branch, setBranch] = useState('main');
  const [port, setPort] = useState(3000);
  const [building, setBuilding] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<string | null>(null);
  const [buildLogs, setBuildLogs] = useState('');
  const [polling, setPolling] = useState<string | null>(null);

  const loadBuilds = useCallback(async () => {
    try {
      const res: any = await api.listBuilds(projectId, appName);
      setBuilds(res?.builds || []);
    } catch {
      setBuilds([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, appName]);

  useEffect(() => { loadBuilds(); }, [loadBuilds]);

  // Poll running builds
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      await loadBuilds();
      const build = builds.find(b => b.name.includes(polling));
      if (build && (build.status === 'succeeded' || build.status === 'failed')) {
        setPolling(null);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, loadBuilds, builds]);

  const triggerBuild = async () => {
    if (!repoURL.trim()) return;
    setBuilding(true);
    setError('');
    try {
      const res: any = await api.triggerBuild(projectId, appName, {
        repoURL,
        branch,
        port,
      });
      setPolling(res?.name?.split('-').pop() || 'build');
      setShowTrigger(false);
      setRepoURL('');
      await loadBuilds();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger build');
    } finally {
      setBuilding(false);
    }
  };

  const viewLogs = async (buildId: string) => {
    setSelectedBuild(buildId);
    setBuildLogs('Loading logs...');
    try {
      const res: any = await api.getBuildLogs(projectId, appName, buildId);
      setBuildLogs(res?.logs || 'No logs available');
    } catch (err: any) {
      setBuildLogs(`Failed to load logs: ${err.message}`);
    }
  };

  const cancelBuild = async (buildId: string) => {
    try {
      await api.cancelBuild(projectId, appName, buildId);
      await loadBuilds();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'succeeded': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  const extractBuildId = (name: string) => {
    const parts = name.split('-');
    return parts[parts.length - 1];
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onRetry={() => setError('')} />}

      <div className="bg-white border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hammer className="w-4 h-4 text-[#00459c]" />
            <h3 className="text-sm font-bold text-slate-900">Build Pipeline</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5">{builds.length}</span>
          </div>
          <PrimaryButton onClick={() => setShowTrigger(true)}>
            <Play className="w-3.5 h-3.5" /> Trigger Build
          </PrimaryButton>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-[#00459c] animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading builds...</p>
          </div>
        ) : builds.length === 0 ? (
          <div className="p-8 text-center">
            <Hammer className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400 mb-3">No builds yet</p>
            <PrimaryButton onClick={() => setShowTrigger(true)}>
              <Play className="w-3.5 h-3.5" /> Trigger First Build
            </PrimaryButton>
          </div>
        ) : (
          <div>
            {builds.map((build, idx) => {
              const buildId = extractBuildId(build.name);
              return (
                <div key={build.name} className={`px-5 py-3.5 flex items-center gap-4 ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
                  {statusIcon(build.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Build {buildId}</span>
                      <StatusPill status={build.status} />
                    </div>
                    {build.message && (
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{build.message}</p>
                    )}
                    {build.imageTag && (
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{build.imageTag}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
                    {build.startTime && <span>{new Date(build.startTime).toLocaleString()}</span>}
                    <GhostButton onClick={() => viewLogs(buildId)}>
                      <Terminal className="w-3 h-3" /> Logs
                    </GhostButton>
                    {build.status === 'running' && (
                      <GhostButton danger onClick={() => cancelBuild(buildId)}>
                        Cancel
                      </GhostButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trigger Build Modal */}
      {showTrigger && (
        <Modal title="Trigger Build" onClose={() => setShowTrigger(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Repository URL</label>
              <input
                value={repoURL}
                onChange={e => setRepoURL(e.target.value)}
                className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#00459c]"
                placeholder="https://github.com/user/repo.git"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">Branch</label>
                <input
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#00459c]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={e => setPort(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#00459c]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton onClick={() => setShowTrigger(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={triggerBuild} disabled={building || !repoURL.trim()}>
                {building ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hammer className="w-3.5 h-3.5" />} Start Build
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Build Logs Modal */}
      {selectedBuild && (
        <Modal title={`Build Logs — ${selectedBuild}`} onClose={() => setSelectedBuild(null)} wide>
          <pre className="bg-slate-950 text-emerald-300 p-4 text-[11px] font-mono leading-relaxed overflow-auto max-h-[55vh] whitespace-pre-wrap break-words">
            {buildLogs}
          </pre>
        </Modal>
      )}
    </div>
  );
}
