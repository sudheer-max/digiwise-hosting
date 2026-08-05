import React, { useState } from 'react';
import { FolderKanban, Plus, Rocket, Database, Trash2, Loader2 } from 'lucide-react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import { SectionHeader, PrimaryButton, GhostButton, Loader, EmptyState, ErrorBanner } from '../ui';

export default function ProjectsView() {
  const { data, navigate } = useConsole();
  const { projects, loading, error, refresh } = data;
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionErr, setActionErr] = useState('');

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setActionErr('');
    try {
      const res: any = await api.createProject({ name: name.trim(), description: desc.trim() || undefined });
      const created = res?.project || res;
      const pid = created?.id;
      setName('');
      setDesc('');
      setShowCreate(false);
      await refresh();
      if (pid) navigate({ name: 'project', projectId: pid });
    } catch (err: any) {
      setActionErr(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (proj: any) => {
    if (!confirm(`Delete project "${proj.name}"?\nThis will permanently remove the project and all its services.`)) return;
    setActionErr('');
    try {
      await api.deleteProject(proj.id);
      await refresh();
    } catch (err: any) {
      setActionErr(err.message || 'Failed to delete project');
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Projects"
        subtitle={`${projects.length} project(s). Projects group your applications and databases.`}
        action={
          <PrimaryButton onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? <Plus className="w-4 h-4 rotate-45" /> : <Plus className="w-4 h-4" />} New Project
          </PrimaryButton>
        }
      />

      {error && <ErrorBanner message={error} onRetry={refresh} />}
      {actionErr && <ErrorBanner message={actionErr} />}

      {showCreate && (
        <form onSubmit={create} className="bg-white border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Project name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-project"
                className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#00459c]"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Description</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#00459c]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Project
            </PrimaryButton>
            <GhostButton onClick={() => setShowCreate(false)}>Cancel</GhostButton>
          </div>
        </form>
      )}

      {loading ? (
        <Loader label="Loading projects..." />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-6 h-6" />}
          title="No projects yet"
          hint="Create a project to organize your applications and databases."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 shadow-sm hover:border-[#00459c]/40 hover:shadow-md transition-all group">
              <button onClick={() => navigate({ name: 'project', projectId: p.id })} className="w-full text-left p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-[#00459c]/10 flex items-center justify-center">
                    <FolderKanban className="w-4.5 h-4.5 text-[#00459c]" />
                  </div>
                </div>
                <div className="font-display font-bold text-sm text-slate-900 truncate">{p.name}</div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{p.k8sNamespace || p.id}</div>
                {p.description && <div className="text-xs text-slate-500 mt-2 line-clamp-2">{p.description}</div>}
              </button>
              <div className="flex items-center gap-3 px-5 py-2.5 border-t border-slate-100">
                <button
                  onClick={() => remove(p)}
                  className="ml-auto text-slate-300 hover:text-rose-600 cursor-pointer p-1"
                  title="Delete project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
