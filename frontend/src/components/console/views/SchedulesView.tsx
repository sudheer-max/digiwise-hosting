import React from 'react';
import { Clock } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function SchedulesView() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Schedules" subtitle="Cron-based automated deployments for your services." />
      <EmptyState
        icon={<Clock className="w-6 h-6" />}
        title="Scheduled tasks"
        hint="Scheduled tasks are handled by the platform's scheduling system. Create scheduled tasks via the dashboard to run tasks on a schedule."
      />
    </div>
  );
}
