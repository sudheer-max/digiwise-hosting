'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AuthView from '../../../components/AuthView';

export default function SignupPage() {
  const router = useRouter();

  const handleAuthSuccess = (email: string) => {
    router.push('/console');
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
