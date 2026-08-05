import React, { useEffect, useState, useCallback } from 'react';
import { FolderKanban, Rocket, Database, Plus, Trash2, Globe, Terminal, RotateCw, Play, Power } from 'lucide-react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import { SectionHeader, GhostButton, PrimaryButton, Loader, EmptyState, ErrorBanner, StatusPill, Modal } from '../ui';

const DB_TYPES = ['postgresql', 'mongodb', 'redis'] as const;
const DB_INFO: Record<string, { label: string; icon: string }> = {
  postgresql: { label: 'PostgreSQL', icon: '🐘' },
  mongodb: { label: 'MongoDB', icon: '🍃' },
  redis: { label: 'Redis', icon: '🔴' },
};

export default function ProjectDetailView({ projectId }: { projectId: string }) {
  const { data, navigate } = useConsole();
  const { projects, loading, refresh } = data;
  const [project, setProject] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [databases, setDatabases] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [showCreateDb, setShowCreateDb] = useState(false);
  const [dbType, setDbType] = useState('postgresql');
  const [dbName, setDbName] = useState('');
  const [busy, setBusy] = useState('');
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
      await api.createDatabase({ type: dbType, name: label, namespace: ns });
      setDbName('');
      setShowCreateDb(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to create database');
    }
  };

  const appAction = async (appName: string, action: 'start' | 'stop' | 'restart' | 'delete') => {
    setError('');
    setBusy(action + appName);
    try {
      if (action === 'restart') await api.restartApp(projectId, appName);
      else if (action === 'start') await api.scaleApp(projectId, appName, 1);
      else if (action === 'stop') await api.scaleApp(projectId, appName, 0);
      else if (action === 'delete') {
        if (!confirm('Delete this application?')) return;
        await api.deleteApp(projectId, appName);
      }
      await load();
    } catch (err: any) {
      setError(err.message || `Action failed: ${action}`);
    } finally {
      setBusy('');
    }
  };

  const dbAction = async (type: string, name: string) => {
    setError('');
    setBusy('delete' + name);
    try {
      if (!confirm('Delete this database?')) return;
      const ns = project?.k8sNamespace || projectId;
      await api.deleteDatabase(ns, type, name);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete database');
    } finally {
      setBusy('');
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

  return (
    <div className="space-y-6">
      <SectionHeader
        title={<span className="flex items-center gap-2"><FolderKanban className="w-6 h-6 text-[#00459c]" /> {displayName}</span>}
        subtitle={<span className="font-mono">{projectId}</span>}
        back={() => navigate({ name: 'projects' })}
        action={
          <GhostButton onClick={() => setShowCreateDb(!showCreateDb)}>
            <Plus className="w-4 h-4" /> New Database
          </GhostButton>
        }
      />

      {error && <ErrorBanner message={error} />}

      {showCreateDb && (
        <form onSubmit={createDb} className="bg-white border border-slate-200 shadow-sm p-4 grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-2">
          <select value={dbType} onChange={(e) => setDbType(e.target.value)} className="border border-slate-200 bg-white px-2 py-2 text-sm outline-none">
            {DB_TYPES.map((t) => <option key={t} value={t}>{DB_INFO[t].icon} {DB_INFO[t].label}</option>)}
          </select>
          <input type="text" value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="database-name" className="border border-slate-200 bg-white px-3 py-2 text-sm outline-none font-mono" required />
          <PrimaryButton type="submit"><Database className="w-4 h-4" /> Create</PrimaryButton>
        </form>
      )}

      {/* Applications */}
      <div className="bg-white border border-slate-200 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Rocket className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-bold text-slate-900">Applications ({apps.length})</span>
        </div>
        <div className="p-5">
          {apps.length === 0 ? (
            <EmptyState icon={<Rocket className="w-6 h-6" />} title="No applications" hint="Deploy an application to this project." />
          ) : (
            <div className="space-y-2">
              {apps.map((app: any) => {
                const appName = app.name || app.metadata?.name;
                const st = (app.status || 'Running').toUpperCase();
                const stopped = st === 'STOPPED' || st === 'SCALED_DOWN';
                return (
                  <div key={appName} className="border border-slate-100 hover:border-slate-200 transition-colors px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-violet-50 flex items-center justify-center shrink-0"><Rocket className="w-4 h-4 text-violet-500" /></div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{appName}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">{app.namespace || projectId}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusPill status={st} />
                        <button onClick={() => openLogs(appName)} className="text-slate-400 hover:text-[#00459c] p-1.5 cursor-pointer" title="Logs"><Terminal className="w-4 h-4" /></button>
                        <button onClick={() => appAction(appName, 'restart')} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"><RotateCw className="w-3 h-3" /> Restart</button>
                        {stopped ? (
                          <button onClick={() => appAction(appName, 'start')} className="bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"><Play className="w-3 h-3" /> Start</button>
                        ) : (
                          <button onClick={() => appAction(appName, 'stop')} className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"><Power className="w-3 h-3" /> Stop</button>
                        )}
                        <button onClick={() => appAction(appName, 'delete')} className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-bold text-slate-900">Databases ({databases.length})</span>
        </div>
        <div className="p-5">
          {databases.length === 0 ? (
            <EmptyState icon={<Database className="w-6 h-6" />} title="No databases" hint="Create a database for this project." />
          ) : (
            <div className="space-y-2">
              {databases.map((db: any) => {
                const dbName = db.name;
                const dbType = db.type;
                const st = (db.status || 'Running').toUpperCase();
                const info = DB_INFO[dbType] || { label: dbType, icon: '📦' };
                return (
                  <div key={`${dbType}-${dbName}`} className="border border-slate-100 hover:border-slate-200 transition-colors px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-emerald-50 flex items-center justify-center shrink-0"><Database className="w-4 h-4 text-emerald-500" /></div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{info.icon} {dbName}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">{info.label}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusPill status={st} />
                        <button onClick={() => dbAction(dbType, dbName)} className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
