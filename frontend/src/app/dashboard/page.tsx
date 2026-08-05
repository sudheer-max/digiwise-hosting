'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-sm">
      Redirecting to console...
    </div>
  );
}
