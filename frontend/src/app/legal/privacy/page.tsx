'use client';

import React from 'react';
import { Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="animate-fade-in py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-[#00459c]" />
        <h1 className="text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-sm text-slate-600 space-y-4 leading-relaxed">
        <p><strong>Last updated:</strong> July 2026</p>
        <p>DigiWise Cloud (&ldquo;DigiWise,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your privacy and is committed to protecting your personal data.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">1. Information We Collect</h2>
        <p>We collect information you provide directly: name, email address, billing details, and account credentials. We also automatically collect technical data such as IP address, browser type, and usage patterns.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">2. How We Use Your Information</h2>
        <p>Your information is used to provide and improve our cloud hosting services, process transactions, send technical notifications, and comply with legal obligations.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">3. Data Security</h2>
        <p>We implement AES-256 encryption for data at rest and TLS 1.3 for data in transit. All infrastructure is monitored 24/7 with automated threat detection.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">4. Your Rights</h2>
        <p>You may access, correct, or delete your personal data at any time through your account settings. Contact us at support@digiwisesoftech.com for assistance.</p>
        <h2 className="text-lg font-bold text-slate-900 pt-4">5. Contact</h2>
        <p>For privacy-related inquiries, email privacy@digiwisesoftech.com or write to our registered office.</p>
      </div>
    </div>
  );
}
