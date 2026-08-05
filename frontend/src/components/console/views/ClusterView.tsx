import React, { useState, useEffect } from 'react';
import { Network, Cpu, MemoryStick, RefreshCw } from 'lucide-react';
import api from '../../../lib/api';
import { SectionHeader, GhostButton, Loader, ErrorBanner, StatusPill, Field, FieldGrid } from '../ui';

export default function ClusterView() {
  const [cluster, setCluster] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const info = await api.getAdminCluster();
      setCluster(info);
    } catch (err: any) {
      setError(err.message || 'Failed to load cluster info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const nodes = cluster?.nodes || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Cluster"
        subtitle="Kubernetes cluster node information."
        action={
          <GhostButton onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload
          </GhostButton>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <Loader label="Loading cluster info..." />
      ) : (
        <div className="space-y-4">
          {cluster && (
            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Network className="w-4 h-4 text-[#00459c]" />
                <span className="text-sm font-bold text-slate-900">K3s Cluster</span>
                <StatusPill status={cluster.ready ? 'healthy' : 'degraded'} />
              </div>
              <FieldGrid>
                <Field label="Version" value={cluster.version || '—'} />
                <Field label="Nodes" value={String(nodes.length)} />
                <Field label="Ready" value={cluster.ready ? 'Yes' : 'No'} />
              </FieldGrid>
            </div>
          )}

          {nodes.length > 0 && (
            <div className="bg-white border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <span className="text-sm font-bold text-slate-900">Nodes ({nodes.length})</span>
              </div>
              <div className="divide-y divide-slate-100">
                {nodes.map((n: any, idx: number) => (
                  <div key={n.name || idx} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#00459c]/10 flex items-center justify-center shrink-0">
                          <Network className="w-4 h-4 text-[#00459c]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{n.name || n.nodeName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{n.ip || n.address || '—'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill status={n.status === 'Ready' ? 'active' : 'idle'} />
                        <div className="flex gap-1">
                          {n.roles?.map((r: string) => (
                            <span key={r} className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5">{r}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
