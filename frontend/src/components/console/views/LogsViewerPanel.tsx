import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Terminal, RefreshCw, Download, Search, Pause, Play, Loader2 } from 'lucide-react';
import api from '../../../lib/api';
import { GhostButton } from '../ui';

export default function LogsViewerPanel({ projectId, appName }: { projectId: string; appName: string }) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const [liveTail, setLiveTail] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  const intervalRef = useRef<any>(null);

  const loadLogs = useCallback(async () => {
    try {
      const res: any = await api.getAppLogs(projectId, appName, 1000);
      const logData = res?.logs || (Array.isArray(res) ? res : []);
      const text = Array.isArray(logData)
        ? logData.map((l: any) => l.log || l.message || JSON.stringify(l)).join('\n')
        : String(logData || 'No logs available');
      setLogs(text);
    } catch {
      setLogs('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [projectId, appName]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Live tail polling
  useEffect(() => {
    if (liveTail) {
      intervalRef.current = setInterval(loadLogs, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [liveTail, loadLogs]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!logRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  const downloadLogs = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appName}-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = search
    ? logs.split('\n').filter(line => line.toLowerCase().includes(search.toLowerCase())).join('\n')
    : logs;

  const lineCount = filteredLogs.split('\n').filter(l => l.trim()).length;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#00459c]" />
            <h3 className="text-sm font-bold text-slate-900">Logs</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5">{lineCount} lines</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 text-xs w-48 focus:outline-none focus:border-[#00459c]"
                placeholder="Search logs..."
              />
            </div>
            <button
              onClick={() => setLiveTail(!liveTail)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                liveTail ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {liveTail ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {liveTail ? 'Live' : 'Tail'}
            </button>
            <GhostButton onClick={loadLogs}>
              <RefreshCw className="w-3.5 h-3.5" />
            </GhostButton>
            <GhostButton onClick={downloadLogs}>
              <Download className="w-3.5 h-3.5" />
            </GhostButton>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-[#00459c] animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading logs...</p>
          </div>
        ) : (
          <pre
            ref={logRef}
            onScroll={handleScroll}
            className="bg-slate-950 text-emerald-300 p-4 text-[11px] font-mono leading-relaxed overflow-auto h-[50vh] whitespace-pre-wrap break-words"
          >
            {filteredLogs || 'No logs available'}
          </pre>
        )}
      </div>
    </div>
  );
}
