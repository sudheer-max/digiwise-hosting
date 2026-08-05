import React, { useEffect, useMemo, useState } from 'react';
import {
  Rocket, Box, Database, Loader2, ArrowLeft, ArrowRight,
  Check, Plus, Search, Github
} from 'lucide-react';
import api from '../../lib/api';
import { PrimaryButton, GhostButton, Modal } from './ui';

type Step = 1 | 2 | 3 | 4;
type AppType = 'web' | 'database' | 'github';

interface Project {
  id: string;
  name: string;
  description?: string;
  namespace: string;
}

const DB_TYPES = ['postgresql', 'mongodb', 'mysql', 'redis'] as const;

const DB_LABELS: Record<string, string> = {
  postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',
  mysql: 'MySQL',
  redis: 'Redis',
};

export default function CreateApplicationWizard({ onClose, onCreated }: {
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const [step, setStep] = useState<Step>(1);

  // Step 1: project
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [createNewProject, setCreateNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  // Step 2: app type
  const [appType, setAppType] = useState<AppType>('web');

  // Step 3: config — web app
  const [appName, setAppName] = useState('');
  const [image, setImage] = useState('');
  const [port, setPort] = useState(3000);
  const [replicas, setReplicas] = useState(1);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);

  // Step 3: config — github
  const [repoURL, setRepoURL] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [targetRevision, setTargetRevision] = useState('HEAD');

  // Step 3: config — database
  const [dbType, setDbType] = useState<string>('postgresql');
  const [dbName, setDbName] = useState('');

  // Step 4: review
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    api.listProjects().then((res: any) => {
      const list = Array.isArray(res) ? res : res?.projects || [];
      setProjects(list);
    }).catch(() => {});
  }, []);

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q) || p.k8sNamespace?.toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const slugify = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

  const onAppNameChange = (v: string) => setAppName(slugify(v));

  const addEnvVar = () => setEnvVars((prev) => [...prev, { key: '', value: '' }]);
  const updateEnvVar = (i: number, field: 'key' | 'value', val: string) =>
    setEnvVars((prev) => prev.map((e, j) => (j === i ? { ...e, [field]: val } : e)));
  const removeEnvVar = (i: number) => setEnvVars((prev) => prev.filter((_, j) => j !== i));

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const canNext = useMemo(() => {
    if (step === 1) {
      if (createNewProject) return !!newProjectName.trim();
      return !!selectedProjectId;
    }
    if (step === 2) return true;
    if (step === 3) {
      if (appType === 'web') return !!appName.trim() && !!image.trim() && port > 0;
      if (appType === 'github') return !!appName.trim() && !!repoURL.trim();
      if (appType === 'database') return !!dbName.trim();
    }
    return true;
  }, [step, createNewProject, newProjectName, selectedProjectId, appType, appName, image, port, dbName, repoURL]);

  const next = () => { setError(''); setStep((s) => (s + 1) as Step); };
  const back = () => { setError(''); setStep((s) => (s - 1) as Step); };

  const create = async () => {
    setError('');
    setBusy(true);
    try {
      let projectId = selectedProjectId;
      let namespace = selectedProject?.k8sNamespace || '';

      if (createNewProject) {
        const res: any = await api.createProject({
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || undefined,
        });
        const created = res?.project || res;
        projectId = created?.id || created?.project?.id;
        namespace = created?.k8sNamespace || created?.project?.k8sNamespace || newProjectName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
        if (!projectId) throw new Error('Failed to create project — no ID returned');
      }

      if (appType === 'web') {
        const env: Record<string, string> = {};
        for (const e of envVars) {
          if (e.key.trim()) env[e.key.trim()] = e.value;
        }
        const res: any = await api.createApp(projectId, {
          name: appName.trim(),
          image: image.trim(),
          port,
          replicas,
          ...(Object.keys(env).length > 0 ? { env } : {}),
        });
        const app = res?.app || res;
        setResult(app);
        if (onCreated) onCreated(app?.name || app?.id || appName);
      } else if (appType === 'github') {
        const res: any = await api.deployToProject(projectId, {
          name: appName.trim(),
          repoURL: repoURL.trim(),
          path: repoPath.trim() || '.',
          targetRevision: targetRevision.trim() || 'HEAD',
        });
        setResult(res);
        if (onCreated) onCreated(appName);
      } else {
        const res: any = await api.createDatabase({
          type: dbType,
          name: dbName.trim(),
          namespace,
        });
        const db = res?.database || res;
        setResult(db);
        if (onCreated) onCreated(db?.name || dbName);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create resource');
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    { id: 1, label: 'Project' },
    { id: 2, label: 'Type' },
    { id: 3, label: 'Configure' },
    { id: 4, label: 'Review' },
  ];

  return (
    <Modal
      title={<span className="flex items-center gap-2"><Rocket className="w-4 h-4 text-[#00459c]" /> Create Application</span>}
      onClose={onClose}
      wide
    >
      {/* Stepper */}
      <div className="flex items-center gap-1 mb-5">
        {steps.map((s, i) => (
          <div key={s.id} className={`flex-1 flex items-center gap-2 ${i > 0 ? 'ml-1' : ''}`}>
            <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold shrink-0 ${step === s.id ? 'bg-[#00459c] text-white' : step > s.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > s.id ? <Check className="w-3 h-3" /> : s.id}
            </div>
            <div className="hidden sm:block">
              <div className={`text-[10px] font-bold uppercase tracking-wider ${step >= s.id ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</div>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${step > s.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-3">{error}</div>}

      {/* ── Step 1: Project ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCreateNewProject(false)}
              className={`border px-3 py-3 text-xs font-bold transition-colors cursor-pointer ${!createNewProject ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              Existing Project
            </button>
            <button
              type="button"
              onClick={() => setCreateNewProject(true)}
              className={`border px-3 py-3 text-xs font-bold transition-colors cursor-pointer ${createNewProject ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <Plus className="w-3 h-3 inline mr-1" /> New Project
            </button>
          </div>

          {!createNewProject && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search projects…"
                  className="w-full border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#00459c]"
                />
              </div>
              {filteredProjects.length === 0 && (
                <div className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-4 py-6 text-center">
                  {projects.length === 0 ? 'No projects yet — create one to get started.' : 'No matching projects.'}
                </div>
              )}
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`w-full text-left border px-3 py-2.5 text-xs transition-colors cursor-pointer ${selectedProjectId === p.id ? 'border-[#00459c] bg-[#00459c]/5' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <span className="font-bold text-slate-700">{p.name}</span>
                    <span className="text-slate-400 ml-2 font-mono text-[10px]">{p.k8sNamespace}</span>
                    {p.description && <p className="text-slate-400 mt-0.5">{p.description}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {createNewProject && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Project Name *</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="my-project"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Description</label>
                <input
                  type="text"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="What is this project for?"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#00459c]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: App Type ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setAppType('web')}
              className={`flex flex-col items-center gap-3 border px-4 py-6 text-xs font-bold transition-colors cursor-pointer ${appType === 'web' ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <Box className="w-8 h-8" />
              <span className="uppercase tracking-wider">Web App</span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">Docker image deployment</span>
            </button>
            <button
              type="button"
              onClick={() => setAppType('github')}
              className={`flex flex-col items-center gap-3 border px-4 py-6 text-xs font-bold transition-colors cursor-pointer ${appType === 'github' ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <Github className="w-8 h-8" />
              <span className="uppercase tracking-wider">GitHub Repo</span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">Deploy Kubernetes manifests via ArgoCD</span>
            </button>
            <button
              type="button"
              onClick={() => setAppType('database')}
              className={`flex flex-col items-center gap-3 border px-4 py-6 text-xs font-bold transition-colors cursor-pointer ${appType === 'database' ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <Database className="w-8 h-8" />
              <span className="uppercase tracking-wider">Database</span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">PostgreSQL, MySQL, MongoDB, or Redis</span>
            </button>
          </div>

          {selectedProject && (
            <div className="bg-slate-50 border border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Deploying to: <span className="text-slate-700">{selectedProject.name}</span>
              <span className="text-slate-400 font-mono ml-1">({selectedProject.k8sNamespace})</span>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Configure ── */}
      {step === 3 && (
        <div className="space-y-4">
          {appType === 'web' && (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">App Name *</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => onAppNameChange(e.target.value)}
                  placeholder="my-app"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Docker Image *</label>
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="nginx:latest"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Container Port *</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value) || 3000)}
                    min={1}
                    max={65535}
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Replicas</label>
                  <input
                    type="number"
                    value={replicas}
                    onChange={(e) => setReplicas(Math.max(1, Number(e.target.value) || 1))}
                    min={1}
                    max={10}
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Environment Variables</label>
                  <GhostButton onClick={addEnvVar} className="!px-2 !py-1 text-[10px]"><Plus className="w-3 h-3" /> Add</GhostButton>
                </div>
                {envVars.length === 0 && (
                  <div className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-3 py-2">No env vars configured.</div>
                )}
                <div className="space-y-2">
                  {envVars.map((e, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <input
                        type="text"
                        value={e.key}
                        onChange={(ev) => updateEnvVar(i, 'key', ev.target.value)}
                        placeholder="KEY"
                        className="border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono outline-none"
                      />
                      <input
                        type="text"
                        value={e.value}
                        onChange={(ev) => updateEnvVar(i, 'value', ev.target.value)}
                        placeholder="value"
                        className="border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono outline-none"
                      />
                      <button onClick={() => removeEnvVar(i)} className="text-slate-400 hover:text-rose-600 px-2 py-2 text-xs cursor-pointer">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {appType === 'database' && (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Database Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {DB_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDbType(t)}
                      className={`border px-3 py-3 text-xs font-bold transition-colors cursor-pointer ${dbType === t ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {DB_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Instance Name *</label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                  placeholder="my-database"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Created inside the <strong>{selectedProject?.k8sNamespace || 'selected'}</strong> namespace.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 4: Review & Deploy ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 divide-y divide-slate-200 text-xs">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Project</span>
              <span className="font-mono text-slate-700">{selectedProject?.name || newProjectName || '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Type</span>
              <span className="font-mono text-slate-700">{appType === 'web' ? 'Web App' : appType === 'github' ? 'GitHub Repo' : `Database (${DB_LABELS[dbType]})`}</span>
            </div>
            {appType === 'web' && (
              <>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">App Name</span>
                  <span className="font-mono text-slate-700">{appName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Image</span>
                  <span className="font-mono text-slate-700">{image}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Port</span>
                  <span className="font-mono text-slate-700">{port}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Replicas</span>
                  <span className="font-mono text-slate-700">{replicas}</span>
                </div>
                {envVars.filter((e) => e.key.trim()).length > 0 && (
                  <div className="px-4 py-2.5">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Env Vars</span>
                    <div className="space-y-0.5">
                      {envVars.filter((e) => e.key.trim()).map((e, i) => (
                        <div key={i} className="font-mono text-slate-600">{e.key}={e.value}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {appType === 'github' && (
              <>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">App Name</span>
                  <span className="font-mono text-slate-700">{appName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Repo</span>
                  <span className="font-mono text-slate-700 truncate max-w-[60%]">{repoURL}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Path</span>
                  <span className="font-mono text-slate-700">{repoPath.trim() || '.'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Branch</span>
                  <span className="font-mono text-slate-700">{targetRevision || 'HEAD'}</span>
                </div>
              </>
            )}
          {appType === 'github' && (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">App Name *</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => onAppNameChange(e.target.value)}
                  placeholder="my-app"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">GitHub Repository URL *</label>
                <input
                  type="text"
                  value={repoURL}
                  onChange={(e) => setRepoURL(e.target.value)}
                  placeholder="https://github.com/your-org/your-repo.git"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Must contain Kubernetes manifests (Deployment, Service, etc.). For private repos, add credentials in ArgoCD first.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Manifest Path</label>
                  <input
                    type="text"
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    placeholder=". (default repo root)"
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Branch / Revision</label>
                  <input
                    type="text"
                    value={targetRevision}
                    onChange={(e) => setTargetRevision(e.target.value)}
                    placeholder="HEAD"
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                  />
                </div>
              </div>
            </>
          )}

          {appType === 'database' && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Instance</span>
                <span className="font-mono text-slate-700">{dbName}</span>
              </div>
            )}
          </div>

          {result && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-3">
              {appType === 'web' ? 'Application' : appType === 'github' ? 'GitHub application' : 'Database'} created successfully.
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
        <GhostButton onClick={step === 1 ? onClose : back} disabled={busy}>
          {step === 1 ? 'Cancel' : <><ArrowLeft className="w-4 h-4" /> Back</>}
        </GhostButton>
        {step < 4 ? (
          <PrimaryButton onClick={next} disabled={!canNext}>Next <ArrowRight className="w-4 h-4" /></PrimaryButton>
        ) : (
          <PrimaryButton onClick={create} disabled={busy || !!result}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} {busy ? 'Creating…' : 'Create & Deploy'}
          </PrimaryButton>
        )}
      </div>
    </Modal>
  );
}
