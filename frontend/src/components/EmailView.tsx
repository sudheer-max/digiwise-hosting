'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Inbox, Send, Trash2, ArrowLeft, Plus, Search, Reply, ReplyAll,
  Forward, Star, Archive, RefreshCw, Loader2, Settings, LogOut, ChevronDown,
  Compose, X, Paperclip
} from 'lucide-react';
import api from '../lib/api';

type View = 'setup' | 'inbox' | 'sent' | 'compose' | 'read';

export default function EmailView() {
  const [view, setView] = useState<View>('setup');
  const [configured, setConfigured] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fromName, setFromName] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupBusy, setSetupBusy] = useState(false);

  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check if session exists on mount
  useEffect(() => {
    const token = api.getEmailToken();
    if (token) {
      api.checkEmailSession().then((data: any) => {
        if (data?.configured) {
          setConfigured(true);
          setView('inbox');
          setEmail(data.email || '');
        }
      }).catch(() => {
        api.clearEmailToken();
      });
    }
  }, []);

  const loadMessages = useCallback(async (folder: string) => {
    setLoading(true);
    try {
      const msgs = folder === 'sent' ? await api.listSent() : await api.listInbox();
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (configured && (view === 'inbox' || view === 'sent')) {
      loadMessages(view);
    }
  }, [view, configured, loadMessages]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSetupBusy(true);
    setSetupError('');
    try {
      await api.createEmailSession({ email, password, fromName: fromName || undefined });
      setConfigured(true);
      setView('inbox');
    } catch (err: any) {
      setSetupError(err.message || 'Failed to connect');
    }
    setSetupBusy(false);
  };

  const handleLogout = async () => {
    try { await api.deleteEmailSession(); } catch { /* ignore */ }
    setConfigured(false);
    setView('setup');
    setEmail('');
    setPassword('');
    setMessages([]);
    setSelected(null);
  };

  const openMessage = (msg: any) => {
    setSelected(msg);
    setView('read');
  };

  const handleSend = async () => {
    if (!composeTo || !composeSubject || !composeBody) return;
    setSending(true);
    setSendResult(null);
    try {
      await api.sendEmail(composeTo, composeSubject, composeBody);
      setSendResult({ type: 'success', message: 'Email sent!' });
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setTimeout(() => { setSendResult(null); setView('sent'); }, 1200);
    } catch (err: any) {
      setSendResult({ type: 'error', message: err.message || 'Failed' });
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteEmailMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selected?.id === id) { setSelected(null); setView('inbox'); }
    } catch { /* ignore */ }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (isNaN(diff)) return d;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filtered = messages.filter((m) =>
    !search || m.subject?.toLowerCase().includes(search.toLowerCase()) ||
    m.from?.toLowerCase().includes(search.toLowerCase()) ||
    m.to?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (addr: string) => {
    const name = addr?.split('@')[0] || '?';
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (addr: string) => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500'];
    let hash = 0;
    for (let i = 0; i < (addr || '').length; i++) hash = addr.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // ====== SETUP SCREEN ======
  if (!configured) {
    return (
      <div className="min-h-screen bg-[#f6f8fc] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#00459c] mx-auto mb-4 flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">DigiWise Mail</h1>
            <p className="text-sm text-slate-500 mt-1">Connect your Gmail to send and receive emails</p>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-8">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Connect Your Email</h2>
            <p className="text-xs text-slate-500 mb-6">Enter your Gmail address and App Password to get started.</p>

            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Gmail Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#00459c] focus:bg-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">App Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c] focus:bg-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Display Name (optional)</label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#00459c] focus:bg-white transition-colors"
                />
              </div>

              {setupError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-3">{setupError}</div>
              )}

              <button
                type="submit"
                disabled={setupBusy || !email || !password}
                className="w-full bg-[#00459c] hover:bg-[#003882] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-3 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {setupBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Connect Email
              </button>
            </form>

            <div className="bg-blue-50 border border-blue-100 p-4 mt-6 text-xs text-blue-800 space-y-1">
              <p className="font-bold">How to get a Gmail App Password:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" className="underline font-bold">Google App Passwords</a></li>
                <li>Enable 2-Step Verification if not already enabled</li>
                <li>Select <strong>Mail</strong> and <strong>Other</strong>, name it "DigiWise"</li>
                <li>Click Generate and copy the 16-character password</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== GMAIL-LIKE INTERFACE ======
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <header className="h-14 border-b border-slate-200 flex items-center gap-4 px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#00459c] flex items-center justify-center">
            <Mail className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-800 hidden sm:block">DigiWise Mail</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mail"
              className="w-full bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-200 pl-10 pr-4 py-2 text-sm outline-none transition-colors"
            />
          </div>
        </div>

        {/* User + Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('inbox')}
            className={`p-2 rounded-full transition-colors cursor-pointer ${view === 'inbox' ? 'bg-[#00459c]/10 text-[#00459c]' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Inbox"
          >
            <Inbox className="w-5 h-5" />
          </button>
          <button
            onClick={() => setView('sent')}
            className={`p-2 rounded-full transition-colors cursor-pointer ${view === 'sent' ? 'bg-[#00459c]/10 text-[#00459c]' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Sent"
          >
            <Send className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer" title="Disconnect">
            <LogOut className="w-4.5 h-4.5" />
          </button>
          <div className="w-8 h-8 bg-[#00459c] text-white flex items-center justify-center text-xs font-bold rounded-full cursor-default" title={email}>
            {getInitials(email)}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r border-slate-200 shrink-0 flex flex-col">
          <div className="p-4">
            <button
              onClick={() => { setView('compose'); setSelected(null); setComposeTo(''); setComposeSubject(''); setComposeBody(''); }}
              className="w-full flex items-center justify-center gap-2 bg-[#00459c] hover:bg-[#003882] text-white font-bold text-sm py-2.5 px-4 transition-colors cursor-pointer"
            >
              <Compose className="w-4 h-4" /> Compose
            </button>
          </div>

          <nav className="flex-1 px-2 space-y-0.5">
            <button
              onClick={() => { setView('inbox'); setSelected(null); }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                (view === 'inbox' || (view === 'read' && selected?.folder !== 'sent'))
                  ? 'bg-[#00459c]/10 text-[#00459c] font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Inbox className="w-4 h-4" /> Inbox
            </button>
            <button
              onClick={() => { setView('sent'); setSelected(null); }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                view === 'sent'
                  ? 'bg-[#00459c]/10 text-[#00459c] font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Send className="w-4 h-4" /> Sent
            </button>
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="text-[10px] text-slate-400 truncate" title={email}>{email}</div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Compose View */}
          {view === 'compose' && (
            <div className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setView('inbox')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-slate-900">New Message</h2>
              </div>

              <div className="space-y-4 flex-1">
                <div className="border-b border-slate-200">
                  <input
                    type="email"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="To"
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
                <div className="border-b border-slate-200">
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Subject"
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  className="w-full flex-1 min-h-[300px] text-sm outline-none resize-none leading-relaxed"
                />
              </div>

              {sendResult && (
                <div className={`px-4 py-3 text-xs font-semibold mb-4 ${
                  sendResult.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}>
                  {sendResult.message}
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={handleSend}
                  disabled={sending || !composeTo || !composeSubject || !composeBody}
                  className="bg-[#00459c] hover:bg-[#003882] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-2.5 transition-colors cursor-pointer flex items-center gap-2"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
                <button
                  onClick={() => setView('inbox')}
                  className="text-slate-500 hover:text-slate-700 text-sm font-medium cursor-pointer px-3 py-2.5"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Read Message View */}
          {view === 'read' && selected && (
            <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
              <button
                onClick={() => { setView(selected.folder === 'sent' ? 'sent' : 'inbox'); setSelected(null); }}
                className="flex items-center gap-1.5 text-sm text-[#00459c] hover:underline cursor-pointer mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <h1 className="text-xl font-bold text-slate-900 mb-4">{selected.subject}</h1>

              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className={`w-10 h-10 ${getAvatarColor(selected.from)} text-white flex items-center justify-center text-xs font-bold rounded-full`}>
                  {getInitials(selected.from)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900">{selected.from}</div>
                  <div className="text-xs text-slate-500">to {selected.to || email}</div>
                </div>
                <div className="text-xs text-slate-400">{formatDate(selected.date || selected.createdAt)}</div>
              </div>

              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[200px]">
                {selected.body}
              </div>

              <div className="flex gap-2 mt-8 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setView('compose');
                    setComposeTo(selected.from);
                    setComposeSubject(`Re: ${selected.subject}`);
                    setComposeBody(`\n\n--- On ${formatDate(selected.date || selected.createdAt)}, ${selected.from} wrote:\n\n${selected.body}`);
                  }}
                  className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm px-4 py-2 transition-colors cursor-pointer"
                >
                  <Reply className="w-4 h-4" /> Reply
                </button>
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="flex items-center gap-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-medium text-sm px-4 py-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          )}

          {/* Message List (Inbox / Sent) */}
          {(view === 'inbox' || view === 'sent') && (
            <div className="flex-1 overflow-y-auto">
              {/* Toolbar */}
              <div className="flex items-center gap-3 px-6 py-2 border-b border-slate-100">
                <button
                  onClick={() => loadMessages(view)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <span className="text-xs text-slate-400">{filtered.length} messages</span>
              </div>

              {/* Messages */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00459c]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-slate-100 flex items-center justify-center mb-4 rounded-full">
                    <Mail className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    {search ? 'No messages match your search' : view === 'inbox' ? 'No messages in inbox' : 'No sent messages'}
                  </p>
                </div>
              ) : (
                <div>
                  {filtered.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => openMessage(msg)}
                      className="flex items-center gap-4 px-6 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <div className={`w-9 h-9 ${getAvatarColor(msg.from)} text-white flex items-center justify-center text-[10px] font-bold rounded-full shrink-0`}>
                        {getInitials(msg.from)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {view === 'sent' ? `To: ${msg.to}` : msg.from}
                          </span>
                          <span className="text-xs text-slate-400 shrink-0">
                            {formatDate(msg.date || msg.createdAt)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-500 truncate">{msg.subject}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                        className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
