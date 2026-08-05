import React from 'react';
import { Palette } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';
import { AdminGate } from './common';

export default function WhitelabelView() {
  return (
    <AdminGate title="Whitelabeling" subtitle="Brand the platform with your own identity.">
      <div className="space-y-6">
        <SectionHeader title="Whitelabeling" subtitle="Customize the name, logo and appearance shown to your users." />
        <EmptyState
          icon={<Palette className="w-6 h-6" />}
          title="Whitelabeling not available"
          hint="Platform branding is managed through the frontend configuration. Edit the theme settings in your deployment."
        />
      </div>
    </AdminGate>
  );
}
