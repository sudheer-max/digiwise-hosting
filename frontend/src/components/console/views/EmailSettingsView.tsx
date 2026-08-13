import React, { useEffect, useState } from 'react';
import { Mail, Loader2, Check, Trash2, Send, Shield } from 'lucide-react';
import api from '../../../lib/api';

export default function EmailSettingsView() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fromName, setFromName] = useState('');
  const [host, setHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState(587);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.getEmailConfig();
        setConfig(cfg);
        if (cfg.configured) {
          setEmail(cfg.email || '');
          setHost(cfg.host || 'smtp.gmail.com');
          setPort(cfg.port || 587);
          setFromName(cfg.fromName || '');
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!email || !password) return;
    setSaving(true);
    setResult(null);
    try {
      await api.saveEmailConfig({ email, password, host, port, secure: port === 465, fromName: fromName || undefined });
      setResult({ type: 'success', message: 'Gmail credentials saved successfully' });
      setConfig({ configured: true, email });
      setPassword('');
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Failed to save' });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res: any = await api.testEmail();
      setResult({ type: 'success', message: res?.message || 'Test email sent!' });
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Test failed' });
    }
    setTesting(false);
  };

  const handleDelete = async () => {
    if (!confirm('Remove Gmail configuration? You will no longer be able to send emails.')) return;
    try {
      await api.deleteEmailConfig();
      setConfig(null);
      setEmail('');
      setPassword('');
      setFromName('');
      setResult({ type: 'success', message: 'Gmail configuration removed' });
    } catch (err: any) {
      setResult({ type: 'error', message: err.message });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-[#00459c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Email Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure your Gmail SMTP to send emails from the DigiWise console.</p>
      </div>

      {/* Status */}
      {config?.configured && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 flex items-center justify-center">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-900">Gmail Configured</div>
            <div className="text-xs text-emerald-700">Sending from: {config.email}</div>
          </div>
          <button onClick={handleDelete} className="ml-auto text-rose-500 hover:text-rose-700 cursor-pointer" title="Remove configuration">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Gmail Setup Guide */}
      <div className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#00459c]/10 text-[#00459c] flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Gmail SMTP Setup</h3>
            <p className="text-[11px] text-slate-400">Use your Gmail account with an App Password to send emails.</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 text-xs text-blue-800 space-y-2 mb-6">
          <p className="font-bold">How to get a Gmail App Password:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Go to <a href="https://myaccount.google.com/security" target="_blank" className="underline font-bold">Google Account Security</a></li>
            <li>Enable <strong>2-Step Verification</strong> (required)</li>
            <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" className="underline font-bold">App Passwords</a></li>
            <li>Select <strong>Mail</strong> and <strong>Other (Custom name)</strong>, enter "DigiWise"</li>
            <li>Click <strong>Generate</strong> — copy the 16-character password below</li>
          </ol>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Gmail Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#00459c]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">App Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
              />
              <p className="text-[10px] text-slate-400 mt-1">16-character Google App Password, not your regular password</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Display Name</label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="DigiWise"
                className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#00459c]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">SMTP Host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
              />
            </div>
          </div>

          {result && (
            <div className={`px-4 py-3 text-xs font-semibold ${
              result.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}>
              {result.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !email || !password}
              className="bg-[#00459c] hover:bg-[#003577] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 transition-colors cursor-pointer flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {config?.configured ? 'Update Credentials' : 'Save Credentials'}
            </button>
            {config?.configured && (
              <button
                onClick={handleTest}
                disabled={testing}
                className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-5 py-2.5 transition-colors cursor-pointer flex items-center gap-2"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Test Email
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
