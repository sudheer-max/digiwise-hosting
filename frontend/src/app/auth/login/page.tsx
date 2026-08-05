'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AuthView from '../../../components/AuthView';

export default function LoginPage() {
  const router = useRouter();

  const handleAuthSuccess = (email: string) => {
    // Navigate to the console on successful login
    router.push('/console');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    router.push('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AuthView
      initialMode="login"
      onAuthSuccess={handleAuthSuccess}
      onCancel={handleCancel}
    />
  );
}
