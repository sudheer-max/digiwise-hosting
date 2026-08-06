import React, { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Loader2, ChevronRight, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import { SectionHeader, PrimaryButton, GhostButton, Loader, EmptyState, ErrorBanner, StatusPill, Modal, ConfirmDeleteDialog } from '../ui';

const DB_TYPES = ['postgresql', 'mongodb', 'mysql', 'redis'] as const;
const DB_INFO: Record<string, { label: string; icon: string; color: string }> = {
  postgresql: { label: 'PostgreSQL', icon: '🐘', color: '#336791' },
  mongodb: { label: 'MongoDB', icon: '🍃', color: '#47A248' },
  mysql: { label: 'MySQL', icon: '🐬', color: '#4479A1' },
  redis: { label: 'Redis', icon: '🔴', color: '#DC382D' },
};

const DB_SIZES = [
  { value: 'small', label: 'Small', cpu: '0.25 CPU', memory: '256MB', desc: 'Dev/Test' },
  { value: 'medium', label: 'Medium', cpu: '0.5 CPU', memory: '512MB', desc: 'Staging' },
  { value: 'large', label: 'Large', cpu: '1 CPU', memory: '1GB', desc: 'Production' },
];

export default function DatabasesView() {
  const { data, navigate } = useConsole();
  const { projects, loading, error, refresh } = data;
  const [showCreate, setShowCreate] = useState(false);
  const [dbType, setDbType] = useState('postgresql');
  const [dbName, setDbName] = useState('');
  const [dbSize, setDbSize] = useState('small');
  const [namespace, setNamespace] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const [databases, setDatabases] = useState<any[]>([]);
  const [loadingDbs, setLoadingDbs] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; type: string; namespace: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
            allDbs.push(...dbs.map((d: any) => ({ ...d, _projectName: p.name, _projectId: p.id })));
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
        size: dbSize,
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

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionErr('');
    try {
      await api.deleteDatabase(deleteTarget.namespace, deleteTarget.type, deleteTarget.name);
      setDeleteTarget(null);
      await loadDatabases();
    } catch (err: any) {
      setActionErr(err.message || 'Failed to delete database');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Databases"
        subtitle={`${databases.length} database(s) across all projects.`}
        action={
          <PrimaryButton onClick={() => setShowCreate(true)} disabled={namespaceOptions.length === 0}>
            <Plus className="w-4 h-4" /> New Database
          </PrimaryButton>
        }
      />

      {error && <ErrorBanner message={error} onRetry={refresh} />}
      {actionErr && <ErrorBanner message={actionErr} />}

      {showCreate && (
        <Modal title={<span className="flex items-center gap-2"><Database className="w-4 h-4 text-emerald-500" /> Create Database</span>} onClose={() => setShowCreate(false)}>
          <form onSubmit={create} className="space-y-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Project (namespace) *</label>
                <select
                  value={namespace}
                  onChange={(e) => setNamespace(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 px-2 py-2.5 text-sm outline-none"
                  required
                >
                  <option value="" disabled>Select project</option>
                  {namespaceOptions.map((o) => <option key={o.namespace} value={o.namespace}>{o.label}</option>)}
                </select>
              </div>
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
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <GhostButton onClick={() => setShowCreate(false)}>Cancel</GhostButton>
              <PrimaryButton type="submit" disabled={creating || !dbName.trim() || !namespace}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Create Database
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {(loading || loadingDbs) ? (
        <Loader label="Loading databases..." />
      ) : databases.length === 0 ? (
        <div className="bg-white border border-slate-200 shadow-sm p-10 text-center">
          <Database className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No databases yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Provision a managed PostgreSQL, MySQL, MongoDB, or Redis instance for your applications.
          </p>
          <PrimaryButton onClick={() => setShowCreate(true)} disabled={namespaceOptions.length === 0}>
            <Plus className="w-4 h-4" /> Create Database
          </PrimaryButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {databases.map((db) => {
            const info = DB_INFO[db.type] || DB_INFO.postgresql;
            const st = (db.status || 'Running').toUpperCase();
            return (
              <div key={`${db.type}-${db.name}`} className="bg-white border border-slate-200 shadow-sm hover:border-[#00459c]/40 hover:shadow-md transition-all group">
                <button
                  onClick={() => navigate({ name: 'database', type: db.type, namespace: db.namespace, dbName: db.name })}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{info.icon}</span>
                    <StatusPill status={st} />
                  </div>
                  <div className="font-display font-bold text-sm text-slate-900 truncate">{db.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{info.label} · {db._projectName || db.namespace}</div>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="font-mono">{db.databaseName || db.databaseUser || ''}</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto group-hover:text-[#00459c] transition-colors" />
                  </div>
                </button>
                <div className="flex items-center justify-end px-5 py-2 border-t border-slate-100">
                  <button
                    onClick={() => setDeleteTarget({ name: db.name, type: db.type, namespace: db.namespace })}
                    className="text-slate-300 hover:text-rose-600 cursor-pointer p-1.5"
                    title="Delete database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          title="Delete Database"
          description={`Are you sure you want to delete the ${DB_INFO[deleteTarget.type]?.label || deleteTarget.type} database "${deleteTarget.name}"? All data will be permanently lost.`}
          confirmName={deleteTarget.name}
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </div>
  );
}
