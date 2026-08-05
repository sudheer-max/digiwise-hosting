'use client';

import React, { useState } from 'react';
import { Mail, MessageSquare, Send, Clock, Headphones, CheckCircle2, Github, BookOpen } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('General Question');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const inputCls = 'w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#00459c] px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-colors';
  const labelCls = 'text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5';

  return (
    <div className="animate-fade-in bg-[#f5f7fb] text-slate-600">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#002866] to-[#00459c] text-white py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:44px_44px]"></div>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-cyan-400/20 blur-[120px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-2 bg-[#00a2ff]/15 border border-[#00a2ff]/30 text-[#00c0ff] text-xs font-bold px-3 py-1.5 mb-6 uppercase tracking-wider font-mono">
            <MessageSquare className="w-3.5 h-3.5" /> Contact
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight font-display">
            Talk to a human, 24/7.
          </h1>
          <p className="text-base sm:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed mt-5">
            Questions, feedback or a debugging session — our engineers respond fast, any time of day.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 p-8 shadow-sm">
              <h2 className="text-slate-900 font-bold text-lg mb-6">Send us a message</h2>
              {sent ? (
                <div className="bg-emerald-50 border border-emerald-200 p-10 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-slate-900 font-bold mb-1">Message sent!</h3>
                  <p className="text-sm text-slate-500">Our team will get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Name *</label>
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Email *</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Topic</label>
                    <select value={topic} onChange={(e) => setTopic(e.target.value)} className={inputCls}>
                      <option>General Question</option>
                      <option>Deployments & Hosting</option>
                      <option>Managed Databases</option>
                      <option>Billing & Invoices</option>
                      <option>Security & Compliance</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Message *</label>
                    <textarea rows={6} required value={message} onChange={(e) => setMessage(e.target.value)} className={inputCls} />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#00459c] hover:bg-[#003882] text-white text-xs font-bold uppercase tracking-wider px-7 py-3.5 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Send Message
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Side info */}
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 p-6 shadow-sm">
              <h3 className="text-slate-900 font-bold text-sm mb-5">Contact Information</h3>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#00459c] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Email</span>
                    <span className="text-xs text-slate-500">support@digiwisesoftech.com</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Headphones className="w-5 h-5 text-[#00459c] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Priority Line</span>
                    <span className="text-xs text-slate-500">+1 (555) 000-0000</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#00459c] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Availability</span>
                    <span className="text-xs text-slate-500">24/7/365 · Avg response 12 min</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#00459c]/5 border border-[#00459c]/15 p-6">
              <h3 className="text-slate-900 font-bold text-sm mb-3">Faster self-service</h3>
              <div className="space-y-3">
                <a href="/kb" className="flex items-center gap-2.5 text-xs text-slate-600 hover:text-[#00459c] transition-colors">
                  <BookOpen className="w-4 h-4 text-[#00459c]" /> Browse the knowledge base
                </a>
                <a href="/support" className="flex items-center gap-2.5 text-xs text-slate-600 hover:text-[#00459c] transition-colors">
                  <MessageSquare className="w-4 h-4 text-[#00459c]" /> Open a support ticket
                </a>
                <a href="/status" className="flex items-center gap-2.5 text-xs text-slate-600 hover:text-[#00459c] transition-colors">
                  <Github className="w-4 h-4 text-[#00459c]" /> Check service status
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
