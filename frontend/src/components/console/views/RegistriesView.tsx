import React from 'react';
import { Container } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';
import { AdminGate } from './common';

export default function RegistriesView() {
  return (
    <AdminGate title="Registries" subtitle="Manage container image registries.">
      <div className="space-y-6">
        <SectionHeader title="Registries" subtitle="App image registries for your deployments." />
        <EmptyState
          icon={<Container className="w-6 h-6" />}
          title="Registries managed by Harbor"
          hint="App images are stored in Harbor (harbor.digiwisesoftech.com). Push images directly to the registry."
        />
      </div>
    </AdminGate>
  );
}
