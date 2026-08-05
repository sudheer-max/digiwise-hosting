import React from 'react';
import { Boxes } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function ComposeView() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Compose" subtitle="Multi-container application definitions." />
      <EmptyState
        icon={<Boxes className="w-6 h-6" />}
        title="Compose is not available"
        hint="Docker Compose is replaced by Kubernetes Deployments and Services. Use the Projects view to manage multi-container applications."
      />
    </div>
  );
}
