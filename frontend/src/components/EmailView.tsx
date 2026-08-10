import React, { useState, useEffect } from 'react';
import {
  Mail, Plus, Trash2, KeyRound, ShieldCheck, HardDrive, Inbox, ExternalLink,
  Monitor, Smartphone, Laptop, Copy, Check, ChevronDown, ChevronUp,
  Server, Settings, Globe, ShoppingCart
} from 'lucide-react';
import api from '../lib/api';

interface EmailAccount {
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
  storageUsed: number;
  storageTotal: number;
  protocols: string;
}

interface SetupGuide {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  steps: string[];
  settings: { label: string; value: string }[];
}

const EMAIL_CLIENTS: SetupGuide[] = [
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    icon: <Monitor className="w-5 h-5" />,
    description: 'Setup your DigiWise email in Outlook for Windows, Mac, or Web.',
    steps: [
      'Open Microsoft Outlook and go to File > Add Account.',
      'Enter your full email address (e.g., admin@digiwisesoftech.com).',
      'When prompted, select "IMAP" as the account type.',
      'Enter the incoming and outgoing server settings below.',
      'Enter your email password when prompted.',
      'Click "Finish" to complete setup.',
    ],
    settings: [
      { label: 'Email Address', value: 'yourname@digiwisesoftech.com' },
      { label: 'Incoming Server (IMAP)', value: 'mail.digiwisesoftech.com' },
      { label: 'IMAP Port', value: '993 (SSL/TLS)' },
      { label: 'Outgoing Server (SMTP)', value: 'mail.digiwisesoftech.com' },
      { label: 'SMTP Port', value: '465 (SSL/TLS)' },
      { label: 'Username', value: 'yourname@digiwisesoftech.com' },
      { label: 'Password', value: 'Your email password' },
      { label: 'Encryption', value: 'SSL/TLS' },
    ],
  },
  {
    id: 'apple-mail',
    name: 'Apple Mail',
    icon: <Laptop className="w-5 h-5" />,
    description: 'Configure DigiWise email on macOS Mail app or iOS Mail.',
    steps: [
      'Open the Mail app on your Mac or iOS device.',
      'Go to Mail > Add Account (macOS) or Settings > Mail > Accounts > Add Account (iOS).',
      'Select "Other Mail Account..." and click Continue.',
      'Enter your name, email address, and password.',
      'Select IMAP as the account type.',
      'Enter the server settings below.',
      'Choose which apps (Mail, Notes) to sync and click Done.',
    ],
    settings: [
      { label: 'Email Address', value: 'yourname@digiwisesoftech.com' },
      { label: 'Incoming Mail Server', value: 'mail.digiwisesoftech.com' },
      { label: 'Incoming Port', value: '993' },
      { label: 'Outgoing Mail Server', value: 'mail.digiwisesoftech.com' },
      { label: 'Outgoing Port', value: '465' },
      { label: 'Username', value: 'yourname@digiwisesoftech.com' },
      { label: 'Password', value: 'Your email password' },
      { label: 'Outgoing TLS', value: 'SSL/TLS' },
    ],
  },
  {
    id: 'thunderbird',
    name: 'Mozilla Thunderbird',
    icon: <Globe className="w-5 h-5" />,
    description: 'Setup your DigiWise email in Thunderbird email client.',
    steps: [
      'Open Thunderbird and go to Email under the Account Setup section.',
      'Click "Skip this and use my existing email".',
      'Enter your name, email address, and password.',
      'Thunderbird will attempt to auto-detect settings. If it fails, click "Configure manually".',
      'Enter the IMAP and SMTP server settings below.',
      'Click "Done" to finish setup.',
    ],
    settings: [
      { label: 'Email Address', value: 'yourname@digiwisesoftech.com' },
      { label: 'Incoming Server (IMAP)', value: 'mail.digiwisesoftech.com' },
      { label: 'Incoming Port', value: '993' },
      { label: 'Incoming SSL', value: 'SSL/TLS' },
      { label: 'Outgoing Server (SMTP)', value: 'mail.digiwisesoftech.com' },
      { label: 'Outgoing Port', value: '465' },
      { label: 'Outgoing SSL', value: 'SSL/TLS' },
      { label: 'Username', value: 'yourname@digiwisesoftech.com' },
    ],
  },
  {
    id: 'gmail-import',
    name: 'Gmail / Google Workspace',
    icon: <Mail className="w-5 h-5" />,
    description: 'Import your DigiWise email into Gmail using POP3 or forward automatically.',
    steps: [
      'Log in to your Gmail account.',
      'Go to Settings > See all settings > Accounts and Import.',
      'Click "Import mail and contacts" or "Add a mail account".',
      'Enter your DigiWise email address.',
      'Choose IMAP and enter the server settings below.',
      'Select labels and click "Start Import".',
    ],
    settings: [
      { label: 'Email Address', value: 'yourname@digiwisesoftech.com' },
      { label: 'IMAP Server', value: 'mail.digiwisesoftech.com' },
      { label: 'IMAP Port', value: '993' },
      { label: 'IMAP SSL', value: 'Yes (TLS)' },
      { label: 'SMTP Server', value: 'mail.digiwisesoftech.com' },
      { label: 'SMTP Port', value: '465' },
      { label: 'SMTP SSL', value: 'Yes (TLS)' },
      { label: 'Username', value: 'yourname@digiwisesoftech.com' },
    ],
  },
  {
    id: 'mobile',
    name: 'Mobile Devices',
    icon: <Smartphone className="w-5 h-5" />,
    description: 'Configure email on iPhone, iPad, or Android native mail apps.',
    steps: [
      'Open the Mail app (iOS) or Gmail/Email app (Android).',
      'Tap "Add Account" and select "Other" or "Manual Setup".',
      'Enter your email address and password.',
      'Choose IMAP as the account type.',
      'Enter the incoming and outgoing server settings.',
      'Save and wait for your mailbox to sync.',
    ],
    settings: [
      { label: 'Email Address', value: 'yourname@digiwisesoftech.com' },
      { label: 'Incoming Server', value: 'mail.digiwisesoftech.com' },
      { label: 'Incoming Port', value: '993' },
      { label: 'Outgoing Server', value: 'mail.digiwisesoftech.com' },
      { label: 'Outgoing Port', value: '465' },
      { label: 'Username', value: 'yourname@digiwisesoftech.com' },
      { label: 'Password', value: 'Your email password' },
      { label: 'Encryption', value: 'SSL/TLS' },
    ],
  },
];

export default function EmailView() {
  const [plan, setPlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [emails, setEmails] = useState<EmailAccount[]>([
    { address: 'admin@digiwisesoftech.com', status: 'ACTIVE', storageUsed: 0, storageTotal: 10, protocols: 'IMAP/SMTP' },
    { address: 'support@digiwisesoftech.com', status: 'ACTIVE', storageUsed: 0, storageTotal: 5, protocols: 'IMAP/SMTP' },
  ]);
  const [newUsername, setNewUsername] = useState('');
  const [newDomain, setNewDomain] = useState('digiwisesoftech.com');
  const [newStorage, setNewStorage] = useState(5);
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    api.getPlan().then(p => setPlan(p)).catch(() => setPlan(null)).finally(() => setPlanLoading(false));
  }, []);

  const hasPaidPlan = plan && plan.plan && plan.plan.key !== 'trial' && plan.planStatus === 'active';

  const handleCreateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    const fullAddress = `${newUsername.trim()}@${newDomain}`;
    if (emails.some(item => item.address === fullAddress)) {
      alert('Email account already exists!');
      return;
    }
    setEmails([
      ...emails,
      { address: fullAddress, status: 'ACTIVE', storageUsed: 0, storageTotal: Number(newStorage), protocols: 'IMAP/SMTP' },
    ]);
    setNewUsername('');
    setNewPassword('');
    setIsCreating(false);
  };

  const handleDeleteEmail = (address: string) => {
    setEmails(emails.filter(e => e.address !== address));
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const totalStorageUsed = emails.reduce((acc, curr) => acc + curr.storageUsed, 0);
  const totalStorageAllocated = emails.reduce((acc, curr) => acc + curr.storageTotal, 0);

  const card = 'bg-white border border-slate-200 shadow-sm';
  const inputCls = 'w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#00459c] px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 font-semibold transition-colors';
  const selectCls = 'w-full bg-white border border-slate-200 focus:border-[#00459c] px-2 py-2 text-xs font-semibold outline-none text-slate-900 transition-colors';
  const labelCls = 'text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5';

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 bg-[#f5f7fb] text-slate-600 min-h-screen">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Business Email</h1>
          <p className="text-slate-500 text-sm mt-1">Provision, secure, and manage enterprise-grade email with dedicated storage.</p>
        </div>
        {hasPaidPlan ? (
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="bg-[#00459c] hover:bg-[#003882] text-white text-xs font-bold uppercase tracking-wider px-5 py-3 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Email Account
          </button>
        ) : (
          <a href="/checkout" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 transition-colors flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4" /> Purchase Plan
          </a>
        )}
      </div>

      {!hasPaidPlan && !planLoading && (
        <div className="bg-white border border-slate-200 shadow-sm p-10 text-center">
          <Mail className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Plan required</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Purchase a VPS hosting plan to create and manage business email accounts.
          </p>
          <a href="/checkout" className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 transition-colors">
            <ShoppingCart className="w-4 h-4" /> Purchase Plan
          </a>
        </div>
      )}

      {hasPaidPlan && (<>
      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${card} p-5`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Created Accounts</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{emails.length} of 10</div>
          <div className="w-full h-1.5 bg-slate-100 mt-3 overflow-hidden">
            <div className="h-full bg-[#00459c]" style={{ width: `${(emails.length / 10) * 100}%` }}></div>
          </div>
        </div>
        <div className={`${card} p-5`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Allocated Storage</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{totalStorageUsed.toFixed(1)} GB of {totalStorageAllocated} GB</div>
          <div className="w-full h-1.5 bg-slate-100 mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${(totalStorageUsed / totalStorageAllocated) * 100}%` }}></div>
          </div>
        </div>
        <div className={`${card} p-5 flex items-center gap-4`}>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spam Protection</span>
            <span className="font-extrabold text-emerald-600 text-sm block mt-0.5">ACTIVE & PREMIUM</span>
          </div>
        </div>
      </div>

      {/* CREATE FORM */}
      {isCreating && (
        <div className={`${card} p-6`}>
          <h3 className="font-bold text-slate-900 text-sm mb-4">Create New Business Email</h3>
          <form onSubmit={handleCreateEmail} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className={labelCls}>Username / Mailbox</label>
              <div className="flex border border-slate-200 bg-slate-50 focus-within:border-[#00459c]">
                <input
                  type="text"
                  placeholder="e.g. sales"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs px-3 py-2 text-slate-900 placeholder:text-slate-400"
                  required
                />
                <span className="bg-slate-200 px-2.5 py-2 text-slate-600 font-mono text-xs border-l border-slate-300">@</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Domain Name</label>
              <select value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className={selectCls}>
                <option value="digiwisesoftech.com">digiwisesoftech.com</option>
                <option value="digiwise.io">digiwise.io</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Storage Limit (GB)</label>
              <input type="number" min="1" max="25" value={newStorage} onChange={(e) => setNewStorage(Number(e.target.value))} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Secure Password</label>
              <input type="password" placeholder="********" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} required />
            </div>
            <div className="sm:col-span-4 flex justify-end gap-2.5 pt-2">
              <button type="button" onClick={() => setIsCreating(false)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 text-xs cursor-pointer">Cancel</button>
              <button type="submit" className="bg-[#00459c] hover:bg-[#003882] text-white font-bold px-4 py-2 text-xs cursor-pointer">Save Mailbox</button>
            </div>
          </form>
        </div>
      )}

      {/* MAILBOXES TABLE */}
      <div className={`${card} p-6`}>
        <h3 className="font-extrabold text-slate-900 text-base mb-4">Active Mailboxes</h3>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-2">EMAIL ADDRESS</th>
                <th className="py-2.5 px-2">STATUS</th>
                <th className="py-2.5 px-2">STORAGE ALLOCATION</th>
                <th className="py-2.5 px-2">PROTOCOLS</th>
                <th className="py-2.5 px-2 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => {
                const percent = email.storageTotal > 0 ? (email.storageUsed / email.storageTotal) * 100 : 0;
                return (
                  <tr key={email.address} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <Inbox className="w-4 h-4 text-[#00459c]" />
                        <span className="font-bold text-slate-900">{email.address}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="inline-block bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 border border-emerald-100">ACTIVE</span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="w-36">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                          <span>{email.storageUsed.toFixed(1)} / {email.storageTotal} GB</span>
                          <span>{percent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 overflow-hidden">
                          <div className="h-full bg-cyan-500" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2 font-mono text-slate-500 font-semibold">{email.protocols}</td>
                    <td className="py-4 px-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-2.5 py-1.5 text-xs cursor-pointer">
                          <span className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Reset PW</span>
                        </button>
                        <button onClick={() => handleDeleteEmail(email.address)} className="border border-rose-200 text-rose-600 hover:bg-rose-50 p-1.5 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EMAIL CLIENT SETUP GUIDES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Email Client Setup Guides</h2>
            <p className="text-sm text-slate-500 mt-1">Step-by-step instructions to configure your email on any device or application.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {EMAIL_CLIENTS.map((client) => {
            const isExpanded = expandedGuide === client.id;
            return (
              <div key={client.id} className={`${card} overflow-hidden`}>
                <button
                  onClick={() => setExpandedGuide(isExpanded ? null : client.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 bg-[#00459c]/10 text-[#00459c] flex items-center justify-center flex-shrink-0">
                    {client.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-sm">{client.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{client.description}</div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 px-5 py-5 space-y-5 bg-slate-50/30">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Setup Steps</h4>
                      <ol className="space-y-2">
                        {client.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                            <span className="w-5 h-5 bg-[#00459c] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Server Settings</h4>
                      <div className="bg-white border border-slate-200 overflow-hidden">
                        {client.settings.map((s, idx) => {
                          const fieldId = `${client.id}-${idx}`;
                          return (
                            <div key={idx} className={`flex items-center justify-between px-4 py-2.5 ${idx < client.settings.length - 1 ? 'border-b border-slate-100' : ''}`}>
                              <span className="text-[11px] text-slate-500 font-semibold">{s.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-slate-900">{s.value}</span>
                                {!s.value.includes('password') && !s.value.includes('Your') && (
                                  <button
                                    onClick={() => copyToClipboard(s.value, fieldId)}
                                    className="text-slate-400 hover:text-[#00459c] transition-colors cursor-pointer p-0.5"
                                    title="Copy to clipboard"
                                  >
                                    {copiedField === fieldId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SERVER CONFIG REFERENCE */}
      <div className={`${card} p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <Server className="w-5 h-5 text-[#00459c]" />
          <h3 className="font-bold text-slate-900 text-sm">Server Configuration Reference</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Incoming Mail (IMAP)</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Server</span><span className="font-mono font-bold text-slate-900">mail.digiwisesoftech.com</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Port</span><span className="font-mono font-bold text-slate-900">993</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Encryption</span><span className="font-mono font-bold text-slate-900">SSL/TLS</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Authentication</span><span className="font-mono font-bold text-slate-900">Password</span></div>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Outgoing Mail (SMTP)</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Server</span><span className="font-mono font-bold text-slate-900">mail.digiwisesoftech.com</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Port</span><span className="font-mono font-bold text-slate-900">465</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Encryption</span><span className="font-mono font-bold text-slate-900">SSL/TLS</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Authentication</span><span className="font-mono font-bold text-slate-900">Password</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Requires Auth</span><span className="font-mono font-bold text-slate-900">Yes</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* WEBMAIL PORTAL */}
      <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-1.5 text-[#00c0ff] font-bold text-xs uppercase tracking-wider mb-2">
            <ExternalLink className="w-4 h-4" /> Secure Webmail Portal
          </div>
          <h3 className="text-xl font-bold tracking-tight">Access Secure DigiWise Webmail</h3>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            Sign in to your corporate inbox securely using our browser-based Webmail application. Fully supports encrypted key authorization and offline message caching.
          </p>
        </div>
        <a
          href="https://webmail.digiwisesoftech.com"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white text-slate-900 font-extrabold text-xs uppercase tracking-wider px-6 py-3 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          Open Webmail Portal
        </a>
      </div>
      </>)}

    </div>
  );
}

