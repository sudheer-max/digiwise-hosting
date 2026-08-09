import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';
import { AdminGate } from './common';

export default function CertificatesView() {
  return (
    <AdminGate title="Certificates" subtitle="SSL/TLS certificates for your domains.">
      <div className="space-y-6">
        <SectionHeader title="Certificates" subtitle="SSL certificates managed by cert-manager." />
        <EmptyState
          icon={<ShieldCheck className="w-6 h-6" />}
          title="Certificates managed automatically"
          hint="SSL/TLS certificates are automatically provisioned and renewed. Configure via routing annotations."
        />
      </div>
    </AdminGate>
  );
}
