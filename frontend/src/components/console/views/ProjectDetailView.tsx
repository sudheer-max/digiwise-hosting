import React, { useEffect, useState, useCallback } from 'react';
import {
  FolderKanban, Rocket, Database, Plus, Trash2, Globe, Terminal, RotateCw, Play, Power,
  Loader2, ExternalLink, ChevronRight
} from 'lucide-react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import { SectionHeader, GhostButton, PrimaryButton, Loader, EmptyState, ErrorBanner, StatusPill, Modal, ConfirmDeleteDialog } from '../ui';
import CreateApplicationWizard from '../CreateApplicationWizard';

const DB_TYPES = ['postgresql', 'mongodb', 'mysql', 'redis'] as const;
const DB_INFO: Record<string, { label: string; icon: string; color: string }> = {
  postgresql: { label: 'PostgreSQL', icon: '🐘', color: '#336791' },
  mongodb: { label: 'MongoDB', icon: '🍃', color: '#47A248' },
  mysql: { label: 'MySQL', icon: '🐬', color: '#4479A1' },
  redis: { label: 'Redis', icon: '🔴', color: '#DC382D' },
};

const DB_SIZES = [
  { value: 'small', label: 'Small', cpu: '0.25 CPU', memory: '256MB', desc: 'For dev/test' },
  { value: 'medium', label: 'Medium', cpu: '0.5 CPU', memory: '512MB', desc: 'For staging' },
  { value: 'large', label: 'Large', cpu: '1 CPU', memory: '1GB', desc: 'For production' },
];

type DeleteTarget = { type: 'app' | 'database'; name: string; dbType?: string } | null;

export default function ProjectDetailView({ projectId }: { projectId: string }) {
  const { data, navigate } = useConsole();
  const { projects, loading, refresh } = data;
  const [project, setProject] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [databases, setDatabases] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [showCreateDb, setShowCreateDb] = useState(false);
  const [showCreateApp, setShowCreateApp] = useState(false);
  const [dbType, setDbType] = useState('postgresql');
  const [dbName, setDbName] = useState('');
  const [dbSize, setDbSize] = useState('small');
  const [busy, setBusy] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);
  const [logTarget, setLogTarget] = useState<{ name: string } | null>(null);
  const [logText, setLogText] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res: any = await api.getProject(projectId);
      const p = res?.project || res;
      setProject(p);
      const appsList = await api.listApps(projectId);
      setApps(Array.isArray(appsList) ? appsList : []);
      const ns = p?.k8sNamespace || projectId;
      const dbsList = await api.listDatabases(ns);
      setDatabases(Array.isArray(dbsList) ? dbsList : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const createDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbName.trim()) return;
    setError('');
    try {
      const label = dbName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const ns = project?.k8sNamespace || projectId;
      await api.createDatabase({ type: dbType, name: label, namespace: ns, size: dbSize });
      setDbName('');
      setShowCreateDb(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to create database');
    }
  };

  const appAction = async (appName: string, action: 'start' | 'stop' | 'restart') => {
    setError('');
    setBusy(action + appName);
    try {
      if (action === 'restart') await api.restartApp(projectId, appName);
      else if (action === 'start') await api.scaleApp(projectId, appName, 1);
      else if (action === 'stop') await api.scaleApp(projectId, appName, 0);
      await load();
    } catch (err: any) {
      setError(err.message || `Action failed: ${action}`);
    } finally {
      setBusy('');
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      if (deleteTarget.type === 'app') {
        await api.deleteApp(projectId, deleteTarget.name);
      } else {
        const ns = project?.k8sNamespace || projectId;
        await api.deleteDatabase(ns, deleteTarget.dbType || '', deleteTarget.name);
      }
      setDeleteTarget(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const openLogs = async (appName: string) => {
    setLogTarget({ name: appName });
    setLogText('Loading logs...');
    try {
      const res: any = await api.getAppLogs(projectId, appName, 500);
      const logs = res?.logs || (Array.isArray(res) ? res : []);
      setLogText(Array.isArray(logs) ? logs.map((l: any) => l.log || l.message || JSON.stringify(l)).join('\n') : String(logs || 'No logs available'));
    } catch (err: any) {
      setLogText(`Failed to load logs: ${err.message}`);
    }
  };

  if (loading) return <Loader label="Loading project..." />;

  const found = projects.find((p) => p.id === projectId);
  const displayName = project?.name || found?.name || projectId;
  const ns = project?.k8sNamespace || projectId;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={<span className="flex items-center gap-2"><FolderKanban className="w-6 h-6 text-[#00459c]" /> {displayName}</span>}
        subtitle={<span className="font-mono">{ns}</span>}
        back={() => navigate({ name: 'projects' })}
        action={
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => setShowCreateDb(true)}>
              <Database className="w-4 h-4" /> New Database
            </GhostButton>
            <PrimaryButton onClick={() => setShowCreateApp(true)}>
              <Plus className="w-4 h-4" /> New Application
            </PrimaryButton>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 shadow-sm px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Applications</div>
          <div className="text-2xl font-display font-bold text-slate-900 mt-1">{apps.length}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Databases</div>
          <div className="text-2xl font-display font-bold text-slate-900 mt-1">{databases.length}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Project</div>
          <div className="text-sm font-mono text-slate-700 mt-1 truncate">{ns}</div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</div>
          <div className="mt-1"><StatusPill status="Running" /></div>
        </div>
      </div>

      {/* Applications */}
      <div className="bg-white border border-slate-200 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-bold text-slate-900">Applications ({apps.length})</span>
          </div>
          <GhostButton onClick={() => setShowCreateApp(true)} className="!text-[10px] !px-2 !py-1">
            <Plus className="w-3 h-3" /> Add
          </GhostButton>
        </div>
        <div className="p-5">
          {apps.length === 0 ? (
            <div className="text-center py-8">
              <Rocket className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No applications yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Deploy a web service from an app image or GitHub repository.</p>
              <PrimaryButton onClick={() => setShowCreateApp(true)}>
                <Plus className="w-4 h-4" /> Deploy Application
              </PrimaryButton>
            </div>
          ) : (
            <div className="space-y-2">
              {apps.map((app: any) => {
                const appName = app.name || app.metadata?.name;
                const st = (app.status || 'Running').toUpperCase();
                const stopped = st === 'STOPPED' || st === 'SCALED_DOWN';
                return (
                  <div key={appName} className="border border-slate-100 hover:border-slate-200 transition-colors px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => navigate({ name: 'application', projectId, appName })}>
                        <div className="w-8 h-8 bg-violet-50 flex items-center justify-center shrink-0"><Rocket className="w-4 h-4 text-violet-500" /></div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{appName}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">{app.image || 'custom image'}</div>
                        </div>
                        {app.externalUrl && (
                          <a href={app.externalUrl} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-[#00459c] hover:underline ml-2">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusPill status={st} />
                        <button onClick={() => openLogs(appName)} className="text-slate-400 hover:text-[#00459c] p-1.5 cursor-pointer" title="Logs"><Terminal className="w-4 h-4" /></button>
                        <button onClick={() => appAction(appName, 'restart')} disabled={busy === 'restart' + appName} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"><RotateCw className="w-3 h-3" /> Restart</button>
                        {stopped ? (
                          <button onClick={() => appAction(appName, 'start')} className="bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"><Play className="w-3 h-3" /> Start</button>
                        ) : (
                          <button onClick={() => appAction(appName, 'stop')} disabled={busy === 'stop' + appName} className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[10px] font-bold px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"><Power className="w-3 h-3" /> Stop</button>
                        )}
                        <button onClick={() => setDeleteTarget({ type: 'app', name: appName })} className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Databases */}
      <div className="bg-white border border-slate-200 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-bold text-slate-900">Databases ({databases.length})</span>
          </div>
          <GhostButton onClick={() => setShowCreateDb(true)} className="!text-[10px] !px-2 !py-1">
            <Plus className="w-3 h-3" /> Add
          </GhostButton>
        </div>
        <div className="p-5">
          {databases.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No databases yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Provision a managed PostgreSQL, MySQL, MongoDB, or Redis instance.</p>
              <GhostButton onClick={() => setShowCreateDb(true)}>
                <Database className="w-4 h-4" /> Create Database
              </GhostButton>
            </div>
          ) : (
            <div className="space-y-2">
              {databases.map((db: any) => {
                const dbName = db.name;
                const dbTp = db.type;
                const st = (db.status || 'Running').toUpperCase();
                const info = DB_INFO[dbTp] || { label: dbTp, icon: '📦', color: '#666' };
                return (
                  <div key={`${dbTp}-${dbName}`} className="border border-slate-100 hover:border-slate-200 transition-colors px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => navigate({ name: 'database', type: dbTp, namespace: ns, dbName })}>
                        <div className="w-8 h-8 flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: `${info.color}15` }}>{info.icon}</div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{dbName}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">{info.label}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusPill status={st} />
                        <button onClick={() => setDeleteTarget({ type: 'database', name: dbName, dbType: dbTp })} className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Database Modal */}
      {showCreateDb && (
        <Modal title={<span className="flex items-center gap-2"><Database className="w-4 h-4 text-emerald-500" /> Create Database</span>} onClose={() => setShowCreateDb(false)}>
          <form onSubmit={createDb} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Database Engine *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DB_TYPES.map((t) => {
                  const info = DB_INFO[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDbType(t)}
                      className={`border px-3 py-3 text-xs font-bold transition-colors cursor-pointer flex flex-col items-center gap-1.5 ${dbType === t ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      <span className="text-lg">{info.icon}</span>
                      <span>{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Instance Name *</label>
              <input
                type="text"
                value={dbName}
                onChange={(e) => setDbName(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                placeholder="my-database"
                className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Size Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {DB_SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setDbSize(s.value)}
                    className={`border px-3 py-3 text-xs transition-colors cursor-pointer ${dbSize === s.value ? 'border-[#00459c] bg-[#00459c]/5' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="font-bold text-slate-900">{s.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{s.cpu} / {s.memory}</div>
                    <div className="text-[10px] text-slate-400">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-3 py-2 text-[10px] text-slate-500">
              Database will be provisioned in project <span className="font-mono font-bold">{ns}</span> by the management system.
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <GhostButton onClick={() => setShowCreateDb(false)}>Cancel</GhostButton>
              <PrimaryButton type="submit" disabled={!dbName.trim()}>
                <Database className="w-4 h-4" /> Create Database
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Create App Wizard */}
      {showCreateApp && (
        <CreateApplicationWizard onClose={() => setShowCreateApp(false)} onCreated={() => { setShowCreateApp(false); load(); }} projectId={projectId} />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDeleteDialog
          title={deleteTarget.type === 'app' ? 'Delete Application' : 'Delete Database'}
          description={
            deleteTarget.type === 'app'
              ? `Are you sure you want to delete "${deleteTarget.name}"? This will permanently remove the application, its service, and traffic route.`
              : `Are you sure you want to delete the ${deleteTarget.dbType} database "${deleteTarget.name}"? All data will be permanently lost.`
          }
          confirmName={deleteTarget.name}
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}

      {/* Logs Modal */}
      {logTarget && (
        <Modal
          title={<span className="flex items-center gap-2"><Terminal className="w-4 h-4" /> Logs — {logTarget.name}</span>}
          onClose={() => setLogTarget(null)}
          wide
        >
          <pre className="bg-slate-950 text-emerald-300 p-4 text-[11px] font-mono leading-relaxed overflow-auto max-h-[55vh] whitespace-pre-wrap break-words">{logText}</pre>
        </Modal>
      )}
    </div>
  );
}
