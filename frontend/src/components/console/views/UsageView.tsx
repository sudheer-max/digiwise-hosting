import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, CreditCard, Truck, Box, Rocket, Database, Zap } from 'lucide-react';
import api from '../../../lib/api';
import { SectionHeader, Card, ErrorBanner, GhostButton } from '../ui';

export default function UsageView() {
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const d = await api.getPlan();
      setPlan(d);
    } catch (e: any) {
      setError(e.message || 'Failed to load usage');
    }
  };

  useEffect(() => { load(); }, []);

  const u = plan?.usage;
  const credits = u?.credits ?? 0;
  const runningNow = u?.runningNow ?? 0;
  const total = u?.total ?? 0;
  const limit = u?.limit ?? 0;

  const rows = [
    { icon: <Truck className="w-5 h-5 text-[#00459c]" />, label: 'Running now', value: `${runningNow}`, unit: 'services', accent: 'bg-[#00459c]' },
    { icon: <Box className="w-5 h-5 text-slate-500" />, label: 'Total services', value: `${total}`, unit: `limit ${limit}`, accent: 'bg-slate-500' },
    { icon: <Activity className="w-5 h-5 text-violet-600" />, label: 'Credit hours (this month)', value: credits.toFixed(2), unit: 'credits', accent: 'bg-violet-500' },
    { icon: <Zap className="w-5 h-5 text-amber-600" />, label: 'Rate', value: '1', unit: 'credit / service-hr', accent: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Usage"
        subtitle="Your deployed services and limits. Free trial includes up to 4 services for 30 days; Pro unlocks unlimited."
        action={<GhostButton onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Refresh</GhostButton>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {rows.map((m) => (
          <div key={m.label} className="bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-slate-50 border border-slate-200 flex items-center justify-center">{m.icon}</div>
              <Activity className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-2xl font-display font-bold text-slate-900">{m.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{m.label} · {m.unit}</div>
          </div>
        ))}
      </div>

      <Card title="Current cycle" icon={<CreditCard className="w-4 h-4 text-[#00459c]" />}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <div className="text-3xl font-display font-bold text-slate-900">{credits.toFixed(2)} <span className="text-base text-slate-400 font-normal">credit hours</span></div>
            <p className="text-sm text-slate-500 mt-1">
              {total} of {limit} services deployed · {runningNow} running right now.
            </p>
          </div>
          <div className="text-xs text-slate-400 max-w-sm">
            Your trial includes up to 4 services free for 30 days; after that upgrade to Pro for $10/mo with unlimited services.
          </div>
        </div>
        <div className="mt-4 h-2 bg-slate-100 overflow-hidden">
          <div className="h-full bg-[#00459c]" style={{ width: `${limit ? Math.min(100, (total / limit) * 100) : 0}%` }} />
        </div>
      </Card>

      <Card title="How metering works" icon={<Truck className="w-4 h-4 text-[#00459c]" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
          <div className="bg-slate-50 border border-slate-200 p-4">
            <Rocket className="w-4 h-4 text-[#00459c] mb-2" />
            <div className="font-bold text-slate-800 mb-1">1 running service</div>
            <div className="text-slate-500">Every deployed service you keep running accrues usage on the shared fleet.</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4">
            <Activity className="w-4 h-4 text-violet-600 mb-2" />
            <div className="font-bold text-slate-800 mb-1">Credits accrue by the hour</div>
            <div className="text-slate-500">1 credit = 1 service running for 1 hour. Measured live from the platform.</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4">
            <Database className="w-4 h-4 text-emerald-600 mb-2" />
            <div className="font-bold text-slate-800 mb-1">Flat $10/mo</div>
            <div className="text-slate-500">Upgrade to Pro for a flat $10/mo with unlimited services after your free month.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}