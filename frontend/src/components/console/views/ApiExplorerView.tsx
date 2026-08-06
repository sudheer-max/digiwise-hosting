import React, { useState } from 'react';
import {
  Braces, Search, Play, Loader2, Check, Copy, Terminal, RefreshCw,
  FolderOpen, Server, Database, Shield, Box, Key, CreditCard, Globe, Heart, Rocket
} from 'lucide-react';
import api from '../../../lib/api';
import { SectionHeader, GhostButton, ErrorBanner } from '../ui';

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
  // ── Auth ──
  { id: 'login', method: 'POST', path: '/api/auth/login', label: 'Login', description: 'Login with email and password. Returns JWT token.', category: 'Auth', bodyPlaceholder: '{"email": "user@example.com", "password": "your-password"}' },
  { id: 'register', method: 'POST', path: '/api/auth/register', label: 'Register', description: 'Register a new user account.', category: 'Auth', bodyPlaceholder: '{"email": "user@example.com", "password": "your-password", "name": "John Doe"}' },
  { id: 'githubAuth', method: 'POST', path: '/api/auth/github', label: 'GitHub OAuth', description: 'Authenticate via GitHub OAuth code.', category: 'Auth', bodyPlaceholder: '{"code": "github-oauth-code"}' },
  { id: 'getMe', method: 'GET', path: '/api/auth/me', label: 'Get Current User', description: 'Get the currently authenticated user profile.', category: 'Auth' },

  // ── Projects ──
  { id: 'listProjects', method: 'GET', path: '/api/projects', label: 'List Projects', description: 'List all Kubernetes namespaces (projects) for the authenticated user.', category: 'Projects' },
  { id: 'createProject', method: 'POST', path: '/api/projects', label: 'Create Project', description: 'Create a new Kubernetes namespace (project).', category: 'Projects', bodyPlaceholder: '{"name": "my-project", "description": "A test project"}' },
  { id: 'getProject', method: 'GET', path: '/api/projects/:id', label: 'Get Project', description: 'Get details for a specific project by ID.', category: 'Projects' },
  { id: 'updateProject', method: 'PUT', path: '/api/projects/:id', label: 'Update Project', description: 'Update project name or description.', category: 'Projects', bodyPlaceholder: '{"name": "new-name", "description": "Updated description"}' },
  { id: 'deleteProject', method: 'DELETE', path: '/api/projects/:id', label: 'Delete Project', description: 'Delete a project (Kubernetes namespace). All resources inside will be removed.', category: 'Projects' },
  { id: 'listProjectDeployments', method: 'GET', path: '/api/projects/:id/deployments', label: 'Project Deployments', description: 'List all ArgoCD deployments in a project.', category: 'Projects' },
  { id: 'listProjectPods', method: 'GET', path: '/api/projects/:id/pods', label: 'Project Pods', description: 'List all pods running in a project namespace.', category: 'Projects' },
  { id: 'getProjectLogs', method: 'GET', path: '/api/projects/:id/logs', label: 'Project Logs', description: 'Get logs from a project namespace.', category: 'Projects' },
  { id: 'deployToProject', method: 'POST', path: '/api/projects/:id/deploy', label: 'Deploy via ArgoCD', description: 'Deploy a Git repository to a project via ArgoCD.', category: 'Projects', bodyPlaceholder: '{"name": "my-app", "repoURL": "https://github.com/org/repo.git", "path": ".", "targetRevision": "HEAD"}' },

  // ── Applications ──
  { id: 'listApps', method: 'GET', path: '/api/projects/:projectId/apps', label: 'List Applications', description: 'List all applications (Deployments) in a project.', category: 'Applications' },
  { id: 'createApp', method: 'POST', path: '/api/projects/:projectId/apps', label: 'Create Application', description: 'Create a new application (Deployment + Service) in a project.', category: 'Applications', bodyPlaceholder: '{"name": "my-app", "image": "nginx:latest", "port": 80, "replicas": 1, "env": {"NODE_ENV": "production"}}' },
  { id: 'getApp', method: 'GET', path: '/api/projects/:projectId/apps/:name', label: 'Get Application', description: 'Get details for a specific application.', category: 'Applications' },
  { id: 'updateApp', method: 'PUT', path: '/api/projects/:projectId/apps/:name', label: 'Update Application', description: 'Update application image, env vars, or replicas.', category: 'Applications', bodyPlaceholder: '{"image": "nginx:1.25", "env": {"KEY": "value"}, "replicas": 2}' },
  { id: 'deleteApp', method: 'DELETE', path: '/api/projects/:projectId/apps/:name', label: 'Delete Application', description: 'Delete an application and its service.', category: 'Applications' },
  { id: 'scaleApp', method: 'POST', path: '/api/projects/:projectId/apps/:name/scale', label: 'Scale Application', description: 'Scale application replicas up or down (0-10).', category: 'Applications', bodyPlaceholder: '{"replicas": 3}' },
  { id: 'getAppLogs', method: 'GET', path: '/api/projects/:projectId/apps/:name/logs', label: 'Application Logs', description: 'Get stdout/stderr logs from the running application.', category: 'Applications' },
  { id: 'restartApp', method: 'POST', path: '/api/projects/:projectId/apps/:name/restart', label: 'Restart Application', description: 'Restart the application (scale to 0 then back to 1).', category: 'Applications' },
  { id: 'deployGitHub', method: 'POST', path: '/api/projects/:projectId/apps/deploy-github', label: 'Deploy from GitHub', description: 'Auto-build and deploy from a GitHub repository. Detects framework, builds Docker image, deploys to K8s.', category: 'Applications', bodyPlaceholder: '{"name": "my-app", "repoURL": "https://github.com/username/repo.git", "branch": "main", "port": 3000}' },
  { id: 'getAppVariables', method: 'GET', path: '/api/projects/:projectId/apps/:name/variables', label: 'App Variables', description: 'Get environment variables for an application.', category: 'Applications' },

  // ── Databases ──
  { id: 'listDatabaseOperators', method: 'GET', path: '/api/databases', label: 'List DB Operators', description: 'List available database operators and their status.', category: 'Databases' },
  { id: 'createDatabase', method: 'POST', path: '/api/databases', label: 'Create Database', description: 'Create a new database instance (PostgreSQL, MongoDB, MySQL, Redis).', category: 'Databases', bodyPlaceholder: '{"type": "postgresql", "name": "my-db", "namespace": "my-project", "size": "small"}' },
  { id: 'listDatabases', method: 'GET', path: '/api/databases/:namespace', label: 'List Databases', description: 'List all database instances in a namespace.', category: 'Databases' },
  { id: 'deleteDatabase', method: 'DELETE', path: '/api/databases/:namespace/:type/:name', label: 'Delete Database', description: 'Delete a database instance permanently.', category: 'Databases' },
  { id: 'getDatabaseVariables', method: 'GET', path: '/api/databases/:namespace/:type/:name/variables', label: 'DB Connection Variables', description: 'Get full connection details: host, port, user, password, connection string, env vars.', category: 'Databases' },

  // ── Plan & Billing ──
  { id: 'getPlan', method: 'GET', path: '/api/plan', label: 'Get Plan', description: 'Get current user plan and usage details.', category: 'Billing' },
  { id: 'planCheckout', method: 'POST', path: '/api/plan/checkout', label: 'Plan Checkout', description: 'Start Razorpay checkout for a plan upgrade.', category: 'Billing', bodyPlaceholder: '{"plan": "pro"}' },
  { id: 'activatePayg', method: 'POST', path: '/api/plan/activate-payg', label: 'Activate Pay-as-you-go', description: 'Activate the pay-as-you-go billing model.', category: 'Billing' },
  { id: 'getPaymentConfig', method: 'GET', path: '/api/config/payments', label: 'Payment Config', description: 'Get payment provider configuration.', category: 'Billing' },
  { id: 'sendConfirmation', method: 'POST', path: '/api/checkout/send-confirmation', label: 'Send Confirmation', description: 'Send order confirmation email.', category: 'Billing', bodyPlaceholder: '{"planName": "Pro", "orderId": "order_xxx", "email": "user@example.com"}' },

  // ── Admin ──
  { id: 'getAdminStats', method: 'GET', path: '/api/admin/stats', label: 'Admin Stats', description: 'Get platform-wide statistics (users, projects, services).', category: 'Admin' },
  { id: 'getAdminUsers', method: 'GET', path: '/api/admin/users', label: 'Admin Users', description: 'List all registered users.', category: 'Admin' },
  { id: 'getAdminProjects', method: 'GET', path: '/api/admin/projects', label: 'Admin Projects', description: 'List all projects across all users.', category: 'Admin' },
  { id: 'getAdminHealth', method: 'GET', path: '/api/admin/health', label: 'Admin Health', description: 'Get infrastructure health status.', category: 'Admin' },
  { id: 'getAdminCluster', method: 'GET', path: '/api/admin/cluster', label: 'Admin Cluster', description: 'Get Kubernetes cluster information.', category: 'Admin' },
  { id: 'getAdminClusterPods', method: 'GET', path: '/api/admin/cluster/pods', label: 'Admin Cluster Pods', description: 'List all pods across all namespaces.', category: 'Admin' },

  // ── System ──
  { id: 'healthCheck', method: 'GET', path: '/api/health', label: 'Health Check', description: 'Basic health check endpoint.', category: 'System' },
  { id: 'getCountry', method: 'GET', path: '/api/geo/country', label: 'Get Country', description: 'Detect country from Cloudflare headers.', category: 'System' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  Auth: <Key className="w-3.5 h-3.5" />,
  Projects: <FolderOpen className="w-3.5 h-3.5" />,
  Applications: <Rocket className="w-3.5 h-3.5" />,
  Databases: <Database className="w-3.5 h-3.5" />,
  Billing: <CreditCard className="w-3.5 h-3.5" />,
  Admin: <Shield className="w-3.5 h-3.5" />,
  System: <Heart className="w-3.5 h-3.5" />,
};

function resolvePath(endpoint: Endpoint, body: any): string {
  let path = endpoint.path;
  if (path.includes(':id')) path = path.replace(':id', body?.id || body?.projectId || '');
  if (path.includes(':projectId')) path = path.replace(':projectId', body?.projectId || body?.id || '');
  if (path.includes(':name')) path = path.replace(':name', body?.name || '');
  if (path.includes(':namespace')) path = path.replace(':namespace', body?.namespace || '');
  if (path.includes(':type')) path = path.replace(':type', body?.type || '');
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
    return e.label.toLowerCase().includes(q) || e.path.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
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
      if (trimmed) parsed = JSON.parse(trimmed);
    } catch (e: any) {
      setError(`Invalid JSON: ${e.message}`);
      setRunBusy(false);
      return;
    }

    const started = Date.now();
    try {
      let res: any;
      const ep = selected;
      const pid = parsed.projectId || parsed.id;

      switch (ep.id) {
        // Auth
        case 'login': res = await api.login(parsed.email, parsed.password); break;
        case 'register': res = await api.register(parsed.email, parsed.password, parsed.name); break;
        case 'githubAuth': res = await api.githubAuth(parsed.code); break;
        case 'getMe': res = await api.getMe(); break;

        // Projects
        case 'listProjects': res = await api.listProjects(); break;
        case 'createProject': res = await api.createProject({ name: parsed.name, description: parsed.description }); break;
        case 'getProject': res = await api.getProject(pid); break;
        case 'updateProject': res = await api.updateProject(pid, { name: parsed.name, description: parsed.description }); break;
        case 'deleteProject': res = await api.deleteProject(pid); break;
        case 'listProjectDeployments': res = await api.listProjectDeployments(pid); break;
        case 'listProjectPods': res = await api.listProjectPods(pid); break;
        case 'getProjectLogs': res = await api.getProjectLogs(pid, parsed.pod, parsed.lines); break;
        case 'deployToProject': res = await api.deployToProject(pid, { name: parsed.name, repoURL: parsed.repoURL, path: parsed.path, targetRevision: parsed.targetRevision }); break;

        // Applications
        case 'listApps': res = await api.listApps(pid); break;
        case 'createApp': res = await api.createApp(pid, { name: parsed.name, image: parsed.image, port: parsed.port, env: parsed.env, replicas: parsed.replicas }); break;
        case 'getApp': res = await api.getApp(pid, parsed.name); break;
        case 'updateApp': res = await api.updateApp(pid, parsed.name, { image: parsed.image, env: parsed.env, replicas: parsed.replicas }); break;
        case 'deleteApp': res = await api.deleteApp(pid, parsed.name); break;
        case 'scaleApp': res = await api.scaleApp(pid, parsed.name, parsed.replicas); break;
        case 'getAppLogs': res = await api.getAppLogs(pid, parsed.name, parsed.lines); break;
        case 'restartApp': res = await api.restartApp(pid, parsed.name); break;
        case 'deployGitHub': res = await api.deployFromGitHub(pid, { name: parsed.name, repoURL: parsed.repoURL, branch: parsed.branch, buildCommand: parsed.buildCommand, startCommand: parsed.startCommand, port: parsed.port, env: parsed.env }); break;
        case 'getAppVariables': res = await api.getAppVariables(pid, parsed.name); break;

        // Databases
        case 'listDatabaseOperators': res = await api.listDatabaseOperators(); break;
        case 'createDatabase': res = await api.createDatabase({ type: parsed.type, name: parsed.name, namespace: parsed.namespace, size: parsed.size }); break;
        case 'listDatabases': res = await api.listDatabases(parsed.namespace); break;
        case 'deleteDatabase': res = await api.deleteDatabase(parsed.namespace, parsed.type, parsed.name); break;
        case 'getDatabaseVariables': res = await api.getDatabaseVariables(parsed.namespace, parsed.type, parsed.name); break;

        // Plan & Billing
        case 'getPlan': res = await api.getPlan(); break;
        case 'planCheckout': res = await api.planCheckout(parsed.plan); break;
        case 'activatePayg': res = await api.activatePayg(); break;
        case 'getPaymentConfig': res = await api.getPaymentConfig(); break;
        case 'sendConfirmation': res = await api.sendConfirmation({ planName: parsed.planName, orderId: parsed.orderId, email: parsed.email }); break;

        // Admin
        case 'getAdminStats': res = await api.getAdminStats(); break;
        case 'getAdminUsers': res = await api.getAdminUsers(); break;
        case 'getAdminProjects': res = await api.getAdminProjects(); break;
        case 'getAdminHealth': res = await api.getAdminHealth(); break;
        case 'getAdminCluster': res = await api.getAdminCluster(); break;
        case 'getAdminClusterPods': res = await api.getAdminClusterPods(); break;

        // System
        case 'healthCheck': res = await api.healthCheck(); break;
        case 'getCountry': res = await api.getCountry(); break;

        default: throw new Error('Unknown endpoint');
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
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={<span className="flex items-center gap-2"><Braces className="w-6 h-6 text-[#00459c]" /> API Explorer</span>}
        subtitle={`${endpoints.length} API endpoints across ${categories.length - 1} categories`}
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
                      activeCategory === cat ? 'bg-[#00459c] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
                    selected?.id === ep.id ? 'bg-[#00459c] text-white' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 shrink-0 ${
                    selected?.id === ep.id ? 'bg-white/20 text-white' :
                    ep.method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
                    ep.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                    ep.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {ep.method}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold truncate">{ep.label}</div>
                    <div className={`text-[10px] truncate ${selected?.id === ep.id ? 'text-white/60' : 'text-slate-400'}`}>{ep.path}</div>
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
              <p className="text-xs text-slate-400 mt-1">Choose an API endpoint on the left to configure and fire a request.</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-1 ${
                      selected.method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
                      selected.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                      selected.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {selected.method}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">{selected.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{selected.path}</span>
                </div>

                <div className="p-4">
                  <p className="text-xs text-slate-600 mb-4">{selected.description}</p>

                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Request Body (JSON)</div>
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
                      {runBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Send request
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
                      <span className={`text-[10px] font-bold px-2 py-0.5 ${result.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {result.ok ? '200 OK' : 'ERROR'}
                      </span>
                      <span className="text-[10px] text-slate-400">{result.ms}ms</span>
                    </div>
                    <button onClick={copyResult} className="inline-flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-bold px-2.5 py-1.5 transition-colors cursor-pointer">
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />} Copy
                    </button>
                  </div>
                  <pre className={`p-4 text-[11px] font-mono overflow-auto max-h-96 whitespace-pre-wrap break-words ${result.ok ? 'text-slate-700 bg-slate-50' : 'text-rose-600 bg-rose-50'}`}>
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
