import React from 'react';
import { Globe } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function WebServerView() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Web Server" subtitle="Configuration for the web server serving your static sites." />
      <EmptyState
        icon={<Globe className="w-6 h-6" />}
        title="Web server managed by cloud engine"
        hint="Static sites are served via the platform's deployment and routing system. Configure via the dashboard."
      />
    </div>
  );
}
