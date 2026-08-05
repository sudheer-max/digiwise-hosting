import React from 'react';
import { Clock } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function SchedulesView() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Schedules" subtitle="Cron-based automated deployments for your services." />
      <EmptyState
        icon={<Clock className="w-6 h-6" />}
        title="Schedules managed by Kubernetes"
        hint="Scheduled tasks are handled by Kubernetes CronJobs. Create CronJob resources via kubectl or ArgoCD to run tasks on a schedule."
      />
    </div>
  );
}
