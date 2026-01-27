import { useState } from "react";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";

// ============================================================================
// DEVICE FRAME COMPONENTS - For mockup screenshots
// ============================================================================
function BrowserFrame({ children, url = "app.dealerhq.co.uk" }) {
  return (
    <div className="relative">
      <div className="bg-slate-800 rounded-t-xl px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-slate-700 rounded-md px-4 py-1 text-xs text-slate-400 font-mono">
            {url}
          </div>
        </div>
      </div>
      <div className="bg-slate-100 rounded-b-xl border-x border-b border-slate-200 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function PhoneFrame({ children }) {
  return (
    <div className="relative bg-slate-900 rounded-[2.5rem] p-2 shadow-xl">
      {/* Notch */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-slate-900 rounded-full z-10"></div>
      {/* Screen */}
      <div className="bg-white rounded-[2rem] overflow-hidden relative">
        <div className="pt-8">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HEADER / NAVIGATION
// ============================================================================
function Header({ isLoggedIn }) {
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
            {isLoggedIn ? (
              <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/signin" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                  Sign in
                </Link>
                <Link href="/auth/signup?plan=free" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  Start free
                </Link>
              </>
            )}
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
              {isLoggedIn ? (
                <Link href="/dashboard" className="px-4 py-2.5 text-sm font-medium text-center text-white bg-blue-600 rounded-lg">Dashboard</Link>
              ) : (
                <>
                  <Link href="/auth/signin" className="px-4 py-2.5 text-sm font-medium text-center text-slate-700 border border-slate-300 rounded-lg">Sign in</Link>
                  <Link href="/auth/signup?plan=free" className="px-4 py-2.5 text-sm font-medium text-center text-white bg-blue-600 rounded-lg">Start free</Link>
                </>
              )}
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
function HeroSection() {
  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            Built for UK independent dealers
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-6">
            The dealership management system
            <br />
            <span className="text-blue-600">that actually makes sense</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Replace spreadsheets, WhatsApp chaos, and scattered paperwork with one simple platform.
            Invoice for free, or unlock the full toolkit for £79/month.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link
              href="/auth/signup?plan=free"
              className="w-full sm:w-auto px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Start invoicing for free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-6 py-3 text-base font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              See it in action
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              No card required
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              UK-based support
            </span>
          </div>
        </div>

        {/* Product Screenshot Mockups */}
        <div className="mt-16 max-w-6xl mx-auto relative">
          {/* Desktop Browser Mockup */}
          <div className="relative z-10">
            <BrowserFrame>
              <div className="p-4 sm:p-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  {/* Dashboard Header */}
                  <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-900">Stock & Prep Board</h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">14 vehicles</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">+ Add Vehicle</div>
                    </div>
                  </div>

                  {/* Kanban Columns */}
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50">
                    {[
                      { name: "In Stock", color: "bg-slate-500", count: 4, cards: [
                        { vrm: "AB21 XYZ", vehicle: "BMW 320d M Sport", tag: "Needs Valet", tagColor: "bg-amber-100 text-amber-700" },
                        { vrm: "CD22 ABC", vehicle: "Audi A4 S Line", tag: null }
                      ]},
                      { name: "In Prep", color: "bg-amber-500", count: 5, cards: [
                        { vrm: "EF20 DEF", vehicle: "Mercedes C200", tag: "PDI Done", tagColor: "bg-emerald-100 text-emerald-700" },
                        { vrm: "GH19 GHI", vehicle: "VW Golf GTI", tag: "Awaiting Parts", tagColor: "bg-red-100 text-red-700" }
                      ]},
                      { name: "Advertised", color: "bg-blue-500", count: 3, cards: [
                        { vrm: "JK21 JKL", vehicle: "Ford Focus ST", tag: "Price Drop", tagColor: "bg-violet-100 text-violet-700" },
                        { vrm: "LM22 MNO", vehicle: "Toyota Yaris", tag: null }
                      ]},
                      { name: "Sold", color: "bg-emerald-500", count: 2, cards: [
                        { vrm: "NP20 PQR", vehicle: "Honda Civic", tag: "Awaiting Delivery", tagColor: "bg-blue-100 text-blue-700" }
                      ]},
                    ].map((col) => (
                      <div key={col.name} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                            <span className="text-xs font-semibold text-slate-700">{col.name}</span>
                          </div>
                          <span className="text-xs text-slate-400">{col.count}</span>
                        </div>
                        <div className="p-2 space-y-2">
                          {col.cards.map((card, i) => (
                            <div key={i} className="bg-slate-50 rounded-md p-2.5 border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer">
                              <div className="text-xs font-mono font-semibold text-slate-900 mb-1">{card.vrm}</div>
                              <div className="text-[11px] text-slate-500 mb-2">{card.vehicle}</div>
                              {card.tag && (
                                <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${card.tagColor}`}>
                                  {card.tag}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </BrowserFrame>
          </div>

          {/* Phone Mockup - positioned to the right */}
          <div className="hidden lg:block absolute -right-8 top-12 w-48 z-20">
            <PhoneFrame>
              <div className="h-80 bg-slate-50">
                <div className="px-3 py-2 bg-white border-b border-slate-200">
                  <div className="text-xs font-semibold text-slate-900">Prep Board</div>
                </div>
                <div className="p-2 space-y-2">
                  {[
                    { vrm: "AB21 XYZ", status: "In Prep", color: "bg-amber-500" },
                    { vrm: "CD22 ABC", status: "Ready", color: "bg-emerald-500" },
                    { vrm: "EF20 DEF", status: "In Stock", color: "bg-slate-500" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white rounded-lg p-2 border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-semibold">{item.vrm}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.color}`}></div>
                      </div>
                      <div className="text-[9px] text-slate-500">{item.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </PhoneFrame>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PROBLEM SECTION
// ============================================================================
function ProblemSection() {
  const problems = [
    {
      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
      title: "Stock prep tracked via WhatsApp",
      description: "Critical updates buried in group chats. No central record of what's been done."
    },
    {
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      title: "PDIs and forms scattered everywhere",
      description: "Paper forms, random folders, nothing connected. Compliance nightmare waiting to happen."
    },
    {
      icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
      title: "Manual invoicing in Word or Excel",
      description: "Hours spent on invoices. VAT calculations by hand. No professional templates."
    },
    {
      icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
      title: "No visibility on deals in progress",
      description: "Who's doing what? What's the next step? It's all in people's heads."
    },
    {
      icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      title: "Warranty claims are a mess",
      description: "Emails, phone calls, paper claims. Hard to track what's owed and what's been handled."
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
              className="p-5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
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
// SOLUTION OVERVIEW SECTION
// ============================================================================
function SolutionSection() {
  const pillars = [
    { name: "Stock & Prep", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", color: "blue" },
    { name: "Sales & Invoicing", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z", color: "emerald" },
    { name: "Digital Forms", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "violet" },
    { name: "Appraisals", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z", color: "amber" },
    { name: "Aftersales", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "rose" },
    { name: "Team & Calendar", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "cyan" },
    { name: "Reports", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", color: "orange" },
  ];

  const colorMap = {
    blue: "bg-blue-600/20 text-blue-400",
    emerald: "bg-emerald-600/20 text-emerald-400",
    violet: "bg-violet-600/20 text-violet-400",
    amber: "bg-amber-600/20 text-amber-400",
    rose: "bg-rose-600/20 text-rose-400",
    cyan: "bg-cyan-600/20 text-cyan-400",
    orange: "bg-orange-600/20 text-orange-400",
  };

  return (
    <section className="py-16 md:py-24 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            One system. Everything connected.
          </h2>
          <p className="text-lg text-slate-400">
            DealerHQ connects all your day-to-day operations in one place —
            designed specifically for how independent dealers actually work.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[pillar.color]}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={pillar.icon} />
                </svg>
              </div>
              <span className="font-medium text-sm">{pillar.name}</span>
            </div>
          ))}
        </div>

        {/* Central Hub */}
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
                Everything flows into one dashboard. See stock status, pending deals,
                open forms, warranty cases, and team schedule at a glance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FEATURE SECTION - Reusable Component
// ============================================================================
function FeatureSection({ id, title, description, points, children, imagePosition = "right", bgColor = "bg-white" }) {
  return (
    <section id={id} className={`py-16 md:py-24 ${bgColor} scroll-mt-20`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid lg:grid-cols-2 gap-12 items-center ${imagePosition === "left" ? "lg:grid-flow-dense" : ""}`}>
          {/* Text Content */}
          <div className={imagePosition === "left" ? "lg:col-start-2" : ""}>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              {title}
            </h2>
            <p className="text-lg text-slate-600 mb-6">
              {description}
            </p>
            <ul className="space-y-3">
              {points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Screenshot/Visual */}
          <div className={imagePosition === "left" ? "lg:col-start-1" : ""}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FEATURE 1: STOCK & PREP BOARD
// ============================================================================
function StockPrepFeature() {
  return (
    <FeatureSection
      id="features"
      title="See every vehicle at a glance"
      description="Track your entire stock through the prep process with a visual Kanban board. No more WhatsApp groups or mental checklists."
      points={[
        "Drag-and-drop vehicles between stages: In Stock, In Prep, Advertised, Sold",
        "Custom color-coded labels (Needs MOT, Priority, Ready for Ad)",
        "Issue tracking with photo evidence and subcategories",
        "Task assignment to team members with due dates",
        "Full activity timeline showing every change",
      ]}
      bgColor="bg-slate-50"
    >
      <BrowserFrame>
        <div className="p-4 bg-slate-50">
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: "In Stock", color: "bg-slate-500", cards: 2 },
              { name: "In Prep", color: "bg-amber-500", cards: 3 },
              { name: "Advertised", color: "bg-blue-500", cards: 2 },
              { name: "Sold", color: "bg-emerald-500", cards: 1 },
            ].map((col) => (
              <div key={col.name} className="bg-white rounded-lg border border-slate-200 p-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                  <span className="text-[10px] font-semibold text-slate-700">{col.name}</span>
                </div>
                <div className="space-y-1.5">
                  {Array(col.cards).fill(0).map((_, i) => (
                    <div key={i} className="bg-slate-50 rounded p-1.5 border border-slate-100">
                      <div className="text-[9px] font-mono font-semibold text-slate-800">AB2{i} XYZ</div>
                      <div className="text-[8px] text-slate-500">BMW 320d</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </BrowserFrame>
    </FeatureSection>
  );
}

// ============================================================================
// FEATURE 2: SALES & INVOICING
// ============================================================================
function SalesFeature() {
  return (
    <FeatureSection
      title="From enquiry to invoice in minutes"
      description="A simple 5-step wizard guides you through every sale. Professional invoices generated automatically with correct VAT treatment."
      points={[
        "5-step sales wizard: Vehicle, Customer, Pricing, Deposit, Review",
        "VAT Qualifying and Margin Scheme support with auto-calculation",
        "E-signature capture in showroom or via driver delivery link",
        "Multiple part exchanges (up to 2 per deal)",
        "Deposit receipts and invoices with your branding",
        "Deal pipeline with status tracking (Draft → Invoiced → Delivered)",
      ]}
      imagePosition="left"
      bgColor="bg-white"
    >
      <BrowserFrame>
        <div className="p-4 bg-white">
          {/* Wizard Steps */}
          <div className="flex items-center justify-between mb-4 px-2">
            {["Vehicle", "Customer", "Pricing", "Deposit", "Review"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${i <= 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {i + 1}
                </div>
                <span className={`text-[10px] hidden sm:inline ${i <= 2 ? "text-slate-900" : "text-slate-400"}`}>{step}</span>
              </div>
            ))}
          </div>

          {/* Form Preview */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-3">
            <div>
              <label className="text-[10px] font-medium text-slate-500 block mb-1">Sale Price (Gross)</label>
              <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-semibold text-slate-900">£18,995.00</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">VAT Scheme</label>
                <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[10px] text-slate-700">VAT Qualifying</div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">Payment Type</label>
                <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[10px] text-slate-700">Cash</div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Net</span>
                <span className="text-slate-900 font-medium">£15,829.17</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">VAT (20%)</span>
                <span className="text-slate-900 font-medium">£3,165.83</span>
              </div>
              <div className="flex justify-between text-xs font-semibold mt-1 pt-1 border-t border-slate-100">
                <span className="text-slate-900">Total</span>
                <span className="text-blue-600">£18,995.00</span>
              </div>
            </div>
          </div>
        </div>
      </BrowserFrame>
    </FeatureSection>
  );
}

// ============================================================================
// FEATURE 3: DIGITAL FORMS
// ============================================================================
function FormsFeature() {
  return (
    <FeatureSection
      title="No more paper. No more chasing."
      description="Digital forms that customers fill on their phones. Submissions appear instantly in your inbox with all the data you need."
      points={[
        "PDI checklists with pass/fail items and photos",
        "Test drive agreements with signature capture",
        "Courtesy car sign-out and return forms",
        "Customer problem reports (auto-create aftersales cases)",
        "Shareable links and QR codes for each form",
        "Mobile-responsive — works on any device",
      ]}
      bgColor="bg-slate-50"
    >
      <div className="flex gap-4 justify-center items-end">
        {/* Phone Mockup */}
        <div className="w-44">
          <PhoneFrame>
            <div className="h-72 bg-white">
              <div className="px-3 py-2 bg-blue-600 text-white">
                <div className="text-[10px] font-semibold">Test Drive Agreement</div>
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <label className="text-[9px] font-medium text-slate-500">Driver Name</label>
                  <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px]">John Smith</div>
                </div>
                <div>
                  <label className="text-[9px] font-medium text-slate-500">Vehicle</label>
                  <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px]">BMW 320d - AB21 XYZ</div>
                </div>
                <div>
                  <label className="text-[9px] font-medium text-slate-500">Signature</label>
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded h-12 flex items-center justify-center">
                    <span className="text-[9px] text-slate-400">Tap to sign</span>
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white text-[10px] font-semibold py-1.5 rounded">
                  Submit
                </button>
              </div>
            </div>
          </PhoneFrame>
        </div>

        {/* QR Code Card */}
        <div className="hidden sm:block bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-900 mb-2">Share Form</div>
          <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center mb-2">
            <div className="grid grid-cols-5 gap-0.5">
              {Array(25).fill(0).map((_, i) => (
                <div key={i} className={`w-3 h-3 ${Math.random() > 0.5 ? "bg-slate-800" : "bg-white"}`}></div>
              ))}
            </div>
          </div>
          <div className="text-[9px] text-slate-500 text-center">Scan with phone</div>
        </div>
      </div>
    </FeatureSection>
  );
}

// ============================================================================
// FEATURE 4: APPRAISALS
// ============================================================================
function AppraisalsFeature() {
  return (
    <FeatureSection
      title="Turn valuations into stock"
      description="Capture part-exchanges and buying opportunities with instant DVLA lookup. Convert winning appraisals to stock with one click."
      points={[
        "Customer PX submission forms via shareable link",
        "DVLA lookup auto-populates make, model, colour, MOT",
        "Photo upload for condition evidence",
        "Status workflow: New → Reviewed → Converted/Declined",
        "One-click convert to stock inventory",
      ]}
      imagePosition="left"
      bgColor="bg-white"
    >
      <BrowserFrame>
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-900">Appraisals</h3>
            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">3 new</span>
          </div>
          <div className="space-y-2">
            {[
              { vrm: "EF20 GHI", vehicle: "2020 Audi A3 S Line", status: "New", statusColor: "bg-blue-100 text-blue-700" },
              { vrm: "KL19 MNO", vehicle: "2019 VW Polo GTI", status: "Reviewed", statusColor: "bg-amber-100 text-amber-700" },
              { vrm: "PQ21 RST", vehicle: "2021 Ford Fiesta ST", status: "Converted", statusColor: "bg-emerald-100 text-emerald-700" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <div className="text-[10px] font-mono font-semibold text-slate-900">{item.vrm}</div>
                  <div className="text-[9px] text-slate-500">{item.vehicle}</div>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${item.statusColor}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </BrowserFrame>
    </FeatureSection>
  );
}

// ============================================================================
// FEATURE 5: WARRANTY/AFTERSALES
// ============================================================================
function AftersalesFeature() {
  return (
    <FeatureSection
      title="Handle issues before they become problems"
      description="Track warranty claims and customer issues from first contact to resolution. Full audit trail, photo evidence, and timeline view."
      points={[
        "Kanban board: Not Booked → Booked In → Work Complete → Closed",
        "Priority levels (Low, Normal, High, Critical)",
        "Photo evidence gallery per case",
        "Timeline view of all actions and updates",
        "Customer form submissions appear automatically",
        "CSV export for reporting",
      ]}
      bgColor="bg-slate-50"
    >
      <BrowserFrame>
        <div className="p-4 bg-slate-50">
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: "Not Booked", color: "bg-slate-500", count: 2 },
              { name: "Booked In", color: "bg-blue-500", count: 1 },
              { name: "In Progress", color: "bg-amber-500", count: 2 },
              { name: "Closed", color: "bg-emerald-500", count: 3 },
            ].map((col) => (
              <div key={col.name} className="bg-white rounded-lg border border-slate-200 p-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                  <span className="text-[9px] font-semibold text-slate-700">{col.name}</span>
                </div>
                <div className="space-y-1.5">
                  {Array(Math.min(col.count, 2)).fill(0).map((_, i) => (
                    <div key={i} className="bg-slate-50 rounded p-1.5 border border-slate-100">
                      <div className="text-[9px] font-semibold text-slate-800">Case #{1000 + i}</div>
                      <div className="text-[8px] text-slate-500">Engine noise</div>
                      <div className="mt-1">
                        <span className="text-[7px] px-1 py-0.5 bg-red-100 text-red-700 rounded font-medium">High</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </BrowserFrame>
    </FeatureSection>
  );
}

// ============================================================================
// FEATURE 6: TEAM & CALENDAR
// ============================================================================
function TeamFeature() {
  return (
    <FeatureSection
      title="Keep your team in sync"
      description="Manage staff roles, holiday requests, and overtime. Shared calendar keeps everyone on the same page."
      points={[
        "6 role levels: Owner, Admin, Sales, Staff, Workshop, Viewer",
        "Role-based permissions (sales can't see financials, etc.)",
        "Holiday request and approval workflow",
        "Overtime submissions with manager approval",
        "Shared calendar with day/week/month views",
        "Delivery scheduling with calendar integration",
      ]}
      imagePosition="left"
      bgColor="bg-white"
    >
      <BrowserFrame>
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-900">Team Calendar</h3>
            <div className="flex gap-1">
              {["Day", "Week", "Month"].map((v) => (
                <button key={v} className={`text-[9px] px-2 py-1 rounded ${v === "Week" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
              <div key={day} className="text-center">
                <div className="text-[9px] font-medium text-slate-500 mb-1">{day}</div>
                <div className="bg-slate-50 rounded p-1 min-h-[60px] space-y-0.5">
                  {i === 1 && (
                    <div className="bg-blue-100 text-blue-700 text-[8px] px-1 py-0.5 rounded truncate">
                      Delivery 2pm
                    </div>
                  )}
                  {i === 3 && (
                    <div className="bg-emerald-100 text-emerald-700 text-[8px] px-1 py-0.5 rounded truncate">
                      PDI - Focus
                    </div>
                  )}
                  {i === 4 && (
                    <div className="bg-amber-100 text-amber-700 text-[8px] px-1 py-0.5 rounded truncate">
                      John - Holiday
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </BrowserFrame>
    </FeatureSection>
  );
}

// ============================================================================
// FEATURE 7: REPORTS
// ============================================================================
function ReportsFeature() {
  return (
    <FeatureSection
      title="Know your numbers"
      description="Sales summaries, VAT reports, stock book, and profitability analysis. Export to CSV or PDF for your accountant."
      points={[
        "Sales Summary: revenue, deals closed, average deal value",
        "VAT Report: output/input VAT for your returns",
        "Inventory Report: current stock value and age distribution",
        "Stock Book: purchase/sale/profit per vehicle",
        "Profitable Models: which makes and models work best",
        "Period filtering and CSV/PDF export",
      ]}
      bgColor="bg-slate-50"
    >
      <BrowserFrame>
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-900">Sales Summary</h3>
            <span className="text-[9px] text-slate-500">Last 30 days</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Deals", value: "12", change: "+3" },
              { label: "Revenue", value: "£186,540", change: "+18%" },
              { label: "Avg Profit", value: "£2,450", change: "+5%" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-50 rounded-lg p-2 text-center">
                <div className="text-[9px] text-slate-500 mb-0.5">{stat.label}</div>
                <div className="text-sm font-bold text-slate-900">{stat.value}</div>
                <div className="text-[9px] text-emerald-600 font-medium">{stat.change}</div>
              </div>
            ))}
          </div>
          {/* Mini chart placeholder */}
          <div className="bg-slate-50 rounded-lg p-2 h-20 flex items-end gap-1">
            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 70, 95].map((h, i) => (
              <div key={i} className="flex-1 bg-blue-500 rounded-t" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>
      </BrowserFrame>
    </FeatureSection>
  );
}

// ============================================================================
// INTEGRATIONS SECTION
// ============================================================================
function IntegrationsSection() {
  const integrations = [
    { name: "DVLA", description: "Auto-populate vehicle details from registration", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { name: "DVSA MOT History", description: "Pull MOT history, advisories, and test results", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { name: "PDF Generation", description: "Professional invoices and receipts with your branding", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
    { name: "Cloud Storage", description: "Secure document and image storage", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Connects to what matters
          </h2>
          <p className="text-lg text-slate-600">
            Built-in integrations with UK vehicle data services. More coming soon.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {integrations.map((item, idx) => (
            <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{item.name}</h3>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// MOBILE EXPERIENCE SECTION
// ============================================================================
function MobileSection() {
  return (
    <section className="py-16 md:py-24 bg-slate-900 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Works everywhere your team does
            </h2>
            <p className="text-lg text-slate-400 mb-8">
              Update prep status from the forecourt. Complete PDIs on a tablet. Approve holidays from your phone. No app to download — just open your browser.
            </p>
            <ul className="space-y-4">
              {[
                "Fully responsive — works on any screen size",
                "Update vehicle status on the move",
                "Customer forms work on any device",
                "Real-time sync across all users",
              ].map((point, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-300">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Phone Mockup */}
          <div className="flex justify-center">
            <div className="w-56">
              <PhoneFrame>
                <div className="h-96 bg-white">
                  <div className="px-3 py-2 bg-slate-900 text-white flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold">DealerHQ</span>
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-semibold text-slate-900 mb-2">Quick Actions</div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {["Add Vehicle", "New Sale", "Forms", "Calendar"].map((action) => (
                        <button key={action} className="bg-slate-50 border border-slate-200 rounded-lg py-2 text-[10px] font-medium text-slate-700">
                          {action}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mb-2">Recent Activity</div>
                    <div className="space-y-2">
                      {[
                        { text: "AB21 XYZ moved to Advertised", time: "2m ago" },
                        { text: "New appraisal submitted", time: "15m ago" },
                        { text: "Invoice #1042 generated", time: "1h ago" },
                      ].map((item, i) => (
                        <div key={i} className="bg-slate-50 rounded p-2">
                          <div className="text-[10px] text-slate-700">{item.text}</div>
                          <div className="text-[9px] text-slate-400">{item.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </PhoneFrame>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// BENEFITS SECTION
// ============================================================================
function BenefitsSection() {
  const benefits = [
    {
      title: "Save 5+ hours every week",
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
      description: "Digital forms, branded invoices, and proper records — without enterprise complexity.",
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
            What dealers tell us
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
  const plans = [
    {
      name: "Free",
      price: "£0",
      period: "forever",
      description: "Start invoicing without any cost",
      badge: "No card required",
      features: [
        "Sales module with invoicing",
        "Deposit receipts",
        "Customer management",
        "Basic reports",
        "Up to 10 active vehicles",
        "Up to 3 team members",
        "Email support",
      ],
      cta: "Start invoicing free",
      ctaHref: "/auth/signup?plan=free",
      highlighted: true,
    },
    {
      name: "Pro",
      price: "£79",
      period: "/month",
      description: "Everything you need to run your dealership",
      badge: "Full toolkit",
      features: [
        "Everything in Free, plus:",
        "Unlimited vehicles",
        "Unlimited team members",
        "Stock & Prep Board",
        "Digital forms (PDI, Test Drive, etc.)",
        "Appraisals with DVLA lookup",
        "Warranty/Aftersales tracking",
        "Team management & calendar",
        "Holiday/overtime tracking",
        "Full reports suite",
        "PDF exports with branding",
        "Priority support",
      ],
      cta: "Start 14-day trial",
      ctaHref: "/auth/signup?plan=pro",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-16 md:py-24 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Simple pricing. No surprises.
          </h2>
          <p className="text-lg text-slate-600">
            Start free with invoicing. Upgrade when you need the full toolkit.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative rounded-2xl overflow-hidden ${
                plan.highlighted
                  ? "bg-blue-600 text-white ring-2 ring-blue-600 shadow-xl shadow-blue-600/20"
                  : "bg-white border-2 border-slate-200"
              }`}
            >
              {plan.badge && (
                <div className={`absolute top-0 right-0 text-xs font-semibold px-3 py-1 rounded-bl-lg ${
                  plan.highlighted ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {plan.badge}
                </div>
              )}

              {/* Header */}
              <div className={`p-6 border-b ${plan.highlighted ? "border-blue-500" : "border-slate-200"}`}>
                <h3 className={`text-xl font-bold mb-1 ${plan.highlighted ? "text-white" : "text-slate-900"}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-4 ${plan.highlighted ? "text-blue-100" : "text-slate-600"}`}>
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${plan.highlighted ? "text-white" : "text-slate-900"}`}>
                    {plan.price}
                  </span>
                  <span className={plan.highlighted ? "text-blue-200" : "text-slate-500"}>
                    {plan.period}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="p-6">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3 text-sm">
                      <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.highlighted ? "text-blue-200" : "text-emerald-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={plan.highlighted ? "text-white" : "text-slate-700"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={`block w-full py-3 px-4 text-center text-base font-medium rounded-lg transition-colors ${
                    plan.highlighted
                      ? "bg-white hover:bg-blue-50 text-blue-600"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
                {plan.highlighted && (
                  <p className="text-center text-xs text-blue-200 mt-3">
                    No credit card required
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* What it replaces */}
        <div className="mt-12 max-w-2xl mx-auto p-6 bg-slate-50 rounded-xl border border-slate-200">
          <p className="font-medium text-slate-900 mb-3 text-center">Replaces:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Spreadsheets", "WhatsApp groups", "Paper forms", "Word invoices", "Email chains"].map((item, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600">
                {item}
              </span>
            ))}
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
      description: "Sign up in 30 seconds. Add your logo and configure your settings.",
    },
    {
      number: "2",
      title: "Add your first vehicle",
      description: "Enter a VRM — DVLA fills in the details automatically.",
    },
    {
      number: "3",
      title: "Start selling",
      description: "Create a deal, generate an invoice, and get paid.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-slate-50 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Up and running in 5 minutes
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
      answer: "No. DealerHQ works alongside your existing DMS. It handles operational workflow — prep tracking, forms, invoicing, warranty cases — while your DMS handles stock advertising and finance.",
    },
    {
      question: "Can my team use it on mobile?",
      answer: "Yes. DealerHQ is fully responsive and works on phones, tablets, and desktops. Your team can update prep status, complete PDIs, and approve requests from anywhere.",
    },
    {
      question: "How does the free tier work?",
      answer: "The free tier gives you full access to the sales and invoicing module with up to 10 vehicles and 3 team members. You can create deals, generate professional invoices, and take deposits — all for free, forever.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit and debit cards. Payments are processed securely through Stripe.",
    },
    {
      question: "Can customers fill forms without an account?",
      answer: "Yes. You can generate shareable links and QR codes for forms like test drive agreements, appraisals, and courtesy car handovers. Recipients just fill in the form — no login needed.",
    },
    {
      question: "Is there a contract or lock-in?",
      answer: "No contracts, no lock-in. Pay monthly, cancel anytime. We think you'll stay because it's useful, not because you're trapped.",
    },
    {
      question: "What support do you offer?",
      answer: "Email support is included on all plans. Pro users get priority support with faster response times.",
    },
    {
      question: "Can I export my data?",
      answer: "Yes. All reports can be exported to CSV. Invoices and receipts can be downloaded as PDFs.",
    },
    {
      question: "Is DealerHQ GDPR compliant?",
      answer: "Yes. We're a UK-based company and fully GDPR compliant. Your data is stored securely in the UK/EU.",
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
          Join UK dealers who've ditched spreadsheets and WhatsApp for DealerHQ.
          Start invoicing for free — no card required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/signup?plan=free"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-medium bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Start free today
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
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-slate-500">
          <span>UK-built</span>
          <span>No card required</span>
          <span>Cancel anytime</span>
        </div>
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
export default function Home() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Head>
          <title>DealerHQ — Dealership Management Made Simple</title>
        </Head>
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect logged-in users to dashboard
  if (isLoggedIn) {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Head>
          <title>DealerHQ — Redirecting...</title>
        </Head>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Full marketing page for non-authenticated users
  return (
    <>
      <Head>
        <title>DealerHQ — The dealership management system that actually makes sense</title>
        <meta
          name="description"
          content="Replace spreadsheets, WhatsApp chaos, and scattered paperwork with one simple platform. Invoice for free, or unlock the full toolkit for £79/month. Built for UK independent car dealers."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-white">
        <Header isLoggedIn={isLoggedIn} />

        <main>
          <HeroSection />
          <ProblemSection />
          <SolutionSection />
          <StockPrepFeature />
          <SalesFeature />
          <FormsFeature />
          <AppraisalsFeature />
          <AftersalesFeature />
          <TeamFeature />
          <ReportsFeature />
          <IntegrationsSection />
          <MobileSection />
          <BenefitsSection />
          <PricingSection />
          <HowItWorksSection />
          <FAQSection />
          <FinalCTASection />
        </main>

        <Footer />
      </div>
    </>
  );
}
