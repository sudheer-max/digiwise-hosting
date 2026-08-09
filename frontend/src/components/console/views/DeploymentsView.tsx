import React, { useEffect, useState, useCallback } from 'react';
import { ListTree, RefreshCw, Terminal, Rocket } from 'lucide-react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import { SectionHeader, GhostButton, Loader, EmptyState, ErrorBanner, StatusPill, Modal } from '../ui';

export default function DeploymentsView() {
  const { data } = useConsole();
  const { projects } = data;
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logTarget, setLogTarget] = useState<any>(null);
  const [logText, setLogText] = useState('');

  const loadAll = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const results: any[] = [];
      for (const p of projects || []) {
        try {
          const ds = await api.listProjectDeployments(p.id);
          if (Array.isArray(ds)) {
            for (const d of ds) results.push({ ...d, projectName: p.name, projectId: p.id });
          }
        } catch { /* skip inaccessible */ }
      }
      results.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setDeployments(results.slice(0, 100));
    } catch (err: any) {
      setError(err.message || 'Failed to load deployments');
    } finally {
      setLoading(false);
    }
  }, [projects]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openLogs = async (d: any) => {
    setLogTarget(d);
    setLogText('Loading logs...');
    try {
      const res: any = await api.getProjectLogs(d.projectId, d.pod, 500);
      const logs = res?.logs || (Array.isArray(res) ? res : []);
      setLogText(Array.isArray(logs) ? logs.map((l: any) => l.log || l.message || JSON.stringify(l)).join('\n') : String(logs || 'No logs available'));
    } catch (err: any) {
      setLogText(`Failed to load logs: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Applications"
        subtitle={`${deployments.length} most recent apps across all projects.`}
        action={
          <GhostButton onClick={loadAll} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload
          </GhostButton>
        }
      />

      {error && <ErrorBanner message={error} onRetry={loadAll} />}

      {loading ? (
        <Loader label="Scanning apps..." />
      ) : deployments.length === 0 ? (
        <EmptyState
          icon={<ListTree className="w-6 h-6" />}
          title="No apps yet"
          hint="Deploy any application to see its history here."
        />
      ) : (
        <div className="bg-white border border-slate-200 shadow-sm">
          {deployments.map((d, idx) => (
            <div key={d.metadata?.name || d.deploymentId || idx} className={`px-5 py-4 ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-[#00459c]/10 flex items-center justify-center shrink-0">
                    <Rocket className="w-4 h-4 text-[#00459c]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{d.metadata?.name || d.title || d.deploymentId}</div>
                    <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5">
                      {d.projectName} · {d.metadata?.namespace || '—'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill status={d.status?.phase || d.status || 'Unknown'} />
                  <span className="text-[10px] text-slate-400 hidden sm:block">{d.metadata?.creationTimestamp || d.createdAt ? new Date(d.metadata?.creationTimestamp || d.createdAt).toLocaleString() : ''}</span>
                  <button onClick={() => openLogs(d)} className="text-slate-400 hover:text-[#00459c] p-1.5 cursor-pointer" title="View logs">
                    <Terminal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {logTarget && (
        <Modal
          title={<span className="flex items-center gap-2"><Terminal className="w-4 h-4" /> Logs — {logTarget.metadata?.name || logTarget.title || logTarget.deploymentId}</span>}
          onClose={() => setLogTarget(null)}
          wide
        >
          <pre className="bg-slate-950 text-emerald-300 p-4 text-[11px] font-mono leading-relaxed overflow-auto max-h-[55vh] whitespace-pre-wrap break-words">{logText}</pre>
        </Modal>
      )}
    </div>
  );
}
