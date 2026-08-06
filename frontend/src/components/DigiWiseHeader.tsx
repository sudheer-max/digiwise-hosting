'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Menu, X, User, Bell, ChevronDown, LogOut,
  Home, Layout, CreditCard, Server, Globe, Mail, HelpCircle, ShoppingCart, CheckCircle, ShieldCheck, BarChart3, Check, Terminal, Rocket, Boxes, Activity
} from 'lucide-react';
import { currencyMap, getDomainPrice, useApp } from '../app/context/AppContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  cartCount?: number;
  onNavigate?: (tabId: string) => void;
}

export default function DigiWiseHeader({ cartCount = 0, onNavigate }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';

  // Map pathname to active tab id
  let activeTab = 'landing';
  if (pathname === '/' || pathname === '') activeTab = 'landing';
  else if (pathname.includes('/dashboard')) activeTab = 'dashboard';
  else if (pathname.includes('/vps')) activeTab = 'dashboard';
  else if (pathname.includes('/domains')) activeTab = 'dashboard';
  else if (pathname.includes('/email')) activeTab = 'dashboard';
  else if (pathname.includes('/support')) activeTab = 'support';
  else if (pathname.includes('/billing')) activeTab = 'billing';
  else if (pathname.includes('/checkout')) activeTab = 'checkout';
  else if (pathname.includes('/success')) activeTab = 'success';
  else if (pathname.includes('/auth/signup')) activeTab = 'auth-signup';
  else if (pathname.includes('/auth/login')) activeTab = 'auth-login';

  const handleTabChange = (tabId: string) => {
    let path = '/';
    if (tabId === 'landing') path = '/';
    else if (tabId === 'auth-login') path = '/auth/login';
    else if (tabId === 'auth-signup') path = '/auth/signup';
    else path = `/${tabId}`;

    router.push(path);
    setIsMegaMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { selectedCountry, setSelectedCountry, cartItems, cartOptions } = useApp();
  const { user, loading, logout } = useAuth();
  const headerRef = useRef<HTMLDivElement>(null);
  const currency = currencyMap[selectedCountry] || currencyMap['United States'];

  // Close menus on clicking outside the entire header
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (target && !document.body.contains(target)) {
        return;
      }
      if (headerRef.current && !headerRef.current.contains(target)) {
        setIsMegaMenuOpen(false);
        setIsMobileMenuOpen(false);
        setIsCountryOpen(false);
        setIsCartOpen(false);
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Also close menus automatically when route changes
  useEffect(() => {
    setIsMegaMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsCountryOpen(false);
    setIsCartOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'billing', label: 'Billing' },
    { id: 'support', label: 'Support' },
  ];

  // Structured links for the Mega Menu with icons and descriptions
  const megaMenuCategories = [
    {
      categoryName: 'Platform',
      links: [
        { id: 'landing', label: 'Home', desc: 'Deploy apps, databases & sites in seconds', icon: Home },
        { id: 'dashboard', label: 'Management Console', desc: 'Projects, services & live infrastructure', icon: Layout },
        { id: 'billing', label: 'Billing & Invoices', desc: 'Invoices, transactions and balances', icon: CreditCard },
      ]
    },
    {
      categoryName: 'Deployments',
      links: [
        { id: 'email', label: 'Business Email', desc: 'Provision secure corporate mailboxes', icon: Mail },
        { id: 'support', label: 'Priority Support', desc: 'SLA ticket system and live support portal', icon: HelpCircle },
      ]
    }
  ];

  const labelCls = 'text-slate-600 hover:text-[#00459c]';
  const panelCls = 'absolute top-full right-0 mt-2 bg-white border border-slate-200 shadow-xl z-50 animate-fade-in';

  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            onClick={() => {
              setIsMegaMenuOpen(false);
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <img src="/DIGIWISE-SOFTECH-LOGO.png" alt="DigiWise Logo" className="h-8 w-auto" />
            <span className="text-xl font-bold text-slate-900 tracking-tight font-display">
              DigiWise<span className="text-[#00459c]">.</span>
            </span>
          </Link>

          {/* Desktop Nav - empty on desktop, links moved to hamburger */}
          <nav className="hidden xl:flex items-center flex-1"></nav>

          {/* Right Actions */}
          <div className="hidden xl:flex items-center gap-4">
            {user ? (
              <>
                {/* Mega Menu Toggle Button (private - logged in) */}
                <div className="relative">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                    className={`px-4 py-2 text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${isMegaMenuOpen ? 'text-[#00459c]' : labelCls}`}
                  >
                    Menu
                    <ChevronDown className={`w-4 h-4 pointer-events-none transition-transform duration-250 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 3-Column Mega Menu dropdown */}
                  {isMegaMenuOpen && (
                    <div className={`${panelCls} w-[720px] p-6 grid grid-cols-3 gap-6`}>
                      {megaMenuCategories.map((cat, idx) => (
                        <div key={idx} className="space-y-4">
                          <div className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase border-b border-slate-200 pb-1.5">
                            {cat.categoryName}
                          </div>
                          <div className="flex flex-col gap-2">
                            {cat.links.map((link) => {
                              const IconComp = link.icon;
                              const isActive = activeTab === link.id;
                              const inner = (
                                <>
                                  <div className={`p-1.5 flex-shrink-0 ${isActive ? 'bg-[#00459c]/10 text-[#00459c]' : 'bg-slate-100 text-slate-400'}`}>
                                    <IconComp className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold leading-tight text-slate-800">{link.label}</div>
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium leading-normal">{link.desc}</p>
                                  </div>
                                </>
                              );
                              return link.id === 'admin-dashboard' && onNavigate ? (
                                <button
                                  key={link.id}
                                  onClick={() => {
                                    onNavigate('admin-dashboard');
                                    setIsMegaMenuOpen(false);
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`w-full text-left p-2 transition-all flex items-start gap-3 cursor-pointer ${isActive ? 'bg-[#00459c]/5' : 'hover:bg-slate-50'}`}
                                >
                                  {inner}
                                </button>
                              ) : (
                                <Link
                                  href={link.id === 'landing' ? '/' : (link.id === 'auth-login' ? '/auth/login' : (link.id === 'auth-signup' ? '/auth/signup' : `/${link.id}`))}
                                  key={link.id}
                                  onClick={() => {
                                    setIsMegaMenuOpen(false);
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`w-full text-left p-2 transition-all flex items-start gap-3 cursor-pointer ${isActive ? 'bg-[#00459c]/5' : 'hover:bg-slate-50'}`}
                                >
                                  {inner}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <div className="col-span-3 bg-slate-50 p-3 flex items-center justify-between border-t border-slate-200 mt-2 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          Protected by DigiWise End-to-End Enterprise Encryption
                        </span>
                        <Link
                          href="/support"
                          onClick={() => { setIsMegaMenuOpen(false); }}
                          className="text-[#00459c] font-bold hover:underline"
                        >
                          Infrastructure SLA Document &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Country Selector */}
                <div className="relative">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setIsCountryOpen(!isCountryOpen)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#00459c] px-2 py-2 transition-colors cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{selectedCountry}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-250 ${isCountryOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isCountryOpen && (
                    <div className={`${panelCls} w-56 py-2 max-h-80 overflow-y-auto`}>
                      {Object.keys(currencyMap).map((country) => {
                        const c = currencyMap[country];
                        const isSel = country === selectedCountry;
                        return (
                          <button
                            key={country}
                            onClick={() => { setSelectedCountry(country); setIsCountryOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${isSel ? 'text-[#00459c] bg-[#00459c]/5' : 'text-slate-600'}`}
                          >
                            <span className="w-8 text-right">{c.symbol}</span>
                            <span className="flex-1">{country}</span>
                            <span className="text-slate-400">{c.code}</span>
                            {isSel && <Check className="w-3 h-3 text-[#00459c]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 border border-slate-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold tracking-wider text-[10px] text-slate-600">SUPPORT: 24/7 PRIORITY</span>
                </div>

                {/* Cart Icon with Popup */}
                <div className="relative">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setIsCartOpen(!isCartOpen)}
                    className="relative flex items-center gap-1 text-slate-600 hover:text-[#00459c] px-3 py-2 transition-colors cursor-pointer"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center bg-emerald-500 text-[9px] font-bold text-white">
                        {cartCount}
                      </span>
                    )}
                  </button>
                  {isCartOpen && (
                    <div className={`${panelCls} w-80`}>
                      <div className="p-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-sm">Shopping Cart</h4>
                          <span className="text-xs text-slate-500">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {cartCount === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500">
                          Your cart is empty.
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto">
                          {cartItems.map((item, idx) => {
                            const opts = cartOptions[item];
                            const yrs = opts?.years || 1;
                            const price = getDomainPrice(item);
                            const localPrice = (price * yrs * currency.rate).toFixed(2);
                            return (
                              <Link
                                key={item + idx}
                                href={"/purchase?id=" + encodeURIComponent(item)}
                                onClick={() => setIsCartOpen(false)}
                                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-bold text-slate-800 block truncate">{item}</span>
                                  <span className="text-[10px] text-slate-500">{yrs} {yrs === 1 ? 'Year' : 'Years'} Registration</span>
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                  <span className="font-bold text-slate-900 text-xs">{currency.symbol}{localPrice}</span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                      {cartCount > 0 && (
                        <div className="p-3 border-t border-slate-200">
                          <Link
                            href="/checkout"
                            onClick={() => setIsCartOpen(false)}
                            className="block w-full bg-[#00459c] hover:bg-[#0057c0] text-white text-center text-xs font-bold uppercase tracking-wider py-2.5 transition-colors cursor-pointer"
                          >
                            View Cart & Checkout &rarr;
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User dropdown with My Projects */}
                <div className="relative">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#00459c] transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    <span className="max-w-[120px] truncate">{user.email}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-250 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isUserMenuOpen && (
                    <div className={`${panelCls} w-56 py-2`}>
                      <Link
                        href="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#00459c] transition-colors cursor-pointer"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <Link
                        href="/billing"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#00459c] transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        Billing
                      </Link>
                      <div className="h-px bg-slate-100 my-1"></div>
                      <button
                        onClick={() => { logout(); router.push('/'); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Public Nav Links */}
                <Link href="/" className="text-xs font-bold text-slate-600 hover:text-[#00459c] px-2 py-2 transition-colors">Home</Link>
                <Link href="/kb" className="text-xs font-bold text-slate-600 hover:text-[#00459c] px-2 py-2 transition-colors">Docs</Link>
                <Link href="/about" className="text-xs font-bold text-slate-600 hover:text-[#00459c] px-2 py-2 transition-colors">About</Link>
                <Link href="/contact" className="text-xs font-bold text-slate-600 hover:text-[#00459c] px-2 py-2 transition-colors">Contact</Link>

                {/* Country Selector (public) */}
                <div className="relative">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setIsCountryOpen(!isCountryOpen)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#00459c] px-2 py-2 transition-colors cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{selectedCountry}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-250 ${isCountryOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isCountryOpen && (
                    <div className={`${panelCls} w-56 py-2 max-h-80 overflow-y-auto`}>
                      {Object.keys(currencyMap).map((country) => {
                        const c = currencyMap[country];
                        const isSel = country === selectedCountry;
                        return (
                          <button
                            key={country}
                            onClick={() => { setSelectedCountry(country); setIsCountryOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${isSel ? 'text-[#00459c] bg-[#00459c]/5' : 'text-slate-600'}`}
                          >
                            <span className="w-8 text-right">{c.symbol}</span>
                            <span className="flex-1">{country}</span>
                            <span className="text-slate-400">{c.code}</span>
                            {isSel && <Check className="w-3 h-3 text-[#00459c]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 border border-slate-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold tracking-wider text-[10px] text-slate-600">SUPPORT: 24/7 PRIORITY</span>
                </div>

                <Link
                  href="/auth/login"
                  onClick={() => { setIsMegaMenuOpen(false); setIsCartOpen(false); }}
                  className="bg-[#00459c] hover:bg-[#0057c0] text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 transition-colors shadow-sm cursor-pointer"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="xl:hidden flex items-center gap-3">
            {user && cartCount > 0 && (
              <Link
                href="/checkout"
                className="relative flex items-center text-slate-600 hover:text-[#00459c] p-2 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center bg-emerald-500 text-[9px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 bg-slate-100 px-2 py-1 border border-slate-200">
              <span className="h-1.5 w-1.5 bg-emerald-500"></span>
              <span className="font-bold">24/7 SUPPORT</span>
            </div>

            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-[#00459c] hover:bg-slate-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 pointer-events-none" /> : <Menu className="w-6 h-6 pointer-events-none" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-slate-200 animate-fade-in py-4 px-4 flex flex-col gap-2">

          {user ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 mb-2 bg-slate-50 border border-slate-200">
                <User className="w-4 h-4 text-[#00459c]" />
                <span className="text-xs font-bold text-slate-800 truncate">{user.email}</span>
              </div>

              <div className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase border-b border-slate-200 pb-1.5 mb-1">
                Explore All Links
              </div>

              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <Link
                    href={item.id === 'landing' ? '/' : `/${item.id}`}
                    key={item.id}
                    onClick={() => { setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${isActive ? 'bg-[#00459c]/5 text-[#00459c]' : 'text-slate-600 hover:bg-slate-50 hover:text-[#00459c]'}`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <Link
                href="/email"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-slate-600 hover:bg-slate-50 hover:text-[#00459c]"
              >
                Business Email
              </Link>

              {onNavigate && (
                <button
                  onClick={() => {
                    onNavigate('admin-dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'admin-dashboard' ? 'bg-[#00459c]/5 text-[#00459c]' : 'text-slate-600 hover:bg-slate-50 hover:text-[#00459c]'}`}
                >
                  Admin Dashboard
                  <span className="ml-2 bg-amber-500 text-[9px] font-bold text-white px-1.5 py-0.5 uppercase">Admin</span>
                </button>
              )}

              {cartCount > 0 && (
                <Link
                  href="/checkout"
                  onClick={() => { setIsMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 text-slate-600 hover:bg-slate-50 hover:text-[#00459c]"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Cart
                  <span className="ml-auto bg-emerald-500 text-[10px] font-bold text-white px-2 py-0.5">
                    {cartCount} items
                  </span>
                </Link>
              )}

              <div className="h-px bg-slate-100 my-2"></div>
              <button
                onClick={() => { logout(); router.push('/'); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <div className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase border-b border-slate-200 pb-1.5 mb-1">
                Welcome
              </div>
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 hover:text-[#00459c] transition-colors cursor-pointer">
                Home
              </Link>
              <Link href="/kb" onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 hover:text-[#00459c] transition-colors cursor-pointer">
                Docs
              </Link>
              <Link href="/about" onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 hover:text-[#00459c] transition-colors cursor-pointer">
                About
              </Link>
              <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 hover:text-[#00459c] transition-colors cursor-pointer">
                Contact
              </Link>
              <div className="h-px bg-slate-100 my-2"></div>
              <div className="flex items-center justify-between gap-4 p-2">
                <Link
                  href="/auth/login"
                  onClick={() => { setIsMobileMenuOpen(false); }}
                  className="flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Log In
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => { setIsMobileMenuOpen(false); }}
                  className="flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white bg-[#00459c] hover:bg-[#0057c0] transition-all cursor-pointer"
                >
                  Get Started
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
