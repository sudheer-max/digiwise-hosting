'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { githubLogin } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing GitHub authentication...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage('GitHub authorization was denied.');
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No authorization code received from GitHub.');
      return;
    }

    githubLogin(code)
      .then(() => {
        setStatus('success');
        setMessage('Successfully authenticated with GitHub!');
        setTimeout(() => {
          router.push('/console');
        }, 1500);
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(err.message || 'GitHub authentication failed.');
      });
  }, [searchParams, githubLogin, router]);

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 p-10 shadow-sm max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <span className="w-10 h-10 border-4 border-[#00459c]/20 border-t-[#00459c] animate-spin rounded-full block mx-auto"></span>
            <p className="text-sm font-semibold text-slate-600">{message}</p>
          </div>
        )}
        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <p className="text-sm font-bold text-emerald-800">{message}</p>
            <p className="text-xs text-slate-400">Redirecting to console...</p>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <X className="w-6 h-6 stroke-[3]" />
            </div>
            <p className="text-sm font-bold text-rose-700">{message}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="mt-4 bg-[#00459c] hover:bg-[#003882] text-white font-bold py-2 px-6 text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 p-10 shadow-sm max-w-md w-full text-center">
          <div className="space-y-4">
            <span className="w-10 h-10 border-4 border-[#00459c]/20 border-t-[#00459c] animate-spin rounded-full block mx-auto"></span>
            <p className="text-sm font-semibold text-slate-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
