import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import DigiWiseHeader from './components/DigiWiseHeader';
import LandingView from './components/LandingView';
import DashboardView from './components/DashboardView';
import AdminDashboardView from './components/AdminDashboardView';
import HostingView from './components/HostingView';
import SupportView from './components/SupportView';
import BillingView from './components/BillingView';
import CheckoutView from './components/CheckoutView';
import SuccessView from './components/SuccessView';
import AuthView from './components/AuthView';
import DigiWiseFooter from './components/DigiWiseFooter';

function AppInner() {
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number } | null>(null);
  const [orderDetails, setOrderDetails] = useState<any | null>(null);
  const { isAdmin } = useAuth();

  const CLOUD_PLANS = new Set(['Hobby', 'Pro', 'Team', 'Trial']);

  const handleSelectPlan = (planName: string, price: number) => {
    if (CLOUD_PLANS.has(planName)) {
      setActiveTab('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSelectedPlan({ name: planName, price: price });
    setActiveTab('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePurchaseComplete = (details: any) => {
    setOrderDetails(details);
    setCartItems([]);
    setSelectedPlan(null);
    setActiveTab('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAuthScreen = activeTab.startsWith('auth');

  return (
    <div className="relative min-h-screen bg-[#f5f7fb] font-sans antialiased text-slate-800 flex flex-col justify-between">
      <div>
        {!isAuthScreen && (
          <DigiWiseHeader
            cartCount={cartItems.length}
            onNavigate={(tabId) => {
              setActiveTab(tabId);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        <main className={isAuthScreen ? "" : "pb-16"}>
          {activeTab === 'landing' && (
            <LandingView
              onSelectPlan={handleSelectPlan}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigate={(tabId) => {
                setActiveTab(tabId);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {activeTab === 'admin-dashboard' && isAdmin && (
            <AdminDashboardView />
          )}

          {activeTab === 'hosting' && (
            <HostingView
              onConfigurePlan={handleSelectPlan}
            />
          )}

          {activeTab === 'support' && (
            <SupportView />
          )}

          {activeTab === 'billing' && (
            <BillingView />
          )}

          {activeTab.startsWith('auth') && (
            <AuthView
              initialMode={activeTab === 'auth-signup' ? 'signup' : 'login'}
              onAuthSuccess={(email) => {
                setActiveTab('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onCancel={() => {
                setActiveTab('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {activeTab === 'checkout' && (
            <CheckoutView
              selectedPlan={selectedPlan}
              cartItems={cartItems}
              onPurchaseComplete={handlePurchaseComplete}
            />
          )}

          {activeTab === 'success' && (
            <SuccessView
              orderDetails={orderDetails}
              onGoToDashboard={() => {
                setActiveTab('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </main>
      </div>

      {!isAuthScreen && <DigiWiseFooter />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
