import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function TemplatesView() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Templates"
        subtitle="Start from a one-click template."
      />
      <EmptyState
        icon={<LayoutTemplate className="w-6 h-6" />}
        title="Templates feature coming soon"
        hint="One-click templates for deploying popular applications and databases will be available in a future release."
      />
    </div>
  );
}
