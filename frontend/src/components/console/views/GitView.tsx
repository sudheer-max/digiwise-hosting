import React from 'react';
import { GitBranch } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';
import { AdminGate } from './common';

export default function GitView() {
  return (
    <AdminGate title="Git" subtitle="Connect GitHub, GitLab, Bitbucket and Gitea accounts.">
      <div className="space-y-6">
        <SectionHeader title="Git Providers" subtitle="Connected source-control providers." />
        <EmptyState
          icon={<GitBranch className="w-6 h-6" />}
          title="Git providers managed externally"
          hint="Git integrations are configured via ArgoCD and Harbor. Manage repository connections through the cluster's GitOps configuration."
        />
      </div>
    </AdminGate>
  );
}
