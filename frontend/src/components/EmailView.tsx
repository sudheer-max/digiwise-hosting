import React, { useState } from 'react';
import { Mail, Plus, Trash2, KeyRound, ShieldCheck, HardDrive, Inbox, ExternalLink } from 'lucide-react';

export default function EmailView() {
  const [emails, setEmails] = useState([
    { address: 'admin@digiwise.io', status: 'ACTIVE', storageUsed: 4.2, storageTotal: 10, protocols: 'IMAP/SMTP' },
    { address: 'sales@digiwise.io', status: 'ACTIVE', storageUsed: 2.1, storageTotal: 5, protocols: 'IMAP/SMTP' },
    { address: 'info@digiwise.io', status: 'ACTIVE', storageUsed: 1.8, storageTotal: 5, protocols: 'IMAP/SMTP' },
    { address: 'support@digiwise.io', status: 'ACTIVE', storageUsed: 4.3, storageTotal: 10, protocols: 'IMAP/SMTP' },
  ]);

  const [newUsername, setNewUsername] = useState('');
  const [newDomain, setNewDomain] = useState('digiwise.io');
  const [newStorage, setNewStorage] = useState(5);
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
      {
        address: fullAddress,
        status: 'ACTIVE',
        storageUsed: 0,
        storageTotal: Number(newStorage),
        protocols: 'IMAP/SMTP'
      }
    ]);

    setNewUsername('');
    setNewPassword('');
    setIsCreating(false);
  };

  const handleDeleteEmail = (address: string) => {
    setEmails(emails.filter(e => e.address !== address));
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
          <p className="text-slate-500 text-sm mt-1">Provision, secure, and manage enterprise-grade inbox identities with dedicated storage.</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="bg-[#00459c] hover:bg-[#003882] text-white text-xs font-bold uppercase tracking-wider px-5 py-3 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Email Account
        </button>
      </div>

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
                <span className="bg-slate-200 px-2.5 py-2 text-slate-600 font-mono text-xs border-l border-slate-300">
                  @
                </span>
              </div>
            </div>

            <div>
              <label className={labelCls}>Domain Name</label>
              <select value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className={selectCls}>
                <option value="digiwise.io">digiwise.io</option>
                <option value="digiwisecloud.com">digiwisecloud.com</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Storage Limit (GB)</label>
              <input
                type="number"
                min="1"
                max="25"
                value={newStorage}
                onChange={(e) => setNewStorage(Number(e.target.value))}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className={labelCls}>Secure Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputCls}
                required
              />
            </div>

            <div className="sm:col-span-4 flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#00459c] hover:bg-[#003882] text-white font-bold px-4 py-2 text-xs cursor-pointer"
              >
                Save Mailbox
              </button>
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
                const percent = (email.storageUsed / email.storageTotal) * 100;
                return (
                  <tr key={email.address} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <Inbox className="w-4 h-4 text-[#00459c]" />
                        <span className="font-bold text-slate-900">{email.address}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="inline-block bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 border border-emerald-100">
                        ACTIVE
                      </span>
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
                        <button
                          onClick={() => handleDeleteEmail(email.address)}
                          className="border border-rose-200 text-rose-600 hover:bg-rose-50 p-1.5 cursor-pointer"
                        >
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

      {/* WEBMAIL PORTAL */}
      <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-1.5 text-[#00c0ff] font-bold text-xs uppercase tracking-wider mb-2">
            <ExternalLink className="w-4 h-4" /> Secure Webmail Portal
          </div>
          <h3 className="text-xl font-bold tracking-tight">Access Secure DigiWise Webmail</h3>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            Sign in to your corporate inbox securely using our isolated browser-based Webmail application. Fully supports encrypted key authorization and offline message caching.
          </p>
        </div>

        <a
          href="https://webmail.digiwise.io"
          target="_blank"
          referrerPolicy="no-referrer"
          className="bg-white text-slate-900 font-extrabold text-xs uppercase tracking-wider px-6 py-3 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          Open Webmail Portal
        </a>
      </div>

    </div>
  );
}
