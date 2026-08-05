import React from 'react';
import { Fingerprint } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';
import { AdminGate } from './common';

export default function SsoView() {
  return (
    <AdminGate title="SSO" subtitle="Single sign-on providers and trusted origins.">
      <div className="space-y-6">
        <SectionHeader title="SSO Providers" subtitle="Configured identity providers for single sign-on." />
        <EmptyState
          icon={<Fingerprint className="w-6 h-6" />}
          title="SSO managed externally"
          hint="Single sign-on is configured at the infrastructure level or via external identity providers. Manage SSO through your identity provider's admin console."
        />
      </div>
    </AdminGate>
  );
}
