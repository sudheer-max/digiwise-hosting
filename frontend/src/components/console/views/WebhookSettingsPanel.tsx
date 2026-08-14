import React, { useEffect, useState } from 'react';
import { Webhook, Check, Copy, ExternalLink, Loader2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import api from '../../../lib/api';
import { GhostButton, PrimaryButton, Loader, ErrorBanner } from '../ui';

interface WebhookStatus {
  autoDeploy: boolean;
  webhookUrl: string | null;
  webhookSecret: string | null;
  lastDeployedAt: string | null;
  lastCommitSha: string | null;
  lastCommitMsg: string | null;
  repoURL: string | null;
  branch: string | null;
}

export default function WebhookSettingsPanel({ projectId, appName }: { projectId: string; appName: string }) {
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<'url' | 'secret' | null>(null);

  const loadStatus = async () => {
    try {
      const s = await api.getWebhookStatus(projectId, appName);
      setStatus(s);
    } catch (err: any) {
      setError(err.message || 'Failed to load webhook status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, [projectId, appName]);

  const toggleAutoDeploy = async () => {
    if (!status) return;
    setBusy(true);
    setError('');
    try {
      const result: any = await api.setupWebhook(projectId, appName, !status.autoDeploy);
      setStatus({
        ...status,
        autoDeploy: !status.autoDeploy,
        webhookUrl: result.webhookUrl || status.webhookUrl,
        webhookSecret: result.webhookSecret || status.webhookSecret,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update webhook');
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = (text: string, type: 'url' | 'secret') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <Loader label="Loading webhook settings..." />;
  if (error && !status) return <ErrorBanner message={error} onRetry={loadStatus} />;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4 text-[#00459c]" />
            <h3 className="text-sm font-bold text-slate-900">Auto-Deploy from GitHub</h3>
          </div>
          <button
            onClick={toggleAutoDeploy}
            disabled={busy}
            className="flex items-center gap-2 text-sm font-bold transition-colors"
          >
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : status?.autoDeploy ? (
              <ToggleRight className="w-8 h-8 text-green-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
            <span className={status?.autoDeploy ? 'text-green-600' : 'text-slate-400'}>
              {status?.autoDeploy ? 'Enabled' : 'Disabled'}
            </span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 mb-4 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <p className="text-xs text-slate-500 mb-4">
          When enabled, pushes to your GitHub repository will automatically trigger a new build and deployment.
        </p>

        {status?.autoDeploy && status?.webhookUrl && (
          <div className="space-y-3 bg-slate-50 border border-slate-200 p-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Webhook URL</label>
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono text-slate-700 bg-white border border-slate-200 px-2 py-1.5 flex-1 truncate">
                  {status.webhookUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(status.webhookUrl!, 'url')}
                  className="p-1.5 hover:bg-slate-100 transition-colors"
                >
                  {copied === 'url' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
            </div>

            {status?.webhookSecret && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Webhook Secret</label>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] font-mono text-slate-700 bg-white border border-slate-200 px-2 py-1.5 flex-1 truncate">
                    {status.webhookSecret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(status.webhookSecret!, 'secret')}
                    className="p-1.5 hover:bg-slate-100 transition-colors"
                  >
                    {copied === 'secret' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 p-3 mt-3">
              <h4 className="text-xs font-bold text-blue-800 mb-2">Setup Instructions</h4>
              <ol className="text-[11px] text-blue-700 space-y-1.5 list-decimal list-inside">
                <li>Go to your GitHub repo → Settings → Webhooks → Add webhook</li>
                <li>Paste the <strong>Payload URL</strong> above</li>
                <li>Set <strong>Content type</strong> to <code>application/json</code></li>
                <li>Paste the <strong>Secret</strong> above</li>
                <li>Select <strong>Just the push event</strong></li>
                <li>Click <strong>Add webhook</strong></li>
              </ol>
            </div>
          </div>
        )}

        {status?.repoURL && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Repository</span>
                <div className="mt-1 flex items-center gap-1 text-slate-700">
                  <ExternalLink className="w-3 h-3" />
                  <a href={status.repoURL} target="_blank" rel="noopener" className="hover:underline truncate">
                    {status.repoURL}
                  </a>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Branch</span>
                <div className="mt-1 text-slate-700 font-mono">{status.branch || 'main'}</div>
              </div>
            </div>
          </div>
        )}

        {status?.lastDeployedAt && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Deploy</span>
            <div className="mt-1 text-xs text-slate-700">
              {new Date(status.lastDeployedAt).toLocaleString()}
              {status.lastCommitSha && (
                <span className="ml-2 font-mono text-slate-500">
                  ({status.lastCommitSha.slice(0, 7)})
                </span>
              )}
            </div>
            {status.lastCommitMsg && (
              <div className="mt-1 text-[11px] text-slate-500 truncate">{status.lastCommitMsg}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
