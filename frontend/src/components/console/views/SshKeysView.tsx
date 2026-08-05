import React from 'react';
import { KeyRound } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';
import { AdminGate } from './common';

export default function SshKeysView() {
  return (
    <AdminGate title="SSH Keys" subtitle="Manage SSH credentials used to connect to servers.">
      <div className="space-y-6">
        <SectionHeader title="SSH Keys" subtitle="Registered SSH key pairs for server connections." />
        <EmptyState
          icon={<KeyRound className="w-6 h-6" />}
          title="SSH keys managed via Kubernetes"
          hint="SSH access to nodes is managed at the infrastructure level. Use kubectl or the K3s kubeconfig for cluster access."
        />
      </div>
    </AdminGate>
  );
}
