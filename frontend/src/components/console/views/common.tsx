import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, ShieldAlert, ChevronDown, Copy, Check } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { SectionHeader, GhostButton, Loader, EmptyState, ErrorBanner, StatusPill, CopyField } from '../ui';

export function useResource<T = any>(loader: () => Promise<any>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);

  const reload = useCallback(async () => {
    setError('');
    setDenied(false);
    setLoading(true);
    try {
      const res = await loader();
      setData(res as T);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
      if (String(err.message).includes('403') || String(err.message).includes('admin')) setDenied(true);
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { reload(); }, [reload]);

  return { data, setData, loading, error, denied, reload };
}

export function AdminGate({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <SectionHeader title={title} subtitle={subtitle} />
        <EmptyState
          icon={<ShieldAlert className="w-6 h-6" />}
          title="Admin access required"
          hint="This section is restricted to administrators."
        />
      </div>
    );
  }
  return <>{children}</>;
}

export function ResourcePage({ title, subtitle, loader, deps = [], empty, icon, children, refreshKey }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  loader: () => Promise<any>;
  deps?: any[];
  empty?: React.ReactNode;
  icon: React.ReactNode;
  children: (data: any, helpers: { reload: () => Promise<void>; loading: boolean }) => React.ReactNode;
  refreshKey?: any;
}) {
  const { data, loading, error, denied, reload } = useResource(loader, deps);
  const [err, setErr] = useState('');
  useEffect(() => { setErr(''); }, [refreshKey]);

  const body = denied ? (
    <EmptyState icon={<ShieldAlert className="w-6 h-6" />} title="Admin access required" hint="This section is restricted to administrators." />
  ) : loading ? (
    <Loader label="Loading..." />
  ) : error ? (
    <ErrorBanner message={error} onRetry={reload} />
  ) : (!data || (Array.isArray(data) && data.length === 0)) ? (
    empty || <EmptyState icon={icon} title="Nothing here yet" hint="No data returned by the API." />
  ) : (
    children(data, { reload, loading })
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={<GhostButton onClick={reload} disabled={loading}><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload</GhostButton>}
      />
      {err && <ErrorBanner message={err} />}
      {body}
    </div>
  );
}

export function PageTable({ columns, rows, rowKey, onRowClick, empty }: {
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode; className?: string }[];
  rows: any[];
  rowKey: string | ((row: any) => string);
  onRowClick?: (row: any) => void;
  empty?: React.ReactNode;
}) {
  if (!rows.length) {
    return empty || <EmptyState icon={<Loader2 className="w-6 h-6" />} title="No data" />;
  }
  return (
    <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            {columns.map((c) => (
              <th key={c.key} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${c.className || ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const key = typeof rowKey === 'function' ? rowKey(row) : row[rowKey];
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${idx > 0 ? 'border-t border-slate-100' : ''} ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-5 py-3 text-sm text-slate-700 ${c.className || ''}`}>
                    {c.render ? c.render(row) : <span className="text-slate-700">{formatValue(row[c.key])}</span>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function formatValue(v: any): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function DetailPanel({ title, icon, children, onClose, action }: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">{icon}{title}</h3>
        <div className="flex items-center gap-2">
          {action}
          {onClose && (
            <button onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer">Close</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

export function KV({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      {value == null || value === '' ? <div className="text-slate-300 text-sm">—</div> : <div className="text-sm text-slate-800 break-words">{value}</div>}
    </div>
  );
}

export function DateTime({ value }: { value?: string | number }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return <span className="text-xs text-slate-500 whitespace-nowrap">{new Date(value).toLocaleString()}</span>;
}

export function ExpandableRow({ row, columns, children }: { row: any; columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[]; children: (row: any) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-slate-200 shadow-sm">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer">
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {columns.map((c) => (
            <div key={c.key}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{c.label}</div>
              <div className="text-sm text-slate-700 truncate">{c.render ? c.render(row) : formatValue(row[c.key])}</div>
            </div>
          ))}
        </div>
      </button>
      {open && <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/40">{children(row)}</div>}
    </div>
  );
}

export { StatusPill, CopyField, Copy, Check };
