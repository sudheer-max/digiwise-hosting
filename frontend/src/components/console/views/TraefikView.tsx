import React from 'react';
import { FileCode2 } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';
import { AdminGate } from './common';

export default function TraefikView() {
  return (
    <AdminGate title="Traefik" subtitle="Reverse proxy configuration.">
      <div className="space-y-6">
        <SectionHeader title="Traefik File System" subtitle="Dynamic configuration, environment and file overrides for the reverse proxy." />
        <EmptyState
          icon={<FileCode2 className="w-6 h-6" />}
          title="Traefik managed by K3s"
          hint="Traefik is the default ingress controller for K3s. Configuration is managed via Helm values and IngressRoute CRDs."
        />
      </div>
    </AdminGate>
  );
}
