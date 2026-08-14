import React, { useEffect, useState, useCallback } from 'react';
import {
  Rocket, GitBranch, Box, Play, Power, RotateCw, Terminal, Trash2, Globe, Save,
  ListTree, KeyRound, HardDrive, Cpu, MemoryStick, ArrowUpRight, Layers, Loader2, RefreshCw, ExternalLink, Check,
  Hammer, Shield, Webhook
} from 'lucide-react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import {
  SectionHeader, GhostButton, PrimaryButton, Loader, EmptyState, ErrorBanner,
  StatusPill, Field, FieldGrid, CopyField, Modal, ConfirmDeleteDialog
} from '../ui';
import EnvironmentVariablesPanel from './EnvironmentVariablesPanel';
import BuildPipelinePanel from './BuildPipelinePanel';
import CustomDomainsPanel from './CustomDomainsPanel';
import LogsViewerPanel from './LogsViewerPanel';
import WebhookSettingsPanel from './WebhookSettingsPanel';

type Tab = 'overview' | 'env' | 'builds' | 'domains' | 'logs' | 'deployments' | 'webhooks' | 'advanced';

export default function ApplicationDetailView({ projectId, name }: { projectId: string; name: string }) {
  const { data, navigate } = useConsole();
  const { refresh } = data;
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState('');
  const [deployments, setDeployments] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [logText, setLogText] = useState('');
  const [logOpen, setLogOpen] = useState(false);

  const loadApp = useCallback(async () => {
    setError('');
    try {
      const a = await api.getApp(projectId, name);
      setApp(a);
      try {
        const ds = await api.listProjectDeployments(projectId);
        setDeployments(Array.isArray(ds) ? ds : []);
      } catch { setDeployments([]); }
    } catch (err: any) {
      setError(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [projectId, name]);

  useEffect(() => { setLoading(true); loadApp(); }, [loadApp]);

  const doAction = async (action: 'restart' | 'stop' | 'delete') => {
    setError('');
    setBusy(action);
    try {
      if (action === 'restart') await api.restartApp(projectId, name);
      else if (action === 'stop') await api.scaleApp(projectId, name, 0);
      else if (action === 'delete') {
        setShowDeleteConfirm(true);
        setBusy('');
        return;
      }
      await loadApp();
      await refresh();
    } catch (err: any) {
      setError(err.message || `Action failed: ${action}`);
    } finally {
      setBusy('');
    }
  };

  const confirmDelete = async () => {
    setBusy('delete');
    try {
      await api.deleteApp(projectId, name);
      navigate({ name: 'applications' });
    } catch (err: any) {
      setError(err.message || 'Failed to delete application');
    } finally {
      setBusy('');
      setShowDeleteConfirm(false);
    }
  };

  const openLogs = async () => {
    setLogOpen(true);
    setLogText('Loading logs...');
    try {
      const res: any = await api.getAppLogs(projectId, name, 500);
      const logs = res?.logs || (Array.isArray(res) ? res : []);
      setLogText(Array.isArray(logs) ? logs.map((l: any) => l.log || l.message || JSON.stringify(l)).join('\n') : String(logs || 'No logs available'));
    } catch (err: any) {
      setLogText(`Failed to load logs: ${err.message}`);
    }
  };

  const reloadDeployments = async () => {
    try {
      const ds = await api.listProjectDeployments(projectId);
      setDeployments(Array.isArray(ds) ? ds : []);
    } catch { /* ignore */ }
  };

  if (loading) return <Loader label="Loading application..." />;
  if (!app) return <ErrorBanner message={error} onRetry={loadApp} />;

  const st = (app.status || 'Unknown').toUpperCase();
  const replicas = app.replicas ?? 1;
  const stopped = replicas === 0;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'env', label: 'Variables', icon: <KeyRound className="w-3.5 h-3.5" /> },
    { id: 'builds', label: 'Builds', icon: <Hammer className="w-3.5 h-3.5" /> },
    { id: 'webhooks', label: 'Webhooks', icon: <Webhook className="w-3.5 h-3.5" /> },
    { id: 'domains', label: 'Domains', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'logs', label: 'Logs', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'deployments', label: 'Deployments', icon: <ListTree className="w-3.5 h-3.5" /> },
    { id: 'advanced', label: 'Advanced', icon: <Cpu className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={<span className="flex items-center gap-2"><Rocket className="w-6 h-6 text-violet-500" /> {app.name}</span>}
        subtitle={<span className="font-mono">{name} · {projectId}</span>}
        back={() => navigate({ name: 'applications' })}
        action={
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => doAction('restart')} disabled={busy === 'restart'}>
              {busy === 'restart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />} Restart
            </GhostButton>
            {stopped ? (
              <PrimaryButton onClick={() => api.scaleApp(projectId, name, 1).then(loadApp).then(refresh)}>
                <Play className="w-4 h-4" /> Start
              </PrimaryButton>
            ) : (
              <GhostButton onClick={() => doAction('stop')} disabled={busy === 'stop'}>
                {busy === 'stop' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />} Stop
              </GhostButton>
            )}
            <GhostButton danger onClick={() => doAction('delete')}><Trash2 className="w-4 h-4" /> Delete</GhostButton>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      {/* Status banner */}
      <div className="bg-white border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span><StatusPill status={st} /></div>
        <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Image</span><span className="text-xs font-mono text-slate-700">{app.image || '—'}</span></div>
        {replicas != null && <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Replicas</span><span className="text-xs font-bold text-slate-700">{replicas}</span></div>}
        {app.port != null && <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Port</span><span className="text-xs font-mono text-slate-700">{app.port}</span></div>}
        {app.externalUrl && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">URL</span>
            <a href={app.externalUrl} target="_blank" rel="noopener" className="text-xs font-mono text-[#00459c] hover:underline flex items-center gap-1">
              {app.externalUrl} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer shrink-0 border-b-2 ${
              tab === t.id ? 'text-[#00459c] border-[#00459c]' : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="pb-10">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Configuration</h3>
              <FieldGrid>
                <Field label="Name" value={app.name} />
                <Field label="Image" value={app.image} copyable={app.image || ''} />
                <Field label="Replicas" value={replicas != null ? String(replicas) : '—'} />
                <Field label="Port" value={app.port != null ? String(app.port) : '—'} />
                <Field label="Namespace" value={app.namespace || projectId} />
                <Field label="Created" value={app.createdAt ? new Date(app.createdAt).toLocaleString() : '—'} />
              </FieldGrid>
            </div>

            {app.env && Object.keys(app.env).length > 0 && (
              <div className="bg-white border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><KeyRound className="w-4 h-4 text-[#00459c]" /> Environment Variables</h3>
                <div className="bg-slate-50 border border-slate-200 p-4 font-mono text-[11px] text-slate-700 space-y-1">
                  {Object.entries(app.env).map(([k, v]) => (
                    <div key={k}><span className="text-slate-500">{k}</span>=<span className="text-slate-800">{String(v).includes('SECRET') || String(v).includes('PASSWORD') ? '••••••' : String(v)}</span></div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Cpu className="w-4 h-4 text-[#00459c]" /> Resources</h3>
              <FieldGrid>
                <Field label="CPU Request" value={app.cpuRequest || '—'} />
                <Field label="CPU Limit" value={app.cpuLimit || '—'} />
                <Field label="Memory Request" value={app.memoryRequest || '—'} />
                <Field label="Memory Limit" value={app.memoryLimit || '—'} />
              </FieldGrid>
            </div>
          </div>
        )}

        {tab === 'env' && (
          <EnvironmentVariablesPanel projectId={projectId} appName={name} />
        )}

        {tab === 'builds' && (
          <BuildPipelinePanel projectId={projectId} appName={name} />
        )}

        {tab === 'webhooks' && (
          <WebhookSettingsPanel projectId={projectId} appName={name} />
        )}

        {tab === 'domains' && (
          <CustomDomainsPanel projectId={projectId} appName={name} />
        )}

        {tab === 'logs' && (
          <LogsViewerPanel projectId={projectId} appName={name} />
        )}

        {tab === 'deployments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{deployments.length} deployment(s)</span>
              <GhostButton onClick={reloadDeployments}><RefreshCw className="w-3.5 h-3.5" /> Reload</GhostButton>
            </div>
            {deployments.length === 0 ? (
              <EmptyState icon={<ListTree className="w-6 h-6" />} title="No deployments" hint="Deploy the application to see deployment history here." />
            ) : (
              <div className="bg-white border border-slate-200 shadow-sm">
                {deployments.map((d, idx) => (
                  <div key={d.name || idx} className={`px-5 py-4 ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusPill status={d.status || 'Unknown'} />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{d.name || `Revision ${d.revision || idx}`}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">{d.image || '—'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400">
                        {d.createdAt && <span>{new Date(d.createdAt).toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'advanced' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Raw Application</h3>
              <details>
                <summary className="text-xs font-bold text-[#00459c] cursor-pointer hover:underline">Show full JSON payload</summary>
                <pre className="mt-3 bg-slate-50 border border-slate-200 p-3 text-[10px] font-mono text-slate-600 overflow-auto max-h-96">
                  {JSON.stringify(app, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>

      {logOpen && (
        <Modal title={<span className="flex items-center gap-2"><Terminal className="w-4 h-4" /> Logs — {app.name}</span>} onClose={() => setLogOpen(false)} wide>
          <pre className="bg-slate-950 text-emerald-300 p-4 text-[11px] font-mono leading-relaxed overflow-auto max-h-[55vh] whitespace-pre-wrap break-words">{logText}</pre>
        </Modal>
      )}

      {showDeleteConfirm && (
        <ConfirmDeleteDialog
          title="Delete Application"
          description={`Are you sure you want to delete "${name}"? This will permanently remove the application, its service, and ingress route.`}
          confirmName={name}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          busy={busy === 'delete'}
        />
      )}
    </div>
  );
}
