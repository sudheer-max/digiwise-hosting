import React, { useState, useEffect } from 'react';
import { Activity, Cpu, MemoryStick, HardDrive, Box, RefreshCw, ExternalLink } from 'lucide-react';
import api from '../../../lib/api';
import { SectionHeader, GhostButton, Loader, ErrorBanner, StatusPill } from '../ui';

export default function MonitoringView() {
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

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Monitoring"
        subtitle="Environment metrics and monitoring links."
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
        <div className="space-y-6">
          {cluster && (
            <div className="bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Box className="w-4 h-4 text-[#00459c]" />
                <span className="text-sm font-bold text-slate-900">Environment Status</span>
                <StatusPill status={cluster.ready ? 'healthy' : 'degraded'} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Metric icon={<Cpu className="w-3.5 h-3.5" />} label="Nodes" value={String(cluster.nodes?.length || cluster.nodeCount || 0)} />
                <Metric icon={<MemoryStick className="w-3.5 h-3.5" />} label="CPU" value={cluster.cpu ? `${cluster.cpu}` : '—'} />
                <Metric icon={<HardDrive className="w-3.5 h-3.5" />} label="Memory" value={cluster.memory ? `${cluster.memory}` : '—'} />
                <Metric icon={<Activity className="w-3.5 h-3.5" />} label="Version" value={cluster.version || '—'} />
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <div className="text-sm font-bold text-slate-900 mb-3">Monitoring Links</div>
            <div className="space-y-2">
              <a href="https://grafana.digiwisesoftech.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between border border-slate-100 hover:border-[#00459c]/40 px-4 py-3 transition-colors group">
                <span className="text-sm text-slate-700">Grafana Dashboard</span>
                <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-[#00459c]" />
              </a>
              <a href="https://prometheus.digiwisesoftech.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between border border-slate-100 hover:border-[#00459c]/40 px-4 py-3 transition-colors group">
                <span className="text-sm text-slate-700">Prometheus</span>
                <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-[#00459c]" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-slate-100 px-3 py-2">
      <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">{icon} {label}</div>
      <div className="text-base font-display font-bold text-slate-900">{value}</div>
    </div>
  );
}
