'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import HostingView from '../../components/HostingView';
import { useApp } from '../context/AppContext';

export default function HostingPage() {
  const router = useRouter();
  const { selectPlan } = useApp();

  const handleConfigurePlan = (planName: string, price: number) => {
    selectPlan(planName, price);
    router.push('/checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <HostingView
      onConfigurePlan={handleConfigurePlan}
    />
  );
}
