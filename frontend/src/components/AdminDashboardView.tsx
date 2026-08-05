import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Layers, Server, Boxes, RefreshCw, Loader2, Activity,
  ShieldCheck, Database, Rocket, Clock, AlertTriangle
} from 'lucide-react';
import api from '../lib/api';

export default function AdminDashboardView() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [cluster, setCluster] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'projects' | 'cluster'>('overview');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, usersData, projectsData, clusterData, healthData] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getAdminUsers().catch(() => []),
        api.listProjects().catch(() => []),
        api.getAdminCluster().catch(() => null),
        api.getAdminHealth().catch(() => null),
      ]);
      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setCluster(clusterData);
      setHealth(healthData);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const statCards = [
    { label: 'Users', value: stats?.users ?? 0, icon: Users, color: 'text-[#00459c] bg-[#00459c]/10' },
    { label: 'Projects', value: stats?.projects ?? 0, icon: Layers, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Applications', value: stats?.applications ?? 0, icon: Rocket, color: 'text-amber-600 bg-amber-50' },
    { label: 'Databases', value: stats?.databases ?? 0, icon: Database, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Platform + Kubernetes infrastructure overview.</p>
        </div>
        <button
          onClick={fetchAll}
          className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1.5 w-fit">
        {(['overview', 'users', 'projects', 'cluster'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer capitalize ${activeTab === tab ? 'bg-white text-[#00459c] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s) => (
                  <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 font-mono">{s.value}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {health && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-[#00459c]" /> Kubernetes Cluster Health
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(Array.isArray(health) ? health : [health]).map((h: any, i: number) => (
                      <div key={i} className={`border rounded-xl p-4 ${h?.error ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className={`w-4 h-4 ${h?.error ? 'text-rose-500' : 'text-emerald-600'}`} />
                          <span className="text-xs font-bold text-slate-800">{h?.name || h?.service || h?.component || `Service ${i + 1}`}</span>
                        </div>
                        <div className={`text-[10px] font-mono mt-1 ${h?.error ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {h?.error || h?.status || h?.healthy === false ? 'ERROR' : 'HEALTHY'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-2">Email</th>
                    <th className="py-3 px-2">Name</th>
                    <th className="py-3 px-2">Role</th>
                    <th className="py-3 px-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 px-2 font-medium text-slate-700">{u.email}</td>
                      <td className="py-3 px-2 text-slate-600">{u.name || '-'}</td>
                      <td className="py-3 px-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${u.role === 'admin' ? 'bg-[#00459c]/10 text-[#00459c]' : 'bg-slate-100 text-slate-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.length === 0 ? (
                <div className="col-span-full text-center py-12 text-sm text-slate-400 bg-white border border-slate-200 rounded-2xl">
                  <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-3" /> No projects found.
                </div>
              ) : projects.map((p: any) => (
                <div key={p.id || p.name} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <Boxes className="w-5 h-5 text-[#00459c]" />
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      {p.deployments ?? 0} deployments
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 truncate">{p.name}</div>
                   <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">{p.k8sNamespace || p.id}</div>
                  <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cluster' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
              {cluster ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                      <Server className="w-4 h-4 text-[#00459c]" /> Kubernetes Cluster
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="border border-slate-200 rounded-xl p-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nodes</div>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{cluster.nodes ?? '-'}</div>
                      </div>
                      <div className="border border-slate-200 rounded-xl p-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Namespaces</div>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{cluster.namespaces ?? '-'}</div>
                      </div>
                      <div className="border border-slate-200 rounded-xl p-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Version</div>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{cluster.version || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {cluster.nodeDetails?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-600 mb-2">Node Details</h4>
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-2">Name</th>
                            <th className="py-3 px-2">Status</th>
                            <th className="py-3 px-2">Roles</th>
                            <th className="py-3 px-2">Version</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cluster.nodeDetails.map((node: any, i: number) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="py-3 px-2 font-medium text-slate-700">{node.name || '-'}</td>
                              <td className="py-3 px-2">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${node.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {node.ready ? 'Ready' : 'NotReady'}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-slate-600">{node.roles || '-'}</td>
                              <td className="py-3 px-2 font-mono text-slate-500">{node.version || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400">
                  <Server className="w-10 h-10 text-slate-300 mx-auto mb-3" /> No cluster data available.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
