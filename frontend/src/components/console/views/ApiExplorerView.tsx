import React, { useState, useCallback } from 'react';
import {
  Braces,
  Search,
  Play,
  Loader2,
  Check,
  Copy,
  Terminal,
  RefreshCw,
  FolderOpen,
  Server,
  Database,
  Shield,
  Box,
} from 'lucide-react';
import api from '../../../lib/api';
import { SectionHeader, GhostButton, Loader, ErrorBanner } from '../ui';

interface Endpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  label: string;
  description: string;
  category: string;
  bodyPlaceholder?: string;
}

const endpoints: Endpoint[] = [
  // Projects
  {
    id: 'listProjects',
    method: 'GET',
    path: '/api/projects',
    label: 'List Projects',
    description: 'List all Kubernetes namespaces (projects) for the authenticated user.',
    category: 'Projects',
  },
  {
    id: 'getProject',
    method: 'GET',
    path: '/api/projects/:id',
    label: 'Get Project',
    description: 'Get details for a specific project by ID.',
    category: 'Projects',
    bodyPlaceholder: '{"id": "your-project-id"}',
  },
  {
    id: 'createProject',
    method: 'POST',
    path: '/api/projects',
    label: 'Create Project',
    description: 'Create a new Kubernetes namespace (project).',
    category: 'Projects',
    bodyPlaceholder: '{"name": "my-project", "description": "A test project"}',
  },
  {
    id: 'deleteProject',
    method: 'DELETE',
    path: '/api/projects/:id',
    label: 'Delete Project',
    description: 'Delete a project (Kubernetes namespace).',
    category: 'Projects',
    bodyPlaceholder: '{"id": "your-project-id"}',
  },
  // Apps
  {
    id: 'listApps',
    method: 'GET',
    path: '/api/projects/:id/apps',
    label: 'List Apps',
    description: 'List all applications (Deployments) in a project.',
    category: 'Applications',
    bodyPlaceholder: '{"projectId": "your-project-id"}',
  },
  {
    id: 'createApp',
    method: 'POST',
    path: '/api/projects/:id/apps',
    label: 'Create App',
    description: 'Create a new application (Deployment + Service) in a project.',
    category: 'Applications',
    bodyPlaceholder:
      '{"projectId": "your-project-id", "name": "my-app", "image": "nginx:latest", "port": 80, "replicas": 1, "env": {"NODE_ENV": "production"}}',
  },
  // Pods & Logs
  {
    id: 'listProjectPods',
    method: 'GET',
    path: '/api/projects/:id/pods',
    label: 'List Project Pods',
    description: 'List all pods running in a project namespace.',
    category: 'Observability',
    bodyPlaceholder: '{"projectId": "your-project-id"}',
  },
  {
    id: 'getProjectLogs',
    method: 'GET',
    path: '/api/projects/:id/logs',
    label: 'Project Logs',
    description: 'Get logs from a project namespace.',
    category: 'Observability',
    bodyPlaceholder: '{"projectId": "your-project-id", "pod": "optional-pod-name", "lines": 100}',
  },
  // Databases
  {
    id: 'listDatabaseOperators',
    method: 'GET',
    path: '/api/databases',
    label: 'List Database Operators',
    description: 'List available database operators (PostgreSQL, MongoDB, Redis).',
    category: 'Databases',
  },
  // Admin
  {
    id: 'getAdminStats',
    method: 'GET',
    path: '/admin/stats',
    label: 'Admin Stats',
    description: 'Get platform-wide statistics.',
    category: 'Admin',
  },
  {
    id: 'getAdminCluster',
    method: 'GET',
    path: '/admin/cluster',
    label: 'Admin Cluster Info',
    description: 'Get Kubernetes cluster information.',
    category: 'Admin',
  },
  {
    id: 'getAdminHealth',
    method: 'GET',
    path: '/admin/health',
    label: 'Admin Health',
    description: 'Get infrastructure health status.',
    category: 'Admin',
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  Projects: <FolderOpen className="w-3.5 h-3.5" />,
  Applications: <Box className="w-3.5 h-3.5" />,
  Observability: <Server className="w-3.5 h-3.5" />,
  Databases: <Database className="w-3.5 h-3.5" />,
  Admin: <Shield className="w-3.5 h-3.5" />,
};

function resolvePath(endpoint: Endpoint, body: any): string {
  let path = endpoint.path;
  if (path.includes(':id')) {
    const id = body?.projectId || body?.id || '';
    path = path.replace(':id', id);
  }
  return path;
}

export default function ApiExplorerView() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selected, setSelected] = useState<Endpoint | null>(null);
  const [bodyText, setBodyText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [resultText, setResultText] = useState('');
  const [runBusy, setRunBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const categories = ['All', ...new Set(endpoints.map((e) => e.category))];

  const filtered = endpoints.filter((e) => {
    const matchCategory = activeCategory === 'All' || e.category === activeCategory;
    if (!matchCategory) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      e.label.toLowerCase().includes(q) ||
      e.path.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
    );
  });

  const select = (ep: Endpoint) => {
    setSelected(ep);
    setResult(null);
    setResultText('');
    setBodyText(ep.bodyPlaceholder || '');
  };

  const run = async () => {
    if (!selected) return;
    setRunBusy(true);
    setError('');
    setResult(null);

    let parsed: any = {};
    try {
      const trimmed = bodyText.trim();
      if (trimmed) {
        parsed = JSON.parse(trimmed);
      }
    } catch (e: any) {
      setError(`Invalid JSON: ${e.message}`);
      setRunBusy(false);
      return;
    }

    const started = Date.now();
    try {
      let res: any;
      const ep = selected;
      switch (ep.id) {
        case 'listProjects':
          res = await api.listProjects();
          break;
        case 'getProject':
          res = await api.getProject(parsed.id || parsed.projectId);
          break;
        case 'createProject':
          res = await api.createProject({ name: parsed.name, description: parsed.description });
          break;
        case 'deleteProject':
          res = await api.deleteProject(parsed.id || parsed.projectId);
          break;
        case 'listApps':
          res = await api.listApps(parsed.projectId || parsed.id);
          break;
        case 'createApp':
          res = await api.createApp(parsed.projectId || parsed.id, {
            name: parsed.name,
            image: parsed.image,
            port: parsed.port,
            env: parsed.env,
            replicas: parsed.replicas,
          });
          break;
        case 'listProjectPods':
          res = await api.listProjectPods(parsed.projectId || parsed.id);
          break;
        case 'getProjectLogs':
          res = await api.getProjectLogs(parsed.projectId || parsed.id, parsed.pod, parsed.lines);
          break;
        case 'listDatabaseOperators':
          res = await api.listDatabaseOperators();
          break;
        case 'getAdminStats':
          res = await api.getAdminStats();
          break;
        case 'getAdminCluster':
          res = await api.getAdminCluster();
          break;
        case 'getAdminHealth':
          res = await api.getAdminHealth();
          break;
        default:
          throw new Error('Unknown endpoint');
      }
      setResult({ ok: true, data: res, ms: Date.now() - started });
      setResultText(JSON.stringify(res, null, 2));
    } catch (err: any) {
      setResult({ ok: false, data: err, ms: Date.now() - started });
      setResultText(String(err?.message || err));
    } finally {
      setRunBusy(false);
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={
          <span className="flex items-center gap-2">
            <Braces className="w-6 h-6 text-[#00459c]" /> API Explorer
          </span>
        }
        subtitle={`${endpoints.length} K8s API endpoints available through your account`}
      />

      {error && <ErrorBanner message={error} />}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: endpoint list */}
        <div className="lg:w-1/3 shrink-0">
          <div className="bg-white border border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search endpoints..."
                  className="w-full border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs outline-none focus:border-[#00459c]"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-[#00459c] text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              {filtered.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => select(ep)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors cursor-pointer border-b border-slate-50 ${
                    selected?.id === ep.id
                      ? 'bg-[#00459c] text-white'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 shrink-0 ${
                      selected?.id === ep.id
                        ? 'bg-white/20 text-white'
                        : ep.method === 'GET'
                        ? 'bg-emerald-100 text-emerald-700'
                        : ep.method === 'POST'
                        ? 'bg-blue-100 text-blue-700'
                        : ep.method === 'PUT'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold truncate">{ep.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        selected?.id === ep.id ? 'text-white/60' : 'text-slate-400'
                      }`}
                    >
                      {ep.path}
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">No endpoints match</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: request builder + response */}
        <div className="flex-1 min-w-0 space-y-4">
          {!selected ? (
            <div className="bg-white border border-slate-200 shadow-sm p-8 text-center">
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 mx-auto mb-3">
                <Braces className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-700">Select an endpoint</p>
              <p className="text-xs text-slate-400 mt-1">
                Choose an API endpoint on the left to configure and fire a request.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 ${
                        selected.method === 'GET'
                          ? 'bg-emerald-100 text-emerald-700'
                          : selected.method === 'POST'
                          ? 'bg-blue-100 text-blue-700'
                          : selected.method === 'PUT'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {selected.method}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {selected.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{selected.path}</span>
                </div>

                <div className="p-4">
                  <p className="text-xs text-slate-600 mb-4">{selected.description}</p>

                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Request Body (JSON)
                    </div>
                    <GhostButton onClick={() => setBodyText('')}>Clear</GhostButton>
                  </div>
                  <textarea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="{}"
                    className="w-full h-48 border border-slate-200 bg-slate-950 text-emerald-300 px-3 py-2.5 text-[11px] font-mono outline-none focus:border-[#00459c] resize-y"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={run}
                      disabled={runBusy}
                      className="inline-flex items-center gap-1.5 bg-[#00459c] hover:bg-[#003882] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 transition-colors cursor-pointer"
                    >
                      {runBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}{' '}
                      Send request
                    </button>
                  </div>
                </div>
              </div>

              {result && (
                <div className="bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-800">Response</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 ${
                          result.ok
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {result.ok ? '200 OK' : 'ERROR'}
                      </span>
                      <span className="text-[10px] text-slate-400">{result.ms}ms</span>
                    </div>
                    <button
                      onClick={copyResult}
                      className="inline-flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-bold px-2.5 py-1.5 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}{' '}
                      Copy
                    </button>
                  </div>
                  <pre
                    className={`p-4 text-[11px] font-mono overflow-auto max-h-96 whitespace-pre-wrap break-words ${
                      result.ok
                        ? 'text-slate-700 bg-slate-50'
                        : 'text-rose-600 bg-rose-50'
                    }`}
                  >
                    {resultText}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
