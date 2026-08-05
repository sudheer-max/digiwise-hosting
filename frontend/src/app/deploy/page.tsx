'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeployPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hosting');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center">
      <div className="text-slate-400 font-medium text-sm">Redirecting to Hosting Console...</div>
    </div>
  );
}
