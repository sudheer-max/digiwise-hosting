import React from 'react';
import { Sparkles } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function AiView() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI"
        subtitle="AI-powered features for your platform."
      />
      <EmptyState
        icon={<Sparkles className="w-6 h-6" />}
        title="AI features coming soon"
        hint="AI-powered log analysis, auto-scaling suggestions, and deployment assistance will be available in a future release."
      />
    </div>
  );
}
