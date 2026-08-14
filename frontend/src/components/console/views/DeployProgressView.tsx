'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import {
  Loader2, CheckCircle2, XCircle, Terminal, ArrowLeft,
  Rocket, Clock, GitBranch, Package, Server, Globe, AlertTriangle
} from 'lucide-react';

type DeployPhase = 'starting' | 'building' | 'deploying' | 'succeeded' | 'failed';

interface DeployProgressProps {
  projectId: string;
  appName: string;
  repoURL: string;
  branch: string;
  port: number;
  env?: Record<string, string>;
  buildCommand?: string;
  startCommand?: string;
  githubToken?: string;
}

export default function DeployProgressView({
  projectId, appName, repoURL, branch, port, env, buildCommand, startCommand, githubToken
}: DeployProgressProps) {
  const { navigate } = useConsole();
  const [phase, setPhase] = useState<DeployPhase>('starting');
  const [logs, setLogs] = useState('Initializing deploy...\n');
  const [errorMessage, setErrorMessage] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [buildName, setBuildName] = useState('');
  const [namespace, setNamespace] = useState('');
  const logsRef = useRef<HTMLPreElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  const fetchLogs = useCallback(async () => {
    if (!buildName || !namespace) return;
    try {
      const res: any = await api.getBuildLogs(projectId, appName, buildName);
      if (res?.logs) {
        setLogs(res.logs);
        if (logsRef.current) {
          logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
      }
    } catch { /* ignore log fetch errors during polling */ }
  }, [projectId, appName, buildName, namespace]);

  const checkStatus = useCallback(async () => {
    if (!buildName || !namespace) return;
    try {
      const res: any = await api.getBuildStatus(projectId, appName, buildName);
      const s = res?.status || 'running';

      if (s === 'succeeded') {
        setPhase('deploying');
        if (pollRef.current) clearInterval(pollRef.current);
        await fetchLogs();

        try {
          const deployRes: any = await api.finalizeDeploy(projectId, appName, buildName);
          setExternalUrl(deployRes?.externalUrl || '');
          setPhase('succeeded');
        } catch (err: any) {
          setErrorMessage(err.message || 'Deployment finalization failed');
          setPhase('failed');
        }
      } else if (s === 'failed') {
        setPhase('failed');
        setErrorMessage(res?.message || 'Build failed');
        if (pollRef.current) clearInterval(pollRef.current);
        await fetchLogs();
      } else {
        setPhase('building');
        await fetchLogs();
      }
    } catch {
      // Ignore poll errors, keep trying
    }
  }, [projectId, appName, buildName, namespace, fetchLogs]);

  const startDeploy = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      setPhase('starting');
      setLogs('Starting build...\n');

      const res: any = await api.deployFromGitHub(projectId, {
        name: appName,
        repoURL,
        branch: branch || 'main',
        buildCommand: buildCommand || undefined,
        startCommand: startCommand || undefined,
        port,
        ...(env && Object.keys(env).length > 0 ? { env } : {}),
        ...(githubToken ? { githubToken } : {}),
      });

      const bn = res?.buildName || '';
      const ns = res?.namespace || '';
      setBuildName(bn);
      setNamespace(ns);
      setPhase('building');
      setLogs('Build started. Waiting for logs...\n');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('abort') || msg.includes('signal')) {
        setErrorMessage('Connection timed out. The server took too long to respond. Please try again.');
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setErrorMessage('Network error. Please check your connection and try again.');
      } else {
        setErrorMessage(msg || 'Failed to start deploy');
      }
      setPhase('failed');
    }
  }, [projectId, appName, repoURL, branch, port, env, buildCommand, startCommand, githubToken]);

  useEffect(() => {
    startDeploy();
  }, [startDeploy]);

  useEffect(() => {
    if (!buildName) return;

    checkStatus();
    pollRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [buildName, checkStatus]);

  const phaseSteps = [
    { key: 'starting', label: 'Initializing', icon: Package, done: phase === 'building' || phase === 'deploying' || phase === 'succeeded' },
    { key: 'building', label: 'Cloning & Building', icon: Package, done: phase === 'deploying' || phase === 'succeeded' },
    { key: 'deploying', label: 'Deploying', icon: Server, done: phase === 'succeeded' },
    { key: 'succeeded', label: 'Live', icon: Globe, done: phase === 'succeeded' },
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
              <span className="flex items-center gap-1 truncate max-w-[50%]">
                <Package className="w-3 h-3" /> {repoURL}
              </span>
            </div>
          </div>
          <PhaseBadge phase={phase} />
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mt-4">
          {phaseSteps.map((step, i) => {
            const Icon = step.icon;
            const isActive = step.key === phase;
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
            {(phase === 'starting' || phase === 'building') && (
              <span className="flex items-center gap-1 text-[10px] text-[#00459c]">
                <Loader2 className="w-3 h-3 animate-spin" /> Building...
              </span>
            )}
            {phase === 'deploying' && (
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
          {(phase === 'building' || phase === 'deploying') && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> This may take a few minutes
            </span>
          )}
          {phase === 'succeeded' && externalUrl && (
            <span className="text-emerald-600 font-semibold">Deployed successfully</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {phase === 'succeeded' && externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener"
              className="px-4 py-2 bg-[#00459c] text-white text-xs font-semibold rounded hover:bg-[#003578] cursor-pointer"
            >
              Open App
            </a>
          )}
          {phase === 'failed' && (
            <>
              <button
                onClick={() => navigate({ name: 'applications' })}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-300 cursor-pointer"
              >
                Back to Applications
              </button>
              <button
                onClick={() => { startedRef.current = false; setBuildName(''); setNamespace(''); setPhase('starting'); setErrorMessage(''); setLogs('Retrying...\n'); startDeploy(); }}
                className="px-4 py-2 bg-[#00459c] text-white text-xs font-semibold rounded hover:bg-[#003578] cursor-pointer"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error overlay */}
      {errorMessage && (
        <div className="px-6 py-3 bg-rose-50 border-t border-rose-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-rose-700 text-xs font-semibold">{errorMessage}</div>
        </div>
      )}
    </div>
  );
}

function PhaseBadge({ phase }: { phase: DeployPhase }) {
  const config = {
    starting: { color: 'bg-slate-100 text-slate-600', label: 'Starting' },
    building: { color: 'bg-blue-100 text-blue-700', label: 'Building' },
    deploying: { color: 'bg-amber-100 text-amber-700', label: 'Deploying' },
    succeeded: { color: 'bg-emerald-100 text-emerald-700', label: 'Live' },
    failed: { color: 'bg-rose-100 text-rose-700', label: 'Failed' },
  };
  const c = config[phase];
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.color}`}>
      {c.label}
    </span>
  );
}
