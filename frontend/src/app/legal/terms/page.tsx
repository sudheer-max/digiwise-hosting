'use client';

import React from 'react';
import { FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="animate-fade-in py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="w-8 h-8 text-[#00459c]" />
        <h1 className="text-3xl font-extrabold text-slate-900">Terms of Service</h1>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-sm text-slate-600 space-y-4 leading-relaxed">
        <p><strong>Last updated:</strong> July 2026</p>
        <p>These Terms of Service govern your use of DigiWise Cloud hosting, domain registration, and related services.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">1. Account Registration</h2>
        <p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your login credentials.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">2. Service Usage</h2>
        <p>Services must be used in compliance with applicable laws and our Acceptable Use Policy. Prohibited activities include but are not limited to: spamming, hacking, distributing malware, and intellectual property infringement.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">3. Billing & Payments</h2>
        <p>All fees are billed in advance on a monthly or annual basis. Refunds are handled per our 30-day money-back guarantee policy.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">4. Service Level Agreement</h2>
        <p>We guarantee 99.99% network uptime. Credits are issued for any downtime exceeding our SLA threshold as detailed in the SLA Agreement.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">5. Termination</h2>
        <p>Either party may terminate services with 30 days written notice. Upon termination, you must export your data before account closure.</p>
      </div>
    </div>
  );
}
