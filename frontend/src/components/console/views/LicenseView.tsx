import React from 'react';
import { KeyRound } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';
import { AdminGate } from './common';

export default function LicenseView() {
  return (
    <AdminGate title="License" subtitle="Enterprise license management.">
      <div className="space-y-6">
        <SectionHeader title="License" subtitle="Enterprise features and license status." />
        <EmptyState
          icon={<KeyRound className="w-6 h-6" />}
          title="License not applicable"
          hint="DigiWise Hosting does not require a license key. All features are available based on your plan."
        />
      </div>
    </AdminGate>
  );
}
