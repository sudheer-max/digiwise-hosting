import React, { useEffect, useState, useCallback } from 'react';
import { Database, Trash2, Terminal, KeyRound, Loader2, HardDrive, RefreshCw, Plug, ExternalLink, Copy, Check } from 'lucide-react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import {
  SectionHeader, GhostButton, PrimaryButton, Loader, EmptyState, ErrorBanner,
  StatusPill, Field, FieldGrid, CopyField, Modal
} from '../ui';

const DB_INFO: Record<string, { label: string; icon: string }> = {
  postgresql: { label: 'PostgreSQL', icon: '🐘' },
  mongodb: { label: 'MongoDB', icon: '🍃' },
  mysql: { label: 'MySQL', icon: '🐬' },
  redis: { label: 'Redis', icon: '🔴' },
};

type Tab = 'overview' | 'connect' | 'credentials' | 'logs' | 'advanced';

export default function DatabaseDetailView({ type, namespace, dbName }: { type: string; namespace: string; dbName: string }) {
  const { data, navigate } = useConsole();
  const { refresh } = data;
  const info = DB_INFO[type] || DB_INFO.postgresql;
  const [db, setDb] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [logText, setLogText] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const dbs = await api.listDatabases(namespace);
      const found = Array.isArray(dbs) ? dbs.find((d: any) => d.name === dbName && d.type === type) : null;
      setDb(found);
    } catch (err: any) {
      setError(err.message || 'Failed to load database');
    } finally {
      setLoading(false);
    }
  }, [type, namespace, dbName]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const doDelete = async () => {
    if (!confirm('Delete this database permanently? All data will be lost.')) return;
    setError('');
    setBusy('delete');
    try {
      await api.deleteDatabase(namespace, type, dbName);
      navigate({ name: 'databases' });
      return;
    } catch (err: any) {
      setError(err.message || 'Failed to delete database');
    } finally {
      setBusy('');
    }
  };

  const openLogs = async () => {
    setLogOpen(true);
    setLogText('Database logs are available via kubectl:\n\nkubectl logs -n ' + namespace + ' ' + (db?.podName || dbName) + '\n\nOr use: kubectl logs -f -n ' + namespace + ' -l app=' + dbName);
  };

  const copyConn = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const buildSnippets = () => {
    if (!db) return [];
    const host = db.host || `${dbName}-rw.${namespace}.svc.cluster.local`;
    const port = db.port || (type === 'postgresql' ? 5432 : type === 'mongodb' ? 27017 : type === 'mysql' ? 3306 : 6379);
    const user = db.databaseUser || 'user';
    const pass = db.databasePassword || 'password';
    const dbname = db.databaseName || dbName;
    const map: Record<string, string[]> = {
      postgresql: [
        `postgresql://${user}:${pass}@${host}:${port}/${dbname}`,
        `psql postgresql://${user}:${pass}@${host}:${port}/${dbname}`,
      ],
      mongodb: [
        `mongodb://${user}:${pass}@${host}:${port}/${dbname}`,
        `mongosh mongodb://${user}:${pass}@${host}:${port}/${dbname}`,
      ],
      mysql: [
        `mysql://${user}:${pass}@${host}:${port}/${dbname}`,
        `mysql -h ${host} -P ${port} -u ${user} -p${pass} ${dbname}`,
      ],
      redis: [
        `redis://${pass}@${host}:${port}`,
        `redis-cli -h ${host} -p ${port} -a ${pass}`,
      ],
    };
    return map[type] || [`DATABASE_URL=${host}:${port}`];
  };

  if (loading) return <Loader label={`Loading ${info.label}...`} />;
  if (!db) return <ErrorBanner message={error || 'Database not found'} onRetry={load} />;

  const st = (db.status || 'Running').toUpperCase();

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <HardDrive className="w-3.5 h-3.5" /> },
    { id: 'connect', label: 'Connect', icon: <Plug className="w-3.5 h-3.5" /> },
    { id: 'credentials', label: 'Credentials', icon: <KeyRound className="w-3.5 h-3.5" /> },
    { id: 'logs', label: 'Logs', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'advanced', label: 'Advanced', icon: <Database className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={<span className="flex items-center gap-2"><span className="text-2xl">{info.icon}</span> {dbName}</span>}
        subtitle={<span className="font-mono">{info.label} · {namespace}</span>}
        back={() => navigate({ name: 'databases' })}
        action={
          <div className="flex items-center gap-2">
            <GhostButton danger onClick={doDelete} disabled={busy === 'delete'}>
              {busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
            </GhostButton>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="bg-white border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span><StatusPill status={st} /></div>
        <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Engine</span><span className="text-xs font-mono text-slate-700">{info.label}</span></div>
        <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Namespace</span><span className="text-xs font-mono text-slate-700">{namespace}</span></div>
      </div>

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

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">General</h3>
            <FieldGrid>
              <Field label="Name" value={dbName} copyable={dbName} />
              <Field label="Type" value={info.label} />
              <Field label="Namespace" value={namespace} copyable={namespace} />
              <Field label="Status" value={<StatusPill status={st} />} />
              <Field label="Created At" value={db.createdAt ? new Date(db.createdAt).toLocaleString() : '—'} />
            </FieldGrid>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Configuration</h3>
            <FieldGrid>
              <Field label="Database Name" value={db.databaseName || '—'} copyable={db.databaseName || ''} />
              <Field label="Database User" value={db.databaseUser || '—'} copyable={db.databaseUser || ''} />
              <Field label="Port" value={db.port != null ? String(db.port) : '—'} />
              <Field label="Size" value={db.size || '—'} />
            </FieldGrid>
          </div>
        </div>
      )}

      {tab === 'connect' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1"><Plug className="w-4 h-4 text-[#00459c]" /> Connection Info</h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">
              Connect to this database from within the Kubernetes cluster or via a port-forward.
            </p>

            <div className="space-y-5">
              <FieldGrid cols={2}>
                <Field label="Host (internal)" value={db.host || `${dbName}-rw.${namespace}.svc.cluster.local`} copyable={db.host || `${dbName}-rw.${namespace}.svc.cluster.local`} />
                <Field label="Port" value={String(db.port || (type === 'postgresql' ? 5432 : type === 'mongodb' ? 27017 : type === 'mysql' ? 3306 : 6379))} copyable={String(db.port || (type === 'postgresql' ? 5432 : type === 'mongodb' ? 27017 : type === 'mysql' ? 3306 : 6379))} />
              </FieldGrid>

              <div className="bg-amber-50 border border-amber-200 px-4 py-3">
                <div className="text-xs font-bold text-amber-700 mb-0.5">Kubernetes Service Access</div>
                <div className="text-[11px] text-amber-600">
                  This database is accessible within the cluster at <code className="font-mono bg-amber-100 px-1">{db.host || `${dbName}-rw.${namespace}.svc.cluster.local`}</code>.
                  To access from outside, use <code className="font-mono bg-amber-100 px-1">kubectl port-forward</code>.
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Port Forward Command</div>
                <code className="text-xs font-mono text-slate-700 break-all">
                  kubectl port-forward -n {namespace} svc/{dbName}-rw {db.port || (type === 'postgresql' ? 5432 : type === 'mongodb' ? 27017 : type === 'mysql' ? 3306 : 6379)}:{db.port || (type === 'postgresql' ? 5432 : type === 'mongodb' ? 27017 : type === 'mysql' ? 3306 : 6379)}
                </code>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Connection Snippets</div>
                <div className="space-y-2">
                  {buildSnippets().map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <pre className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2.5 text-[11px] font-mono text-slate-700 overflow-auto">{s}</pre>
                      <button
                        onClick={() => copyConn(s)}
                        className="inline-flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-bold px-2.5 py-2 transition-colors cursor-pointer shrink-0"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'credentials' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Connection Details</h3>
            <FieldGrid>
              <Field label="Database User" copyable={db.databaseUser || ''} />
              <Field label="Database Password" copyable={db.databasePassword || ''} />
              <Field label="Database Name" copyable={db.databaseName || ''} />
              <Field label="Port" copyable={db.port != null ? String(db.port) : ''} />
            </FieldGrid>
            <div className="mt-4 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2">
              Store these credentials securely. The password is stored in a Kubernetes Secret.
            </div>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Environment Variables (auto-injected)</h3>
            <div className="bg-slate-50 border border-slate-200 p-4 font-mono text-[11px] text-slate-700 space-y-1 overflow-auto">
              <div>DATABASE_URL=...</div>
              <div>DATABASE_USER={db.databaseUser || ''}</div>
              <div>DATABASE_PASSWORD=••••••</div>
              <div>DATABASE_NAME={db.databaseName || ''}</div>
              <div>DATABASE_PORT={db.port || ''}</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-white border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Container Logs</h3>
            <GhostButton onClick={openLogs}><Terminal className="w-3.5 h-3.5" /> View logs</GhostButton>
          </div>
          <p className="text-xs text-slate-400">Database logs are accessed via kubectl. Click "View logs" to see the command.</p>
        </div>
      )}

      {tab === 'advanced' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Danger Zone</h3>
            <div className="flex gap-2">
              <GhostButton danger onClick={doDelete} disabled={busy === 'delete'}>
                {busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete Database
              </GhostButton>
            </div>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Raw Database</h3>
            <details>
              <summary className="text-xs font-bold text-[#00459c] cursor-pointer hover:underline">Show full JSON payload</summary>
              <pre className="mt-3 bg-slate-50 border border-slate-200 p-3 text-[10px] font-mono text-slate-600 overflow-auto max-h-96">
                {JSON.stringify(db, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {logOpen && (
        <Modal title={<span className="flex items-center gap-2"><Terminal className="w-4 h-4" /> Logs — {dbName}</span>} onClose={() => setLogOpen(false)} wide>
          <pre className="bg-slate-950 text-emerald-300 p-4 text-[11px] font-mono leading-relaxed overflow-auto max-h-[55vh] whitespace-pre-wrap break-words">{logText}</pre>
        </Modal>
      )}
    </div>
  );
}
