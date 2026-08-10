'use client';

import { useEffect } from 'react';

export default function BillingPage() {
  useEffect(() => {
    window.location.href = '/console';
  }, []);
  return null;
}
