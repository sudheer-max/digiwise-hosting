import React, { useState } from 'react';
import { Check, Copy, Loader2, X, AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';

export function StatusPill({ status }: { status?: string | null | object }) {
  const s = (typeof status === 'string' ? status : 'idle').toUpperCase();
  const running = ['RUNNING', 'DONE', 'ACTIVE', 'STARTING', 'HEALTHY', 'UP', 'SUCCESS'].includes(s);
  const stopped = ['IDLE', 'STOPPED', 'EXITED', 'ERROR', 'FAILED', 'OFFLINE', 'DEAD'].includes(s);
  const building = ['BUILDING', 'DEPLOYING', 'QUEUED', 'PENDING', 'PROGRESS'].includes(s);
  const color = running ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : stopped ? 'bg-rose-50 text-rose-700 border-rose-200'
    : building ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-slate-100 text-slate-600 border-slate-200';
  const dot = running ? 'bg-emerald-500'
    : stopped ? 'bg-rose-500'
    : building ? 'bg-amber-500'
    : 'bg-slate-400';
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${running || building ? 'animate-pulse' : ''}`} />
      {s}
    </span>
  );
}

export function CopyField({ text, mono = true }: { text: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-1 text-[11px] ${mono ? 'font-mono' : ''} text-slate-700 transition-colors cursor-pointer group max-w-full`}
      title="Click to copy"
    >
      <span className="truncate">{text}</span>
      {copied ? <Check className="w-3 h-3 text-emerald-500 shrink-0" /> : <Copy className="w-3 h-3 text-slate-400 group-hover:text-[#00459c] shrink-0" />}
    </button>
  );
}

export function Card({ title, icon, action, children, className = '' }: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-slate-200 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            {icon}
            {title}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action, back }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  back?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={back}
            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
            title="Go back"
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

export function PrimaryButton({ children, onClick, type = 'button', disabled, className = '' }: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 bg-[#00459c] hover:bg-[#003882] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 transition-colors cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, type = 'button', className = '', danger = false, disabled }: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold px-3 py-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        danger ? 'hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function Loader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> {label}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="text-center py-14 bg-white border border-slate-200 shadow-sm">
      <div className="w-12 h-12 bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 mx-auto mb-3">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{hint}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide = false }: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white shadow-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} max-h-[85vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
          <span className="text-sm font-bold text-slate-900 flex items-center gap-2">{title}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function LogViewer({ title, onClose, text }: { title: string; onClose: () => void; text: string }) {
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live container output</span>
        <button
          onClick={() => { onClose(); }}
          className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          Close
        </button>
      </div>
      <pre className="bg-slate-950 text-emerald-300 p-4 text-[11px] font-mono leading-relaxed overflow-auto max-h-[55vh] whitespace-pre-wrap break-words">
        {text || 'No logs available'}
      </pre>
    </Modal>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-3">
      <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {message}</span>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-900 cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  );
}

export function Field({ label, value, copyable }: { label: string; value?: React.ReactNode; copyable?: string }) {
  const text = (() => {
    if (value == null) return '—';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    if (value === '') return '—';
    return String(value);
  })();
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      {copyable !== undefined ? <CopyField text={copyable} /> : <div className="text-sm text-slate-800 whitespace-pre-wrap break-words">{text}</div>}
    </div>
  );
}

export function FieldGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const map = { 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4' };
  return <div className={`grid ${map[cols]} gap-5`}>{children}</div>;
}
