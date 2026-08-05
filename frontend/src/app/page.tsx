'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import LandingView from '../components/LandingView';
import { useApp } from './context/AppContext';

export default function Home() {
  const router = useRouter();
  const { selectPlan } = useApp();

  const CLOUD_PLANS = new Set(['Hobby', 'Pro', 'Team', 'Trial']);

  const handleSelectPlan = (planName: string, price: number) => {
    if (CLOUD_PLANS.has(planName)) {
      router.push('/console');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    selectPlan(planName, price);
    router.push('/checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <LandingView
      onSelectPlan={handleSelectPlan}
    />
  );
}
