import React from 'react';
import { Gauge } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';

export default function RequestsView() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Requests" subtitle="Track HTTP request activity for your domains." />
      <EmptyState
        icon={<Gauge className="w-6 h-6" />}
        title="Request tracking managed by monitoring"
        hint="HTTP request metrics are collected by Prometheus and visualized in Grafana. Access the monitoring dashboard for request analytics."
      />
    </div>
  );
}
