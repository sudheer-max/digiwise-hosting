'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  githubLogin: (code: string) => Promise<void>;
  sendOtp: (email: string, purpose: 'signup' | 'reset') => Promise<void>;
  verifyOtp: (email: string, code: string, purpose: 'signup' | 'reset') => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('digiwise_token') : null;

    setLoading(false);

    if (!token) return;

    api.setToken(token);
    api.getMe()
      .then((userData) => {
        if (!cancelled) setUser(userData as User);
      })
      .catch(() => {
        api.setToken(null);
      });

    return () => { cancelled = true; };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    api.setToken(res.token);
    setUser(res.user as User);
  };

  const register = async (email: string, password: string, name?: string) => {
    const res = await api.register(email, password, name);
    api.setToken(res.token);
    setUser(res.user as User);
  };

  const githubLogin = async (code: string) => {
    const res = await api.githubAuth(code);
    api.setToken(res.token);
    setUser(res.user as User);
  };

  const sendOtp = async (email: string, purpose: 'signup' | 'reset') => {
    await api.sendOtp(email, purpose);
  };

  const verifyOtp = async (email: string, code: string, purpose: 'signup' | 'reset') => {
    await api.verifyOtp(email, code, purpose);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, githubLogin, sendOtp, verifyOtp, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
