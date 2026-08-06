import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Plus, Trash2, Loader2, CheckCircle2, XCircle, Clock, Shield, ExternalLink, Copy, AlertCircle } from 'lucide-react';
import api from '../../../lib/api';
import { GhostButton, PrimaryButton, ErrorBanner, Modal } from '../ui';

interface Domain {
  domain: string;
  status: string;
  sslStatus: string;
  createdAt?: string;
}

export default function CustomDomainsPanel({ projectId, appName }: { projectId: string; appName: string }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [copied, setCopied] = useState('');

  const loadDomains = useCallback(async () => {
    try {
      const res: any = await api.listDomains(projectId, appName);
      setDomains(res?.domains || []);
    } catch {
      setDomains([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, appName]);

  useEffect(() => { loadDomains(); }, [loadDomains]);

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    setAdding(true);
    setError('');
    setVerifyResult(null);
    try {
      const res = await api.addDomain(projectId, appName, newDomain);
      setVerifyResult(res);
      setNewDomain('');
      await loadDomains();
    } catch (err: any) {
      setError(err.message || 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  };

  const verifyDomain = async (domain: string) => {
    setError('');
    try {
      const res = await api.verifyDomain(projectId, appName, domain);
      setVerifyResult(res);
      await loadDomains();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteDomain = async (domain: string) => {
    if (!confirm(`Delete domain ${domain}?`)) return;
    try {
      await api.deleteDomain(projectId, appName, domain);
      await loadDomains();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
  };

  const statusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'verified': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-rose-500" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  const sslIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return <Shield className="w-4 h-4 text-emerald-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-rose-500" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onRetry={() => setError('')} />}

      <div className="bg-white border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#00459c]" />
            <h3 className="text-sm font-bold text-slate-900">Custom Domains</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5">{domains.length}</span>
          </div>
          <PrimaryButton onClick={() => { setShowAdd(true); setVerifyResult(null); }}>
            <Plus className="w-3.5 h-3.5" /> Add Domain
          </PrimaryButton>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-[#00459c] animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading domains...</p>
          </div>
        ) : domains.length === 0 ? (
          <div className="p-8 text-center">
            <Globe className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400 mb-3">No custom domains configured</p>
            <PrimaryButton onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Custom Domain
            </PrimaryButton>
          </div>
        ) : (
          <div>
            {domains.map((d, idx) => (
              <div key={d.domain} className={`px-5 py-4 flex items-center gap-4 ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
                {statusIcon(d.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{d.domain}</span>
                    <a href={`https://${d.domain}`} target="_blank" rel="noopener" className="text-[#00459c] hover:text-[#003882]">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      DNS: {d.status || 'pending'}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      SSL: {sslIcon(d.sslStatus)} {d.sslStatus || 'provisioning'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d.status !== 'verified' && (
                    <GhostButton onClick={() => verifyDomain(d.domain)}>
                      Verify
                    </GhostButton>
                  )}
                  <GhostButton danger onClick={() => deleteDomain(d.domain)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </GhostButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {showAdd && (
        <Modal title="Add Custom Domain" onClose={() => { setShowAdd(false); setVerifyResult(null); }}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Domain Name</label>
              <input
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDomain()}
                className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#00459c]"
                placeholder="app.example.com"
              />
            </div>

            {verifyResult?.instructions && (
              <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> DNS Configuration Required
                </h4>

                <div className="bg-white border border-slate-200 p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">1. Add TXT Record (Ownership Verification)</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-400">Name:</div>
                      <div className="text-xs font-mono text-slate-700">{verifyResult.instructions.txtRecord.name}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-400">Value:</div>
                      <div className="text-xs font-mono text-slate-700 flex items-center gap-1">
                        {verifyResult.instructions.txtRecord.value}
                        <button onClick={() => copyToClipboard(verifyResult.instructions.txtRecord.value)} className="text-[#00459c] cursor-pointer">
                          {copied === verifyResult.instructions.txtRecord.value ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">2. Add CNAME Record</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-400">Host:</div>
                      <div className="text-xs font-mono text-slate-700">{verifyResult.domain}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-400">Points to:</div>
                      <div className="text-xs font-mono text-slate-700 flex items-center gap-1">
                        {verifyResult.instructions.cnameRecord.value}
                        <button onClick={() => copyToClipboard(verifyResult.instructions.cnameRecord.value)} className="text-[#00459c] cursor-pointer">
                          {copied === verifyResult.instructions.cnameRecord.value ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <GhostButton onClick={() => { setShowAdd(false); setVerifyResult(null); }}>Close</GhostButton>
              {!verifyResult && (
                <PrimaryButton onClick={addDomain} disabled={adding || !newDomain.trim()}>
                  {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add Domain
                </PrimaryButton>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
