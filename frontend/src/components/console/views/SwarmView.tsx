import React from 'react';
import { Network } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function SwarmView() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Swarm"
        subtitle="Container orchestration."
      />
      <EmptyState
        icon={<Network className="w-6 h-6" />}
        title="Docker Swarm not supported"
        hint="This platform uses a cloud engine for orchestration. Docker Swarm is not available."
      />
    </div>
  );
}
