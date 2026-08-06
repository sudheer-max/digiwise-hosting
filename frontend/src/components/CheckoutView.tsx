import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShoppingCart, Lock, ArrowRight, Check, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { currencyMap, countryCodeMap, getDomainPrice, useApp } from '../app/context/AppContext';
import { useAuth } from '../context/AuthContext';

interface CheckoutViewProps {
  selectedPlan: { name: string; price: number } | null;
  cartItems?: string[];
  onPurchaseComplete?: (details: any) => void;
}

export default function CheckoutView({ selectedPlan, cartItems = [], onPurchaseComplete }: CheckoutViewProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { selectedCountry, removeFromCart, cartOptions } = useApp();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState(selectedCountry);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'sample'>('sample');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setRazorpayLoaded(true);
      document.body.appendChild(script);
    } else if (typeof (window as any)?.Razorpay !== 'undefined') {
      setRazorpayLoaded(true);
    }
  }, []);

  useEffect(() => {
    setCountry(selectedCountry);
  }, [selectedCountry]);

  const currency = currencyMap[country] || currencyMap['United States'];

  const WEBSITE_PLANS: Record<string, number> = { 'Single Website': 3500, '10 Websites': 12500, '30 Websites': 30000 };
  const activePlan = selectedPlan;
  const isWebsitePlan = activePlan && activePlan.name in WEBSITE_PLANS;

  const hasDomains = cartItems && cartItems.length > 0;
  const hasPlan = !!selectedPlan;
  const isEmpty = !hasPlan && !hasDomains;

  const planINR = isWebsitePlan ? WEBSITE_PLANS[activePlan!.name] : 0;
  const planPrice = activePlan ? activePlan.price : 0;
  const domainsPriceUSD = cartItems.reduce((acc, domain) => {
    const opts = cartOptions[domain];
    const yrs = opts?.years || 1;
    return acc + getDomainPrice(domain) * yrs;
  }, 0);
  
  const basePrice = planPrice + domainsPriceUSD;
  const basePriceLocal = isWebsitePlan
    ? planINR + Math.round(domainsPriceUSD * currency.rate * 100) / 100
    : Math.round(basePrice * currency.rate * 100) / 100;
  const vat = Math.round(basePriceLocal * currency.taxRate * 100) / 100;
  const total = Math.round((basePriceLocal + vat) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const cc = countryCodeMap[country] || 'US';
    setSubmitting(true);

    try {
      const items: any[] = [];
      cartItems.forEach(name => items.push({ name, price: getDomainPrice(name), years: (cartOptions[name]?.years || 1), autoRenew: (cartOptions[name]?.autoRenew ?? true), type: 'domain' }));
      if (activePlan) items.push({ name: activePlan.name, price: activePlan.price, type: 'hosting' });

      if (paymentMethod === 'sample') {
        // Simulate 2s delay then redirect to success
        await new Promise(resolve => setTimeout(resolve, 2000));
        const params = new URLSearchParams({ orderId: 'SAMPLE-' + Date.now(), planName: activePlan?.name || '', clientName: firstName, email, });
        router.push('/success?' + params.toString());
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const result = await api.checkoutDomains(items, {
        firstName, lastName, email, phone,
        address: { line1: address, city, state, zip, country },
      }, cc);

      // Redirect to Razorpay hosted checkout page (full page, no popup)
      if ((window as any).Razorpay && result.razorpayOrderId) {
        const razorpayKey = (await api.getPaymentConfig()).razorpayKeyId;
        const rzp = new (window as any).Razorpay({
          key: razorpayKey,
          amount: result.amount,
          currency: (result.currency || 'USD').toUpperCase(),
          name: 'DigiWise Softech',
          description: activePlan ? 'Hosting & Domains' : 'Domain Registration',
          order_id: result.razorpayOrderId,
          redirect: true,
          callback_url: api.getCallbackUrl(),
          cancel_url: api.getCancelUrl(),
        });
        rzp.open(); // This navigates the browser to Razorpay
      } else {
        throw new Error('Payment gateway not available');
      }
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
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-[#00459c] hover:bg-[#003882] text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-lg transition-colors"
            >
              View Hosting Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Secure Checkout</h1>
        <p className="text-slate-500 text-sm mt-1">Configure your billing profile details to deploy your active NVMe container cluster.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-sm mb-6 pb-2 border-b border-slate-100">Order Configuration</h3>
          
            {!user && !loading && (
              <div className="bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                You need to <Link href="/auth/login" className="underline font-bold mx-1">login</Link> before placing an order.
              </div>
            )}
            {error && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">First Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Last Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none"
                  required
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Company Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. DigiWise Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Country *</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-lg px-2 py-2 text-xs font-semibold outline-none"
                  >
                    <option value="United States">🇺🇸 United States ($ USD)</option>
                    <option value="United Kingdom">🇬🇧 United Kingdom (£ GBP)</option>
                    <option value="Germany">🇩🇪 Germany (€ EUR)</option>
                    <option value="France">🇫🇷 France (€ EUR)</option>
                    <option value="Italy">🇮🇹 Italy (€ EUR)</option>
                    <option value="Spain">🇪🇸 Spain (€ EUR)</option>
                    <option value="Netherlands">🇳🇱 Netherlands (€ EUR)</option>
                    <option value="Japan">🇯🇵 Japan (¥ JPY)</option>
                    <option value="Canada">🇨🇦 Canada (C$ CAD)</option>
                    <option value="Australia">🇦🇺 Australia (A$ AUD)</option>
                    <option value="India">🇮🇳 India (₹ INR)</option>
                    <option value="Brazil">🇧🇷 Brazil (R$ BRL)</option>
                    <option value="Singapore">🇸🇬 Singapore (S$ SGD)</option>
                    <option value="UAE">🇦🇪 UAE (د.إ AED)</option>
                  </select>
              </div>
            </div>

            {/* Row 3 */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Street Address *</label>
              <input
                type="text"
                placeholder="House number and street name..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none"
                required
              />
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Town / City *</label>
                <input
                  type="text"
                  placeholder="e.g. Boston"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">State / County *</label>
                <input
                  type="text"
                  placeholder="e.g. MA"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Postcode / ZIP *</label>
                <input
                  type="text"
                  placeholder="e.g. 02108"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none"
                  required
                />
              </div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. admin@digiwise.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Phone *</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none"
                  required
                />
              </div>
            </div>

            {/* Payment Selection */}
            <div className="space-y-3.5 pt-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Payment Method</label>
              
              <div className="space-y-2">
                <label
                  onClick={() => setPaymentMethod('sample')}
                  className={`border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all ${
                    paymentMethod === 'sample' ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-300' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input type="radio" name="payment" checked={paymentMethod === 'sample'} onChange={() => {}} className="accent-amber-500" />
                  <div>
                    <span className="font-extrabold text-amber-700 text-sm">Sample / Test Payment</span>
                    <span className="text-xs text-amber-600 block mt-0.5">Simulate a purchase for development/testing</span>
                  </div>
                </label>

                <label
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all ${
                    paymentMethod === 'razorpay' ? 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-300' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input type="radio" name="payment" checked={paymentMethod === 'razorpay'} onChange={() => {}} className="accent-emerald-500" />
                  <div>
                    <span className="font-extrabold text-emerald-700 text-sm">Razorpay</span>
                    <span className="text-xs text-emerald-600 block mt-0.5">Secure UPI / Cards / NetBanking / Wallet</span>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#00459c] hover:bg-[#003882] disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-extrabold text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <Lock className="w-4 h-4 fill-white" /> {submitting ? 'PROCESSING...' : (paymentMethod === 'sample' ? 'COMPLETE TEST PURCHASE' : (hasDomains ? 'PURCHASE & REGISTER DOMAINS' : 'PURCHASE NOW & DEPLOY SERVER'))}
            </button>

          </form>
        </div>

        {/* Right Column: Summary */}
        <div className="space-y-6">
          
          {/* Order Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h4 className="font-extrabold text-slate-900 text-sm mb-4">Order Summary</h4>
            
            <div className="space-y-3.5 pb-4 border-b border-slate-200 text-xs">
              {activePlan && (
                <div className="flex justify-between items-start text-slate-800 border-b border-slate-100 pb-2.5 group">
                  <div className="flex-1">
                    <span className="font-bold block text-slate-900">{activePlan.name}</span>
                    <span className="text-[10px] text-slate-400">{isWebsitePlan ? 'Website Hosting (Annual)' : 'Virtual Machine Plan'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono text-xs">{isWebsitePlan ? `₹${planINR.toLocaleString('en-IN')}` : `${currency.symbol}${(activePlan.price * currency.rate).toFixed(2)}`}</span>
                  </div>
                </div>
              )}

              {cartItems.map((domain) => {
                const opts = cartOptions[domain];
                const yrs = opts?.years || 1;
                const price = getDomainPrice(domain) * yrs;
                return (
                  <div key={domain} className="flex justify-between items-start text-slate-800 border-b border-slate-100 pb-2.5 group">
                    <Link
                      href={"/purchase?id=" + encodeURIComponent(domain)}
                      className="flex-1 hover:bg-slate-100/50 -mx-2 px-2 rounded transition-colors"
                    >
                      <span className="font-bold block text-[#00459c]">{domain}</span>
                      <span className="text-[10px] text-slate-400">{yrs} {yrs === 1 ? 'Year' : 'Years'} Domain Registration</span>
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono text-xs">{currency.symbol}{(price * currency.rate).toFixed(2)}</span>
                      <button
                        onClick={() => removeFromCart(domain)}
                        className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all p-1 cursor-pointer"
                        title="Remove from cart"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between items-center text-slate-500 pt-1.5">
                <span>Integrated SLA Priority Support</span>
                <span className="text-emerald-600 font-bold uppercase text-[9px]">FREE</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Integrated WHOIS Protection</span>
                <span className="text-emerald-600 font-bold uppercase text-[9px]">FREE</span>
              </div>
            </div>

            <div className="py-4 border-b border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800 font-mono">{isWebsitePlan ? `₹${basePriceLocal.toFixed(2)}` : `${currency.symbol}${basePriceLocal.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>VAT / Tax ({(currency.taxRate * 100).toFixed(0)}%)</span>
                <span className="font-semibold text-slate-800 font-mono">{isWebsitePlan ? `₹${vat.toFixed(2)}` : `${currency.symbol}${vat.toFixed(2)}`}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center text-sm font-extrabold text-slate-900">
              <span>Total Price Due</span>
              <span className="text-lg text-[#00459c] font-mono">{isWebsitePlan ? `₹${total.toFixed(2)}` : `${currency.symbol}${total.toFixed(2)}`}</span>
            </div>
          </div>

          {/* Secure logs */}
          <div className="bg-[#00459c]/5 border border-[#00459c]/15 rounded-2xl p-5 shadow-sm text-[11px] space-y-3 text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-[#00459c]">
              <ShieldCheck className="w-4 h-4" /> SECURE DEPLOYMENT PROTOCOL
            </div>
            <p className="leading-relaxed">
              Your transaction is handled over an encrypted TLS connection. Node virtualization starts instantly upon approval.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
