'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthView from '../../../components/AuthView';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/console';

  const handleAuthSuccess = (email: string) => {
    router.push(returnTo);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    router.push('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AuthView
      initialMode="signup"
      onAuthSuccess={handleAuthSuccess}
      onCancel={handleCancel}
    />
  );
}
