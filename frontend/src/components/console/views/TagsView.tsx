import React from 'react';
import { Tag } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function TagsView() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tags"
        subtitle="Organize projects with colored tags."
      />
      <EmptyState
        icon={<Tag className="w-6 h-6" />}
        title="Tags feature coming soon"
        hint="You'll be able to create colored tags to organize and filter your projects."
      />
    </div>
  );
}
