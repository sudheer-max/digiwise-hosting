'use client';

import React from 'react';
import { Cookie } from 'lucide-react';

export default function CookiesPage() {
  return (
    <div className="animate-fade-in py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Cookie className="w-8 h-8 text-[#00459c]" />
        <h1 className="text-3xl font-extrabold text-slate-900">Cookie Policy</h1>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-sm text-slate-600 space-y-4 leading-relaxed">
        <p><strong>Last updated:</strong> July 2026</p>
        <p>DigiWise Cloud uses cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and provide personalized content.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">1. What Are Cookies</h2>
        <p>Cookies are small text files stored on your device by your web browser. They help us remember your preferences and improve site performance.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">2. Types of Cookies We Use</h2>
        <p><strong>Essential:</strong> Required for authentication and core site functionality.<br />
        <strong>Analytics:</strong> Help us understand how visitors interact with our platform.<br />
        <strong>Preference:</strong> Remember your country, currency, and UI settings.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">3. Managing Cookies</h2>
        <p>You can control cookies through your browser settings. Disabling certain cookies may impact site functionality.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">4. Third-Party Cookies</h2>
        <p>We use trusted third-party services for analytics and payment processing. These providers may set their own cookies in accordance with their privacy policies.</p>
      </div>
    </div>
  );
}
