'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Check, ArrowRight, Shield, Zap, Users, Building2,
  Globe, ArrowLeft, Loader2, Star, Lock, HardDrive, Send, Clock, AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Billing = 'monthly' | 'yearly';

const EMAIL_PLANS = [
  {
    key: 'email-starter',
    name: 'Starter',
    icon: Mail,
    description: 'Perfect for personal use',
    highlighted: false,
    specs: {
      mailboxes: 1,
      storage: '5 GB per mailbox',
      attachmentSize: '25 MB',
      domains: 1,
      aliases: 5,
    },
    features: [
      '1 Email mailbox',
      '5 GB storage per mailbox',
      'Send & receive emails',
      '25 MB attachment limit',
      '1 Custom domain',
      '5 Email aliases',
      'Webmail access',
      'Spam & virus protection',
    ],
    pricing: { monthly: 49, yearly: 39 },
  },
  {
    key: 'email-pro',
    name: 'Professional',
    icon: Zap,
    description: 'Best for small teams',
    highlighted: true,
    specs: {
      mailboxes: 5,
      storage: '10 GB per mailbox',
      attachmentSize: '50 MB',
      domains: 3,
      aliases: 25,
    },
    features: [
      '5 Email mailboxes',
      '10 GB storage per mailbox',
      'Send & receive emails',
      '50 MB attachment limit',
      '3 Custom domains',
      '25 Email aliases',
      'Webmail access',
      'Spam & virus protection',
      'Email templates',
      'Priority support',
    ],
    pricing: { monthly: 199, yearly: 149 },
  },
  {
    key: 'email-business',
    name: 'Business',
    icon: Building2,
    description: 'For growing businesses',
    highlighted: false,
    specs: {
      mailboxes: 25,
      storage: '25 GB per mailbox',
      attachmentSize: '100 MB',
      domains: 10,
      aliases: 100,
    },
    features: [
      '25 Email mailboxes',
      '25 GB storage per mailbox',
      'Send & receive emails',
      '100 MB attachment limit',
      '10 Custom domains',
      '100 Email aliases',
      'Webmail access',
      'Spam & virus protection',
      'Email templates',
      'Calendar & contacts',
      'API access',
      'Priority support',
    ],
    pricing: { monthly: 499, yearly: 399 },
  },
  {
    key: 'email-enterprise',
    name: 'Enterprise',
    icon: Users,
    description: 'For large organizations',
    highlighted: false,
    specs: {
      mailboxes: 100,
      storage: '50 GB per mailbox',
      attachmentSize: '200 MB',
      domains: 50,
      aliases: 500,
    },
    features: [
      '100 Email mailboxes',
      '50 GB storage per mailbox',
      'Send & receive emails',
      '200 MB attachment limit',
      '50 Custom domains',
      '500 Email aliases',
      'Webmail access',
      'Spam & virus protection',
      'Email templates',
      'Calendar & contacts',
      'API access',
      'Dedicated support',
      'Custom branding',
      'SSO integration',
    ],
    pricing: { monthly: 999, yearly: 799 },
  },
];

export default function EmailHostingView() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [billing, setBilling] = useState<Billing>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<typeof EMAIL_PLANS[0] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [startingTrial, setStartingTrial] = useState(false);

  // Check trial status on mount
  useEffect(() => {
    if (user) {
      api.getEmailTrialStatus().then((trial: any) => {
        setTrialStatus(trial);
      }).catch(() => {});
    }
  }, [user]);

  const handleStartTrial = async () => {
    if (!user) {
      router.push('/auth/login?returnTo=/email/hosting');
      return;
    }

    setStartingTrial(true);
    try {
      const result = await api.startEmailTrial();
      if (result?.success) {
        // Redirect to email setup with trial account created
        router.push('/email?trial=started');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start trial');
    }
    setStartingTrial(false);
  };

  const handlePurchase = async (plan: typeof EMAIL_PLANS[0]) => {
    if (!user) {
      router.push('/auth/login?returnTo=/email/hosting');
      return;
    }

    setSelectedPlan(plan);
    setProcessing(true);
    setError('');

    try {
      if (isAdmin) {
        const result = await api.adminActivateEmailHosting(plan.key, billing);
        if (result?.success) {
          router.push('/email?purchase=success');
        }
        setProcessing(false);
        return;
      }

      const cfg = await api.getPaymentConfig();
      const order = await api.emailHostCheckout(plan.key, billing);

      const loadScript = () => new Promise<void>((resolve, reject) => {
        if ((window as any).Razorpay) return resolve();
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.body.appendChild(s);
      });

      await loadScript();

      const rzp = new (window as any).Razorpay({
        key: cfg.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'DigiWise Email',
        description: `${plan.name} - ${billing === 'monthly' ? '1 Month' : '12 Months'}`,
        order_id: order.razorpayOrderId,
        handler: async (r: any) => {
          try {
            await api.verifyEmailHostPayment({
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_order_id: r.razorpay_order_id,
              razorpay_signature: r.razorpay_signature,
              plan: plan.key,
              billing,
            });
            router.push('/email?purchase=success');
          } catch (err: any) {
            setError(err.message || 'Payment verification failed');
          }
          setProcessing(false);
        },
        prefill: {
          email: user.email,
          name: user.name || '',
        },
        theme: { color: '#00459c' },
        modal: {
          ondismiss: () => setProcessing(false),
        },
      });

      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/email')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00459c] flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Email Hosting</h1>
              <p className="text-xs text-slate-500">Professional email for your business</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Trial Banner */}
        {user && trialStatus && !trialStatus.hasAccess && !trialStatus.trialExpired && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">Start Your 14-Day Free Trial</h3>
              <p className="text-sm text-emerald-100">Get 256 MB storage, 1 mailbox, and full email access. No credit card required.</p>
            </div>
            <button
              onClick={handleStartTrial}
              disabled={startingTrial}
              className="bg-white text-emerald-600 font-bold text-sm px-6 py-3 hover:bg-emerald-50 transition-colors cursor-pointer flex items-center gap-2"
            >
              {startingTrial ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Start Free Trial
            </button>
          </div>
        )}

        {/* Trial Active Banner */}
        {user && trialStatus?.isTrial && trialStatus?.hasAccess && (
          <div className="bg-amber-50 border border-amber-200 p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <div className="text-sm font-bold text-amber-800">Free Trial Active</div>
                <div className="text-xs text-amber-600">{trialStatus.daysLeft} days left &middot; {trialStatus.storageLimit} MB storage</div>
              </div>
            </div>
            <a href="/email" className="text-xs font-bold text-amber-700 hover:text-amber-900 underline">
              Go to Email &rarr;
            </a>
          </div>
        )}

        {/* Trial Expired Banner */}
        {user && trialStatus?.trialExpired && (
          <div className="bg-rose-50 border border-rose-200 p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <div>
                <div className="text-sm font-bold text-rose-800">Trial Expired</div>
                <div className="text-xs text-rose-600">Your 14-day trial has ended. Purchase a plan to continue using email hosting.</div>
              </div>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Professional Email Hosting</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Create branded email addresses using your own domain. Send and receive emails with 99.9% uptime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-6 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
              billing === 'monthly'
                ? 'bg-[#00459c] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-6 py-2.5 text-sm font-semibold transition-colors cursor-pointer relative ${
              billing === 'yearly'
                ? 'bg-[#00459c] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5">
              -20%
            </span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 mb-8 max-w-2xl mx-auto">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {EMAIL_PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = plan.pricing[billing];
            const monthlyEquivalent = billing === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;

            return (
              <div
                key={plan.key}
                className={`bg-white border-2 p-6 flex flex-col transition-all hover:shadow-lg ${
                  plan.highlighted
                    ? 'border-[#00459c] relative'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00459c] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <div className={`w-12 h-12 flex items-center justify-center mb-3 ${
                    plan.highlighted ? 'bg-[#00459c]/10' : 'bg-slate-100'
                  }`}>
                    <Icon className={`w-6 h-6 ${plan.highlighted ? 'text-[#00459c]' : 'text-slate-600'}`} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">₹{price}</span>
                    <span className="text-sm text-slate-500">/mo</span>
                  </div>
                  {billing === 'yearly' && (
                    <div className="text-xs text-emerald-600 font-semibold mt-1">
                      Save ₹{(plan.pricing.monthly - plan.pricing.yearly) * 12}/year
                    </div>
                  )}
                  <div className="text-xs text-slate-400 mt-1">
                    Billed {billing === 'monthly' ? 'monthly' : 'yearly (₹' + (price * 12) + ')'}
                  </div>
                </div>

                {/* Specs */}
                <div className="mb-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong>{plan.specs.mailboxes}</strong> mailbox{plan.specs.mailboxes > 1 ? 'es' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong>{plan.specs.storage}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Send className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong>{plan.specs.attachmentSize}</strong> attachments</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong>{plan.specs.domains}</strong> domain{plan.specs.domains > 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-2 mb-6">
                  {plan.features.slice(0, 6).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                  {plan.features.length > 6 && (
                    <li className="text-xs text-slate-400 pl-5">
                      +{plan.features.length - 6} more features
                    </li>
                  )}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handlePurchase(plan)}
                  disabled={processing && selectedPlan?.key === plan.key}
                  className={`w-full py-3 font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    plan.highlighted
                      ? 'bg-[#00459c] hover:bg-[#003882] text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  } ${processing && selectedPlan?.key === plan.key ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {processing && selectedPlan?.key === plan.key ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {isAdmin ? 'Activate' : 'Get Started'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Trust badges */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="flex items-start gap-4 p-6 bg-white border border-slate-200">
            <Shield className="w-8 h-8 text-[#00459c] shrink-0" />
            <div>
              <div className="text-sm font-bold text-slate-900">99.9% Uptime</div>
              <div className="text-xs text-slate-500 mt-1">Enterprise-grade infrastructure with guaranteed uptime</div>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 bg-white border border-slate-200">
            <Lock className="w-8 h-8 text-[#00459c] shrink-0" />
            <div>
              <div className="text-sm font-bold text-slate-900">Encrypted</div>
              <div className="text-xs text-slate-500 mt-1">TLS encryption for all emails in transit</div>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 bg-white border border-slate-200">
            <Star className="w-8 h-8 text-[#00459c] shrink-0" />
            <div>
              <div className="text-sm font-bold text-slate-900">24/7 Support</div>
              <div className="text-xs text-slate-500 mt-1">Priority support for all email hosting plans</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-slate-900 text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {[
              {
                q: 'Can I use my own domain?',
                a: 'Yes! All plans support custom domains. Simply point your domain\'s MX records to our mail servers and we\'ll handle the rest.',
              },
              {
                q: 'Can I migrate from another email provider?',
                a: 'Absolutely. We provide free migration assistance for all paid plans. Our team will help you move your existing emails and contacts.',
              },
              {
                q: 'What happens if I exceed my storage limit?',
                a: 'You\'ll receive a notification when you reach 80% storage. You can upgrade your plan at any time or archive old emails.',
              },
              {
                q: 'Do you support IMAP/POP3?',
                a: 'Yes, all plans support IMAP, POP3, and SMTP. You can use any email client like Outlook, Thunderbird, or Apple Mail.',
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! All plans come with a 14-day free trial. No credit card required to start.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 p-5">
                <div className="text-sm font-bold text-slate-900 mb-2">{faq.q}</div>
                <div className="text-xs text-slate-600 leading-relaxed">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
