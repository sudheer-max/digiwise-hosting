import React from 'react';
import { BookOpen, ExternalLink, FileText, GitBranch, TerminalSquare } from 'lucide-react';
import { SectionHeader, Card } from '../ui';

const DOCS = [
  { title: 'Quickstart', desc: 'Deploy your first service in under a minute.', icon: <TerminalSquare className="w-4 h-4 text-[#00459c]" />, href: 'https://docs.digiwisesoftech.com' },
  { title: 'Applications', desc: 'Git pushes, buildpacks and rollbacks.', icon: <GitBranch className="w-4 h-4 text-[#00459c]" />, href: 'https://docs.digiwisesoftech.com/deployments' },
  { title: 'Databases', desc: 'Postgres, MySQL, Redis, MongoDB guides.', icon: <FileText className="w-4 h-4 text-[#00459c]" />, href: 'https://docs.digiwisesoftech.com/databases' },
  { title: 'Pricing & billing', desc: 'Plans, usage metering and invoicing.', icon: <BookOpen className="w-4 h-4 text-[#00459c]" />, href: 'https://docs.digiwisesoftech.com/pricing' },
];

export default function DocsView() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Documentation"
        subtitle="Guides and reference for the DigiWise platform."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOCS.map((d) => (
          <a
            key={d.title}
            href={d.href}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-slate-200 shadow-sm p-5 flex items-start gap-3 hover:border-[#00459c]/40 hover:shadow-md transition-all group"
          >
            <div className="w-9 h-9 bg-[#00459c]/10 flex items-center justify-center shrink-0">{d.icon}</div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                {d.title} <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-[#00459c]" />
              </div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">{d.desc}</div>
            </div>
          </a>
        ))}
      </div>

      <Card title="Need help?" >
        <p className="text-sm text-slate-600">
          Open a support thread from the sidebar, or email{' '}
          <a href="mailto:support@digiwisesoftech.com" className="text-[#00459c] font-semibold hover:underline">support@digiwisesoftech.com</a>.
        </p>
      </Card>
    </div>
  );
}
