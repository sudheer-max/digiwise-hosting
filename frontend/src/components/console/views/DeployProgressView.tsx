'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import {
  Loader2, CheckCircle2, XCircle, Terminal, ArrowLeft,
  Rocket, Clock, GitBranch, Package, Server, Globe
} from 'lucide-react';

type DeployStatus = 'building' | 'deploying' | 'succeeded' | 'failed';

interface DeployProgressProps {
  projectId: string;
  appName: string;
  buildName: string;
  namespace: string;
  repoURL: string;
  branch: string;
  port: number;
}

export default function DeployProgressView({
  projectId, appName, buildName, namespace, repoURL, branch, port
}: DeployProgressProps) {
  const { navigate } = useConsole()!;
  const [status, setStatus] = useState<DeployStatus>('building');
  const [logs, setLogs] = useState('Starting build...\n');
  const [buildMessage, setBuildMessage] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [error, setError] = useState('');
  const logsRef = useRef<HTMLPreElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchLogs = useCallback(async () => {
    try {
      const res: any = await api.getBuildLogs(projectId, appName, buildName);
      if (res?.logs) {
        setLogs(res.logs);
        if (logsRef.current) {
          logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
      }
    } catch { /* ignore log fetch errors during polling */ }
  }, [projectId, appName, buildName]);

  const checkStatus = useCallback(async () => {
    try {
      const res: any = await api.getBuildStatus(projectId, appName, buildName);
      const s = res?.status || 'running';
      setBuildMessage(res?.message || '');

      if (s === 'succeeded') {
        setStatus('deploying');
        if (pollRef.current) clearInterval(pollRef.current);

        // Fetch final logs
        await fetchLogs();

        // Finalize deployment
        try {
          const deployRes: any = await api.finalizeDeploy(projectId, appName, buildName);
          setExternalUrl(deployRes?.externalUrl || '');
          setStatus('succeeded');
        } catch (err: any) {
          setError(err.message || 'Deployment failed');
          setStatus('failed');
        }
      } else if (s === 'failed') {
        setStatus('failed');
        setBuildMessage(res?.message || 'Build failed');
        if (pollRef.current) clearInterval(pollRef.current);
        await fetchLogs();
      } else {
        // Still running — fetch logs
        await fetchLogs();
      }
    } catch {
      // Ignore poll errors, keep trying
    }
  }, [projectId, appName, buildName, fetchLogs]);

  useEffect(() => {
    // Initial status check
    checkStatus();

    // Poll every 3 seconds
    pollRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkStatus]);

  const statusSteps = [
    { key: 'building', label: 'Cloning & Building', icon: Package, done: status === 'deploying' || status === 'succeeded' },
    { key: 'deploying', label: 'Deploying', icon: Server, done: status === 'succeeded' },
    { key: 'succeeded', label: 'Live', icon: Globe, done: status === 'succeeded' },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ name: 'applications' })}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-[#00459c]" />
              Deploying {appName}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> {branch}
              </span>
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" /> {repoURL}
              </span>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mt-4">
          {statusSteps.map((step, i) => {
            const Icon = step.icon;
            const isActive = step.key === status;
            return (
              <React.Fragment key={step.key}>
                {i > 0 && <div className={`flex-1 h-0.5 ${step.done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold
                  ${step.done ? 'bg-emerald-50 text-emerald-700' :
                    isActive ? 'bg-[#00459c]/10 text-[#00459c]' : 'bg-slate-50 text-slate-400'}`}>
                  {step.done ? <CheckCircle2 className="w-3 h-3" /> :
                   isActive ? <Loader2 className="w-3 h-3 animate-spin" /> :
                   <Icon className="w-3 h-3" />}
                  {step.label}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Build logs */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Build Logs</span>
            {status === 'building' && (
              <span className="flex items-center gap-1 text-[10px] text-[#00459c]">
                <Loader2 className="w-3 h-3 animate-spin" /> Building...
              </span>
            )}
            {status === 'deploying' && (
              <span className="flex items-center gap-1 text-[10px] text-amber-600">
                <Loader2 className="w-3 h-3 animate-spin" /> Deploying...
              </span>
            )}
          </div>
          <pre
            ref={logsRef}
            className="flex-1 bg-slate-950 text-emerald-300 p-4 text-[11px] font-mono leading-relaxed overflow-auto whitespace-pre-wrap break-words"
          >
            {logs || 'Waiting for logs...'}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-200 shrink-0 flex items-center justify-between bg-slate-50">
        <div className="text-[10px] text-slate-400">
          {buildMessage && <span>{buildMessage}</span>}
        </div>
        <div className="flex items-center gap-2">
          {status === 'succeeded' && externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener"
              className="px-4 py-2 bg-[#00459c] text-white text-xs font-semibold rounded hover:bg-[#003578] cursor-pointer"
            >
              Open App
            </a>
          )}
          {status === 'failed' && (
            <button
              onClick={() => navigate({ name: 'applications' })}
              className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-300 cursor-pointer"
            >
              Back to Applications
            </button>
          )}
          {(status === 'building' || status === 'deploying') && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> This may take a few minutes
            </span>
          )}
        </div>
      </div>

      {/* Error overlay */}
      {error && (
        <div className="px-6 py-3 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DeployStatus }) {
  const config = {
    building: { color: 'bg-blue-100 text-blue-700', label: 'Building' },
    deploying: { color: 'bg-amber-100 text-amber-700', label: 'Deploying' },
    succeeded: { color: 'bg-emerald-100 text-emerald-700', label: 'Live' },
    failed: { color: 'bg-rose-100 text-rose-700', label: 'Failed' },
  };
  const c = config[status];
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.color}`}>
      {c.label}
    </span>
  );
}
