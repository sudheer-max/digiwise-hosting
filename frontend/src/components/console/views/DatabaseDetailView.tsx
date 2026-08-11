import React, { useEffect, useState, useCallback } from 'react';
import { Database, Trash2, Terminal, KeyRound, Loader2, HardDrive, RefreshCw, Plug, ExternalLink, Copy, Check, Eye, EyeOff, ChevronRight, Globe, Lock, ArrowDownToLine, Wifi, WifiOff } from 'lucide-react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import {
  SectionHeader, GhostButton, PrimaryButton, Loader, EmptyState, ErrorBanner,
  StatusPill, Field, FieldGrid, CopyField, Modal, ConfirmDeleteDialog
} from '../ui';

const DB_INFO: Record<string, { label: string; icon: string; color: string }> = {
  postgresql: { label: 'PostgreSQL', icon: '🐘', color: '#336791' },
  mongodb: { label: 'MongoDB', icon: '🍃', color: '#47A248' },
  mysql: { label: 'MySQL', icon: '🐬', color: '#4479A1' },
  redis: { label: 'Redis', icon: '🔴', color: '#DC382D' },
};

type Tab = 'variables' | 'connect' | 'credentials' | 'browse' | 'logs' | 'advanced' | 'migrate';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-bold px-2 py-1.5 transition-colors cursor-pointer shrink-0">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function ConnectionField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow] = useState(!secret);
  const display = secret && !show ? '••••••••' : value;
  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</div>
        <div className="text-xs font-mono text-slate-800 truncate">{display}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {secret && (
          <button onClick={() => setShow(!show)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        <CopyButton text={value} />
      </div>
    </div>
  );
}

export default function DatabaseDetailView({ type, namespace, dbName }: { type: string; namespace: string; dbName: string }) {
  const { data, navigate } = useConsole();
  const { refresh } = data;
  const info = DB_INFO[type] || DB_INFO.postgresql;
  const [db, setDb] = useState<any>(null);
  const [vars, setVars] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('variables');
  const [busy, setBusy] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logText, setLogText] = useState('');
  const [activeLang, setActiveLang] = useState('nodejs');
  const [connectNetwork, setConnectNetwork] = useState<'private' | 'public'>('private');
  const [browseData, setBrowseData] = useState<any>(null);
  const [browseTable, setBrowseTable] = useState('');
  const [browseLoading, setBrowseLoading] = useState(false);
  const [migrateUri, setMigrateUri] = useState('');
  const [migrateBusy, setMigrateBusy] = useState(false);
  const [migrateResult, setMigrateResult] = useState<{ success: boolean; message: string } | null>(null);
  const [migrateError, setMigrateError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [dbs, variables, healthData] = await Promise.all([
        api.listDatabases(namespace),
        api.getDatabaseVariables(namespace, type, dbName).catch(() => null),
        api.getDatabaseHealth(namespace, type, dbName).catch(() => null),
      ]);
      const found = Array.isArray(dbs) ? dbs.find((d: any) => d.name === dbName && d.type === type) : null;
      setDb(found);
      setVars(variables);
      setHealth(healthData);
    } catch (err: any) {
      setError(err.message || 'Failed to load database');
    } finally {
      setLoading(false);
    }
  }, [type, namespace, dbName]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      api.getDatabaseHealth(namespace, type, dbName).then(setHealth).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [namespace, type, dbName]);

  useEffect(() => {
    if (tab === 'browse' && !browseData && !browseLoading) {
      loadBrowse();
    }
  }, [tab]);

  const doDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
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
      setShowDeleteConfirm(false);
    }
  };

  const openLogs = async () => {
    setLogOpen(true);
    setLogText('Loading logs...');
    try {
      const res: any = await api.getProjectLogs(namespace, dbName);
      const logs = res?.logs || (Array.isArray(res) ? res : []);
      setLogText(Array.isArray(logs) ? logs.map((l: any) => l.log || l.message || JSON.stringify(l)).join('\n') : String(logs || 'No logs available'));
    } catch (err: any) {
      setLogText(`Failed to load logs: ${err.message}`);
    }
  };

  const doMigrate = async () => {
    if (!migrateUri.trim()) return;
    setMigrateBusy(true);
    setMigrateResult(null);
    setMigrateError('');
    try {
      const res: any = await api.migrateDatabase(namespace, type, dbName, migrateUri.trim());
      setMigrateResult({ success: true, message: res?.message || 'Migration completed successfully' });
      setMigrateUri('');
    } catch (err: any) {
      setMigrateError(err.message || 'Migration failed');
    } finally {
      setMigrateBusy(false);
    }
  };

  if (loading) return <Loader label={`Loading ${info.label}...`} />;
  if (!db && !vars) return <ErrorBanner message={error || 'Database not found'} onRetry={load} />;

  const st = (db?.status || vars?.status || 'Running').toUpperCase();
  const host = vars?.host || `${dbName}-rw.${namespace}.svc.cluster.local`;
  const port = vars?.port || (type === 'postgresql' ? 5432 : type === 'mongodb' ? 27017 : type === 'mysql' ? 3306 : 6379);
  const username = vars?.username || '';
  const password = vars?.password || '';
  const connStr = vars?.internalConnectionString || '';
  const extConnStr = vars?.externalConnectionString || '';
  const portForwardCmd = vars?.portForwardCmd || `kubectl port-forward -n ${namespace} svc/${dbName}-rw ${port}:${port}`;
  const publicHost = vars?.publicHost || '';
  const publicPort = vars?.publicPort || 0;
  const publicConnStr = vars?.publicConnectionString || '';
  const envVars = vars?.envVars || {};

  const loadBrowse = async (table?: string) => {
    if (type !== 'postgresql' && type !== 'mongodb') return;
    setBrowseLoading(true);
    try {
      const data = await api.browseDatabase(namespace, type, dbName, table);
      setBrowseData(data);
      if (table) setBrowseTable(table);
    } catch { /* ignore */ }
    setBrowseLoading(false);
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'variables', label: 'Variables', icon: <KeyRound className="w-3.5 h-3.5" /> },
    { id: 'connect', label: 'Connect', icon: <Plug className="w-3.5 h-3.5" /> },
    { id: 'credentials', label: 'Credentials', icon: <Lock className="w-3.5 h-3.5" /> },
    { id: 'browse', label: 'Browse Data', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'logs', label: 'Logs', icon: <Terminal className="w-3.5 h-3.5" /> },
    ...(type === 'mongodb' || type === 'postgresql' ? [{ id: 'migrate' as Tab, label: 'Migrate Data', icon: <ArrowDownToLine className="w-3.5 h-3.5" /> }] : []),
    { id: 'advanced', label: 'Advanced', icon: <Database className="w-3.5 h-3.5" /> },
  ];

  const snippets: Record<string, { label: string; code: string }[]> = {
    nodejs: [
      { label: 'Connection String', code: `DATABASE_URL="${connStr}"` },
      { label: 'pg (PostgreSQL)', code: `const { Pool } = require('pg');\nconst pool = new Pool({ connectionString: process.env.DATABASE_URL });` },
      { label: 'mongoose (MongoDB)', code: `const mongoose = require('mongoose');\nawait mongoose.connect(process.env.DATABASE_URL);` },
      { label: 'mysql2 (MySQL)', code: `const mysql = require('mysql2/promise');\nconst conn = await mysql.createConnection(process.env.DATABASE_URL);` },
      { label: 'ioredis (Redis)', code: `const Redis = require('ioredis');\nconst redis = new Redis(process.env.REDIS_URL);` },
    ],
    python: [
      { label: 'Connection String', code: `DATABASE_URL="${connStr}"` },
      { label: 'psycopg2 (PostgreSQL)', code: `import psycopg2\nconn = psycopg2.connect("${connStr}")` },
      { label: 'pymongo (MongoDB)', code: `from pymongo import MongoClient\nclient = MongoClient("${connStr}")` },
      { label: 'pymysql (MySQL)', code: `import pymysql\nconn = pymysql.connect(host="${host}", port=${port}, user="${username}", password="***", database="${dbName}")` },
      { label: 'redis-py (Redis)', code: `import redis\nr = redis.Redis.from_url("${connStr}")` },
    ],
    go: [
      { label: 'Connection String', code: `DATABASE_URL="${connStr}"` },
      { label: 'pgx (PostgreSQL)', code: `conn, err := pgx.Connect(context.Background(), os.Getenv("DATABASE_URL"))` },
      { label: 'mongo-go-driver', code: `client, err := mongo.Connect(ctx, options.Client().ApplyURI(os.Getenv("DATABASE_URL")))` },
    ],
    curl: [
      { label: 'psql', code: `psql "${connStr}"` },
      { label: 'mongosh', code: `mongosh "${connStr}"` },
      { label: 'mysql CLI', code: `mysql -h ${host} -P ${port} -u ${username} -p ${dbName}` },
      { label: 'redis-cli', code: `redis-cli -h ${host} -p ${port}${password ? ` -a ${password}` : ''}` },
    ],
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={<span className="flex items-center gap-2"><span className="text-2xl">{info.icon}</span> {dbName}</span>}
        subtitle={<span className="font-mono" style={{ color: info.color }}>{info.label} · {namespace}</span>}
        back={() => navigate({ name: 'databases' })}
        action={
          <div className="flex items-center gap-2">
            <GhostButton onClick={load}><RefreshCw className="w-4 h-4" /></GhostButton>
            <GhostButton danger onClick={doDelete} disabled={busy === 'delete'}>
              {busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
            </GhostButton>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      {/* Status banner */}
      <div className="bg-white border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
          <StatusPill status={health?.status === 'healthy' ? 'RUNNING' : health?.status === 'unhealthy' ? 'ERROR' : st} />
        </div>
        <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Engine</span><span className="text-xs font-mono text-slate-700">{info.label}</span></div>
        <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Host</span><span className="text-xs font-mono text-slate-700">{host}</span></div>
        <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Port</span><span className="text-xs font-mono text-slate-700">{port}</span></div>
        {health && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pods</span>
            <span className={`text-xs font-mono font-bold ${health.ready === health.total ? 'text-emerald-600' : 'text-amber-600'}`}>{health.ready}/{health.total} ready</span>
          </div>
        )}
        {publicHost && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Public</span>
            <span className="text-xs font-mono text-slate-700">{publicHost}:{publicPort}</span>
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

      {/* Variables Tab - Railway style */}
      {tab === 'variables' && (
        <div className="space-y-6">
          {/* Connection String Card */}
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center text-lg" style={{ backgroundColor: `${info.color}15` }}>{info.icon}</div>
                Connection String
              </h3>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-4 py-3">
              <code className="flex-1 text-xs font-mono text-emerald-400 overflow-auto whitespace-pre-wrap break-all">{connStr}</code>
              <CopyButton text={connStr} />
            </div>
          </div>

          {/* Quick Fields */}
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Connection Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ConnectionField label="Host" value={host} />
              <ConnectionField label="Port" value={String(port)} />
              <ConnectionField label="User" value={username} />
              <ConnectionField label="Password" value={password} secret />
              <ConnectionField label="Database" value={dbName} />
              <ConnectionField label="Namespace" value={namespace} />
            </div>
          </div>

          {/* Environment Variables */}
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#00459c]" /> Environment Variables
              </h3>
              <CopyButton text={Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join('\n')} />
            </div>
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-[11px] space-y-1 overflow-auto max-h-64">
              {Object.entries(envVars).map(([k, v]) => (
                <div key={k} className="flex">
                  <span className="text-emerald-400">{k}</span>
                  <span className="text-slate-500">=</span>
                  <span className="text-amber-300 break-all">{String(v).includes('PASSWORD') || k.includes('PASSWORD') || k.includes('SECRET') ? '••••••••' : String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connect Tab — Railway style */}
      {tab === 'connect' && (
        <div className="space-y-6">
          {/* Network Toggle */}
          <div className="bg-white border border-slate-200 shadow-sm p-1 flex">
            <button
              onClick={() => setConnectNetwork('private')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                connectNetwork === 'private' ? 'bg-[#00459c] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Private Network
            </button>
            <button
              onClick={() => setConnectNetwork('public')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                connectNetwork === 'public' ? 'bg-[#00459c] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Public Network
            </button>
          </div>

          {/* Info Banner */}
          {connectNetwork === 'public' && publicHost ? (
            <div className="bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 font-semibold">
              Connecting over the public network may cause egress costs.
            </div>
          ) : connectNetwork === 'private' ? (
            <div className="bg-[#00459c]/5 border border-[#00459c]/20 px-4 py-3 text-xs text-[#00459c] font-semibold">
              Private Network is only accessible from within the same Kubernetes cluster.
            </div>
          ) : null}

          {/* Connection URL */}
          {connectNetwork === 'private' ? (
            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Connection URL</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => {}} className="text-[10px] font-bold text-[#00459c] hover:underline cursor-pointer">show</button>
                  <button onClick={() => {}} className="text-[10px] font-bold text-[#00459c] hover:underline cursor-pointer">open</button>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 rounded-lg px-4 py-3">
                <code className="flex-1 text-xs font-mono text-emerald-400 overflow-auto whitespace-pre-wrap break-all">{connStr}</code>
                <CopyButton text={connStr} />
              </div>
            </div>
          ) : publicHost ? (
            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Connection URL</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => {}} className="text-[10px] font-bold text-[#00459c] hover:underline cursor-pointer">show</button>
                  <button onClick={() => {}} className="text-[10px] font-bold text-[#00459c] hover:underline cursor-pointer">open</button>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 rounded-lg px-4 py-3">
                <code className="flex-1 text-xs font-mono text-emerald-400 overflow-auto whitespace-pre-wrap break-all">{publicConnStr}</code>
                <CopyButton text={publicConnStr} />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 shadow-sm p-8 text-center">
              <WifiOff className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 mb-1">No Public Network</h3>
              <p className="text-xs text-slate-500">This database does not have a public endpoint configured.</p>
            </div>
          )}

          {/* Connection Details */}
          {connectNetwork === 'private' ? (
            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Connection Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ConnectionField label="Host" value={host} />
                <ConnectionField label="Port" value={String(port)} />
                <ConnectionField label="User" value={username} />
                <ConnectionField label="Password" value={password} secret />
                <ConnectionField label="Database" value={dbName} />
                <ConnectionField label="Namespace" value={namespace} />
              </div>
            </div>
          ) : publicHost ? (
            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Connection Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ConnectionField label="Host" value={publicHost} />
                <ConnectionField label="Port" value={String(publicPort)} />
                <ConnectionField label="User" value={username} />
                <ConnectionField label="Password" value={password} secret />
                <ConnectionField label="Database" value={dbName} />
              </div>
            </div>
          ) : null}

          {/* Raw CLI Command */}
          {connectNetwork === 'private' && (
            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Raw CLI Command</h3>
              <div className="flex items-start gap-2">
                <code className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2.5 text-[11px] font-mono text-slate-700 break-all">{type === 'postgresql' ? `psql "${connStr}"` : type === 'mongodb' ? `mongosh "${connStr}"` : type === 'mysql' ? `mysql -h ${host} -P ${port} -u ${username} -p ${dbName}` : `redis-cli -h ${host} -p ${port}${password ? ` -a ${password}` : ''}`}</code>
                <CopyButton text={type === 'postgresql' ? `psql "${connStr}"` : type === 'mongodb' ? `mongosh "${connStr}"` : type === 'mysql' ? `mysql -h ${host} -P ${port} -u ${username} -p ${dbName}` : `redis-cli -h ${host} -p ${port}${password ? ` -a ${password}` : ''}`} />
              </div>
            </div>
          )}

          {connectNetwork === 'public' && publicHost && (
            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Raw CLI Command</h3>
              <div className="flex items-start gap-2">
                <code className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2.5 text-[11px] font-mono text-slate-700 break-all">{type === 'postgresql' ? `psql "${publicConnStr}"` : type === 'mongodb' ? `mongosh "${publicConnStr}"` : type === 'mysql' ? `mysql -h ${publicHost} -P ${publicPort} -u ${username} -p ${dbName}` : `redis-cli -h ${publicHost} -p ${publicPort}${password ? ` -a ${password}` : ''}`}</code>
                <CopyButton text={type === 'postgresql' ? `psql "${publicConnStr}"` : type === 'mongodb' ? `mongosh "${publicConnStr}"` : type === 'mysql' ? `mysql -h ${publicHost} -P ${publicPort} -u ${username} -p ${dbName}` : `redis-cli -h ${publicHost} -p ${publicPort}${password ? ` -a ${password}` : ''}`} />
              </div>
            </div>
          )}

          {/* Port Forward (Private only) */}
          {connectNetwork === 'private' && (
            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#00459c]" /> Access from Local Machine
              </h3>
              <p className="text-xs text-slate-500 mb-3">Use port-forward to access this database from your local machine:</p>
              <div className="flex items-start gap-2">
                <code className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2.5 text-[11px] font-mono text-slate-700 break-all">{portForwardCmd}</code>
                <CopyButton text={portForwardCmd} />
              </div>
              <div className="mt-3 text-[11px] text-slate-500">
                Then connect to <code className="bg-slate-100 px-1">localhost:{port}</code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Credentials Tab */}
      {tab === 'credentials' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Database Credentials</h3>
            <div className="space-y-3">
              <ConnectionField label="Username" value={username} />
              <ConnectionField label="Password" value={password} secret />
              <ConnectionField label="Database Name" value={dbName} />
            </div>
            <div className="mt-4 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2">
              Store these credentials securely. The password is stored as an encrypted secret.
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Connection URLs</h3>
            <div className="space-y-3">
              <ConnectionField label="Internal URL" value={connStr} />
              <ConnectionField label="External URL (via port-forward)" value={extConnStr} />
            </div>
          </div>
        </div>
      )}

      {/* Browse Data Tab */}
      {tab === 'browse' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#00459c]" /> Browse Data
              </h3>
              <GhostButton onClick={() => loadBrowse(browseTable || undefined)}><RefreshCw className="w-3.5 h-3.5" /> Refresh</GhostButton>
            </div>

            {browseLoading && !browseData ? (
              <p className="text-xs text-slate-400">Loading tables...</p>
            ) : browseData?.tables?.length === 0 ? (
              <p className="text-xs text-slate-400">No tables/collections found. Create some data first.</p>
            ) : (
              <div className="space-y-4">
                {/* Table selector */}
                <div className="flex flex-wrap gap-2">
                  {(browseData?.tables || []).map((t: string) => (
                    <button
                      key={t}
                      onClick={() => loadBrowse(t)}
                      className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                        browseTable === t
                          ? 'bg-[#00459c] text-white border-[#00459c]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Data table */}
                {browseData?.selectedTable && browseData?.columns?.length > 0 ? (
                  <div className="overflow-auto max-h-[60vh] border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr className="border-b border-slate-200">
                          {browseData.columns.map((col: string) => (
                            <th key={col} className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {browseData.rows.map((row: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                            {browseData.columns.map((col: string) => (
                              <td key={col} className="px-3 py-2 text-xs font-mono text-slate-700 max-w-[300px] truncate">
                                {typeof row === 'object' ? String(row[col] ?? '') : String(row)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-200">
                      Showing {browseData.rows.length} of {browseData.total} rows
                    </div>
                  </div>
                ) : browseData?.selectedTable && browseData?.rows?.length === 0 ? (
                  <p className="text-xs text-slate-400">This table is empty.</p>
                ) : (
                  <p className="text-xs text-slate-400">Select a table to view its data.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {tab === 'logs' && (
        <div className="bg-white border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Service Logs</h3>
            <GhostButton onClick={openLogs}><Terminal className="w-3.5 h-3.5" /> View logs</GhostButton>
          </div>
          <p className="text-xs text-slate-400">Database logs are accessed via the platform. Click "View logs" to see the command.</p>
        </div>
      )}

      {/* Migrate Tab */}
      {tab === 'migrate' && (type === 'mongodb' || type === 'postgresql') && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#00459c]/10 text-[#00459c] flex items-center justify-center">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Migrate from {type === 'mongodb' ? 'MongoDB Atlas, Railway, or other provider' : 'Railway, Heroku, or other provider'}</h3>
                <p className="text-[11px] text-slate-400">Import all {type === 'mongodb' ? 'collections and documents' : 'tables and data'} from an external {type === 'mongodb' ? 'MongoDB' : 'PostgreSQL'} into this database.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Source {type === 'mongodb' ? 'MongoDB' : 'PostgreSQL'} Connection URI *</label>
                <input
                  type="text"
                  value={migrateUri}
                  onChange={(e) => setMigrateUri(e.target.value)}
                  placeholder={type === 'mongodb' ? 'mongodb://username:password@host:5432/dbname?authSource=admin' : 'postgresql://username:password@host:5432/dbname'}
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                  disabled={migrateBusy}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {type === 'mongodb'
                    ? 'Find this in Railway dashboard → your database → Variables → MONGO_URL or MONGODB_URI'
                    : 'Find this in Railway dashboard → your database → Variables → DATABASE_URL'}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
                <strong>Warning:</strong> This will overwrite any existing data in this database. Make sure the source database is accessible from the internet.
              </div>

              {migrateResult && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-3">
                  {migrateResult.message}
                </div>
              )}

              {migrateError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-3">
                  {migrateError}
                </div>
              )}

              <button
                onClick={doMigrate}
                disabled={migrateBusy || !migrateUri.trim()}
                className="bg-[#00459c] hover:bg-[#003577] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 transition-colors cursor-pointer flex items-center gap-2"
              >
                {migrateBusy ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Migrating... (this may take a while)</>
                ) : (
                  <><ArrowDownToLine className="w-3.5 h-3.5" /> Start Migration</>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">How it works</h3>
            <ol className="text-xs text-slate-500 space-y-2 list-decimal list-inside">
              <li>DigiWise connects to your source {type === 'mongodb' ? 'MongoDB' : 'PostgreSQL'} (Railway, Atlas, etc.)</li>
              <li>Dumps all {type === 'mongodb' ? 'collections and documents' : 'tables and data'} using <code>{type === 'mongodb' ? 'mongodump' : 'pg_dump'}</code></li>
              <li>Restores everything into this database using <code>{type === 'mongodb' ? 'mongorestore' : 'pg_restore'}</code></li>
              <li>Cleans up temporary files</li>
            </ol>
            <p className="text-[10px] text-slate-400 mt-3">
              The source database must be reachable from the internet. For Railway, grab the connection URI from your service Variables.
            </p>
          </div>
        </div>
      )}

      {/* Advanced Tab */}
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
            <h3 className="text-sm font-bold text-slate-900 mb-3">Raw Data</h3>
            <details>
              <summary className="text-xs font-bold text-[#00459c] cursor-pointer hover:underline">Show full JSON payload</summary>
              <pre className="mt-3 bg-slate-50 border border-slate-200 p-3 text-[10px] font-mono text-slate-600 overflow-auto max-h-96">
                {JSON.stringify({ db, variables: vars }, null, 2)}
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

      {showDeleteConfirm && (
        <ConfirmDeleteDialog
          title="Delete Database"
          description={`Are you sure you want to delete the ${info.label} database "${dbName}"? All data will be permanently lost.`}
          confirmName={dbName}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          busy={busy === 'delete'}
        />
      )}
    </div>
  );
}
