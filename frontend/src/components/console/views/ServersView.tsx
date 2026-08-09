import React, { useEffect, useState } from 'react';
import { Server, ShieldAlert, Cpu, HardDrive, MemoryStick, Activity, RefreshCw } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { SectionHeader, GhostButton, Loader, EmptyState, ErrorBanner, StatusPill, Field, FieldGrid } from '../ui';

export default function ServersView() {
  const { isAdmin } = useAuth();
  const [cluster, setCluster] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const load = async () => {
    if (!isAdmin) { setDenied(true); return; }
    setLoading(true);
    setError('');
    setDenied(false);
    try {
      const info = await api.getAdminCluster();
      setCluster(info);
    } catch (err: any) {
      setError(err.message || 'Failed to load cluster info');
      if (String(err.message).includes('403') || String(err.message).includes('admin')) setDenied(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isAdmin]);

  const nodes = cluster?.nodes || [];

  if (denied) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Servers" subtitle="Cloud environment servers." />
        <EmptyState
          icon={<ShieldAlert className="w-6 h-6" />}
          title="Admin access required"
          hint="Server management is restricted to administrators. Contact your platform administrator for access."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Servers"
        subtitle={`${nodes.length} server(s) in your cloud environment.`}
        action={
          <GhostButton onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload
          </GhostButton>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <Loader label="Loading cluster info..." />
      ) : nodes.length === 0 ? (
        <EmptyState
          icon={<Server className="w-6 h-6" />}
          title="No nodes found"
          hint="Cloud environment servers will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nodes.map((n: any) => (
            <button
              key={n.name || n.nodeName}
              onClick={() => setSelected(n)}
              className={`bg-white border shadow-sm p-5 text-left transition-all hover:border-[#00459c]/40 hover:shadow-md cursor-pointer ${selected?.name === n.name ? 'border-[#00459c]' : 'border-slate-200'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-[#00459c]/10 flex items-center justify-center">
                  <Server className="w-4.5 h-4.5 text-[#00459c]" />
                </div>
                <StatusPill status={n.status === 'Ready' ? 'active' : 'idle'} />
              </div>
              <div className="font-display font-bold text-sm text-slate-900 truncate">{n.name || n.nodeName}</div>
              <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{n.ip || n.address || '—'}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-400">
                {n.roles?.map((r: string) => (
                  <span key={r} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 font-bold uppercase">{r}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-white border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">{selected.name || selected.nodeName} — Details</h3>
            <button onClick={() => setSelected(null)} className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer">Close</button>
          </div>
          <FieldGrid>
            <Field label="Node Name" value={selected.name || selected.nodeName || '—'} />
            <Field label="IP Address" value={selected.ip || selected.address || '—'} />
            <Field label="Status" value={selected.status || '—'} />
            <Field label="Roles" value={selected.roles?.join(', ') || '—'} />
          </FieldGrid>
        </div>
      )}
    </div>
  );
}

function MetricTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-slate-100 px-4 py-3">
      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
        {icon} {label}
      </div>
      <div className="text-lg font-display font-bold text-slate-900">{value}</div>
    </div>
  );
}
