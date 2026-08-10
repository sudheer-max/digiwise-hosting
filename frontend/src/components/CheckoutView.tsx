import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShoppingCart, Lock, ArrowRight, Check, AlertCircle, Cpu, HardDrive, Server, Network } from 'lucide-react';
import api from '../lib/api';
import { useApp } from '../app/context/AppContext';
import { useAuth } from '../context/AuthContext';

interface CheckoutViewProps {
  selectedPlan: { name: string; price: number; billing?: string } | null;
  cartItems?: string[];
  onPurchaseComplete?: (details: any) => void;
}

const VPS_SPECS: Record<string, { vcpu: number; ram: string; disk: string; bandwidth: string }> = {
  'KVM 1': { vcpu: 1, ram: '4 GB', disk: '50 GB NVMe', bandwidth: '4 TB' },
  'KVM 2': { vcpu: 2, ram: '8 GB', disk: '100 GB NVMe', bandwidth: '8 TB' },
  'KVM 4': { vcpu: 4, ram: '16 GB', disk: '200 GB NVMe', bandwidth: '16 TB' },
  'KVM 8': { vcpu: 8, ram: '32 GB', disk: '400 GB NVMe', bandwidth: '32 TB' },
};

const VPS_PRICING: Record<string, { monthly: number; yearly: number; twoYear: number }> = {
  'KVM 1': { monthly: 999, yearly: 799, twoYear: 599 },
  'KVM 2': { monthly: 1199, yearly: 999, twoYear: 779 },
  'KVM 4': { monthly: 2399, yearly: 1499, twoYear: 1099 },
  'KVM 8': { monthly: 4399, yearly: 2999, twoYear: 2199 },
};

export default function CheckoutView({ selectedPlan, cartItems = [], onPurchaseComplete }: CheckoutViewProps) {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();
  const { removeFromCart, cartOptions } = useApp();
  const [billing, setBilling] = useState<'monthly' | 'yearly' | 'twoYear'>((selectedPlan?.billing as any) || 'twoYear');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('India');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activePlan = selectedPlan;
  const isVPS = activePlan && activePlan.name in VPS_SPECS;
  const specs = isVPS ? VPS_SPECS[activePlan!.name] : null;
  const prices = isVPS ? VPS_PRICING[activePlan!.name] : null;
  const monthlyPrice = prices ? prices[billing] : (activePlan?.price || 0);
  const months = billing === 'monthly' ? 1 : billing === 'yearly' ? 12 : 24;
  const totalAmount = monthlyPrice * months;

  const hasDomains = cartItems && cartItems.length > 0;
  const hasPlan = !!selectedPlan;
  const isEmpty = !hasPlan && !hasDomains;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      router.push('/auth/login?returnTo=/checkout');
      return;
    }
    setSubmitting(true);

    try {
      if (isVPS) {
        if (isAdmin) {
          await api.adminActivatePlan(activePlan!.name.toLowerCase(), billing);
          router.push('/console');
          return;
        }

        const cfg = await api.getPaymentConfig();
        const order = await api.planCheckout(activePlan!.name.toLowerCase(), billing);

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
          description: `${order.planName} - ${billing === 'monthly' ? '1 Month' : billing === 'yearly' ? '12 Months' : '24 Months'}`,
          order_id: order.razorpayOrderId,
          handler: (r: any) => {
            const qs = new URLSearchParams({
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_order_id: r.razorpay_order_id,
              razorpay_signature: r.razorpay_signature,
            });
            window.location.href = `${callback}?${qs.toString()}`;
          },
          modal: { ondismiss: () => setSubmitting(false) },
        });
        rzp.open();
        return;
      }

      const items: any[] = [];
      cartItems.forEach(name => items.push({ name, price: 0, years: (cartOptions[name]?.years || 1), autoRenew: (cartOptions[name]?.autoRenew ?? true), type: 'domain' }));
      if (activePlan) items.push({ name: activePlan.name, price: activePlan.price, type: 'hosting' });

      await new Promise(resolve => setTimeout(resolve, 2000));
      const params = new URLSearchParams({ orderId: 'SAMPLE-' + Date.now(), planName: activePlan?.name || '', clientName: firstName, email });
      router.push('/success?' + params.toString());
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || 'Payment failed. Please try again.');
    }
  };

  if (isEmpty) {
    return (
      <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center py-20">
          <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Your cart is empty</h2>
          <p className="text-slate-500 text-sm mb-8">Nothing to checkout. Choose a hosting plan to get started.</p>
          <Link href="/" className="bg-[#00459c] hover:bg-[#003882] text-white font-bold text-xs uppercase tracking-wider px-6 py-3 transition-colors inline-block">
            View Hosting Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Secure Checkout</h1>
        <p className="text-slate-500 text-sm mt-1">Complete your order to deploy your VPS server.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Left: Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 shadow-sm space-y-6">
          <h3 className="font-extrabold text-slate-900 text-sm pb-2 border-b border-slate-100">Billing Details</h3>

          {!user && !loading && (
            <div className="bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              You need to <Link href="/auth/login?returnTo=/checkout" className="underline font-bold mx-1">login</Link> or <Link href="/auth/signup?returnTo=/checkout" className="underline font-bold mx-1">create an account</Link> before placing an order.
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">First Name *</label>
                <input type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#00459c] px-3 py-2 text-xs outline-none transition-colors" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Last Name *</label>
                <input type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#00459c] px-3 py-2 text-xs outline-none transition-colors" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Company (Optional)</label>
                <input type="text" placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#00459c] px-3 py-2 text-xs outline-none transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Country *</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border border-slate-200 bg-white px-2 py-2 text-xs font-semibold outline-none">
                  <option value="India">India (INR)</option>
                  <option value="United States">United States (USD)</option>
                  <option value="United Kingdom">United Kingdom (GBP)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Address *</label>
              <input type="text" placeholder="Street address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#00459c] px-3 py-2 text-xs outline-none transition-colors" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">City *</label>
                <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#00459c] px-3 py-2 text-xs outline-none transition-colors" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">State *</label>
                <input type="text" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#00459c] px-3 py-2 text-xs outline-none transition-colors" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ZIP *</label>
                <input type="text" placeholder="ZIP code" value={zip} onChange={(e) => setZip(e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#00459c] px-3 py-2 text-xs outline-none transition-colors" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email *</label>
                <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#00459c] px-3 py-2 text-xs outline-none transition-colors" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Phone *</label>
                <input type="tel" placeholder="+91 99999 99999" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#00459c] px-3 py-2 text-xs outline-none transition-colors" required />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !user}
              className="w-full bg-[#00459c] hover:bg-[#003882] disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-extrabold text-xs uppercase tracking-widest py-3.5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 fill-white" /> {submitting ? 'Processing...' : 'Pay Now'}
            </button>
          </form>
        </div>

        {/* Right: Order Summary */}
        <div className="space-y-6">
          {/* Selected Plan */}
          {activePlan && isVPS && (
            <div className="bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-extrabold text-slate-900 text-sm">{activePlan.name}</h4>
                <span className="bg-[#7c3aed] text-white text-[9px] font-bold px-2 py-0.5 uppercase">VPS</span>
              </div>

              {/* Billing Cycle Selector */}
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Billing Cycle</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { key: 'monthly' as const, label: '1 mo' },
                    { key: 'yearly' as const, label: '12 mo' },
                    { key: 'twoYear' as const, label: '24 mo', badge: 'Best' },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setBilling(opt.key)}
                      className={`relative px-2 py-2 text-[10px] font-bold uppercase transition-all cursor-pointer text-center ${
                        billing === opt.key
                          ? 'bg-[#00459c] text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {opt.label}
                      {opt.badge && billing === opt.key && (
                        <span className="ml-1 bg-amber-400 text-white text-[7px] px-1">{opt.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specs */}
              {specs && (
                <div className="space-y-2 text-xs text-slate-600 mb-4">
                  <div className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-slate-400" /> {specs.vcpu} vCPU core{specs.vcpu > 1 ? 's' : ''}</div>
                  <div className="flex items-center gap-2"><HardDrive className="w-3.5 h-3.5 text-slate-400" /> {specs.ram} RAM</div>
                  <div className="flex items-center gap-2"><Server className="w-3.5 h-3.5 text-slate-400" /> {specs.disk}</div>
                  <div className="flex items-center gap-2"><Network className="w-3.5 h-3.5 text-slate-400" /> {specs.bandwidth} bandwidth</div>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Monthly price</span>
                  <span className="font-bold text-slate-900">₹{monthlyPrice}/mo</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Billing period</span>
                  <span className="font-bold text-slate-900">{months} month{months > 1 ? 's' : ''}</span>
                </div>
                {prices && prices.monthly > monthlyPrice && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>You save</span>
                    <span className="font-bold">₹{((prices.monthly - monthlyPrice) * months).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total due today</span>
                  <span className="text-[#00459c]">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-slate-50 border border-slate-200 p-6 shadow-sm">
            <h4 className="font-extrabold text-slate-900 text-sm mb-4">Order Summary</h4>
            <div className="space-y-3 text-xs">
              {activePlan && (
                <div className="flex justify-between items-center text-slate-800 pb-2 border-b border-slate-200">
                  <div>
                    <span className="font-bold block">{activePlan.name}</span>
                    <span className="text-[10px] text-slate-400">{isVPS ? `VPS - ${months} month${months > 1 ? 's' : ''}` : 'Hosting Plan'}</span>
                  </div>
                  <span className="font-bold font-mono">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              {cartItems.map((domain) => {
                const yrs = cartOptions[domain]?.years || 1;
                return (
                  <div key={domain} className="flex justify-between items-center text-slate-800 pb-2 border-b border-slate-100">
                    <div className="flex-1">
                      <span className="font-bold block text-[#00459c]">{domain}</span>
                      <span className="text-[10px] text-slate-400">{yrs} Year{yrs > 1 ? 's' : ''} Registration</span>
                    </div>
                    <button onClick={() => removeFromCart(domain)} className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer" title="Remove">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                );
              })}

              <div className="flex justify-between items-center text-slate-500 pt-1">
                <span>Priority Support</span>
                <span className="text-emerald-600 font-bold uppercase text-[9px]">FREE</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>SSL Certificate</span>
                <span className="text-emerald-600 font-bold uppercase text-[9px]">FREE</span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
              <span>Total</span>
              <span className="text-lg text-[#00459c]">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Security */}
          <div className="bg-[#00459c]/5 border border-[#00459c]/15 p-5 text-[11px] space-y-2 text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-[#00459c]">
              <ShieldCheck className="w-4 h-4" /> SECURE DEPLOYMENT
            </div>
            <p className="leading-relaxed">Your payment is encrypted. Your VPS server provisions instantly after payment confirmation.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
