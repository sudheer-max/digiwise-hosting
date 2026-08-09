import React, { useEffect, useState } from 'react';
import { Radio, Loader2, RefreshCw, Box, Server, Database } from 'lucide-react';
import api from '../../../lib/api';
import { SectionHeader, Card, GhostButton, ErrorBanner, StatusPill } from '../ui';

export default function CentralStationView() {
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const h = await api.healthCheck();
      setHealth(h);
    } catch (e: any) {
      setError(e.message || 'Health check unavailable');
    }
  };

  useEffect(() => { load(); }, []);

  const checks = [
    { label: 'API', status: health ? (health.status === 'ok' || health.status === 'healthy' || health.healthy ? 'healthy' : 'degraded') : 'loading' },
    { label: 'Cloud Platform', status: health ? (health.kubernetes === 'healthy' || health.k8s === 'healthy' ? 'healthy' : 'degraded') : 'loading' },
    { label: 'Database', status: health?.database?.status === 'healthy' ? 'healthy' : health ? 'degraded' : 'loading' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Central Station"
        subtitle="Live status of the DigiWise platform you're running on."
        action={<GhostButton onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Refresh</GhostButton>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <Card title="Platform status" icon={<Radio className="w-4 h-4 text-[#00459c]" />}>
        {!health && !error ? (
          <div className="flex items-center justify-center py-10 text-slate-400 text-sm"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Checking...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center justify-between border border-slate-100 px-4 py-3">
                <span className="text-sm font-bold text-slate-700">{c.label}</span>
                <StatusPill status={c.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Server className="w-4 h-4" />, label: 'Cloud Engine', desc: 'Lightweight cloud engine powering your infrastructure.' },
          { icon: <Database className="w-4 h-4" />, label: 'Managed data stores', desc: 'PostgreSQL, MongoDB, Redis via operators.' },
          { icon: <Box className="w-4 h-4" />, label: 'Proxy layer', desc: 'Traefik edge with automatic TLS.' },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 shadow-sm p-5">
            <div className="w-9 h-9 bg-[#00459c]/10 flex items-center justify-center text-[#00459c] mb-3">{c.icon}</div>
            <div className="text-sm font-bold text-slate-900">{c.label}</div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
