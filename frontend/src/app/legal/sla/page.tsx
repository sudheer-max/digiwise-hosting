'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function SLAPage() {
  return (
    <div className="animate-fade-in py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="w-8 h-8 text-[#00459c]" />
        <h1 className="text-3xl font-extrabold text-slate-900">SLA Agreement</h1>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-sm text-slate-600 space-y-4 leading-relaxed">
        <p><strong>Last updated:</strong> July 2026</p>
        <p>This Service Level Agreement (&ldquo;SLA&rdquo;) governs the uptime and performance commitments for DigiWise Cloud hosting services.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">1. Uptime Guarantee</h2>
        <p>DigiWise guarantees 99.99% network and infrastructure uptime, measured monthly across all data center regions.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">2. Service Credits</h2>
        <p>If monthly uptime falls below 99.99%, you are eligible for service credits: 5% credit for 99.0-99.99%, 10% for 95.0-98.99%, and 25% for below 95%.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">3. Exclusions</h2>
        <p>This SLA does not cover downtime caused by: scheduled maintenance (notified 48h in advance), customer-configuration errors, third-party network issues, or force majeure events.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">4. Reporting</h2>
        <p>Submit credit requests within 30 days of the incident via the support portal. Credits are applied to your next billing cycle.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">5. Monitoring</h2>
        <p>Infrastructure is monitored 24/7 from multiple global vantage points. Real-time status is available at /status.</p>
      </div>
    </div>
  );
}
