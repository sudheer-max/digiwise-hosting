import React, { useState } from 'react';
import { ShieldCheck, Check, Github, ArrowRight, HelpCircle, Lock, Server, Mail, Key, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthViewProps {
  initialMode?: 'login' | 'signup';
  onAuthSuccess: (userEmail: string) => void;
  onCancel: () => void;
}

export default function AuthView({ initialMode = 'login', onAuthSuccess, onCancel }: AuthViewProps) {
  const { login, register, githubLogin, sendOtp, verifyOtp } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const handleSendOtp = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address first');
      return;
    }
    setIsAuthenticating(true);
    setErrorMsg('');
    try {
      await sendOtp(email, 'signup');
      setOtpSent(true);
      setOtpCountdown(60);
      const timer = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg('Please enter a 6-digit code');
      return;
    }
    setIsAuthenticating(true);
    setErrorMsg('');
    try {
      await verifyOtp(email, otpCode, 'signup');
      setOtpVerified(true);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid OTP code');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setErrorMsg('');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!otpVerified) {
          setErrorMsg('Please verify your email first');
          setIsAuthenticating(false);
          return;
        }
        await register(email, password, name || email.split('@')[0]);
      }
      setSuccessMsg(`Successfully ${mode === 'login' ? 'logged in' : 'registered'}!`);
      setTimeout(() => onAuthSuccess(email), 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
      setIsAuthenticating(false);
    }
  };

  const handleGithubLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      setErrorMsg('GitHub login is not configured. Please set NEXT_PUBLIC_GITHUB_CLIENT_ID.');
      return;
    }
    const callbackUrl = window.location.origin + '/auth/github/callback';
    const scope = 'read:user,user:email';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}`;
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] text-slate-800 font-sans flex flex-col justify-between items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Server className="w-6 h-6 text-[#00459c]" />
          <span className="text-lg font-bold text-[#00459c] tracking-tight font-display">
            DigiWise Cloud Platform
          </span>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          &larr; Back to Landing
        </button>
      </div>

      <div className="w-full max-w-md bg-white border border-slate-200 p-8 shadow-sm relative overflow-hidden my-auto">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:16px_16px]"></div>

        <div className="relative z-10 border-b border-slate-100 pb-5 mb-6">
          <h2 className="text-xl font-extrabold text-[#002866] font-display">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {mode === 'login'
              ? 'Access your apps, databases, and cloud environment.'
              : 'Register to deploy and manage your cloud apps and databases.'}
          </p>
        </div>

        {successMsg ? (
          <div className="py-12 text-center space-y-4 relative z-10 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="text-base font-bold text-emerald-800">{successMsg}</h3>
            <p className="text-slate-400 text-xs max-w-xs mx-auto">
              Redirecting to your dashboard...
            </p>
          </div>
        ) : (
          <div className="relative z-10 space-y-6">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Name (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#00459c] focus:bg-white font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#00459c] focus:bg-white font-semibold"
                  required
                  disabled={otpVerified}
                />
              </div>

              {mode === 'signup' && (
                <>
                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isAuthenticating || !email}
                      className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white font-bold py-2.5 px-4 text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isAuthenticating ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin"></span>
                          SENDING...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          SEND VERIFICATION CODE
                        </>
                      )}
                    </button>
                  ) : !otpVerified ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                          <Key className="w-3 h-3" /> Verification Code
                        </label>
                        <input
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#00459c] focus:bg-white font-semibold"
                          maxLength={6}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={isAuthenticating || otpCode.length !== 6}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold py-2.5 px-4 text-xs uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {isAuthenticating ? 'VERIFYING...' : 'VERIFY CODE'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isAuthenticating || otpCountdown > 0}
                          className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-600 font-bold py-2.5 px-4 text-xs uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {otpCountdown > 0 ? `${otpCountdown}s` : 'RESEND'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4" /> Email verified successfully!
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Key className="w-3 h-3" /> Password
                </label>
                <input
                  type="password"
                  placeholder={mode === 'login' ? 'Your password' : 'Min 6 characters'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#00459c] focus:bg-white font-semibold"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isAuthenticating || (mode === 'signup' && !otpVerified)}
                className={`w-full bg-[#00459c] hover:bg-[#003882] disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isAuthenticating ? 'opacity-80 cursor-not-allowed' : ''
                }`}
              >
                {isAuthenticating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin"></span>
                    PROCESSING...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                  </>
                )}
              </button>
            </form>

            {process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-slate-400 font-semibold">OR</span>
                  </div>
                </div>

                <button
                  onClick={handleGithubLogin}
                  disabled={isAuthenticating}
                  className={`w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2.5 border border-slate-800 ${
                    isAuthenticating ? 'opacity-80 cursor-not-allowed' : ''
                  }`}
                >
                  {isAuthenticating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin"></span>
                      CONNECTING GITHUB AUTH...
                    </>
                  ) : (
                    <>
                      <Github className="w-4 h-4 fill-white" />
                      CONTINUE WITH GITHUB
                    </>
                  )}
                </button>
              </>
            )}

            <div className="text-center">
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setErrorMsg('');
                }}
                className="text-xs text-[#00459c] font-bold hover:underline cursor-pointer"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>

            <div className="flex items-center gap-1.5 justify-center py-2 border-t border-slate-50">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Secured with JWT Authentication
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center mt-12 gap-4 text-[11px] text-slate-400 font-medium">
        <div>&copy; 2026 DigiWise Platform Corp. All rights reserved.</div>
        <div className="flex items-center gap-4 sm:ml-auto">
          <button onClick={() => alert("Enterprise SLA v3.4.1 active")} className="hover:text-slate-700 hover:underline font-bold uppercase tracking-wider cursor-pointer">
            SLA parameters
          </button>
          <span>&middot;</span>
          <button onClick={() => alert("Zero-Trust security infrastructure")} className="hover:text-slate-700 hover:underline font-bold uppercase tracking-wider cursor-pointer">
            Security Policy
          </button>
          <span>&middot;</span>
          <button onClick={() => alert("Contact: support@digiwise-infra.io")} className="hover:text-slate-700 hover:underline font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer">
            <HelpCircle className="w-3.5 h-3.5" /> Support Help
          </button>
        </div>
      </div>
    </div>
  );
}
