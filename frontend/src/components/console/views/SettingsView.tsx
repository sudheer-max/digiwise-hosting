import React, { useEffect, useState } from 'react';
import {
  Settings, ShieldAlert, HeartPulse, Globe, Box, Cpu, CloudCog, Info,
  RefreshCw, Loader2, Activity, HardDrive, Trash2
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { SectionHeader, GhostButton, Loader, EmptyState, ErrorBanner, StatusPill, Field, FieldGrid, Card } from '../ui';

export default function SettingsView() {
  const { isAdmin } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [cluster, setCluster] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);

  const load = async () => {
    if (!isAdmin) { setDenied(true); return; }
    setLoading(true);
    setError('');
    setDenied(false);
    try {
      const [h, cl] = await Promise.allSettled([
        api.healthCheck(),
        api.getAdminCluster(),
      ]);
      if (h.status === 'fulfilled') setHealth(h.value);
      if (cl.status === 'fulfilled') setCluster(cl.value);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
      if (String(err.message).includes('403') || String(err.message).includes('admin')) setDenied(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isAdmin]);

  if (denied) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Settings" subtitle="Platform configuration and diagnostics." />
        <EmptyState
          icon={<ShieldAlert className="w-6 h-6" />}
          title="Admin access required"
          hint="Platform settings are restricted to administrators."
        />
      </div>
    );
  }

  const healthy = health ? (health.status === 'healthy' || health.healthy) : false;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings"
        subtitle="Platform configuration, diagnostics, and cluster information."
        action={
          <GhostButton onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload
          </GhostButton>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? <Loader label="Loading settings..." /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="API Health" icon={<HeartPulse className="w-4 h-4 text-emerald-500" />}>
            {!health ? (
              <div className="text-xs text-slate-400">Health check unavailable.</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">API</span>
                  <StatusPill status={healthy ? 'healthy' : 'degraded'} />
                </div>
                {health.database && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Database</span>
                    <StatusPill status={health.database.status === 'healthy' ? 'healthy' : 'degraded'} />
                  </div>
                )}
                {health.kubernetes && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Kubernetes</span>
                    <StatusPill status={health.kubernetes === 'healthy' ? 'healthy' : 'degraded'} />
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="Kubernetes Cluster" icon={<Globe className="w-4 h-4 text-[#00459c]" />}>
            {!cluster ? (
              <div className="text-xs text-slate-400">Cluster info unavailable.</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Version</span>
                  <span className="font-mono text-sm font-bold text-slate-900">{cluster.version || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Nodes</span>
                  <span className="text-xs font-mono text-slate-700">{cluster.nodeCount || cluster.nodes?.length || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Provider</span>
                  <span className="text-xs font-mono text-slate-700">{cluster.provider || 'K3s'}</span>
                </div>
                {cluster.platform && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Platform</span>
                    <span className="text-xs font-mono text-slate-700">{cluster.platform}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="Infrastructure Health" icon={<Activity className="w-4 h-4 text-[#00459c]" />}>
            {!health?.infrastructure ? (
              <div className="text-xs text-slate-400">Infrastructure health unavailable.</div>
            ) : (
              <div className="space-y-2">
                {Object.entries(health.infrastructure).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                    <StatusPill status={v === 'healthy' || v === true ? 'healthy' : 'degraded'} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Diagnostics" icon={<Info className="w-4 h-4 text-[#00459c]" />}>
            <div className="space-y-2 text-xs text-slate-500">
              <div>Platform: DigiWise Hosting (Kubernetes)</div>
              <div>Orchestration: K3s</div>
              <div>Ingress: Traefik</div>
              <div>Storage: Longhorn</div>
              <div>Registry: Harbor</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
