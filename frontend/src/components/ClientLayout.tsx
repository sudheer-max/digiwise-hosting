'use client';

import React, { useEffect } from 'react';
import { AppProvider, useApp } from '../app/context/AppContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import DigiWiseHeader from './DigiWiseHeader';
import DigiWiseFooter from './DigiWiseFooter';
import { usePathname, useRouter } from 'next/navigation';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { cartItems } = useApp();
  const { user, loading } = useAuth();
  const pathname = usePathname() || '/';
  const router = useRouter();

  const isConsole = pathname.startsWith('/console');
  const isPublicRoute = pathname === '/' ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/kb') ||
    pathname.startsWith('/status') ||
    pathname.startsWith('/legal/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/support');

  useEffect(() => {
    if (!user && !loading && !isPublicRoute) {
      router.replace('/auth/login');
    }
    if (user && !loading && (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup'))) {
      router.replace('/console');
    }
  }, [user, loading, isPublicRoute, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center">
        <div className="text-slate-400 font-medium text-sm">Loading...</div>
      </div>
    );
  }

  if (!user && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center">
        <div className="text-slate-400 font-medium text-sm">Redirecting to login...</div>
      </div>
    );
  }

  if (isConsole) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] font-sans antialiased text-slate-800">
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f5f7fb] font-sans antialiased text-slate-800 flex flex-col justify-between">
      <div>
        <DigiWiseHeader cartCount={cartItems.length} />
        <main className="pb-16">
          {children}
        </main>
      </div>
      <DigiWiseFooter />
    </div>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <AuthProvider>
        <LayoutContent>{children}</LayoutContent>
      </AuthProvider>
    </AppProvider>
  );
}
