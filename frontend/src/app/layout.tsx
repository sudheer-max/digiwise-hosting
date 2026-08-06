'use client';

import React, { useEffect } from 'react';
import '../index.css';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import DigiWiseHeader from '../components/DigiWiseHeader';
import DigiWiseFooter from '../components/DigiWiseFooter';
import { usePathname, useRouter } from 'next/navigation';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { cartItems } = useApp();
  const { user, loading } = useAuth();
  const pathname = usePathname() || '/';
  const router = useRouter();

  const isAuthScreen = pathname.startsWith('/auth/');
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
  }, [user, loading, isPublicRoute, router]);

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>DigiWise Kubernetes - Enterprise K3s Cloud Platform</title>
        <meta name="description" content="Managed Kubernetes platform with K3s, Traefik, ArgoCD, Longhorn and CloudNativePG. Deploy apps, databases and sites on a production-grade cluster." />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/DIGIWISE-SOFTECH-LOGO.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00459c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DigiWise" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js'); }); }`,
          }}
        />
      </head>
      <body>
        <AppProvider>
          <AuthProvider>
            <LayoutContent>{children}</LayoutContent>
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}
