import React from 'react';
import Link from 'next/link';
import { Terminal, Shield, BookOpen, Mail, MessageSquare, CheckCircle2, Activity } from 'lucide-react';

export default function DigiWiseFooter() {
  const currentYear = new Date().getFullYear();

  const columns = [
    {
      heading: 'Platform',
      links: [
        { label: 'Deployments', href: '/dashboard' },
        { label: 'Managed Databases', href: '/dashboard' },
        { label: 'Domains', href: '/dashboard' },
        { label: 'Business Email', href: '/email' },
        { label: 'VPS Compute', href: '/dashboard' },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: 'Documentation', href: '/kb' },
        { label: 'Support Center', href: '/support' },
        { label: 'Service Status', href: '/status' },
        { label: 'About DigiWise', href: '/about' },
        { label: 'Contact Us', href: '/contact' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'Privacy Policy', href: '/legal/privacy' },
        { label: 'Terms of Service', href: '/legal/terms' },
        { label: 'Cookie Policy', href: '/legal/cookies' },
        { label: 'SLA Agreement', href: '/legal/sla' },
      ],
    },
  ];

  return (
    <footer className="bg-white border-t border-slate-200 text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand Column */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
              <img src="/DIGIWISE-SOFTECH-LOGO.png" alt="DigiWise Logo" className="h-8 w-auto" />
            </Link>
            <p className="text-xs leading-relaxed max-w-sm">
              Managed cloud platform with auto-SSL, reliable storage, and Git-based deployments. Deploy apps, databases and sites in seconds.
            </p>
            <div className="flex gap-2.5 mt-2">
              <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#00459c] hover:border-[#00459c]/40 transition-colors cursor-pointer">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#00459c] hover:border-[#00459c]/40 transition-colors cursor-pointer">
                <Terminal className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#00459c] hover:border-[#00459c]/40 transition-colors cursor-pointer">
                <Shield className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#00459c] hover:border-[#00459c]/40 transition-colors cursor-pointer">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.heading} className="md:col-span-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                {col.heading}
              </h4>
              <ul className="space-y-2.5 text-xs font-semibold">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-slate-600 hover:text-[#00459c] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Status Column */}
          <div className="md:col-span-2">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
              Status
            </h4>
            <div className="space-y-3">
              <Link href="/status" className="group block bg-slate-50 border border-slate-200 p-3 hover:border-emerald-400/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Operational</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed whitespace-nowrap">All systems operational.</p>
              </Link>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <Activity className="w-3.5 h-3.5 text-[#00459c] shrink-0" />
                <span>99.99% uptime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-[#00459c]" />
            <a href="mailto:support@digiwisesoftech.com" className="hover:text-slate-600 transition-colors">support@digiwisesoftech.com</a>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              SOC 2 compliant
            </span>
            <span>© {currentYear} DigiWise Softech</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
