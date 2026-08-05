import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Play, RefreshCw, Trash2, Copy, Check, Loader2, Rocket,
  Server, Boxes, Database, Globe, Terminal, ChevronDown, ChevronRight,
  Power, RotateCw, ExternalLink, Layers, FolderPlus, GitBranch, Activity
} from 'lucide-react';
import api from '../lib/api';

interface HostingViewProps {
  onConfigurePlan: (planName: string, price: number) => void;
}

const DB_TYPE_INFO: Record<string, { label: string; icon: string; envName: string }> = {
  postgresql: { label: 'PostgreSQL', icon: '🐘', envName: 'postgresql' },
  mongodb: { label: 'MongoDB', icon: '🍃', envName: 'mongodb' },
  redis: { label: 'Redis', icon: '🔴', envName: 'redis' },
};

export default function HostingView({ onConfigurePlan }: HostingViewProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [dbs, setDbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  // Create project
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Create app
  const [showNewApp, setShowNewApp] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppImage, setNewAppImage] = useState('nginx:alpine');
  const [newAppPort, setNewAppPort] = useState('80');

  // Create DB
  const [showNewDb, setShowNewDb] = useState(false);
  const [dbType, setDbType] = useState('postgresql');
  const [dbName, setDbName] = useState('');
  const [creating, setCreating] = useState(false);

  // Logs
  const [logApp, setLogApp] = useState<string>('');
  const [logData, setLogData] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await api.listProjects();
      setProjects(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const selectProject = useCallback(async (proj: any) => {
    setSelectedProject(proj);
    setDetailsLoading(true);
    const ns = proj.k8sNamespace || proj.id;
    try {
      const [appList, dbList] = await Promise.all([
        api.listApps(proj.id).catch(() => []),
        api.listDatabases(ns).catch(() => []),
      ]);
      setApps(Array.isArray(appList) ? appList : []);
      setDbs(Array.isArray(dbList) ? dbList : []);
    } catch {
      setApps([]);
      setDbs([]);
    }
    setDetailsLoading(false);
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setError('');
    try {
      const res = await api.createProject({ name: newProjectName.trim() });
      setNewProjectName('');
      setShowNewProject(false);
      await loadProjects();
      if (res?.id) {
        await selectProject(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject || !confirm(`Delete project "${selectedProject.name}"? This will remove all its apps and databases.`)) return;
    setError('');
    try {
      await api.deleteProject(selectedProject.id);
      setSelectedProject(null);
      setApps([]);
      setDbs([]);
      await loadProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    }
  };

  const handleCreateApp = async () => {
    if (!newAppName.trim() || !selectedProject) return;
    setError('');
    try {
      await api.createApp(selectedProject.id, {
        name: newAppName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        image: newAppImage.trim() || 'nginx:alpine',
        port: parseInt(newAppPort, 10) || 80,
        replicas: 1,
      });
      setNewAppName('');
      setNewAppImage('nginx:alpine');
      setNewAppPort('80');
      setShowNewApp(false);
      await selectProject(selectedProject);
    } catch (err: any) {
      setError(err.message || 'Failed to create application');
    }
  };

  const handleCreateDb = async () => {
    if (!dbName.trim() || !selectedProject) return;
    setCreating(true);
    setError('');
    try {
      const label = dbName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      await api.createDatabase({
        type: dbType,
        name: label,
        namespace: selectedProject.k8sNamespace || selectedProject.id,
      });
      setDbName('');
      setShowNewDb(false);
      await selectProject(selectedProject);
    } catch (err: any) {
      setError(err.message || 'Failed to create database');
    }
    setCreating(false);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const appAction = async (appName: string, action: 'restart' | 'delete' | 'scale-up' | 'scale-down') => {
    setError('');
    if (!selectedProject) return;
    try {
      if (action === 'restart') await api.restartApp(selectedProject.id, appName);
      else if (action === 'scale-up') {
        const app = apps.find((a: any) => a.name === appName);
        const current = app?.replicas ?? 1;
        await api.scaleApp(selectedProject.id, appName, current + 1);
      } else if (action === 'scale-down') {
        const app = apps.find((a: any) => a.name === appName);
        const current = app?.replicas ?? 1;
        await api.scaleApp(selectedProject.id, appName, Math.max(0, current - 1));
      } else if (action === 'delete') {
        if (!confirm('Delete this application?')) return;
        await api.deleteApp(selectedProject.id, appName);
      }
      await selectProject(selectedProject);
    } catch (err: any) {
      setError(err.message || `Action failed: ${action}`);
    }
  };

  const openLogs = async (appName: string) => {
    setLogApp(appName);
    setLogData('Loading logs...');
    try {
      const res: any = await api.getAppLogs(selectedProject.id, appName, 500);
      const logs = res?.logs || (Array.isArray(res) ? res : []);
      const text = (Array.isArray(logs)
        ? logs.map((l: any) => l.log || l.message || JSON.stringify(l)).join('\n')
        : String(logs || 'No logs available'));
      setLogData(text);
    } catch (err: any) {
      setLogData(`Failed to load logs: ${err.message}`);
    }
  };

  const dbAction = async (dbType: string, dbName: string, action: 'delete') => {
    setError('');
    if (!selectedProject) return;
    const ns = selectedProject.k8sNamespace || selectedProject.id;
    try {
      if (action === 'delete' && !confirm('Delete this database?')) return;
      await api.deleteDatabase(ns, dbType, dbName);
      await selectProject(selectedProject);
    } catch (err: any) {
      setError(err.message || `Failed to ${action} database`);
    }
  };

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">Your Kubernetes deployment console.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadProjects}
            className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => setShowNewProject(!showNewProject)}
            className="bg-[#00459c] hover:bg-[#003882] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-4 py-3">{error}</div>
      )}

      {showNewProject && (
        <form onSubmit={(e) => { e.preventDefault(); handleCreateProject(); }} className="flex gap-2 bg-slate-50 border border-slate-200 rounded-xl p-4 animate-fade-in">
          <input
            type="text"
            placeholder="Project name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="flex-1 border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs outline-none"
            required
          />
          <button type="submit" className="bg-[#00459c] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer hover:bg-[#003882]">Create</button>
          <button type="button" onClick={() => setShowNewProject(false)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-50">Cancel</button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No projects yet. Create your first project to deploy apps and databases.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProject(p)}
              className={`text-left border rounded-2xl p-5 transition-all cursor-pointer group ${
                selectedProject?.id === p.id
                  ? 'bg-[#00459c] text-white border-[#00459c] shadow-lg'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-[#00459c]/40 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Boxes className={`w-6 h-6 ${selectedProject?.id === p.id ? 'text-white' : 'text-[#00459c]'}`} />
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${selectedProject?.id === p.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                  {p.appCount || 0} services
                </span>
              </div>
              <div className="font-bold text-sm truncate">{p.name}</div>
              <div className={`text-[10px] mt-1 font-mono truncate ${selectedProject?.id === p.id ? 'text-white/70' : 'text-slate-400'}`}>
                {p.k8sNamespace || p.id}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedProject && (
        <>
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#00459c]" /> {selectedProject.name}
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">namespace: {selectedProject.k8sNamespace || selectedProject.id}</p>
            </div>
            <button
              onClick={handleDeleteProject}
              className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Delete project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading project details...
            </div>
          ) : (
            <>
              {/* APPLICATIONS */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-[#00459c]" /> Applications
                  </h3>
                  <button
                    onClick={() => setShowNewApp(!showNewApp)}
                    className="bg-[#00459c] hover:bg-[#003882] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> New App
                  </button>
                </div>

                {showNewApp && (
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateApp(); }} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end animate-fade-in">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">App Name</label>
                      <input type="text" placeholder="my-app" value={newAppName} onChange={(e) => setNewAppName(e.target.value)} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs outline-none font-mono" required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Docker Image</label>
                      <input type="text" placeholder="nginx:alpine" value={newAppImage} onChange={(e) => setNewAppImage(e.target.value)} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs outline-none font-mono" required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Port</label>
                      <input type="number" placeholder="80" value={newAppPort} onChange={(e) => setNewAppPort(e.target.value)} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs outline-none font-mono" required />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="bg-[#00459c] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer hover:bg-[#003882] flex-1">Create</button>
                      <button type="button" onClick={() => setShowNewApp(false)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-50">Cancel</button>
                    </div>
                  </form>
                )}

                {apps.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400">No applications yet. Create one to deploy your code.</div>
                ) : (
                  <div className="space-y-3">
                    {apps.map((app: any) => {
                      const status = (app.status || 'IDLE').toUpperCase();
                      const running = status === 'RUNNING' || status === 'DONE' || status === 'ACTIVE';
                      const stopped = status === 'IDLE' || status === 'STOPPED' || app.replicas === 0;
                      return (
                        <div key={app.name} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-2.5 h-2.5 rounded-full ${running ? 'bg-emerald-500' : stopped ? 'bg-slate-300' : 'bg-amber-400'} animate-pulse`} />
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-slate-900 truncate">{app.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">{app.image} · {status}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => copyToClipboard(app.name, `id-${app.name}`)} className="text-slate-400 hover:text-[#00459c] p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer" title="Copy app name">
                                {copied === `id-${app.name}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                              <button onClick={() => openLogs(app.name)} className="text-slate-400 hover:text-[#00459c] p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer" title="View logs">
                                <Terminal className="w-4 h-4" />
                              </button>
                              <button onClick={() => appAction(app.name, 'restart')} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1">
                                <Rocket className="w-3 h-3" /> Restart
                              </button>
                              <button onClick={() => appAction(app.name, 'scale-down')} className="text-slate-400 hover:text-amber-600 p-1.5 hover:bg-amber-50 rounded-lg cursor-pointer" title="Scale down">
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => appAction(app.name, 'scale-up')} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-lg cursor-pointer" title="Scale up">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => appAction(app.name, 'delete')} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {app.replicas ?? 1} replica(s)</span>
                            {app.port && <span>port: {app.port}</span>}
                            <span>image: {app.image}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DATABASES */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#00459c]" /> Databases
                  </h3>
                  <button
                    onClick={() => setShowNewDb(!showNewDb)}
                    className="bg-[#00459c] hover:bg-[#003882] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> New Database
                  </button>
                </div>

                {showNewDb && (
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateDb(); }} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end animate-fade-in">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
                      <select value={dbType} onChange={(e) => setDbType(e.target.value)} className="w-full border border-slate-200 bg-white rounded-lg px-2 py-2 text-xs font-bold outline-none">
                        {Object.entries(DB_TYPE_INFO).map(([key, info]) => (
                          <option key={key} value={key}>{info.icon} {info.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Name</label>
                      <input type="text" placeholder="my-db" value={dbName} onChange={(e) => setDbName(e.target.value)} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs outline-none font-mono" required />
                    </div>
                    <button type="submit" disabled={creating} className="bg-[#00459c] hover:bg-[#003882] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50">
                      {creating ? <Loader2 className="w-3.5 h-3.5 inline animate-spin" /> : 'Create Database'}
                    </button>
                    <button type="button" onClick={() => setShowNewDb(false)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-50">Cancel</button>
                  </form>
                )}

                {dbs.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400">No databases yet. Create one to get a managed instance.</div>
                ) : (
                  <div className="space-y-3">
                    {dbs.map((db: any) => {
                      const info = DB_TYPE_INFO[db.type] || DB_TYPE_INFO.postgres;
                      const status = (db.status || 'IDLE').toUpperCase();
                      return (
                        <div key={`${db.type}-${db.name}`} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-lg">{info.icon}</span>
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-slate-900 truncate">{db.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">{info.label} · {status}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => copyToClipboard(db.name, `db-${db.name}`)} className="text-slate-400 hover:text-[#00459c] p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer" title="Copy database name">
                                {copied === `db-${db.name}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                              <button onClick={() => dbAction(db.type, db.name, 'delete')} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {logApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Logs — {logApp}
              </span>
              <button onClick={() => { setLogApp(''); setLogData(''); }} className="text-slate-400 hover:text-white cursor-pointer">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-[11px] font-mono text-emerald-300 whitespace-pre-wrap break-words">
              {logData || 'No logs'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
