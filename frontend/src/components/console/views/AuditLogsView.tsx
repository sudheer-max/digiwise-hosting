import React from 'react';
import { ScrollText } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function AuditLogsView() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Audit Logs"
        subtitle="Record of every action performed across the platform."
      />
      <EmptyState
        icon={<ScrollText className="w-6 h-6" />}
        title="Audit logs available via kubectl"
        hint="Use 'kubectl get events -n digiwise-backend' to view platform audit logs."
      />
    </div>
  );
}
