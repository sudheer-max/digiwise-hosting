import React, { useEffect, useState } from 'react';
import { CreditCard, FileText, RefreshCw, Download, Check, Sparkles, ArrowRight } from 'lucide-react';
import api from '../../../lib/api';
import { SectionHeader, Card, ErrorBanner, PrimaryButton, GhostButton, StatusPill } from '../ui';

export default function BillingView() {
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const d = await api.getPlan();
      setPlan(d);
    } catch (e: any) {
      setError(e.message || 'Failed to load billing info');
    }
  };

  useEffect(() => { load(); }, []);

  const status = plan?.planStatus || 'trial';
  const planName = plan?.plan?.name || 'Trial';
  const price = plan?.plan?.price || 0;
  const renewsAt = plan?.planRenewsAt ? new Date(plan.planRenewsAt) : null;

  const invoices = [
    { id: 'INV-0001', date: '—', amount: 0, status: 'Draft' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Billing"
        subtitle="Manage your subscription and invoices."
        action={<GhostButton onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Refresh</GhostButton>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Subscription card */}
      <Card title="Subscription" icon={<CreditCard className="w-4 h-4 text-[#00459c]" />}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-[#00459c]/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#00459c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900">{planName} plan</span>
                <StatusPill status={status} />
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {price > 0 ? `$${price}.00 / month` : 'Free trial'} — {plan?.plan?.unlimited ? 'unlimited services' : `up to ${plan?.plan?.serviceLimit ?? 4} services`}
                {renewsAt && ` · renews ${renewsAt.toLocaleDateString()}`}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                {plan?.usage?.credits ?? 0} credit hours used this cycle
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <PrimaryButton onClick={() => window.location.href = '/console?view=plans'} className="whitespace-nowrap">
              <ArrowRight className="w-3.5 h-3.5" /> Change plan
            </PrimaryButton>
          </div>
        </div>
      </Card>

      {/* Payment method */}
      <Card title="Payment method" icon={<CreditCard className="w-4 h-4 text-[#00459c]" />}>
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            No card on file. Add a payment method when you upgrade to a paid plan.
          </div>
          <GhostButton className="shrink-0" onClick={() => window.location.href = '/console?view=plans'}>
            Add card
          </GhostButton>
        </div>
      </Card>

      {/* Plan model */}
      <Card title="Billing model" icon={<Check className="w-4 h-4 text-[#00459c]" />}>
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm text-slate-600 leading-relaxed">
            Free trial includes up to 4 services for your first 30 days. Upgrade to Pro for a flat
            $10/mo with unlimited services after that.
            <div className="mt-1 text-xs text-slate-400">Flat fee — no metering, cancel anytime.</div>
          </div>
          <GhostButton className="shrink-0" onClick={() => window.location.href = '/console?view=plans'}>
            Upgrade
          </GhostButton>
        </div>
      </Card>

      {/* Invoices */}
      <Card title="Invoices" icon={<FileText className="w-4 h-4 text-[#00459c]" />}>
        {invoices.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">No invoices yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200">
                  <th className="py-2 pr-3">Invoice</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-3 text-sm font-bold text-slate-800">{inv.id}</td>
                    <td className="py-2.5 pr-3 text-xs text-slate-500">{inv.date}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-slate-600">${inv.amount.toFixed(2)}</td>
                    <td className="py-2.5 pr-3"><StatusPill status={inv.status} /></td>
                    <td className="py-2.5">
                      <button disabled className="text-slate-300 cursor-not-allowed" title="Not available yet">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
