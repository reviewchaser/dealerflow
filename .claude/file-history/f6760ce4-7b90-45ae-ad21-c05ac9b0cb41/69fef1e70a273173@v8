import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import StatsCard from "@/components/StatsCard";
import useDealerRedirect from "@/hooks/useDealerRedirect";

// Human-readable form type labels
const FORM_TYPE_LABELS = {
  PDI: "PDI",
  TEST_DRIVE: "Test Drive",
  WARRANTY_CLAIM: "Warranty Claim",
  COURTESY_OUT: "Courtesy Out",
  COURTESY_IN: "Courtesy In",
  SERVICE_RECEIPT: "Service",
  REVIEW_FEEDBACK: "Feedback",
  OTHER: "Other",
};

// Purpose-led icons for each form type (rounded, modern, single-weight)
const FormTypeIcon = ({ type, className = "w-6 h-6" }) => {
  const icons = {
    // PDI - Checklist icon
    PDI: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    // Test Drive - Steering wheel
    TEST_DRIVE: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeWidth={1.5} d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      </svg>
    ),
    // Courtesy Out - Car with outward arrow
    COURTESY_OUT: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17a2 2 0 100-4 2 2 0 000 4zM16 17a2 2 0 100-4 2 2 0 000 4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 13V11a1 1 0 011-1h2l2-3h6l2 3h2a1 1 0 011 1v2M6 13h12M17 6l3 3m0 0l-3 3m3-3H13" />
      </svg>
    ),
    // Courtesy In - Car with inward arrow
    COURTESY_IN: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17a2 2 0 100-4 2 2 0 000 4zM16 17a2 2 0 100-4 2 2 0 000 4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 13V11a1 1 0 011-1h2l2-3h6l2 3h2a1 1 0 011 1v2M6 13h12M13 6l-3 3m0 0l3 3m-3-3h7" />
      </svg>
    ),
    // Service Receipt - Wrench/spanner
    SERVICE_RECEIPT: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    // Feedback - Star rating
    REVIEW_FEEDBACK: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    // Delivery - Truck/handover
    DELIVERY: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    // Default - Generic form icon (for OTHER and unknown types)
    DEFAULT: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  };
  return icons[type] || icons.DEFAULT;
};

// Default priority forms - PDI is always first as it's the most common daily task
// COURTESY_IN (Courtesy Car Collection) is also prioritized as a frequently used form
const DEFAULT_PRIORITY_FORM_TYPES = ["PDI", "TEST_DRIVE", "COURTESY_IN"];
const ALWAYS_FIRST_FORM_TYPE = "PDI";
// Customer-facing forms that should NOT appear in internal dashboard/quick forms
const CUSTOMER_FACING_FORM_TYPES = ["WARRANTY_CLAIM"];

// Needs Attention item configurations
const NEEDS_ATTENTION_ITEMS = [
  {
    key: "soldInProgress",
    label: "Sold in progress",
    href: "/sales-prep",
    color: "warning",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: "vehicles awaiting delivery"
  },
  {
    key: "warrantyNotBookedIn",
    label: "Warranty not booked in",
    href: "/warranty",
    color: "danger",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    description: "cases need scheduling"
  },
  {
    key: "eventsToday",
    label: "Events today",
    href: "/calendar",
    color: "info",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    description: "on your calendar"
  },
  {
    key: "courtesyDueBack",
    label: "Courtesy due back",
    href: "/warranty",
    color: "warning",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    description: "vehicles due today or overdue"
  },
  {
    key: "motExpiringSoon",
    label: "MOT expiring soon",
    href: "/sales-prep",
    color: "danger",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    description: "within 14 days"
  },
  {
    key: "contactDue",
    label: "Contact due",
    href: "/warranty",
    color: "warning",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    description: "warranty cases need follow-up"
  },
  {
    key: "newWarrantyCases",
    label: "New warranty cases",
    href: "/warranty",
    color: "info",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: "created in last 48 hours"
  }
];

// Color mappings for needs attention
const ATTENTION_COLORS = {
  warning: {
    bg: "bg-gradient-to-br from-amber-50 to-orange-50",
    border: "border-amber-200",
    icon: "bg-amber-100 text-amber-600",
    badge: "bg-amber-500 text-white",
    text: "text-amber-900"
  },
  danger: {
    bg: "bg-gradient-to-br from-red-50 to-rose-50",
    border: "border-red-200",
    icon: "bg-red-100 text-red-600",
    badge: "bg-red-500 text-white",
    text: "text-red-900"
  },
  info: {
    bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
    border: "border-blue-200",
    icon: "bg-blue-100 text-blue-600",
    badge: "bg-blue-500 text-white",
    text: "text-blue-900"
  }
};

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isRedirecting } = useDealerRedirect();
  const [stats, setStats] = useState(null);
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const defaultStats = {
    appraisals: { total: 0, pending: 0 },
    vehicles: { total: 0, inStock: 0, inPrep: 0, live: 0, delivered: 0 },
    aftercare: { total: 0, open: 0 },
    reviews: { count: 0, avgRating: "N/A", lastReviewDays: null },
    forms: { total: 0, submissions: 0 },
    recent: { appraisals: [], vehicles: [], formSubmissions: [] },
    needsAttention: { soldInProgress: 0, warrantyNotBookedIn: 0, eventsToday: 0, courtesyDueBack: 0, motExpiringSoon: 0, contactDue: 0, newWarrantyCases: 0 },
    today: { events: 0, deliveries: 0, testDrives: 0, courtesyDueBack: 0 },
    topForms: [],
    oldestAppraisalDays: null,
  };

  // Only fetch stats after redirect check is complete (prevents double fetch)
  useEffect(() => {
    // Skip if we're still checking for redirects or going to redirect
    if (isRedirecting) return;

    const safeJsonParse = async (res) => {
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("[Dashboard] Non-JSON response:", res.status, contentType);
        return null;
      }
      return res.json();
    };

    fetch("/api/dashboard/stats")
      .then(async (res) => {
        if (res.status === 403) return { error: "No dealer context" };
        if (!res.ok) return { error: "Failed to fetch stats" };
        return await safeJsonParse(res) || { error: "Invalid response" };
      })
      .then((statsData) => {
        if (statsData?.error) {
          console.error("Dashboard stats error:", statsData.error);
          setStats(defaultStats);
          setForms([]);
        } else {
          setStats(statsData || defaultStats);
          setForms(Array.isArray(statsData?.formsList) ? statsData.formsList : []);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard fetch error:", err);
        setStats(defaultStats);
        setForms([]);
        setIsLoading(false);
      });
  }, [isRedirecting]);

  const handleFormClick = (form) => {
    if (form.isPublic && form.publicSlug) {
      window.open(`/public/forms/${form.publicSlug}`, '_blank');
    } else {
      router.push(`/forms/fill/${form.id || form._id}`);
    }
  };

  // Filter out customer-facing forms from internal dashboard
  const internalForms = forms.filter(f => !CUSTOMER_FACING_FORM_TYPES.includes(f.type));

  const getTopForms = () => {
    const pdiForm = internalForms.find(f => f.type === ALWAYS_FIRST_FORM_TYPE);
    let otherTopForms = [];
    if (stats?.topForms?.length > 0) {
      otherTopForms = stats.topForms
        .map(tf => internalForms.find(f => (f.id || f._id?.toString?.() || f._id) === (tf.formId?.toString?.() || tf.formId)))
        .filter(f => f && f.type !== ALWAYS_FIRST_FORM_TYPE)
        .slice(0, 2);
    } else {
      otherTopForms = internalForms.filter(f => DEFAULT_PRIORITY_FORM_TYPES.includes(f.type) && f.type !== ALWAYS_FIRST_FORM_TYPE).slice(0, 2);
    }
    return pdiForm ? [pdiForm, ...otherTopForms] : otherTopForms;
  };

  const topForms = getTopForms();
  const otherForms = internalForms.filter(f => !topForms.find(tf => (tf.id || tf._id?.toString?.() || tf._id) === (f.id || f._id?.toString?.() || f._id)));

  const activeNeedsAttention = NEEDS_ATTENTION_ITEMS.filter(item =>
    stats?.needsAttention?.[item.key] > 0
  );

  const hasTodayData = stats?.today && (
    stats.today.events > 0 ||
    stats.today.deliveries > 0 ||
    stats.today.testDrives > 0 ||
    stats.today.courtesyDueBack > 0
  );

  // Show loading while checking for dealer redirect
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Dashboard | DealerFlow</title></Head>

      {/* Hero Header with Rich Gradient */}
      <div className="relative -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 md:px-6 pt-8 pb-10 mb-8 hero-gradient border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
              </h1>
              <p className="text-slate-600 mt-1.5 text-base">Here's what's happening with your dealership today</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#14B8A6] flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Today's Activity Pills */}
          {hasTodayData && (
            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today</span>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-2 flex-wrap">
                {(stats?.today?.events ?? 0) > 0 && (
                  <Link href="/calendar" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#0066CC]/20 text-[#0066CC] rounded-xl text-sm font-semibold hover:bg-[#0066CC]/5 hover:border-[#0066CC]/40 transition-all shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0066CC] animate-pulse" />
                    {stats.today.events} event{stats.today.events !== 1 ? "s" : ""}
                  </Link>
                )}
                {(stats?.today?.deliveries ?? 0) > 0 && (
                  <Link href="/calendar" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-all shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    {stats.today.deliveries} deliver{stats.today.deliveries !== 1 ? "ies" : "y"}
                  </Link>
                )}
                {(stats?.today?.testDrives ?? 0) > 0 && (
                  <Link href="/calendar" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-cyan-200 text-cyan-700 rounded-xl text-sm font-semibold hover:bg-cyan-50 transition-all shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    {stats.today.testDrives} test drive{stats.today.testDrives !== 1 ? "s" : ""}
                  </Link>
                )}
                {(stats?.today?.courtesyDueBack ?? 0) > 0 && (
                  <Link href="/warranty" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50 transition-all shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    {stats.today.courtesyDueBack} courtesy due
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#0066CC]/20 border-t-[#0066CC] rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading dashboard...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">

          {/* KPI Cards Row - Mixed Variants */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard
              title="Pending Appraisals"
              value={stats?.appraisals?.pending ?? 0}
              trend={typeof stats?.oldestAppraisalDays === "number" ? `Oldest: ${stats.oldestAppraisalDays}d` : null}
              icon="📋"
              color="primary"
              variant="gradient"
            />
            <StatsCard
              title="Total Stock"
              value={(stats?.vehicles?.inStock ?? 0) + (stats?.vehicles?.inPrep ?? 0)}
              trend={stats?.vehicles?.inPrep > 0 ? `${stats.vehicles.inPrep} in prep` : null}
              icon="🚗"
              color="secondary"
              variant="gradient"
            />
            <StatsCard
              title="Sold in Progress"
              value={stats?.vehicles?.live ?? 0}
              trend="Awaiting delivery"
              icon="📦"
              color="warning"
              variant="outlined"
            />
            <StatsCard
              title="Total Sold"
              value={stats?.vehicles?.delivered ?? 0}
              trend="Delivered to customers"
              icon="🏆"
              color="success"
              variant="gradient"
            />
          </div>

          {/* Quick Forms Section */}
          {forms.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Quick Forms</h2>
                    <p className="text-xs text-slate-500">Launch frequently used forms</p>
                  </div>
                </div>
                <Link href="/forms" className="text-sm text-[#0066CC] hover:text-[#0055BB] font-semibold transition-colors flex items-center gap-1">
                  All Submissions
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topForms.map((form) => (
                  <button
                    key={form.id || form._id}
                    onClick={() => handleFormClick(form)}
                    className="group bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 p-5 rounded-xl flex flex-col items-center gap-3 hover:border-[#0066CC] hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#0066CC]/10 text-[#0066CC] flex items-center justify-center group-hover:bg-[#0066CC] group-hover:text-white transition-colors">
                      <FormTypeIcon type={form.type} className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-700 text-sm text-center">
                      {FORM_TYPE_LABELS[form.type] || form.name}
                    </span>
                  </button>
                ))}
                {otherForms.length > 0 && (
                  <div className="dropdown dropdown-end">
                    <label
                      tabIndex={0}
                      className="group bg-slate-100 border-2 border-dashed border-slate-300 p-5 rounded-xl flex flex-col items-center gap-3 hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer w-full"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                      </div>
                      <span className="font-bold text-slate-500 text-sm">+{otherForms.length} More</span>
                    </label>
                    <div tabIndex={0} className="dropdown-content z-20 shadow-2xl bg-white rounded-xl w-64 border border-slate-200 mt-2 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">All Forms</p>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {otherForms.map((form) => (
                          <button
                            key={form.id || form._id}
                            onClick={() => handleFormClick(form)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-[#0066CC]/5 hover:text-[#0066CC] transition-colors border-b border-slate-50 last:border-0"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                              <FormTypeIcon type={form.type} className="w-4 h-4" />
                            </div>
                            <span className="truncate">{FORM_TYPE_LABELS[form.type] || form.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Middle Row - Needs Attention + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Needs Attention - Modern Card Layout */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-red-50/50 to-amber-50/50">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-white shadow-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Needs Attention</h2>
                    <p className="text-xs text-slate-500">Items requiring your immediate action</p>
                  </div>
                </div>
                {activeNeedsAttention.length > 0 ? (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeNeedsAttention.map((item) => {
                      const colors = ATTENTION_COLORS[item.color];
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className={`${colors.bg} ${colors.border} border rounded-xl p-4 hover:shadow-md transition-all group`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center flex-shrink-0`}>
                              {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`${colors.badge} px-2 py-0.5 rounded-full text-xs font-bold`}>
                                  {stats?.needsAttention?.[item.key] ?? 0}
                                </span>
                                <span className={`text-sm font-bold ${colors.text}`}>{item.label}</span>
                              </div>
                              <p className="text-xs text-slate-600">{item.description}</p>
                            </div>
                            <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-lg font-bold text-emerald-700">All clear!</p>
                      <p className="text-sm text-emerald-600/70 mt-1">Nothing needs attention right now</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions - Command Palette Style */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#0EA5E9] flex items-center justify-center text-white shadow-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
                  <p className="text-xs text-slate-500">Shortcuts to common tasks</p>
                </div>
              </div>
              <div className="space-y-3">
                <Link href="/sales-prep" className="action-card">
                  <div className="w-10 h-10 rounded-xl bg-[#0066CC]/10 text-[#0066CC] flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-slate-800 block">Add Vehicle</span>
                    <span className="text-xs text-slate-500">Add to stock</span>
                  </div>
                </Link>

                <Link href="/appraisals/new" className="action-card">
                  <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/10 text-[#14B8A6] flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-slate-800 block">New Appraisal</span>
                    <span className="text-xs text-slate-500">Value a vehicle</span>
                  </div>
                </Link>

                <Link href="/forms" className="action-card">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-slate-800 block">View Submissions</span>
                    <span className="text-xs text-slate-500">Review form data</span>
                  </div>
                </Link>

                <Link href="/warranty?addCase=1" className="action-card">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-slate-800 block">Add Aftersales Case</span>
                    <span className="text-xs text-slate-500">Log warranty issue</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Row - Recent Activity Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Appraisals */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0066CC]/10 text-[#0066CC] flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Recent Appraisals</h3>
                </div>
                <Link href="/appraisals" className="text-xs font-bold text-[#0066CC] uppercase tracking-wide hover:underline flex items-center gap-1">
                  View All
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {stats?.recent?.appraisals?.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {stats.recent.appraisals.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      onClick={() => router.push(`/appraisals/${a.id}`)}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border border-slate-200">
                        <span className="font-mono text-xs font-bold text-slate-600">{a.vehicleReg?.slice(0, 4)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{a.vehicleReg}</p>
                        <p className="text-xs text-slate-500 truncate">{a.contactId?.name || "No contact"}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        a.decision === "purchased" || a.decision === "converted"
                          ? "bg-emerald-100 text-emerald-700"
                          : a.decision === "not_purchased" || a.decision === "declined"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {a.decision}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">No appraisals yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pending Prep */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/10 text-[#14B8A6] flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Pending Prep</h3>
                </div>
                <Link href="/sales-prep" className="text-xs font-bold text-[#0066CC] uppercase tracking-wide hover:underline flex items-center gap-1">
                  View All
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {stats?.recent?.vehicles?.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {stats.recent.vehicles.slice(0, 5).map((v) => (
                    <div
                      key={v.id}
                      onClick={() => router.push("/sales-prep")}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-50 flex items-center justify-center border border-amber-200">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-8 4h4m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{v.make} {v.model}</p>
                        <p className="text-xs text-slate-500">{v.regCurrent}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        v.status === "delivered"
                          ? "bg-slate-100 text-slate-600"
                          : v.status === "live"
                          ? "bg-emerald-100 text-emerald-700"
                          : v.status === "in_prep"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {v.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-8 4h4m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">No vehicles yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
