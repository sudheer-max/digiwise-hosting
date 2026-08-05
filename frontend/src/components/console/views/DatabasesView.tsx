import React, { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Loader2, ChevronRight } from 'lucide-react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import { SectionHeader, PrimaryButton, GhostButton, Loader, EmptyState, ErrorBanner, StatusPill } from '../ui';

const DB_TYPES = ['postgresql', 'mongodb', 'mysql', 'redis'] as const;
const DB_INFO: Record<string, { label: string; icon: string; color: string }> = {
  postgresql: { label: 'PostgreSQL', icon: '🐘', color: 'text-[#336791]' },
  mongodb: { label: 'MongoDB', icon: '🍃', color: 'text-emerald-600' },
  mysql: { label: 'MySQL', icon: '🐬', color: 'text-[#00758f]' },
  redis: { label: 'Redis', icon: '🔴', color: 'text-red-500' },
};

export default function DatabasesView() {
  const { data, navigate } = useConsole();
  const { projects, loading, error, refresh } = data;
  const [showCreate, setShowCreate] = useState(false);
  const [dbType, setDbType] = useState('postgresql');
  const [dbName, setDbName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const [databases, setDatabases] = useState<any[]>([]);
  const [loadingDbs, setLoadingDbs] = useState(true);

  const namespaceOptions = (projects || []).map((p: any) => ({
    namespace: p.k8sNamespace,
    label: p.name,
  }));

  const loadDatabases = useCallback(async () => {
    setLoadingDbs(true);
    try {
      const allDbs: any[] = [];
      for (const p of projects || []) {
        try {
          const dbs = await api.listDatabases(p.k8sNamespace);
          if (Array.isArray(dbs)) {
            allDbs.push(...dbs.map((d: any) => ({ ...d, _projectName: p.name })));
          }
        } catch { /* skip */ }
      }
      setDatabases(allDbs);
    } catch { /* ignore */ }
    setLoadingDbs(false);
  }, [projects]);

  useEffect(() => { loadDatabases(); }, [loadDatabases]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbName.trim() || !namespace) return;
    setCreating(true);
    setActionErr('');
    try {
      const label = dbName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      await api.createDatabase({
        type: dbType,
        name: label,
        namespace,
      });
      setDbName('');
      setShowCreate(false);
      await refresh();
      await loadDatabases();
      navigate({ name: 'database', type: dbType, namespace, dbName: label });
    } catch (err: any) {
      setActionErr(err.message || 'Failed to create database');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Databases"
        subtitle={`${databases.length} database(s) across all projects.`}
        action={
          <PrimaryButton onClick={() => setShowCreate(!showCreate)} disabled={namespaceOptions.length === 0}>
            <Plus className="w-4 h-4" /> New Database
          </PrimaryButton>
        }
      />

      {error && <ErrorBanner message={error} onRetry={refresh} />}
      {actionErr && <ErrorBanner message={actionErr} />}

      {showCreate && (
        <form onSubmit={create} className="bg-white border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Type *</label>
              <select value={dbType} onChange={(e) => setDbType(e.target.value)} className="w-full border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none">
                {DB_TYPES.map((t) => <option key={t} value={t}>{DB_INFO[t].icon} {DB_INFO[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Database name *</label>
              <input type="text" value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="my-db" className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none font-mono" required />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Project (namespace) *</label>
              <select value={namespace} onChange={(e) => setNamespace(e.target.value)} className="w-full border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none" required>
                <option value="" disabled>Select project</option>
                {namespaceOptions.map((o) => <option key={o.namespace} value={o.namespace}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Create Database
            </PrimaryButton>
            <GhostButton onClick={() => setShowCreate(false)}>Cancel</GhostButton>
          </div>
          <p className="text-[10px] text-slate-400">The database will be automatically provisioned by the Kubernetes operator.</p>
        </form>
      )}

      {(loading || loadingDbs) ? (
        <Loader label="Loading databases..." />
      ) : databases.length === 0 ? (
        <EmptyState
          icon={<Database className="w-6 h-6" />}
          title="No databases"
          hint="Provision a managed PostgreSQL, MySQL, MongoDB, Redis or MariaDB instance."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {databases.map((db) => {
            const info = DB_INFO[db.type] || DB_INFO.postgresql;
            const st = (db.status || 'Running').toUpperCase();
            return (
              <button
                key={`${db.type}-${db.name}`}
                onClick={() => navigate({ name: 'database', type: db.type, namespace: db.namespace || db._projectName, dbName: db.name })}
                className="bg-white border border-slate-200 shadow-sm hover:border-[#00459c]/40 hover:shadow-md transition-all p-5 text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{info.icon}</span>
                  <StatusPill status={st} />
                </div>
                <div className="font-display font-bold text-sm text-slate-900 truncate">{db.name}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{info.label} · {db.namespace || db._projectName}</div>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="font-mono">{db.databaseName || db.databaseUser || ''}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto group-hover:text-[#00459c] transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
