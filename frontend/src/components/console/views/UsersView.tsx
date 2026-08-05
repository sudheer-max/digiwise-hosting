import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import { ResourcePage, PageTable, StatusPill, DateTime, KV, DetailPanel } from './common';
import { Modal, PrimaryButton, GhostButton, FieldGrid } from '../ui';
import { AdminGate } from './common';

export default function UsersView() {
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await api.getAdminUsers();
      setUsers(Array.isArray(res) ? res : []);
    } catch { setUsers([]); }
    setLoadingUsers(false);
  }, []);

  useEffect(() => { loadUsers(); }, [refreshTick, loadUsers]);

  return (
    <AdminGate title="Users" subtitle="Manage platform users and their roles.">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Users</h2>
            <p className="text-xs text-slate-400">All registered users on the platform.</p>
          </div>
          <PrimaryButton onClick={() => window.location.href = '/auth/register'}>Register New User</PrimaryButton>
        </div>

        {loadingUsers ? (
          <div className="text-center py-14 text-sm text-slate-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-14 text-sm text-slate-400">No users found.</div>
        ) : (
          <PageTable
            rowKey={(u) => u.id || u.userId}
            onRowClick={setSelected}
            columns={[
              { key: 'name', label: 'Name', render: (u) => <span className="font-bold text-slate-900">{u.name || u.email}</span> },
              { key: 'email', label: 'Email', render: (u) => <span className="text-xs">{u.email}</span> },
              { key: 'role', label: 'Role', render: (u) => <StatusPill status={u.role || 'member'} /> },
              { key: 'createdAt', label: 'Created', render: (u) => <DateTime value={u.createdAt} /> },
            ]}
            rows={users}
          />
        )}

        {selected && (
          <DetailPanel title={<span>{selected.name || selected.email}</span>} onClose={() => setSelected(null)}>
            <KV label="ID" value={<code className="text-xs">{selected.id || selected.userId}</code>} />
            <KV label="Name" value={selected.name} />
            <KV label="Email" value={selected.email} />
            <KV label="Role" value={<StatusPill status={selected.role} />} />
            <KV label="Created" value={<DateTime value={selected.createdAt} />} />
          </DetailPanel>
        )}
      </div>
    </AdminGate>
  );
}
