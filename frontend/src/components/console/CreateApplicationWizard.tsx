import React, { useEffect, useMemo, useState } from 'react';
import {
  Rocket, Box, Database, Loader2, ArrowLeft, ArrowRight,
  Check, Plus, Search, Github, Upload, Code, List
} from 'lucide-react';
import api from '../../lib/api';
import { PrimaryButton, GhostButton, Modal } from './ui';
import { useConsole } from './ConsoleShell';

type Step = 1 | 2 | 3 | 4;
type AppType = 'web' | 'database' | 'github' | 'upload';

interface Project {
  id: string;
  name: string;
  description?: string;
  namespace: string;
  k8sNamespace?: string;
}

const DB_TYPES = ['postgresql', 'mongodb', 'mysql', 'redis'] as const;

const DB_LABELS: Record<string, string> = {
  postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',
  mysql: 'MySQL',
  redis: 'Redis',
};

export default function CreateApplicationWizard({ onClose, onCreated, projectId: initialProjectId }: {
  onClose: () => void;
  onCreated?: (id: string) => void;
  projectId?: string;
}) {
  const ctx = useConsole();
  const navigate = ctx?.navigate;
  const [step, setStep] = useState<Step>(initialProjectId ? 2 : 1);

  // Step 1: project
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
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
  const [envRawMode, setEnvRawMode] = useState(false);
  const [envRawText, setEnvRawText] = useState('');

  // Step 3: config — github
  const [repoURL, setRepoURL] = useState('');
  const [branch, setBranch] = useState('main');
  const [buildCommand, setBuildCommand] = useState('');
  const [startCommand, setStartCommand] = useState('');

  // Step 3: config — database
  const [dbType, setDbType] = useState<string>('postgresql');
  const [dbName, setDbName] = useState('');

  // Step 3: config — upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);

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

  const parseRawEnvVars = () => {
    const lines = envRawText.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const parsed: { key: string; value: string }[] = [];
    for (const line of lines) {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim();
        const value = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        parsed.push({ key, value });
      }
    }
    setEnvVars(parsed);
    setEnvRawText('');
    setEnvRawMode(false);
  };

  const syncEnvVarsToRaw = () => {
    const lines = envVars.map(e => `${e.key}=${e.value}`);
    setEnvRawText(lines.join('\n'));
  };

  const toggleEnvRawMode = () => {
    if (envRawMode) {
      parseRawEnvVars();
    } else {
      syncEnvVarsToRaw();
      setEnvRawMode(true);
    }
  };

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
      if (appType === 'upload') return !!appName.trim() && !!uploadFile;
    }
    return true;
  }, [step, createNewProject, newProjectName, selectedProjectId, appType, appName, image, port, dbName, repoURL, uploadFile]);

  const next = () => { setError(''); setStep((s) => (s + 1) as Step); };
  const back = () => { setError(''); setStep((s) => (s - 1) as Step); };

  const create = async () => {
    setError('');
    setBusy(true);
    try {
      // Parse raw env vars if in raw mode
      let finalEnvVars = envVars;
      if (envRawMode && envRawText.trim()) {
        const lines = envRawText.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
        const parsed: { key: string; value: string }[] = [];
        for (const line of lines) {
          const eqIdx = line.indexOf('=');
          if (eqIdx > 0) {
            const key = line.slice(0, eqIdx).trim();
            const value = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            parsed.push({ key, value });
          }
        }
        finalEnvVars = parsed;
      }

      let projectId = selectedProjectId;

      if (createNewProject) {
        const res: any = await api.createProject({
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || undefined,
        });
        const created = res?.project || res;
        projectId = created?.id || created?.project?.id;
        if (!projectId) throw new Error('Failed to create project — no ID returned');
      }

      if (appType === 'web') {
        const env: Record<string, string> = {};
        for (const e of finalEnvVars) {
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
        const env: Record<string, string> = {};
        for (const e of finalEnvVars) {
          if (e.key.trim()) env[e.key.trim()] = e.value;
        }
        const res: any = await api.deployFromGitHub(projectId, {
          name: appName.trim(),
          repoURL: repoURL.trim(),
          branch: branch.trim() || 'main',
          buildCommand: buildCommand.trim() || undefined,
          startCommand: startCommand.trim() || undefined,
          port,
          ...(Object.keys(env).length > 0 ? { env } : {}),
        });
        // Navigate to deploy progress page
        if (navigate) {
          navigate({
            name: 'deployProgress',
            projectId,
            appName: appName.trim(),
            buildName: res?.buildName || '',
            namespace: res?.namespace || '',
            repoURL: repoURL.trim(),
            branch: branch.trim() || 'main',
            port,
          });
        } else {
          setResult(res);
          if (onCreated) onCreated(appName);
        }
      } else if (appType === 'upload') {
        const res: any = await api.uploadZip(projectId, {
          name: appName.trim(),
          port,
          file: uploadFile!,
        });
        setResult(res);
        if (onCreated) onCreated(appName);
      } else {
        const res: any = await api.createDatabase({
          type: dbType,
          name: dbName.trim(),
          namespace: selectedProject?.k8sNamespace || newProjectName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
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

      {/* Step 1: Project */}
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
                  placeholder="Search projects..."
                  className="w-full border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#00459c]"
                />
              </div>
              {filteredProjects.length === 0 && (
                <div className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-4 py-6 text-center">
                  {projects.length === 0 ? 'No projects yet - create one to get started.' : 'No matching projects.'}
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

      {/* Step 2: App Type */}
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
              <span className="text-[10px] font-normal text-slate-400 normal-case">Deploy from an image</span>
            </button>
            <button
              type="button"
              onClick={() => setAppType('github')}
              className={`flex flex-col items-center gap-3 border px-4 py-6 text-xs font-bold transition-colors cursor-pointer ${appType === 'github' ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <Github className="w-8 h-8" />
              <span className="uppercase tracking-wider">GitHub Repo</span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">Auto-build & deploy from source</span>
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
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAppType('upload')}
              className={`flex flex-col items-center gap-3 border px-4 py-6 text-xs font-bold transition-colors cursor-pointer ${appType === 'upload' ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <Upload className="w-8 h-8" />
              <span className="uppercase tracking-wider">Upload ZIP</span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">Upload and auto-deploy a project archive</span>
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

      {/* Step 3: Configure */}
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">App Image *</label>
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Port *</label>
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Copies</label>
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleEnvRawMode}
                      className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold border transition-colors cursor-pointer ${envRawMode ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {envRawMode ? <List className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                      {envRawMode ? 'Form' : 'Raw'}
                    </button>
                    {!envRawMode && (
                      <GhostButton onClick={addEnvVar} className="!px-2 !py-1 text-[10px]"><Plus className="w-3 h-3" /> Add</GhostButton>
                    )}
                  </div>
                </div>
                {envRawMode ? (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">Paste KEY=VALUE pairs, one per line. Lines starting with # are ignored.</p>
                    <textarea
                      value={envRawText}
                      onChange={(e) => setEnvRawText(e.target.value)}
                      placeholder={`DATABASE_URL=postgresql://user:pass@host:5432/db\nAPI_KEY=sk-xxxxx\nSECRET_TOKEN=xxx`}
                      className="w-full h-32 border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono outline-none focus:border-[#00459c] resize-none"
                    />
                  </div>
                ) : (
                  <>
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
                          <button onClick={() => removeEnvVar(i)} className="text-slate-400 hover:text-rose-600 px-2 py-2 text-xs cursor-pointer">x</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
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
                  placeholder="https://github.com/username/repo.git"
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Supports Node.js, Python, Go, and static sites. Auto-detects framework.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Branch</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value) || 3000)}
                    min={1}
                    max={65535}
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Build Command (optional)</label>
                  <input
                    type="text"
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    placeholder="npm run build"
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Start Command (optional)</label>
                  <input
                    type="text"
                    value={startCommand}
                    onChange={(e) => setStartCommand(e.target.value)}
                    placeholder="npm start"
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Environment Variables</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleEnvRawMode}
                      className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold border transition-colors cursor-pointer ${envRawMode ? 'border-[#00459c] bg-[#00459c]/5 text-[#00459c]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {envRawMode ? <List className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                      {envRawMode ? 'Form' : 'Raw'}
                    </button>
                    {!envRawMode && (
                      <GhostButton onClick={addEnvVar} className="!px-2 !py-1 text-[10px]"><Plus className="w-3 h-3" /> Add</GhostButton>
                    )}
                  </div>
                </div>
                {envRawMode ? (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">Paste KEY=VALUE pairs, one per line. Lines starting with # are ignored.</p>
                    <textarea
                      value={envRawText}
                      onChange={(e) => setEnvRawText(e.target.value)}
                      placeholder={`DATABASE_URL=postgresql://user:pass@host:5432/db\nAPI_KEY=sk-xxxxx\nSECRET_TOKEN=xxx`}
                      className="w-full h-32 border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono outline-none focus:border-[#00459c] resize-none"
                    />
                  </div>
                ) : (
                  <>
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
                          <button onClick={() => removeEnvVar(i)} className="text-slate-400 hover:text-rose-600 px-2 py-2 text-xs cursor-pointer">x</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {appType === 'database' && (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Database Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

          {appType === 'upload' && (
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Port</label>
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Project ZIP File *</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) setUploadFile(file);
                  }}
                  className="border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center cursor-pointer hover:border-[#00459c] transition-colors"
                  onClick={() => document.getElementById('zip-upload-input')?.click()}
                >
                  <input
                    id="zip-upload-input"
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setUploadFile(file);
                    }}
                  />
                  {uploadFile ? (
                    <div>
                      <Upload className="w-6 h-6 text-[#00459c] mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">{uploadFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                        className="text-[10px] text-rose-500 hover:text-rose-700 mt-2 underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500">Drop a ZIP file here or click to browse</p>
                      <p className="text-[10px] text-slate-400">Supports Node.js, Python, Go, and static sites</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 4: Review & Deploy */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 divide-y divide-slate-200 text-xs">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Project</span>
              <span className="font-mono text-slate-700">{selectedProject?.name || newProjectName || '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Type</span>
              <span className="font-mono text-slate-700">{appType === 'web' ? 'Web App' : appType === 'github' ? 'GitHub Repo' : appType === 'upload' ? 'Upload ZIP' : `Database (${DB_LABELS[dbType]})`}</span>
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
                {envVars.length > 0 && (
                  <div className="px-4 py-2.5">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Env Vars</span>
                    <div className="mt-1 space-y-0.5">
                      {envVars.filter(e => e.key.trim()).map((e, i) => (
                        <div key={i} className="font-mono text-slate-700 text-[11px]">{e.key}=***</div>
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
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Branch</span>
                  <span className="font-mono text-slate-700">{branch}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Port</span>
                  <span className="font-mono text-slate-700">{port}</span>
                </div>
                {envVars.length > 0 && (
                  <div className="px-4 py-2.5">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Env Vars</span>
                    <div className="mt-1 space-y-0.5">
                      {envVars.filter(e => e.key.trim()).map((e, i) => (
                        <div key={i} className="font-mono text-slate-700 text-[11px]">{e.key}=***</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {appType === 'database' && (
              <>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Database</span>
                  <span className="font-mono text-slate-700">{DB_LABELS[dbType]}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Instance</span>
                  <span className="font-mono text-slate-700">{dbName}</span>
                </div>
              </>
            )}
            {appType === 'upload' && (
              <>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">App Name</span>
                  <span className="font-mono text-slate-700">{appName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">File</span>
                  <span className="font-mono text-slate-700">{uploadFile?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Port</span>
                  <span className="font-mono text-slate-700">{port}</span>
                </div>
              </>
            )}
          </div>

          {result && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-3">
              {appType === 'web' ? 'Application' : appType === 'github' ? 'Application deployed from GitHub' : appType === 'upload' ? 'Application deployed from ZIP' : 'Database'} created successfully.
              {result.externalUrl && (
                <span className="ml-2">
                  <a href={result.externalUrl} target="_blank" rel="noopener" className="underline">Open URL</a>
                </span>
              )}
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
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} {busy ? 'Creating...' : 'Create & Deploy'}
          </PrimaryButton>
        )}
      </div>
    </Modal>
  );
}
