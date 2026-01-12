import { useState } from "react";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";

// Header/Nav with scroll anchors
function Header({ isLoggedIn }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="navbar bg-base-100/95 backdrop-blur-sm border-b border-base-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex-1">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
            <span className="text-xl font-bold">DealerFlow</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="text-base-content/70 hover:text-base-content transition-colors">Features</a>
            <a href="#modules" className="text-base-content/70 hover:text-base-content transition-colors">Modules</a>
            <a href="#pricing" className="text-base-content/70 hover:text-base-content transition-colors">Pricing</a>
            <a href="#faq" className="text-base-content/70 hover:text-base-content transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 ml-4">
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn btn-primary btn-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/signin" className="btn btn-ghost btn-sm">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="btn btn-primary btn-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            className="btn btn-ghost btn-sm"
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
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-base-100 border-b border-base-200 shadow-lg">
          <nav className="flex flex-col p-4 gap-2">
            <a href="#features" className="py-2 px-4 rounded hover:bg-base-200" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#modules" className="py-2 px-4 rounded hover:bg-base-200" onClick={() => setMobileMenuOpen(false)}>Modules</a>
            <a href="#pricing" className="py-2 px-4 rounded hover:bg-base-200" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#faq" className="py-2 px-4 rounded hover:bg-base-200" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <div className="border-t border-base-200 mt-2 pt-4 flex flex-col gap-2">
              {isLoggedIn ? (
                <Link href="/dashboard" className="btn btn-primary btn-sm">Dashboard</Link>
              ) : (
                <>
                  <Link href="/auth/signin" className="btn btn-ghost btn-sm">Sign In</Link>
                  <Link href="/auth/signup" className="btn btn-primary btn-sm">Get Started</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// Hero Section
function Hero() {
  return (
    <section className="min-h-[85vh] flex items-center bg-gradient-to-br from-primary/5 via-base-100 to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Built for UK Independent Dealers
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-base-content leading-tight mb-6">
            Run your dealership ops without spreadsheets, WhatsApp, or paperwork
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-base-content/70 max-w-3xl mx-auto mb-8">
            DealerFlow keeps vehicle prep, warranties, appraisals, forms, and staff time-off in one simple system — built for UK used car dealers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link href="/auth/signup" className="btn btn-primary btn-lg px-8">
              Get Started
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link href="/auth/signin" className="btn btn-outline btn-lg px-8">
              Sign In
            </Link>
          </div>

          {/* Small note */}
          <p className="text-sm text-base-content/50">
            Designed to run alongside your existing DMS — not replace it.
          </p>
        </div>
      </div>
    </section>
  );
}

// Trust Strip
function TrustStrip() {
  const items = [
    { icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9", text: "Built for small–medium UK dealers" },
    { icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z", text: "Mobile-friendly" },
    { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", text: "Multi-user teams" },
    { icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4", text: "Works alongside your DMS" },
  ];

  return (
    <section className="py-8 bg-base-200/50 border-y border-base-200">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-base-content/70">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Problem Section
function ProblemSection() {
  const problems = [
    "Prep tracked in people's heads or scattered across WhatsApp",
    "Warranty claims buried in emails and paper PDFs",
    "Appraisals done on the road with no central record",
    "Forms everywhere — PDI, test drives, courtesy cars — all disconnected",
    "No visibility on what's blocking cars or who last updated them",
  ];

  return (
    <section className="py-20 bg-base-100">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-4">
              The day-to-day mess
            </h2>
            <p className="text-lg text-base-content/70">
              Sound familiar? You're not alone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {problems.map((problem, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-error/5 border border-error/20 rounded-lg">
                <svg className="w-5 h-5 text-error mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-base-content/80">{problem}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Features Section
function Features() {
  const features = [
    {
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      title: "Stock & Prep Board",
      description: "Kanban-style board to track vehicles from arrival to sale-ready. PDI checklists, issue tracking, and task management.",
    },
    {
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      title: "Warranty & Aftersales Board",
      description: "Track warranty claims, manage repairs, allocate courtesy cars, and keep customers updated at every step.",
    },
    {
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      title: "Smart Forms That Feed Workflow",
      description: "Digital PDI, test drives, handovers, and appraisals. QR codes, e-signatures, and instant PDF export.",
    },
    {
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      title: "Calendar + Staff Leave Approvals",
      description: "Shared team calendar for events, appointments, and holiday requests with approval workflow.",
    },
    {
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      title: "Activity Log",
      description: "See who did what and when. Full audit trail for every vehicle, form, and status change.",
    },
  ];

  return (
    <section id="features" className="py-20 bg-base-200 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-4">
            Everything in one place
          </h2>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
            Stop juggling spreadsheets, WhatsApp groups, and paper forms. DealerFlow brings it all together.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
              <div className="card-body">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="card-title text-lg">{feature.title}</h3>
                <p className="text-base-content/70 text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Modules Section
function Modules() {
  const modules = [
    {
      title: "Stock & Prep",
      description: "Track vehicles from purchase to sale-ready with kanban boards, task lists, and issue tracking.",
      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    },
    {
      title: "Appraisals",
      description: "Shareable appraisal links for part-exchanges and buying appointments. AI-powered hints for common issues.",
      icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    },
    {
      title: "Warranty & Aftersales",
      description: "Manage warranty cases, bookings, parts orders, and courtesy car allocation in one place.",
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    },
    {
      title: "Reviews",
      description: "Request customer reviews via SMS or email with direct links to your Google Reviews page.",
      icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    },
  ];

  return (
    <section id="modules" className="py-20 bg-base-100 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-4">
            Modules that work together
          </h2>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
            Enable only what you need. Each module integrates seamlessly with the others.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {modules.map((module, idx) => (
            <div key={idx} className="flex gap-4 p-6 bg-base-200 rounded-xl">
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={module.icon} />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">{module.title}</h3>
                <p className="text-base-content/70 text-sm">{module.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// How It Works
function HowItWorks() {
  const steps = [
    {
      step: "1",
      title: "Set up your dealership",
      description: "Sign up in seconds, add your logo, and configure which modules you need.",
    },
    {
      step: "2",
      title: "Add vehicles & share forms",
      description: "Enter a VRM to auto-fill details. Generate QR codes for test drives and appraisals.",
    },
    {
      step: "3",
      title: "Track everything from one place",
      description: "See prep progress, warranty cases, form submissions, and team schedules at a glance.",
    },
  ];

  return (
    <section className="py-20 bg-base-200">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-4">
            Up and running in minutes
          </h2>
          <p className="text-lg text-base-content/70">
            No complex setup. No training required.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-center gap-8 max-w-4xl mx-auto">
          {steps.map((item, index) => (
            <div key={index} className="flex-1 text-center relative">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-content text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-base-content/70 text-sm">{item.description}</p>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%]">
                  <svg className="w-full h-4 text-primary/30" viewBox="0 0 100 10">
                    <line x1="0" y1="5" x2="90" y2="5" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <polygon points="90,0 100,5 90,10" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-base-100 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-base-content/70 mb-8">
            No contracts. No hidden fees. Cancel anytime.
          </p>

          <div className="card bg-base-200 shadow-xl">
            <div className="card-body text-center">
              <div className="mb-4">
                <span className="text-sm text-base-content/60 uppercase tracking-wide">Starting from</span>
                <div className="text-5xl font-bold text-primary mt-2">
                  £79<span className="text-lg font-normal text-base-content/60">/month</span>
                </div>
                <p className="text-sm text-base-content/60 mt-1">per dealership</p>
              </div>

              <ul className="text-left space-y-3 my-6">
                {["Unlimited users", "All modules included", "Email support", "Regular updates", "No long-term contract"].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-warning/10 text-warning-content rounded-lg p-3 mb-4">
                <p className="text-sm font-medium">Early access pricing available</p>
              </div>

              <Link href="/auth/signup" className="btn btn-primary btn-lg">
                Get Started
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "Do I need to replace my DMS?",
      answer: "No. DealerFlow is designed to work alongside your existing DMS (like Autotrader, Autorola, or dealer management systems). It handles the operational side — prep tracking, warranty cases, forms — while your DMS handles stock advertising and finance.",
    },
    {
      question: "Can I share forms to customers or mechanics?",
      answer: "Yes. You can generate shareable links and QR codes for forms like test drive agreements, appraisals, and courtesy car handovers. Recipients don't need an account — they just fill in the form on their phone or computer.",
    },
    {
      question: "Does it work on mobile?",
      answer: "Absolutely. DealerFlow is fully responsive and works on phones, tablets, and desktops. Your team can update prep status, complete PDIs, and approve holiday requests from anywhere.",
    },
    {
      question: "Can I add staff and set different roles?",
      answer: "Yes. You can invite team members with different roles (Owner, Admin, Staff, Workshop). Each role has appropriate permissions — for example, only Owners and Admins can approve holiday requests.",
    },
    {
      question: "Does it include invoicing?",
      answer: "Not in the current version. DealerFlow focuses on operational workflow (prep, warranties, forms, scheduling). For invoicing and accounting, we recommend using your existing tools.",
    },
    {
      question: "Can I export job sheets and PDFs?",
      answer: "Yes. You can export vehicle job sheets, form submissions, and appraisals as PDFs. These include your dealership branding and are ready to print or email.",
    },
  ];

  return (
    <section id="faq" className="py-20 bg-base-200 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-4">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="collapse collapse-arrow bg-base-100 shadow">
                <input
                  type="radio"
                  name="faq-accordion"
                  checked={openIndex === idx}
                  onChange={() => setOpenIndex(openIndex === idx ? null : idx)}
                />
                <div className="collapse-title text-lg font-medium">
                  {faq.question}
                </div>
                <div className="collapse-content">
                  <p className="text-base-content/70 pt-2">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Final CTA Section
function FinalCTA() {
  return (
    <section className="py-20 bg-primary text-primary-content">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to streamline your dealership?
        </h2>
        <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
          Join dealers across the UK who are saving hours every week with DealerFlow.
        </p>
        <Link href="/auth/signup" className="btn btn-secondary btn-lg px-8">
          Get Started
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="bg-base-300 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
            <span className="font-bold">DealerFlow</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="text-base-content/60 hover:text-base-content">Privacy</Link>
            <Link href="/tos" className="text-base-content/60 hover:text-base-content">Terms</Link>
          </div>
          <div className="text-sm text-base-content/50">
            &copy; {new Date().getFullYear()} DealerFlow. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Page Component - NO AUTO-REDIRECT
export default function Home() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  // Show loading only briefly while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <Head><title>DealerFlow</title></Head>
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // Always show marketing page - DO NOT REDIRECT
  return (
    <>
      <Head>
        <title>DealerFlow — Dealer Operations Made Simple</title>
        <meta name="description" content="DealerFlow keeps vehicle prep, warranties, appraisals, forms, and staff time-off in one simple system — built for UK used car dealers." />
      </Head>

      <div className="min-h-screen bg-base-100">
        <Header isLoggedIn={isLoggedIn} />
        <Hero />
        <TrustStrip />
        <ProblemSection />
        <Features />
        <Modules />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <FinalCTA />
        <Footer />
      </div>
    </>
  );
}
