import React, { useState } from 'react';
import { FolderKanban, Plus, Rocket, Database, Trash2, Loader2, Globe, Layers, ExternalLink, ShoppingCart, ArrowRight } from 'lucide-react';
import api from '../../../lib/api';
import { useConsole } from '../ConsoleShell';
import { SectionHeader, PrimaryButton, GhostButton, Loader, EmptyState, ErrorBanner, Modal, ConfirmDeleteDialog } from '../ui';

export default function ProjectsView() {
  const { data, navigate } = useConsole();
  const { projects, loading, error, refresh, hasPaidPlan } = data;
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

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

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionErr('');
    try {
      await api.deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
    } catch (err: any) {
      setActionErr(err.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Projects"
        subtitle={`${projects.length} project(s). Projects group your applications and databases.`}
        action={
          hasPaidPlan ? (
            <PrimaryButton onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> New Project
            </PrimaryButton>
          ) : (
            <a href="/checkout" className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 transition-colors">
              <ShoppingCart className="w-4 h-4" /> Purchase Plan to Create
            </a>
          )
        }
      />

      {error && <ErrorBanner message={error} onRetry={refresh} />}
      {actionErr && <ErrorBanner message={actionErr} />}

      {showCreate && (
        <Modal title={<span className="flex items-center gap-2"><FolderKanban className="w-4 h-4 text-[#00459c]" /> Create Project</span>} onClose={() => setShowCreate(false)}>
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Project name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                placeholder="my-project"
                className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#00459c]"
                required
                autoFocus
              />
              <p className="text-[10px] text-slate-400 mt-1">Lowercase letters, numbers, and hyphens only. This becomes the project identifier.</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Description</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What is this project for?"
                className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#00459c]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <GhostButton onClick={() => setShowCreate(false)}>Cancel</GhostButton>
              <PrimaryButton type="submit" disabled={creating || !name.trim()}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Project
              </PrimaryButton>
            </div>
          </form>
        </Modal>
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
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    {p.apps && <span className="flex items-center gap-0.5"><Rocket className="w-3 h-3" /> {p.apps.length}</span>}
                    {p.databases && <span className="flex items-center gap-0.5"><Database className="w-3 h-3" /> {p.databases.length}</span>}
                  </div>
                </div>
                <div className="font-display font-bold text-sm text-slate-900 truncate">{p.name}</div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{p.k8sNamespace || p.id}</div>
                {p.description && <div className="text-xs text-slate-500 mt-2 line-clamp-2">{p.description}</div>}
                {p.externalUrl && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-[#00459c]">
                    <Globe className="w-3 h-3" /> {p.externalUrl}
                  </div>
                )}
              </button>
              <div className="flex items-center gap-2 px-5 py-2.5 border-t border-slate-100">
                <GhostButton onClick={() => navigate({ name: 'project', projectId: p.id })} className="!text-[10px] !px-2 !py-1">
                  <Layers className="w-3 h-3" /> Open
                </GhostButton>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className="ml-auto text-slate-300 hover:text-rose-600 cursor-pointer p-1.5"
                  title="Delete project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          title="Delete Project"
          description={`Are you sure you want to delete "${deleteTarget.name}"? This will permanently remove the project and all its applications, databases, and resources.`}
          confirmName={deleteTarget.name}
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </div>
  );
}
