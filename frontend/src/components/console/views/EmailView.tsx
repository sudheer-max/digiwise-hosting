import React, { useEffect, useState, useCallback } from 'react';
import { Mail, Inbox, Send, FileText, Loader2, Trash2, ArrowLeft, Plus, Search, MailOpen, Reply } from 'lucide-react';
import api from '../../../lib/api';

type View = 'inbox' | 'sent' | 'compose' | 'read';

export default function EmailView() {
  const [view, setView] = useState<View>('inbox');
  const [messages, setMessages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [search, setSearch] = useState('');

  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await api.getEmailConfig();
      setConfig(cfg);
    } catch { /* ignore */ }
  }, []);

  const loadMessages = useCallback(async (folder: string) => {
    setLoading(true);
    try {
      const msgs = folder === 'inbox' ? await api.listInbox() : await api.listSent();
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { loadMessages(view === 'sent' ? 'sent' : 'inbox'); }, [view, loadMessages]);

  const openMessage = async (msg: any) => {
    setSelected(msg);
    setView('read');
    if (msg.folder === 'inbox' && !msg.read) {
      try { await api.markEmailRead(msg.id, true); } catch { /* ignore */ }
    }
  };

  const handleSend = async () => {
    if (!composeTo || !composeSubject || !composeBody) return;
    setSending(true);
    setSendResult(null);
    try {
      await api.sendEmail(composeTo, composeSubject, composeBody);
      setSendResult({ type: 'success', message: 'Email sent successfully!' });
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setTimeout(() => {
        setSendResult(null);
        setView('sent');
      }, 1500);
    } catch (err: any) {
      setSendResult({ type: 'error', message: err.message || 'Failed to send' });
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api.deleteEmailMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selected?.id === id) { setSelected(null); setView(view === 'inbox' ? 'inbox' : 'sent'); }
    } catch { /* ignore */ }
  };

  const filtered = messages.filter((m) =>
    !search || m.subject?.toLowerCase().includes(search.toLowerCase()) || m.from?.toLowerCase().includes(search.toLowerCase()) || m.to?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!config?.configured) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Email</h1>
          <p className="text-xs text-slate-500 mt-1">Send and receive emails from the console.</p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm p-12 text-center">
          <Mail className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-slate-900 mb-2">Email Not Configured</h3>
          <p className="text-xs text-slate-500 mb-4">Set up your Gmail SMTP credentials to start sending and receiving emails.</p>
          <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate', { detail: { name: 'emailSettings' } })); }} className="inline-flex items-center gap-2 bg-[#00459c] hover:bg-[#003577] text-white font-bold text-xs px-5 py-2.5 transition-colors cursor-pointer">
            <Mail className="w-3.5 h-3.5" /> Configure Email
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-lg font-bold text-slate-900">Email</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setView('compose'); setSelected(null); }}
            className="bg-[#00459c] hover:bg-[#003577] text-white font-bold text-xs px-4 py-2 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Compose
          </button>
        </div>
      </div>

      <div className="flex bg-white border border-slate-200 shadow-sm min-h-[600px]">
        {/* Sidebar */}
        <div className="w-56 border-r border-slate-200 shrink-0">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs outline-none focus:border-[#00459c]"
              />
            </div>
          </div>
          <nav className="p-1">
            <button
              onClick={() => { setView('inbox'); setSelected(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                view === 'inbox' || (view === 'read' && selected?.folder === 'inbox')
                  ? 'bg-[#00459c] text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Inbox className="w-4 h-4" /> Inbox
              <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5">{messages.filter(m => m.folder === 'inbox').length}</span>
            </button>
            <button
              onClick={() => { setView('sent'); setSelected(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                view === 'sent'
                  ? 'bg-[#00459c] text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Send className="w-4 h-4" /> Sent
              <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5">{messages.filter(m => m.folder === 'sent').length}</span>
            </button>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Message list */}
          {(view === 'inbox' || view === 'sent') && (
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-5 h-5 animate-spin text-[#00459c]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Mail className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-500">{search ? 'No messages match your search' : view === 'inbox' ? 'Inbox is empty' : 'No sent messages'}</p>
                </div>
              ) : (
                filtered.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => openMessage(msg)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!msg.read && msg.folder === 'inbox' ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0 ${
                      msg.folder === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#00459c]/10 text-[#00459c]'
                    }`}>
                      {msg.folder === 'sent' ? <Send className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs truncate ${!msg.read && msg.folder === 'inbox' ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {msg.folder === 'sent' ? `To: ${msg.to}` : `From: ${msg.from}`}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">{formatDate(msg.createdAt)}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">{msg.subject}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                      className="p-1 text-slate-300 hover:text-rose-500 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Read message */}
          {view === 'read' && selected && (
            <div className="p-6">
              <button
                onClick={() => { setView(selected.folder === 'sent' ? 'sent' : 'inbox'); setSelected(null); }}
                className="flex items-center gap-1.5 text-xs text-[#00459c] hover:underline cursor-pointer mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to {selected.folder === 'sent' ? 'Sent' : 'Inbox'}
              </button>

              <div className="border-b border-slate-200 pb-4 mb-4">
                <h2 className="text-lg font-bold text-slate-900 mb-2">{selected.subject}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-[#00459c]/10 text-[#00459c] flex items-center justify-center font-bold text-[10px]">
                      {(selected.from || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-700">{selected.from}</div>
                      <div className="text-[10px] text-slate-400">to {selected.to}</div>
                    </div>
                  </div>
                  <span className="ml-auto text-[10px] text-slate-400">{new Date(selected.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selected.body}</div>

              <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setView('compose');
                    setComposeTo(selected.from);
                    setComposeSubject(`Re: ${selected.subject}`);
                    setComposeBody(`\n\n--- Original Message ---\nFrom: ${selected.from}\nDate: ${new Date(selected.createdAt).toLocaleString()}\n\n${selected.body}`);
                  }}
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Reply className="w-3.5 h-3.5" /> Reply
                </button>
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs px-4 py-2 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          )}

          {/* Compose */}
          {view === 'compose' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => { setView('inbox'); setSelected(null); }}
                  className="text-xs text-[#00459c] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <h2 className="text-sm font-bold text-slate-900 ml-2">New Message</h2>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">To</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#00459c]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#00459c]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={14}
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#00459c] resize-none font-mono"
                />
              </div>

              {sendResult && (
                <div className={`px-4 py-3 text-xs font-semibold ${
                  sendResult.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}>
                  {sendResult.message}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSend}
                  disabled={sending || !composeTo || !composeSubject || !composeBody}
                  className="bg-[#00459c] hover:bg-[#003577] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 transition-colors cursor-pointer flex items-center gap-2"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Message
                </button>
                <button
                  onClick={() => { setView('inbox'); setSelected(null); }}
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-5 py-2.5 transition-colors cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
