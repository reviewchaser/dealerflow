import { useState } from "react";
import Head from "next/head";
import Link from "next/link";

// ============================================================================
// PASSWORD GATE
// ============================================================================
const MARKETING_PASSWORD = "NeSyY6B079.!123";

function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === MARKETING_PASSWORD) {
      // Store in sessionStorage so it persists during session
      sessionStorage.setItem("marketing_unlocked", "true");
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Head>
        <title>Marketing Preview | DealerHQ</title>
      </Head>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing Preview</h1>
          <p className="text-slate-500 mt-2">Enter password to view the marketing page</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className={`w-full px-4 py-3 border-2 rounded-xl text-center text-lg font-mono transition-colors ${
              error
                ? "border-red-500 bg-red-50"
                : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            }`}
            autoFocus
          />
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Unlock
          </button>
        </form>

        {error && (
          <p className="text-red-500 text-center mt-4 text-sm">
            Incorrect password
          </p>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HEADER / NAVIGATION
// ============================================================================
function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">DealerHQ</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How it works</a>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/signin" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
            <Link href="/auth/signup" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Start free trial
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            <nav className="flex flex-col gap-1">
              <a href="#features" className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#how-it-works" className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            </nav>
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-2">
              <Link href="/auth/signin" className="px-4 py-2.5 text-sm font-medium text-center text-slate-700 border border-slate-300 rounded-lg">Sign in</Link>
              <Link href="/auth/signup" className="px-4 py-2.5 text-sm font-medium text-center text-white bg-blue-600 rounded-lg">Start free trial</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// ============================================================================
// HERO SECTION
// ============================================================================
function Hero() {
  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            Built for UK independent dealers
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-6">
            Run your dealership
            <br />
            <span className="text-blue-600">on one system</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Track stock, prep, forms, warranties, and staff — without spreadsheets,
            WhatsApp chaos, or scattered paperwork.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Start free trial
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-6 py-3 text-base font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              See how it works
            </a>
          </div>

          {/* Small note */}
          <p className="text-sm text-slate-500">
            No card required. Set up in under 5 minutes.
          </p>
        </div>

        {/* Product Screenshot Mockup */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="relative">
            {/* Browser Chrome */}
            <div className="bg-slate-800 rounded-t-xl px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-slate-700 rounded-md px-4 py-1 text-xs text-slate-400 font-mono">
                  app.dealerhq.co.uk
                </div>
              </div>
            </div>

            {/* Screenshot Content - Stock Board Mockup */}
            <div className="bg-slate-100 rounded-b-xl p-4 sm:p-6 border-x border-b border-slate-200">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                {/* Dashboard Header */}
                <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-900">Stock & Prep Board</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">12 vehicles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                    <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                  </div>
                </div>

                {/* Kanban Columns */}
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: "Arrived", color: "bg-slate-500", count: 3 },
                    { name: "In Prep", color: "bg-amber-500", count: 4 },
                    { name: "Ready", color: "bg-emerald-500", count: 3 },
                    { name: "Sold", color: "bg-blue-500", count: 2 },
                  ].map((col) => (
                    <div key={col.name} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                        <span className="text-xs font-medium text-slate-700">{col.name}</span>
                        <span className="text-xs text-slate-400">{col.count}</span>
                      </div>
                      {/* Vehicle Cards */}
                      <div className="space-y-2">
                        {Array(Math.min(col.count, 2)).fill(0).map((_, i) => (
                          <div key={i} className="bg-white rounded-md p-2 shadow-sm border border-slate-200">
                            <div className="text-xs font-mono font-medium text-slate-900 mb-1">AB12 {String.fromCharCode(65 + i)}DE</div>
                            <div className="text-[10px] text-slate-500">BMW 3 Series</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PROBLEM SECTION - "The Reality"
// ============================================================================
function ProblemSection() {
  const problems = [
    {
      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
      title: "Prep tracked via WhatsApp",
      description: "Critical updates buried in group chats. No central record of what's been done."
    },
    {
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      title: "Forms scattered everywhere",
      description: "PDIs in one folder, test drives in another, appraisals on paper. Nothing connected."
    },
    {
      icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      title: "Warranty claims are messy",
      description: "Emails, phone calls, paper claims. Hard to track what's owed and what's paid."
    },
    {
      icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
      title: "No visibility",
      description: "You don't know what's blocking cars or who last touched what. It's all in people's heads."
    },
    {
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      title: "Systems built for enterprise",
      description: "Most dealer software is complex, expensive, and designed for large groups — not you."
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Sound familiar?
          </h2>
          <p className="text-lg text-slate-600">
            Most small dealers run their operations the same way — and it's costing them time and money.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {problems.map((problem, idx) => (
            <div
              key={idx}
              className="p-5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={problem.icon} />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{problem.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{problem.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SOLUTION SECTION - "What DealerHQ Does"
// ============================================================================
function SolutionSection() {
  const pillars = [
    { name: "Stock & Prep", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { name: "Appraisals", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
    { name: "Forms", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { name: "Warranties", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { name: "Team & HR", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  return (
    <section className="py-16 md:py-24 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            One system for everything
          </h2>
          <p className="text-lg text-slate-400">
            DealerHQ connects all your day-to-day operations in one place —
            designed specifically for how independent dealers actually work.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-5 py-3 bg-slate-800 border border-slate-700 rounded-xl"
            >
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={pillar.icon} />
                </svg>
              </div>
              <span className="font-medium">{pillar.name}</span>
            </div>
          ))}
        </div>

        {/* Connection Diagram */}
        <div className="max-w-2xl mx-auto">
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="font-semibold">DealerHQ Dashboard</span>
              </div>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Everything flows into one dashboard. See stock status, pending forms,
                warranty cases, and team schedule at a glance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FEATURES SECTION - Detailed Feature Groups
// ============================================================================
function FeaturesSection() {
  const featureGroups = [
    {
      title: "Stock & Prep",
      description: "Track every vehicle from arrival to sale-ready",
      color: "blue",
      features: [
        "Visual stock board with drag-and-drop",
        "Prep checklists per vehicle",
        "Issue tracking with photos",
        "Activity log for every change",
        "Documents attached to vehicles",
      ],
    },
    {
      title: "Appraisals",
      description: "Capture part-exchanges and buying opportunities",
      color: "emerald",
      features: [
        "Customer PX submission forms",
        "Dealer buying appraisals",
        "DVLA vehicle lookup",
        "Convert appraisal to stock instantly",
        "AI hints for common issues",
      ],
    },
    {
      title: "Forms & Submissions",
      description: "Digital forms that feed into your workflow",
      color: "violet",
      features: [
        "Pre-delivery inspections (PDI)",
        "Test drive agreements",
        "Courtesy car sign-out/return",
        "Custom internal forms",
        "Submission inbox with filters",
      ],
    },
    {
      title: "Warranty & Aftersales",
      description: "Manage claims from start to finish",
      color: "amber",
      features: [
        "Warranty case tracking board",
        "Issue logging with evidence",
        "Status updates and notes",
        "Customer communication log",
        "Export for reporting",
      ],
    },
    {
      title: "Team & HR",
      description: "Keep your team organised",
      color: "rose",
      features: [
        "Staff roles and permissions",
        "Holiday request & approval",
        "Overtime submissions",
        "Shared team calendar",
        "Activity visibility",
      ],
    },
  ];

  const colorMap = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", accent: "text-blue-600", dot: "bg-blue-600" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", accent: "text-emerald-600", dot: "bg-emerald-600" },
    violet: { bg: "bg-violet-50", border: "border-violet-200", accent: "text-violet-600", dot: "bg-violet-600" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", accent: "text-amber-600", dot: "bg-amber-600" },
    rose: { bg: "bg-rose-50", border: "border-rose-200", accent: "text-rose-600", dot: "bg-rose-600" },
  };

  return (
    <section id="features" className="py-16 md:py-24 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Features that actually matter
          </h2>
          <p className="text-lg text-slate-600">
            No bloat. No complexity. Just the tools you need to run your dealership efficiently.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureGroups.map((group, idx) => {
            const colors = colorMap[group.color];
            return (
              <div
                key={idx}
                className={`p-6 rounded-2xl ${colors.bg} border ${colors.border}`}
              >
                <h3 className={`text-lg font-bold ${colors.accent} mb-2`}>{group.title}</h3>
                <p className="text-sm text-slate-600 mb-4">{group.description}</p>
                <ul className="space-y-2">
                  {group.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-sm text-slate-700">
                      <div className={`w-1.5 h-1.5 ${colors.dot} rounded-full mt-1.5 flex-shrink-0`}></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Coming Soon Card */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-600 mb-1">More coming</h3>
            <p className="text-sm text-slate-500">SMS reminders, integrations, and more on the roadmap.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// BENEFITS SECTION - "Why Dealers Choose DealerHQ"
// ============================================================================
function BenefitsSection() {
  const benefits = [
    {
      title: "Save hours every week",
      description: "Stop chasing updates across WhatsApp and spreadsheets. Everything's in one place.",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      title: "Fewer mistakes",
      description: "Checklists, mandatory fields, and audit trails mean nothing gets missed.",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      title: "Clear accountability",
      description: "Know who did what and when. No more \"I thought you were handling that\".",
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    },
    {
      title: "Faster prep turnaround",
      description: "Visual boards and task tracking help you spot blockers and move cars faster.",
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
    },
    {
      title: "Professional operations",
      description: "Digital forms, branded exports, and proper records — without enterprise complexity.",
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    },
    {
      title: "Scales with you",
      description: "Works for 5 cars or 50. Add team members as you grow — all included.",
      icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Why dealers choose DealerHQ
          </h2>
          <p className="text-lg text-slate-600">
            It's not about features — it's about outcomes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={benefit.icon} />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{benefit.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING SECTION
// ============================================================================
function PricingSection() {
  return (
    <section id="pricing" className="py-16 md:py-24 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-lg text-slate-600">
            One plan. Everything included. No per-user fees.
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="bg-slate-900 text-white rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-8 text-center border-b border-slate-700">
              <div className="inline-block px-3 py-1 bg-blue-600 text-sm font-medium rounded-full mb-4">
                Dealership Plan
              </div>
              <div className="mb-2">
                <span className="text-5xl font-bold">£79</span>
                <span className="text-slate-400">/month</span>
              </div>
              <p className="text-slate-400">per dealership, billed monthly</p>
            </div>

            {/* Features */}
            <div className="p-8">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">Everything included:</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited vehicles",
                  "Unlimited team members",
                  "All modules (Stock, Appraisals, Forms, Warranty, HR)",
                  "DVLA vehicle lookups",
                  "QR codes and shareable links",
                  "PDF exports with your branding",
                  "Email support",
                  "Regular updates and new features",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm">
                    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/signup"
                className="block w-full py-3 px-4 text-center text-base font-medium bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Start free trial
              </Link>
              <p className="text-center text-xs text-slate-500 mt-4">
                14-day free trial. No card required. Cancel anytime.
              </p>
            </div>
          </div>

          {/* What it replaces */}
          <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
            <p className="font-medium text-slate-900 mb-3 text-center">Replaces:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Spreadsheets", "WhatsApp groups", "Paper forms", "Email chains", "Sticky notes"].map((item, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// HOW IT WORKS SECTION
// ============================================================================
function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Create your dealership",
      description: "Sign up in 30 seconds. Add your logo and configure which modules you need.",
    },
    {
      number: "2",
      title: "Add your stock & team",
      description: "Enter a VRM to auto-fill vehicle details. Invite team members with the right permissions.",
    },
    {
      number: "3",
      title: "Run everything from one place",
      description: "Track prep, manage forms, handle warranties, and approve time-off — all from your dashboard.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-slate-50 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Up and running in minutes
          </h2>
          <p className="text-lg text-slate-600">
            No IT department required. No complex setup. No training videos.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative text-center">
                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-slate-300"></div>
                )}

                <div className="relative z-10 w-16 h-16 bg-blue-600 text-white text-2xl font-bold rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ SECTION
// ============================================================================
function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "Do I need to replace my DMS?",
      answer: "No. DealerHQ works alongside your existing DMS (like Autotrader, Autorola, or dealer management systems). It handles operational workflow — prep tracking, warranty cases, forms — while your DMS handles stock advertising and finance.",
    },
    {
      question: "Can my team use it on mobile?",
      answer: "Absolutely. DealerHQ is fully responsive and works on phones, tablets, and desktops. Your team can update prep status, complete PDIs, and approve requests from anywhere.",
    },
    {
      question: "How many users can I add?",
      answer: "Unlimited. Your subscription covers your whole team — no per-user fees. Add as many staff members as you need with different permission levels.",
    },
    {
      question: "Can customers fill in forms without an account?",
      answer: "Yes. You can generate shareable links and QR codes for forms like test drive agreements, appraisals, and courtesy car handovers. Recipients just fill in the form on their phone or computer — no login needed.",
    },
    {
      question: "Is there a contract or lock-in?",
      answer: "No contracts, no lock-in. Pay monthly, cancel anytime. We think you'll stay because it's useful, not because you're trapped.",
    },
    {
      question: "What support do you offer?",
      answer: "Email support is included. We're a small team building for dealers, so you'll get real answers from people who understand your business.",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Questions? Answers.
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                >
                  <span className="font-medium text-slate-900">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${openIndex === idx ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openIndex === idx && (
                  <div className="px-6 pb-4">
                    <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA SECTION
// ============================================================================
function FinalCTASection() {
  return (
    <section className="py-16 md:py-24 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          Ready to get organised?
        </h2>
        <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">
          Stop running your dealership from WhatsApp and spreadsheets.
          Start your free trial today.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/signup"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-medium bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Start free trial
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <a
            href="mailto:hello@dealerhq.co.uk"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-medium text-slate-300 hover:text-white transition-colors"
          >
            Questions? Get in touch
          </a>
        </div>
        <p className="text-sm text-slate-500 mt-6">
          14-day free trial. No card required. Cancel anytime.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================
function Footer() {
  return (
    <footer className="bg-slate-950 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <span className="text-lg font-bold">DealerHQ</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy-policy" className="text-slate-400 hover:text-white transition-colors">Privacy</Link>
            <Link href="/tos" className="text-slate-400 hover:text-white transition-colors">Terms</Link>
            <a href="mailto:hello@dealerhq.co.uk" className="text-slate-400 hover:text-white transition-colors">Contact</a>
          </div>

          {/* Copyright */}
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} DealerHQ. Built for UK dealers.
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function MarketingPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if already unlocked in session
  useState(() => {
    if (typeof window !== "undefined") {
      const isUnlocked = sessionStorage.getItem("marketing_unlocked") === "true";
      setUnlocked(isUnlocked);
    }
    setCheckingSession(false);
  }, []);

  // Show loading state briefly
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show password gate if not unlocked
  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // Show full marketing page
  return (
    <>
      <Head>
        <title>DealerHQ — Dealer Operations Made Simple</title>
        <meta
          name="description"
          content="Track stock, prep, forms, warranties, and staff — without spreadsheets, WhatsApp chaos, or scattered paperwork. Built for UK independent car dealers."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <BenefitsSection />
        <PricingSection />
        <HowItWorksSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </>
  );
}
