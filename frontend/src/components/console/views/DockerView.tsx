import React, { useState, useEffect } from 'react';
import { Container, Box, RefreshCw } from 'lucide-react';
import api from '../../../lib/api';
import { ResourcePage, PageTable, StatusPill, KV, DetailPanel } from './common';

export default function DockerView() {
  const [selected, setSelected] = useState<any>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  return (
    <ResourcePage
      title="Services"
      subtitle="Inspect running services across your cloud environment."
      icon={<Container className="w-6 h-6" />}
      deps={[refreshTick]}
      loader={async () => {
        const pods = await api.getAdminClusterPods().catch(() => []);
        return Array.isArray(pods) ? pods : [];
      }}
      empty={<div className="text-center py-14 text-sm text-slate-400">No services found.</div>}
      children={(rows) => {
        const list = Array.isArray(rows) ? rows : [];
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setRefreshTick((t) => t + 1)} className="text-slate-400 hover:text-[#00459c] p-1.5 cursor-pointer" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <PageTable
              rowKey={(p) => p.metadata?.name || p.name || Math.random()}
              onRowClick={setSelected}
              columns={[
                { key: 'name', label: 'Service', render: (p) => <span className="font-mono text-xs font-bold text-slate-900">{p.metadata?.name || p.name}</span> },
                { key: 'namespace', label: 'Project', render: (p) => <span className="text-xs text-slate-600">{p.metadata?.namespace || p.namespace || '—'}</span> },
                { key: 'status', label: 'Status', render: (p) => <StatusPill status={p.status?.phase || p.status || 'Unknown'} /> },
                { key: 'node', label: 'Node', render: (p) => <span className="text-xs text-slate-500">{p.spec?.nodeName || p.node || '—'}</span> },
                { key: 'restarts', label: 'Restarts', render: (p) => <span className="text-xs">{p.status?.containerStatuses?.[0]?.restartCount ?? '—'}</span> },
              ]}
              rows={list}
            />

            {selected && (
              <DetailPanel title={<span className="font-mono">{selected.metadata?.name || selected.name}</span>} icon={<Box className="w-4 h-4 text-[#00459c]" />} onClose={() => setSelected(null)}>
                <KV label="Name" value={selected.metadata?.name || selected.name} />
                <KV label="Project" value={selected.metadata?.namespace || selected.namespace} />
                <KV label="Status" value={<StatusPill status={selected.status?.phase || selected.status} />} />
                <KV label="Node" value={selected.spec?.nodeName || selected.node || '—'} />
                <KV label="IP Address" value={selected.status?.podIP || selected.podIP || '—'} />
                <KV label="Restart Count" value={String(selected.status?.containerStatuses?.[0]?.restartCount ?? 0)} />
                <KV label="Created" value={selected.metadata?.creationTimestamp || selected.createdAt || '—'} />
              </DetailPanel>
            )}
          </div>
        );
      }}
    />
  );
}
