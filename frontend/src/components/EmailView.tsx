'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, Inbox, Send, Trash2, ArrowLeft, Plus, Search, Reply, ReplyAll,
  Forward, Star, Archive, RefreshCw, Loader2, Settings, LogOut, ChevronDown,
  PenSquare, X, Paperclip, FileText, Download, Upload, ChevronRight, Users
} from 'lucide-react';
import api from '../lib/api';

type View = 'setup' | 'inbox' | 'sent' | 'compose' | 'read' | 'accounts' | 'templates';

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

  // Compose
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeHtml, setComposeHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Attachments
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accounts
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState({
    email: '', provider: 'gmail', imapHost: 'imap.gmail.com', imapPort: 993,
    smtpHost: 'smtp.gmail.com', smtpPort: 587, username: '', password: '', fromName: ''
  });

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '', html: '' });

  // Check session on mount
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

  const loadAccounts = useCallback(async () => {
    try {
      const accs = await api.getEmailAccounts();
      setAccounts(Array.isArray(accs) ? accs : []);
    } catch { /* ignore */ }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const temps = await api.getEmailTemplates();
      setTemplates(Array.isArray(temps) ? temps : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (configured && (view === 'inbox' || view === 'sent')) {
      loadMessages(view);
    }
    if (configured && view === 'accounts') {
      loadAccounts();
    }
    if (configured && view === 'templates') {
      loadTemplates();
    }
  }, [view, configured, loadMessages, loadAccounts, loadTemplates]);

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

  const handleUploadAttachment = async (file: File) => {
    setUploading(true);
    try {
      const result = await api.uploadEmailAttachment(file);
      setAttachments(prev => [...prev, result.attachment]);
    } catch (err: any) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handleRemoveAttachment = async (id: string) => {
    try {
      await api.deleteEmailAttachment(id);
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
  };

  const handleSend = async () => {
    if (!composeTo || !composeSubject || !composeBody) return;
    setSending(true);
    setSendResult(null);
    try {
      await api.sendEmail(composeTo, composeSubject, composeBody, composeHtml || undefined, undefined, undefined, attachments.map(a => ({ id: a.id, name: a.fileName, mimeType: a.mimeType })));
      setSendResult({ type: 'success', message: 'Email sent!' });
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setComposeHtml('');
      setAttachments([]);
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

  const handleSaveAccount = async () => {
    try {
      await api.createEmailAccount(accountForm);
      setShowAccountForm(false);
      setAccountForm({ email: '', provider: 'gmail', imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587, username: '', password: '', fromName: '' });
      loadAccounts();
    } catch (err: any) {
      console.error('Failed to save account:', err);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await api.deleteEmailAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
  };

  const handleSaveTemplate = async () => {
    try {
      await api.createEmailTemplate(templateForm);
      setShowTemplateForm(false);
      setTemplateForm({ name: '', subject: '', body: '', html: '' });
      loadTemplates();
    } catch (err: any) {
      console.error('Failed to save template:', err);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.deleteEmailTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch { /* ignore */ }
  };

  const handleUseTemplate = (template: any) => {
    setComposeSubject(template.subject);
    setComposeBody(template.body);
    setComposeHtml(template.html || template.body.replace(/\n/g, '<br>'));
    setView('compose');
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
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#00459c] mx-auto mb-4 flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">DigiWise Mail</h1>
            <p className="text-sm text-slate-500 mt-1">Connect your email to send and receive messages</p>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-8">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Connect Your Email</h2>
            <p className="text-xs text-slate-500 mb-6">Enter your email credentials to get started.</p>

            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Email Address *</label>
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
                <li>Select <strong>Mail</strong> and <strong>Other</strong>, name it &quot;DigiWise&quot;</li>
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
          <button
            onClick={() => setView('accounts')}
            className={`p-2 rounded-full transition-colors cursor-pointer ${view === 'accounts' ? 'bg-[#00459c]/10 text-[#00459c]' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Accounts"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={() => setView('templates')}
            className={`p-2 rounded-full transition-colors cursor-pointer ${view === 'templates' ? 'bg-[#00459c]/10 text-[#00459c]' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Templates"
          >
            <FileText className="w-5 h-5" />
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
              onClick={() => { setView('compose'); setSelected(null); setComposeTo(''); setComposeSubject(''); setComposeBody(''); setAttachments([]); }}
              className="w-full flex items-center justify-center gap-2 bg-[#00459c] hover:bg-[#003882] text-white font-bold text-sm py-2.5 px-4 transition-colors cursor-pointer"
            >
              <PenSquare className="w-4 h-4" /> Compose
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
            <button
              onClick={() => { setView('accounts'); setSelected(null); }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                view === 'accounts'
                  ? 'bg-[#00459c]/10 text-[#00459c] font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" /> Accounts
            </button>
            <button
              onClick={() => { setView('templates'); setSelected(null); }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                view === 'templates'
                  ? 'bg-[#00459c]/10 text-[#00459c] font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" /> Templates
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

                {/* Template selector */}
                {templates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Use template:</span>
                    {templates.filter(t => !t.isSystem).slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleUseTemplate(t)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors cursor-pointer"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  className="w-full flex-1 min-h-[250px] text-sm outline-none resize-none leading-relaxed"
                />

                {/* Attachments */}
                {attachments.length > 0 && (
                  <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attachments</div>
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-2 bg-slate-50 px-3 py-2">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700 flex-1 truncate">{att.fileName}</span>
                        <span className="text-xs text-slate-400">{(att.fileSize / 1024).toFixed(1)}KB</span>
                        <button onClick={() => handleRemoveAttachment(att.id)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm px-4 py-2.5 transition-colors cursor-pointer"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  Attach
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.zip"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      Array.from(files).forEach(f => handleUploadAttachment(f));
                    }
                    e.target.value = '';
                  }}
                />
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

              {/* Show attachments if present */}
              {selected.hasAttachments && (
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attachments</div>
                  <div className="text-sm text-slate-500">This message has attachments (view in email client)</div>
                </div>
              )}

              <div className="flex gap-2 mt-8 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setView('compose');
                    setComposeTo(selected.from);
                    setComposeSubject(`Re: ${selected.subject}`);
                    setComposeBody(`\n\n--- On ${formatDate(selected.date || selected.createdAt)}, ${selected.from} wrote:\n\n${selected.body}`);
                    setAttachments([]);
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

          {/* Accounts View */}
          {view === 'accounts' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900">Email Accounts</h2>
                  <button
                    onClick={() => setShowAccountForm(true)}
                    className="flex items-center gap-1.5 bg-[#00459c] hover:bg-[#003882] text-white font-bold text-sm px-4 py-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Account
                  </button>
                </div>

                {/* Account Form Modal */}
                {showAccountForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 w-full max-w-md space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Add Email Account</h3>
                        <button onClick={() => setShowAccountForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <input type="email" placeholder="Email address" value={accountForm.email} onChange={(e) => setAccountForm(p => ({ ...p, email: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm outline-none" />
                      <select value={accountForm.provider} onChange={(e) => setAccountForm(p => ({ ...p, provider: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm outline-none">
                        <option value="gmail">Gmail</option>
                        <option value="outlook">Outlook</option>
                        <option value="custom">Custom</option>
                      </select>
                      <input type="text" placeholder="IMAP Host" value={accountForm.imapHost} onChange={(e) => setAccountForm(p => ({ ...p, imapHost: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm outline-none" />
                      <input type="text" placeholder="SMTP Host" value={accountForm.smtpHost} onChange={(e) => setAccountForm(p => ({ ...p, smtpHost: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm outline-none" />
                      <input type="password" placeholder="Password" value={accountForm.password} onChange={(e) => setAccountForm(p => ({ ...p, password: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm outline-none" />
                      <input type="text" placeholder="Display Name" value={accountForm.fromName} onChange={(e) => setAccountForm(p => ({ ...p, fromName: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm outline-none" />
                      <div className="flex gap-2">
                        <button onClick={handleSaveAccount} className="flex-1 bg-[#00459c] hover:bg-[#003882] text-white font-bold text-sm py-2.5 transition-colors cursor-pointer">Save Account</button>
                        <button onClick={() => setShowAccountForm(false)} className="px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm py-2.5 transition-colors cursor-pointer">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Accounts List */}
                {accounts.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No email accounts configured</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.map((acc) => (
                      <div key={acc.id} className="flex items-center gap-4 border border-slate-200 p-4">
                        <div className={`w-10 h-10 ${getAvatarColor(acc.email)} text-white flex items-center justify-center text-xs font-bold rounded-full`}>
                          {getInitials(acc.email)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900">{acc.email}</div>
                          <div className="text-xs text-slate-500">{acc.provider} &middot; {acc.smtpHost}</div>
                        </div>
                        <button onClick={() => handleDeleteAccount(acc.id)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Templates View */}
          {view === 'templates' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900">Email Templates</h2>
                  <button
                    onClick={() => setShowTemplateForm(true)}
                    className="flex items-center gap-1.5 bg-[#00459c] hover:bg-[#003882] text-white font-bold text-sm px-4 py-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> New Template
                  </button>
                </div>

                {/* Template Form Modal */}
                {showTemplateForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 w-full max-w-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Create Template</h3>
                        <button onClick={() => setShowTemplateForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <input type="text" placeholder="Template name" value={templateForm.name} onChange={(e) => setTemplateForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm outline-none" />
                      <input type="text" placeholder="Subject line (use {{variable}} for variables)" value={templateForm.subject} onChange={(e) => setTemplateForm(p => ({ ...p, subject: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm outline-none" />
                      <textarea placeholder="Body text (use {{variable}} for variables)" value={templateForm.body} onChange={(e) => setTemplateForm(p => ({ ...p, body: e.target.value }))} className="w-full border border-slate-200 px-3 py-2 text-sm outline-none h-32 resize-none" />
                      <div className="flex gap-2">
                        <button onClick={handleSaveTemplate} className="flex-1 bg-[#00459c] hover:bg-[#003882] text-white font-bold text-sm py-2.5 transition-colors cursor-pointer">Save Template</button>
                        <button onClick={() => setShowTemplateForm(false)} className="px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm py-2.5 transition-colors cursor-pointer">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Templates */}
                <div className="mb-8">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">System Templates</h3>
                  <div className="space-y-2">
                    {templates.filter(t => t.isSystem).map((t) => (
                      <div key={t.id} className="flex items-center gap-4 border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900">{t.name}</div>
                          <div className="text-xs text-slate-500 truncate">{t.subject}</div>
                        </div>
                        <button onClick={() => handleUseTemplate(t)} className="text-xs bg-[#00459c] hover:bg-[#003882] text-white px-3 py-1.5 transition-colors cursor-pointer">
                          Use
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* User Templates */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">My Templates</h3>
                  {templates.filter(t => !t.isSystem).length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No custom templates yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {templates.filter(t => !t.isSystem).map((t) => (
                        <div key={t.id} className="flex items-center gap-4 border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                          <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-900">{t.name}</div>
                            <div className="text-xs text-slate-500 truncate">{t.subject}</div>
                          </div>
                          <button onClick={() => handleUseTemplate(t)} className="text-xs bg-[#00459c] hover:bg-[#003882] text-white px-3 py-1.5 transition-colors cursor-pointer">
                            Use
                          </button>
                          <button onClick={() => handleDeleteTemplate(t.id)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                      {msg.hasAttachments && (
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
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
