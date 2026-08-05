import React from 'react';
import { Globe } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function WebServerView() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Web Server" subtitle="Configuration for the web server serving your static sites." />
      <EmptyState
        icon={<Globe className="w-6 h-6" />}
        title="Web server managed by K3s"
        hint="Static sites are served via Kubernetes Deployments and Traefik Ingress. Configure via IngressRoute resources."
      />
    </div>
  );
}
