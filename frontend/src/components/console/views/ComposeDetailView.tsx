import React from 'react';
import { Boxes } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function ComposeDetailView({ composeId }: { composeId: string }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title={<span className="flex items-center gap-2"><Boxes className="w-6 h-6 text-amber-500" /> Compose Project</span>}
        subtitle={<span className="font-mono">{composeId}</span>}
      />
      <EmptyState
        icon={<Boxes className="w-6 h-6" />}
        title="Compose is not available"
        hint="Docker Compose is replaced by Kubernetes Deployments and Services. Use the Applications view to manage multi-container applications."
      />
    </div>
  );
}
