'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Loader2, ArrowRight, Check, AlertCircle, Shield, Globe,
  ChevronRight, Eye, EyeOff, Settings, Wifi, Server
} from 'lucide-react';
import api from '../lib/api';

type Step = 'provider' | 'credentials' | 'testing' | 'success';

const PROVIDERS = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: '✉️',
    description: 'Connect your Gmail or Google Workspace account',
    color: 'bg-red-50 border-red-200 hover:border-red-400',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    helpUrl: 'https://myaccount.google.com/apppasswords',
    helpText: 'Generate an App Password',
    instructions: [
      'Go to Google Account Settings',
      'Enable 2-Step Verification if not enabled',
      'Go to "App Passwords" section',
      'Select "Mail" and "Other" (name it "DigiWise")',
      'Click "Generate" and copy the 16-character password',
    ],
  },
  {
    id: 'outlook',
    name: 'Outlook / Microsoft 365',
    icon: '🔷',
    description: 'Connect your Outlook, Hotmail, or Microsoft 365 account',
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    helpUrl: 'https://account.microsoft.com/security',
    helpText: 'Manage app passwords',
    instructions: [
      'Go to Microsoft Account Security settings',
      'Enable "Two-step verification" if not enabled',
      'Create an "App password" under "App passwords"',
      'Copy the generated password',
      'Use your full email address as the username',
    ],
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    icon: '🟣',
    description: 'Connect your Yahoo Mail account',
    color: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 587,
    helpUrl: 'https://login.yahoo.com/myaccount/security',
    helpText: 'Generate app password',
    instructions: [
      'Go to Yahoo Account Security settings',
      'Enable "Two-step verification" if not enabled',
      'Click "Generate app password"',
      'Select "Other App" and name it "DigiWise"',
      'Copy the generated password',
    ],
  },
  {
    id: 'zoho',
    name: 'Zoho Mail',
    icon: '🔴',
    description: 'Connect your Zoho Mail account',
    color: 'bg-orange-50 border-orange-200 hover:border-orange-400',
    imapHost: 'imap.zoho.com',
    imapPort: 993,
    smtpHost: 'smtp.zoho.com',
    smtpPort: 587,
    helpUrl: 'https://www.zoho.com/mail/help/app-passwords.html',
    helpText: 'Generate app password',
    instructions: [
      'Go to Zoho Mail Settings',
      'Navigate to "Security" > "App Passwords"',
      'Click "Generate New App Password"',
      'Name it "DigiWise" and click "Generate"',
      'Copy the generated password',
    ],
  },
  {
    id: 'custom',
    name: 'Custom / Other Provider',
    icon: '⚙️',
    description: 'Connect any IMAP/SMTP email provider',
    color: 'bg-slate-50 border-slate-200 hover:border-slate-400',
    imapHost: '',
    imapPort: 993,
    smtpHost: '',
    smtpPort: 587,
    instructions: [
      'Enter your email provider\'s IMAP server details',
      'Enter your email provider\'s SMTP server details',
      'Use your email password or app-specific password',
      'Contact your email provider for server details',
    ],
  },
];

export default function EmailSetupView() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('provider');
  const [selectedProvider, setSelectedProvider] = useState<typeof PROVIDERS[0] | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fromName, setFromName] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [showPassword, setShowPassword] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // State
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [existingAccounts, setExistingAccounts] = useState<any[]>([]);

  // Load existing accounts
  useEffect(() => {
    const token = api.getEmailToken();
    if (token) {
      api.checkEmailSession().then((data: any) => {
        if (data?.configured) {
          // Already connected, go to inbox
          router.push('/email');
        }
      }).catch(() => {
        api.clearEmailToken();
      });
    }
    // Load saved accounts
    api.getEmailAccounts().then((accs: any) => {
      setExistingAccounts(Array.isArray(accs) ? accs : []);
    }).catch(() => {});

    // Check trial status
    api.getEmailTrialStatus().then((trial: any) => {
      if (trial?.hasAccess) {
        // Trial active, can proceed
      } else if (trial?.trialExpired) {
        // Trial expired, redirect to purchase
        router.push('/email/hosting');
      }
    }).catch(() => {});
  }, [router]);

  const selectProvider = (provider: typeof PROVIDERS[0]) => {
    setSelectedProvider(provider);
    setImapHost(provider.imapHost);
    setImapPort(provider.imapPort);
    setSmtpHost(provider.smtpHost);
    setSmtpPort(provider.smtpPort);
    setStep('credentials');
    setError('');
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setStep('testing');
    setTesting(true);
    setError('');
    setTestResult(null);

    try {
      // Create session first
      await api.createEmailSession({
        email,
        password,
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        fromName: fromName || undefined,
      });

      // Test the connection
      const inbox = await api.listInbox();
      const inboxCount = Array.isArray(inbox) ? inbox.length : 0;

      // Save account
      await api.createEmailAccount({
        email,
        provider: selectedProvider?.id || 'custom',
        imapHost,
        imapPort,
        smtpHost,
        smtpPort,
        username: username || email,
        password,
        fromName: fromName || undefined,
      });

      setTestResult({
        success: true,
        message: `Connected successfully! Found ${inboxCount} messages in inbox.`,
      });

      setStep('success');

      // Redirect to inbox after 2 seconds
      setTimeout(() => {
        router.push('/email');
      }, 2000);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to connect. Please check your credentials.',
      });
      setStep('credentials');
    }
    setTesting(false);
  };

  const goBack = () => {
    if (step === 'credentials') {
      setStep('provider');
      setError('');
    } else if (step === 'testing') {
      setStep('credentials');
    }
  };

  // ====== STEP: SELECT PROVIDER ======
  if (step === 'provider') {
    return (
      <div className="min-h-screen bg-[#f6f8fc] flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00459c] flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Connect Email Account</h1>
                <p className="text-xs text-slate-500">Step 1 of 2 — Choose your email provider</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-[#00459c] text-white flex items-center justify-center text-xs font-bold rounded-full">1</div>
              <div className="flex-1 h-1 bg-[#00459c] rounded" />
              <div className="w-8 h-8 bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold rounded-full">2</div>
              <div className="flex-1 h-1 bg-slate-200 rounded" />
              <div className="w-8 h-8 bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold rounded-full">3</div>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Select your email provider</h2>
            <p className="text-sm text-slate-500 mb-8">Choose the email service you want to connect to send and receive emails.</p>

            {/* Provider Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => selectProvider(provider)}
                  className={`${provider.color} border-2 p-6 text-left transition-all cursor-pointer group hover:shadow-md`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{provider.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-[#00459c] transition-colors">{provider.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{provider.description}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#00459c] transition-colors mt-1" />
                  </div>
                </button>
              ))}
            </div>

            {/* Existing accounts */}
            {existingAccounts.length > 0 && (
              <div className="mt-8 p-4 bg-white border border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Connected Accounts</div>
                <div className="space-y-2">
                  {existingAccounts.map((acc) => (
                    <div key={acc.id} className="flex items-center gap-3 p-3 bg-slate-50">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-slate-700">{acc.email}</span>
                      <span className="text-xs text-slate-400 ml-auto">{acc.provider}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security note */}
            <div className="mt-8 flex items-start gap-3 p-4 bg-blue-50 border border-blue-100">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-800">
                <strong>Your credentials are encrypted</strong> and stored securely. We never store your password in plain text. You can disconnect your account at any time.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== STEP: ENTER CREDENTIALS ======
  if (step === 'credentials' || step === 'testing') {
    return (
      <div className="min-h-screen bg-[#f6f8fc] flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={goBack} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00459c] flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Connect {selectedProvider?.name}</h1>
                <p className="text-xs text-slate-500">Step 2 of 2 — Enter your credentials</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-[#00459c] text-white flex items-center justify-center text-xs font-bold rounded-full">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex-1 h-1 bg-[#00459c] rounded" />
              <div className="w-8 h-8 bg-[#00459c] text-white flex items-center justify-center text-xs font-bold rounded-full">2</div>
              <div className="flex-1 h-1 bg-slate-200 rounded" />
              <div className="w-8 h-8 bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold rounded-full">3</div>
            </div>

            {/* Provider badge */}
            <div className="flex items-center gap-3 mb-6 p-4 bg-white border border-slate-200">
              <span className="text-2xl">{selectedProvider?.icon}</span>
              <div>
                <div className="text-sm font-bold text-slate-900">{selectedProvider?.name}</div>
                <div className="text-xs text-slate-500">{selectedProvider?.description}</div>
              </div>
            </div>

            {/* Instructions toggle */}
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-4 cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <span>How to get your {selectedProvider?.name} app password</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${showInstructions ? 'rotate-90' : ''}`} />
            </button>

            {showInstructions && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200">
                <ol className="list-decimal list-inside space-y-2 text-xs text-amber-800">
                  {selectedProvider?.instructions.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ol>
                {selectedProvider?.helpUrl && (
                  <a
                    href={selectedProvider.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-amber-700 hover:text-amber-900 underline"
                  >
                    <Globe className="w-3 h-3" />
                    {selectedProvider.helpText}
                  </a>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`you@${selectedProvider?.id === 'gmail' ? 'gmail.com' : selectedProvider?.id === 'outlook' ? 'outlook.com' : 'example.com'}`}
                  className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#00459c] transition-colors"
                  required
                  disabled={testing}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Password / App Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your app password"
                    className="w-full border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm font-mono outline-none focus:border-[#00459c] transition-colors"
                    required
                    disabled={testing}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Display Name (optional)</label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#00459c] transition-colors"
                  disabled={testing}
                />
              </div>

              {/* Advanced settings */}
              {selectedProvider?.id === 'custom' && (
                <div className="border border-slate-200 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Settings className="w-3.5 h-3.5" />
                    Server Settings
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">IMAP Host *</label>
                      <input
                        type="text"
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        placeholder="imap.provider.com"
                        className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#00459c] transition-colors"
                        required
                        disabled={testing}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">IMAP Port</label>
                      <input
                        type="number"
                        value={imapPort}
                        onChange={(e) => setImapPort(parseInt(e.target.value) || 993)}
                        className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#00459c] transition-colors"
                        disabled={testing}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">SMTP Host *</label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.provider.com"
                        className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#00459c] transition-colors"
                        required
                        disabled={testing}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">SMTP Port</label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                        className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#00459c] transition-colors"
                        disabled={testing}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Server info display for non-custom providers */}
              {selectedProvider?.id !== 'custom' && (
                <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-100 text-xs text-slate-500">
                  <Server className="w-4 h-4 text-slate-400" />
                  <span>IMAP: <strong>{imapHost}:{imapPort}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>SMTP: <strong>{smtpHost}:{smtpPort}</strong></span>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Test result */}
              {testResult && (
                <div className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}>
                  {testResult.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {testResult.message}
                </div>
              )}

              <button
                type="submit"
                disabled={testing || !email || !password}
                className="w-full bg-[#00459c] hover:bg-[#003882] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-3 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    Connect & Test
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ====== STEP: SUCCESS ======
  return (
    <div className="min-h-screen bg-[#f6f8fc] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 bg-emerald-100 flex items-center justify-center mx-auto mb-6 rounded-full">
          <Check className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Email Connected!</h1>
        <p className="text-sm text-slate-500 mb-4">
          Your <strong>{selectedProvider?.name}</strong> account has been connected successfully.
        </p>
        {testResult?.success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 mb-6">
            {testResult.message}
          </div>
        )}
        <p className="text-xs text-slate-400">Redirecting to your inbox...</p>
      </div>
    </div>
  );
}
