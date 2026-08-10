import React, { useEffect, useState } from 'react';
import { Sparkles, Check, Loader2, RefreshCw, Zap, ArrowRight, Cpu, HardDrive, Server, Network } from 'lucide-react';
import api from '../../../lib/api';
import { SectionHeader, Card, ErrorBanner, PrimaryButton, GhostButton } from '../ui';

interface PlanData {
  plan: { key: string; name: string; price: number; serviceLimit: number; unlimited?: boolean; description: string; specs?: { vcpu: number; ram: string; disk: string; bandwidth: string }; renewsAt?: number };
  planStatus: string;
  planRenewsAt?: string | null;
  trial?: { daysLeft: number; endsAt: string };
  usage?: { apps: number; dbs: number; composes: number; total: number; limit: number; remaining: number | null; unlimited?: boolean };
  plans?: any[];
}

export default function PlansView() {
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState('');
  const [payError, setPayError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.getPlan();
      setData(d);
    } catch (e: any) {
      setError(e.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upgrade = async (planKey: string) => {
    setPayError('');
    setPaying(planKey);

    try {
      const cfg = await api.getPaymentConfig();
      const order = await api.planCheckout(planKey);

      const loadScript = () => new Promise<void>((resolve, reject) => {
        if ((window as any).Razorpay) return resolve();
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.body.appendChild(s);
      });

      await loadScript();
      const callback = api.getPlanCallbackUrl();
      const rzp = new (window as any).Razorpay({
        key: cfg.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'DigiWise Cloud',
        description: `${order.planName} plan`,
        order_id: order.razorpayOrderId,
        handler: (r: any) => {
          const qs = new URLSearchParams({
            razorpay_payment_id: r.razorpay_payment_id,
            razorpay_order_id: r.razorpay_order_id,
            razorpay_signature: r.razorpay_signature,
          });
          window.location.href = `${callback}?${qs.toString()}`;
        },
        modal: { ondismiss: () => setPaying('') },
      });
      rzp.open();
    } catch (e: any) {
      setPayError(e.message || 'Failed to start payment');
      setPaying('');
    }
  };

  const isActive = data?.planStatus === 'active';
  const isTrial = data?.planStatus === 'trial';

  return (
    <div className="space-y-6">
      <SectionHeader
        title="VPS Hosting Plans"
        subtitle="Choose a plan that fits your workload."
        action={<GhostButton onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Refresh</GhostButton>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}
      {payError && <ErrorBanner message={payError} />}

      {loading && !data ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading plans...</div>
      ) : data ? (
        <>
          {/* Current plan banner */}
          <Card title="Current Plan" icon={<Sparkles className="w-4 h-4 text-[#00459c]" />}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-2xl font-display font-bold text-slate-900">{data.plan.name}</div>
                <div className="text-xs text-slate-500 mt-1">{data.plan.description}</div>
                {isTrial && data.trial && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-2.5 py-1">
                    <Zap className="w-3.5 h-3.5" /> Trial — {data.trial.daysLeft} day{data.trial.daysLeft === 1 ? '' : 's'} left
                  </div>
                )}
                {isActive && data.planRenewsAt && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-2.5 py-1">
                    <Check className="w-3.5 h-3.5" /> Renews {new Date(data.planRenewsAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="shrink-0">
                <div className="text-3xl font-display font-bold text-slate-900">
                  {data.plan.price > 0 ? `₹${data.plan.price}` : 'Free'}
                  {data.plan.price > 0 && <span className="text-sm text-slate-400 font-medium">/mo</span>}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                  {isActive ? 'Active' : isTrial ? 'Trial' : data.planStatus}
                </div>
              </div>
            </div>
          </Card>

          {/* VPS Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {(data.plans || []).filter(p => p.key !== 'trial').map((p) => {
              const current = p.key === data.plan.key;
              const featured = p.highlighted;
              return (
                <div
                  key={p.key}
                  className={`relative bg-white border p-6 flex flex-col justify-between transition-all ${
                    featured ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/15 shadow-md' : 'border-slate-200 hover:border-[#00459c]/40 hover:shadow-sm'
                  } ${current ? 'opacity-90' : ''}`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7c3aed] text-white text-[9px] font-bold px-3 py-1 uppercase tracking-wider whitespace-nowrap">
                      Most Popular
                    </span>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{p.name}</div>
                    <div className="mt-2 flex items-baseline">
                      <span className="text-3xl font-display font-bold text-slate-900">₹{p.price}</span>
                      <span className="text-sm text-slate-400 font-medium ml-1">/mo</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{p.description}</p>

                    {p.specs && (
                      <div className="mt-4 border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-slate-400" /> {p.specs.vcpu} vCPU core{p.specs.vcpu > 1 ? 's' : ''}</div>
                        <div className="flex items-center gap-2"><HardDrive className="w-3.5 h-3.5 text-slate-400" /> {p.specs.ram} RAM</div>
                        <div className="flex items-center gap-2"><Server className="w-3.5 h-3.5 text-slate-400" /> {p.specs.disk}</div>
                        <div className="flex items-center gap-2"><Network className="w-3.5 h-3.5 text-slate-400" /> {p.specs.bandwidth} bandwidth</div>
                      </div>
                    )}

                    {p.renewsAt && (
                      <div className="mt-3 text-[11px] text-slate-400">
                        Renews at ₹{p.renewsAt}/mo
                      </div>
                    )}
                  </div>
                  <div className="mt-5">
                    {current ? (
                      <div className="w-full text-center text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 py-2.5">
                        <Check className="w-3.5 h-3.5 inline mr-1" /> Current plan
                      </div>
                    ) : p.price === 0 ? (
                      <GhostButton className="w-full justify-center" onClick={() => load()}>Manage</GhostButton>
                    ) : (
                      <PrimaryButton className="w-full justify-center" onClick={() => upgrade(p.key)} disabled={!!paying}>
                        {paying === p.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />} Choose plan
                      </PrimaryButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
