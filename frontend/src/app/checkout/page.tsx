'use client';

import React from 'react';
import CheckoutView from '../../components/CheckoutView';
import { useApp } from '../context/AppContext';

export default function CheckoutPage() {
  const { selectedPlan, cartItems } = useApp();

  return (
    <CheckoutView
      selectedPlan={selectedPlan}
      cartItems={cartItems}
    />
  );
}
