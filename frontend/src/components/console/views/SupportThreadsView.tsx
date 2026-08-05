import React from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { SectionHeader, Card, PrimaryButton, StatusPill } from '../ui';

const THREADS = [
  { id: 'DIGI-0001', subject: 'Welcome to DigiWise', status: 'open', updated: 'Just now' },
];

export default function SupportThreadsView() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="My support threads"
        subtitle="Conversations with the DigiWise support team."
        action={<PrimaryButton onClick={() => window.location.href = '/support'}><Plus className="w-3.5 h-3.5" /> New thread</PrimaryButton>}
      />

      <Card title="Threads" icon={<MessageSquare className="w-4 h-4 text-[#00459c]" />}>
        {THREADS.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">No support threads yet.</div>
        ) : (
          <div className="space-y-2">
            {THREADS.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 border border-slate-100 px-4 py-3 hover:border-[#00459c]/40 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">{t.subject}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{t.id} · updated {t.updated}</div>
                </div>
                <StatusPill status={t.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
