import React from 'react';
import { Bell } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';
import { AdminGate } from './common';

export default function NotificationsView() {
  return (
    <AdminGate title="Notifications" subtitle="Configure notification channels for deployment events.">
      <div className="space-y-6">
        <SectionHeader title="Notifications" subtitle="Channels that receive alerts about your deployments." />
        <EmptyState
          icon={<Bell className="w-6 h-6" />}
          title="Notifications managed by management system"
          hint="Deployment notifications are handled by the platform's management system. Configure alerts via the dashboard."
        />
      </div>
    </AdminGate>
  );
}
