import React from 'react';
import { HardDriveDownload } from 'lucide-react';
import { SectionHeader, EmptyState } from '../ui';
import { AdminGate } from './common';

export default function DestinationsView() {
  return (
    <AdminGate title="S3 Destinations" subtitle="Backup storage buckets for databases and volumes.">
      <div className="space-y-6">
        <SectionHeader title="S3 Destinations" subtitle="Object-storage destinations used for backups." />
        <EmptyState
          icon={<HardDriveDownload className="w-6 h-6" />}
          title="Destinations managed by MinIO"
          hint="Object storage is provided by MinIO (S3-compatible). Backup destinations are configured via Velero or database operator settings."
        />
      </div>
    </AdminGate>
  );
}
