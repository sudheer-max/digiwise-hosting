import React from 'react';
import { Share2, Users, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { SectionHeader, Card, CopyField } from '../ui';

export default function ReferralsView() {
  const [copied, setCopied] = useState(false);
  const link = 'https://digiwisesoftech.com?ref=';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const referralTiers = [
    { label: 'Total referrals', value: '0' },
    { label: 'Active teams', value: '0' },
    { label: 'Lifetime credit', value: '$0.00' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Referrals"
        subtitle="Share DigiWise and earn credits for your account."
      />

      <Card title="Your referral link" icon={<Share2 className="w-4 h-4 text-[#00459c]" />}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <CopyField text={link} mono={false} />
          </div>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 bg-[#00459c] hover:bg-[#003577] text-white text-xs font-bold px-4 py-2.5 transition-colors cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy link
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Your link becomes active once you're on a paid plan. Referrals must start a paid plan
          for credit to apply.
        </p>
      </Card>

      <Card title="Program details" icon={<Users className="w-4 h-4 text-[#00459c]" />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {referralTiers.map((r) => (
            <div key={r.label} className="border border-slate-100 p-4">
              <div className="text-xl font-display font-bold text-slate-900">{r.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{r.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
