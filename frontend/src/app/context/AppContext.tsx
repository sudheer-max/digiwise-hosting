'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../../lib/api';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number;
  taxRate: number;
}

export const currencyMap: Record<string, CurrencyInfo> = {
  'United States': { code: 'USD', symbol: '$', rate: 1, taxRate: 0 },
  'United Kingdom': { code: 'GBP', symbol: '£', rate: 0.79, taxRate: 0.20 },
  'Germany': { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.19 },
  'Japan': { code: 'JPY', symbol: '¥', rate: 149.50, taxRate: 0.10 },
  'Canada': { code: 'CAD', symbol: 'C$', rate: 1.36, taxRate: 0.05 },
  'Australia': { code: 'AUD', symbol: 'A$', rate: 1.54, taxRate: 0.10 },
  'India': { code: 'INR', symbol: '₹', rate: 83.12, taxRate: 0.18 },
  'Brazil': { code: 'BRL', symbol: 'R$', rate: 5.02, taxRate: 0.17 },
  'Singapore': { code: 'SGD', symbol: 'S$', rate: 1.34, taxRate: 0.09 },
  'France': { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.20 },
  'Italy': { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.22 },
  'Spain': { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.21 },
  'Netherlands': { code: 'EUR', symbol: '€', rate: 0.92, taxRate: 0.21 },
  'UAE': { code: 'AED', symbol: 'د.إ', rate: 3.67, taxRate: 0.05 },
};

export const countryCodeMap: Record<string, string> = {
  'United States': 'US', 'United Kingdom': 'GB', 'Germany': 'DE',
  'France': 'FR', 'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL',
  'Japan': 'JP', 'Canada': 'CA', 'Australia': 'AU', 'India': 'IN',
  'Brazil': 'BR', 'Singapore': 'SG', 'UAE': 'AE',
};

const codeToCountry: Record<string, string> = {
  'US': 'United States', 'GB': 'United Kingdom', 'DE': 'Germany',
  'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
  'JP': 'Japan', 'CA': 'Canada', 'AU': 'Australia', 'IN': 'India',
  'BR': 'Brazil', 'SG': 'Singapore', 'AE': 'UAE',
};

const localeToCountry: Record<string, string> = {
  'en-US': 'United States', 'en-GB': 'United Kingdom', 'de-DE': 'Germany',
  'fr-FR': 'France', 'it-IT': 'Italy', 'es-ES': 'Spain', 'nl-NL': 'Netherlands',
  'ja-JP': 'Japan', 'en-CA': 'Canada', 'en-AU': 'Australia', 'en-IN': 'India',
  'pt-BR': 'Brazil', 'en-SG': 'Singapore', 'ar-AE': 'UAE',
};

export function getDomainPrice(name: string): number {
  if (name.endsWith('.ai')) return 69.99;
  if (name.endsWith('.io')) return 45.00;
  if (name.endsWith('.net')) return 12.99;
  if (name.endsWith('.tech')) return 4.99;
  if (name.endsWith('.dev')) return 14.99;
  if (name.endsWith('.cloud')) return 11.99;
  return 9.99;
}

export interface CartItemOptions {
  years: number;
  autoRenew: boolean;
}

const defaultOptions: CartItemOptions = { years: 1, autoRenew: true };

interface AppContextType {
  cartItems: string[];
  cartOptions: Record<string, CartItemOptions>;
  selectedPlan: { name: string; price: number } | null;
  orderDetails: any | null;
  selectedCountry: string;
  addToCart: (name: string, options?: Partial<CartItemOptions>) => void;
  removeFromCart: (name: string) => void;
  updateCartOptions: (name: string, options: Partial<CartItemOptions>) => void;
  selectPlan: (name: string, price: number) => void;
  completePurchase: (details: any) => void;
  clearCart: () => void;
  setSelectedCountry: (country: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const COUNTRY_STORAGE_KEY = 'digiwise_country';
const CART_OPTIONS_KEY = 'digiwise_cart_options';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [cartOptions, setCartOptions] = useState<Record<string, CartItemOptions>>({});
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number } | null>(null);
  const [orderDetails, setOrderDetails] = useState<any | null>(null);
  const [selectedCountry, setSelectedCountryState] = useState('India');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedCart = localStorage.getItem('digiwise_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart items', e);
      }
    }
    const savedOptions = localStorage.getItem(CART_OPTIONS_KEY);
    if (savedOptions) {
      try {
        setCartOptions(JSON.parse(savedOptions));
      } catch (e) {
        console.error('Failed to parse cart options', e);
      }
    }
    const savedCountry = localStorage.getItem(COUNTRY_STORAGE_KEY);
    if (savedCountry && currencyMap[savedCountry]) {
      setSelectedCountryState(savedCountry);
      return;
    }
    api.getCountry().then((res: any) => {
      const country = codeToCountry[res.country];
      if (country) {
        setSelectedCountryState(country);
        localStorage.setItem(COUNTRY_STORAGE_KEY, country);
      }
    }).catch(() => {
      const locale = navigator.language;
      const country = localeToCountry[locale] || codeToCountry[locale.split('-')[1]?.toUpperCase()];
      if (country) {
        setSelectedCountryState(country);
        localStorage.setItem(COUNTRY_STORAGE_KEY, country);
      }
    });
  }, []);

  const persistCart = (items: string[], options: Record<string, CartItemOptions>) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('digiwise_cart', JSON.stringify(items));
    localStorage.setItem(CART_OPTIONS_KEY, JSON.stringify(options));
  };

  const setSelectedCountry = (country: string) => {
    setSelectedCountryState(country);
    localStorage.setItem(COUNTRY_STORAGE_KEY, country);
  };

  const addToCart = (name: string, options?: Partial<CartItemOptions>) => {
    if (!cartItems.includes(name)) {
      const newCart = [...cartItems, name];
      const newOptions = { ...cartOptions, [name]: { ...defaultOptions, ...options } };
      setCartItems(newCart);
      setCartOptions(newOptions);
      persistCart(newCart, newOptions);
    }
  };

  const removeFromCart = (name: string) => {
    const newCart = cartItems.filter((item) => item !== name);
    const newOptions = { ...cartOptions };
    delete newOptions[name];
    setCartItems(newCart);
    setCartOptions(newOptions);
    persistCart(newCart, newOptions);
  };

  const updateCartOptions = (name: string, options: Partial<CartItemOptions>) => {
    if (cartItems.includes(name)) {
      const existing = cartOptions[name] || defaultOptions;
      const newOptions = { ...cartOptions, [name]: { ...existing, ...options } };
      setCartOptions(newOptions);
      persistCart(cartItems, newOptions);
    }
  };

  const selectPlan = (name: string, price: number) => {
    setSelectedPlan({ name, price });
  };

  const completePurchase = (details: any) => {
    setOrderDetails(details);
    setCartItems([]);
    setCartOptions({});
    setSelectedPlan(null);
    localStorage.removeItem('digiwise_cart');
    localStorage.removeItem(CART_OPTIONS_KEY);
  };

  const clearCart = () => {
    setCartItems([]);
    setCartOptions({});
    localStorage.removeItem('digiwise_cart');
    localStorage.removeItem(CART_OPTIONS_KEY);
  };

  return (
    <AppContext.Provider
      value={{
        cartItems,
        cartOptions,
        selectedPlan,
        orderDetails,
        selectedCountry,
        addToCart,
        removeFromCart,
        updateCartOptions,
        selectPlan,
        completePurchase,
        clearCart,
        setSelectedCountry,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
