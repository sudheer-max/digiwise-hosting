import React, { useState, useEffect, useCallback } from 'react';
import { ScrollText, Loader2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../lib/api';
import { SectionHeader, ErrorBanner, EmptyState } from '../ui';

const ACTION_COLORS: Record<string, string> = {
  'project.create': 'bg-emerald-100 text-emerald-700',
  'project.delete': 'bg-rose-100 text-rose-700',
  'app.create': 'bg-blue-100 text-blue-700',
  'app.delete': 'bg-rose-100 text-rose-700',
  'app.deploy-github': 'bg-violet-100 text-violet-700',
  'env.update': 'bg-amber-100 text-amber-700',
  'build.trigger': 'bg-cyan-100 text-cyan-700',
  'build.cancel': 'bg-orange-100 text-orange-700',
};

export default function AuditLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [stats, setStats] = useState<any>(null);
  const limit = 25;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { limit, offset: page * limit };
      if (filterAction) params.action = filterAction;
      if (filterResource) params.resource = filterResource;
      const res = await api.listAuditLogs(params);
      setLogs(res?.logs || []);
      setTotal(res?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterResource]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.getAuditLogStats();
      setStats(res);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const totalPages = Math.ceil(total / limit);

  const formatTime = (ts: string) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Audit Logs"
        subtitle={`${total} recorded actions across the platform.`}
      />

      {error && <ErrorBanner message={error} onRetry={loadLogs} />}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 shadow-sm p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total || 0}</div>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last 30 Days</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.last30Days || 0}</div>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last 7 Days</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.last7Days || 0}</div>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last 24h</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.last24Hours || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 shadow-sm px-5 py-3 flex items-center gap-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(0); }}
          className="bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-[#00459c]"
        >
          <option value="">All Actions</option>
          <option value="project.create">Project Create</option>
          <option value="project.delete">Project Delete</option>
          <option value="app.create">App Create</option>
          <option value="app.delete">App Delete</option>
          <option value="app.deploy-github">Deploy from GitHub</option>
          <option value="env.update">Env Update</option>
          <option value="build.trigger">Build Trigger</option>
          <option value="build.cancel">Build Cancel</option>
        </select>
        <select
          value={filterResource}
          onChange={e => { setFilterResource(e.target.value); setPage(0); }}
          className="bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-[#00459c]"
        >
          <option value="">All Resources</option>
          <option value="project">Project</option>
          <option value="app">Application</option>
          <option value="build">Build</option>
        </select>
        <span className="text-[10px] text-slate-400 ml-auto">{total} results</span>
      </div>

      {/* Log table */}
      {loading ? (
        <div className="bg-white border border-slate-200 shadow-sm p-8 text-center">
          <Loader2 className="w-6 h-6 text-[#00459c] animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-slate-200 shadow-sm">
          <EmptyState
            icon={<ScrollText className="w-6 h-6" />}
            title="No audit logs"
            hint="Actions performed on the platform will appear here."
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 shadow-sm">
          <div className="grid grid-cols-[140px_1fr_120px_140px_100px] gap-4 px-5 py-2.5 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Time</span>
            <span>Action</span>
            <span>Resource</span>
            <span>User</span>
            <span>Status</span>
          </div>
          {logs.map((log, idx) => (
            <div key={log.id || idx} className={`grid grid-cols-[140px_1fr_120px_140px_100px] gap-4 px-5 py-3 text-xs ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
              <span className="text-slate-500 font-mono text-[10px]">{formatTime(log.createdAt)}</span>
              <span>
                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                  {log.action}
                </span>
                {log.resourceId && <span className="text-slate-400 ml-2 font-mono">{log.resourceId}</span>}
              </span>
              <span className="text-slate-600">{log.resource}</span>
              <span className="text-slate-600 truncate">{log.user?.email || log.userId}</span>
              <span>
                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {log.status}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Page {page + 1} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
