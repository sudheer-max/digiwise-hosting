import React, { useState, useEffect } from 'react';
import { Check, ShieldCheck, Server, Globe, FileText, ArrowRight, Mail, HelpCircle, AlertCircle, RefreshCcw } from 'lucide-react';

interface SuccessViewProps {
  orderDetails: {
    orderId: string;
    planName: string;
    price: number;
    total: number;
    clientName: string;
    email: string;
    date: string;
    domains?: string[];
    planPrice?: number;
    domainsPrice?: number;
    currency?: string;
    currencySymbol?: string;
  } | null;
  onGoToDashboard: () => void;
}

export default function SuccessView({ orderDetails, onGoToDashboard }: SuccessViewProps) {
  const [step, setStep] = useState(0);

  // Fallback order details to match the screenshot or support custom flow
  const sym = orderDetails?.currencySymbol || '$';

  const order = orderDetails || {
    orderId: 'DWC-88294-02X',
    planName: 'Elite Cloud VPS - Pro Plan',
    price: 149.00,
    total: 139.00,
    clientName: 'John Doe',
    email: 'admin@digiwise-infra.io',
    date: 'November 14, 2024',
    domains: ['digiwise-infra.io'],
    currencySymbol: '$',
  };

  const stepsList = [
    'Allocating NVMe enterprise SSD sector limits...',
    'Injecting Anycast IP Protection & 10Gbps Uplink headers...',
    'Configuring Operating System kernel virtualization limits...',
    'Generating secure global TLS certificate chains...',
    'Node configuration successfully provisioned!'
  ];

  useEffect(() => {
    if (step >= stepsList.length - 1) return;
    const timer = setTimeout(() => {
      setStep(prev => prev + 1);
    }, 1500);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div className="animate-fade-in py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 font-sans">
      
      {/* SUCCESS CARD */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
        {/* Subtle background mesh line */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:16px_16px]"></div>
        
        {/* Checkmark square logo in dark blue */}
        <div className="relative z-10 flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#00459c] text-white flex items-center justify-center shadow-lg shadow-[#00459c]/25">
            <Check className="w-9 h-9 stroke-[3]" />
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#002866] tracking-tight font-display">
            Deployment Successful
          </h1>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Your enterprise-grade infrastructure is being provisioned. Your order is confirmed and active.
          </p>
        </div>

        {/* ORDER SPECS HEADER BOX */}
        <div className="relative z-10 mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-mono">
          <div className="space-y-1">
            <span className="text-slate-400 block text-[9px] font-sans font-bold uppercase tracking-wider">ORDER NUMBER</span>
            <span className="font-bold text-slate-800 text-sm">#{order.orderId}</span>
          </div>
          
          <div className="space-y-1">
            <span className="text-slate-400 block text-[9px] font-sans font-bold uppercase tracking-wider">PURCHASE DATE</span>
            <span className="font-bold text-slate-800 text-sm">{order.date}</span>
          </div>

          <div className="flex gap-2">
            <span className="bg-cyan-500 text-white text-[10px] font-sans font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-cyan-400">
              STABLE
            </span>
            <span className="bg-[#00459c] text-white text-[10px] font-sans font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-700">
              PAID
            </span>
          </div>
        </div>

        {/* PROVISIONING DETAILS MATRIX */}
        <div className="relative z-10 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8 text-left border-t border-slate-100 pt-8">
          
          {/* Left Columns: Services list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border-b border-slate-150 pb-2">
              <h3 className="font-bold text-[#002866] text-sm uppercase tracking-wider">Provisioning Details</h3>
            </div>

            {/* Row 1: Plan (Only if plan is purchased or it's the fallback demo) */}
            {(!orderDetails || (order.planPrice && order.planPrice > 0) || orderDetails?.planName !== 'Premium Domain Registration') && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                  <Server className="w-5 h-5 text-[#00459c]" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-900 text-sm">{order.planName}</h4>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {sym}{(order.planPrice !== undefined ? order.planPrice : 149.00).toFixed(2)}/mo
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#00459c] font-extrabold text-xs">✓</span>
                      <span>Virtual Private Server Container virtualisation</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#00459c] font-extrabold text-xs">✓</span>
                      <span>SLA-backed SLA Priority Support (10Gbps Uplink)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loop through active domains being registered */}
            {order.domains && order.domains.map((dom: any) => (
              <div key={typeof dom === 'string' ? dom : dom.name} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                  <Globe className="w-5 h-5 text-[#00459c]" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-900 text-sm">{typeof dom === 'string' ? dom : dom.name}</h4>
                    <span className="font-bold text-emerald-600 text-xs">✓ REGISTERED</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#00459c] font-extrabold text-xs">✓</span>
                      <span>WHOIS Privacy Protection Mask Enabled</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#00459c] font-extrabold text-xs">✓</span>
                      <span>Anycast DNS Propagation Initiated</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Dynamic Status Log */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-150">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCcw className="w-4 h-4 text-[#00459c] animate-spin" />
                <span className="text-[10px] font-bold text-[#00459c] uppercase tracking-wider">Live Virtualization Progress</span>
              </div>
              <div className="space-y-2 text-xs font-mono text-slate-600">
                {stepsList.map((st, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${i < step ? 'bg-emerald-500' : i === step ? 'bg-[#00459c] animate-ping' : 'bg-slate-300'}`}></span>
                    <span className={i < step ? 'text-slate-400 line-through' : i === step ? 'text-slate-900 font-bold' : 'text-slate-400'}>{st}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Payment Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 h-fit space-y-4">
            <h4 className="font-bold text-[#002866] text-sm border-b border-slate-150 pb-2 uppercase tracking-wider">
              Payment Summary
            </h4>
            
            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex justify-between items-center">
                <span>Subtotal:</span>
                <span className="font-bold font-mono text-slate-800">{sym}{(order.price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Tax (VAT 15%):</span>
                <span className="font-bold font-mono text-slate-800">{sym}{(order.price * 0.15).toFixed(2)}</span>
              </div>
              
              <div className="h-px bg-slate-200 my-2"></div>
              
              <div className="flex justify-between items-center text-[#00459c] font-extrabold text-sm pt-2">
                <span>TOTAL BILLED:</span>
                <span className="font-mono text-base">{sym}{(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ACTIONS BUTTONS ROW */}
        <div className="relative z-10 mt-10 flex flex-col sm:flex-row gap-4 border-t border-slate-100 pt-8 max-w-lg mx-auto">
          <button
            onClick={onGoToDashboard}
            className="flex-1 bg-[#00459c] hover:bg-[#003882] text-white font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-[#00459c]/15"
          >
            GO TO DASHBOARD <ArrowRight className="w-4.5 h-4.5" />
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-[#00459c] font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FileText className="w-4.5 h-4.5 text-[#00459c]" /> VIEW INVOICE
          </button>
        </div>

      </div>

      {/* POST-DEPLOYMENT GUIDES CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-[#00459c] font-extrabold text-xs">
            <span className="text-sm font-mono text-slate-300">01</span>
            <span className="uppercase tracking-widest">CHECK EMAIL</span>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed">
            We've sent your root credentials and server configuration guide to your registered email address securely.
          </p>
        </div>

        {/* Column 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-[#00459c] font-extrabold text-xs">
            <span className="text-sm font-mono text-slate-300">02</span>
            <span className="uppercase tracking-widest">DNS UPDATE</span>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed">
            Your domain registration is active. Propagation to our regional DNS edge nodes typically takes 15-30 minutes.
          </p>
        </div>

        {/* Column 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-[#00459c] font-extrabold text-xs">
            <span className="text-sm font-mono text-slate-300">03</span>
            <span className="uppercase tracking-widest">PRIORITY SUPPORT</span>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed">
            As an Elite Cloud customer, you now have instant 24/7/365 access to our dedicated Tier-3 cloud systems engineers.
          </p>
        </div>
      </div>

    </div>
  );
}
