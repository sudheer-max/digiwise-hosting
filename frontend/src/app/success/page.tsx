'use client';

import React, { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SuccessView from '../../components/SuccessView';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const WEBSITE_PLANS = ['Single Website', '10 Websites', '30 Websites'];

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const planName = searchParams.get('planName') || '';
  const isWebsitePlan = WEBSITE_PLANS.includes(planName);

  const orderDetails = useMemo(() => ({
    orderId: searchParams.get('orderId') || 'DGW-000000',
    planName: planName || 'Premium Hosting',
    price: 0,
    total: 0,
    clientName: searchParams.get('clientName') || user?.name || 'Customer',
    email: searchParams.get('email') || user?.email || '',
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
    currencySymbol: isWebsitePlan ? '\u20b9' : '$',
  }), [searchParams, planName, isWebsitePlan, user]);

  useEffect(() => {
    const email = searchParams.get('email') || user?.email;
    const name = searchParams.get('clientName') || user?.name;
    if (email) {
      api.sendConfirmation({
        planName: planName || 'Hosting Plan',
        orderId: searchParams.get('orderId') || 'SAMPLE',
        clientName: name || 'Valued Customer',
        email,
      }).catch(() => {});
    }
  }, [user]);

  const handleGoToDashboard = () => {
    if (isWebsitePlan) {
      router.push(`/create-website?plan=${encodeURIComponent(planName)}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/my-projects');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <SuccessView
      orderDetails={orderDetails}
      onGoToDashboard={handleGoToDashboard}
    />
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-sm">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
