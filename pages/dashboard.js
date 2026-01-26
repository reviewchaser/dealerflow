import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import StatsCard from "@/components/StatsCard";
import useDealerRedirect from "@/hooks/useDealerRedirect";
import { useDealer } from "@/contexts/DealerContext";
import { appPath } from "@/libs/appPath";
import { PageHint } from "@/components/ui";

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
// COURTESY_OUT is prioritized as it's frequently used when handing out courtesy cars
const DEFAULT_PRIORITY_FORM_TYPES = ["PDI", "TEST_DRIVE", "COURTESY_OUT"];
const ALWAYS_FIRST_FORM_TYPE = "PDI";
// Customer-facing forms that should NOT appear in internal dashboard/quick forms
const CUSTOMER_FACING_FORM_TYPES = ["WARRANTY_CLAIM"];

// Needs Attention item configurations
const NEEDS_ATTENTION_ITEMS = [
  {
    key: "soldInProgress",
    label: "Sold in progress",
    href: "/prep",
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
    href: "/aftersales",
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
    href: "/aftersales",
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
    href: "/prep",
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
    href: "/aftersales",
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
    href: "/aftersales",
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
  const { dealerSlug } = useDealer(); // Get dealer slug for tenant-aware links
  // Get slug from URL immediately for parallel fetch (before dealer context resolves)
  const slugFromUrl = router.query.dealerSlug;
  const getPath = (path) => appPath(dealerSlug, path); // Helper for tenant-aware paths
  const [stats, setStats] = useState(null);
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // KPI display mode: "net" (default) or "gross"
  const [kpiDisplayMode, setKpiDisplayMode] = useState("net");
  // Activity feed filter
  const [activityFilter, setActivityFilter] = useState("all");
  // VRM search for activity feed
  const [vrmSearch, setVrmSearch] = useState("");
  // My Tasks (personal notifications) - separated into new and done
  const [newTasks, setNewTasks] = useState([]);
  const [doneTasks, setDoneTasks] = useState([]);
  const [taskTab, setTaskTab] = useState("new"); // "new" or "done"
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [vrmSuggestions, setVrmSuggestions] = useState([]);
  const [showVrmSuggestions, setShowVrmSuggestions] = useState(false);

  // Fetch VRM suggestions when user types
  useEffect(() => {
    if (!vrmSearch || vrmSearch.length < 2) {
      setVrmSuggestions([]);
      return;
    }
    const debounce = setTimeout(() => {
      // Get unique VRMs from the activity feed
      const uniqueVrms = [...new Set(
        (stats?.activityFeed || [])
          .filter(e => e.vehicleReg)
          .map(e => e.vehicleReg.toUpperCase())
      )].filter(vrm => vrm.includes(vrmSearch.toUpperCase()));
      setVrmSuggestions(uniqueVrms.slice(0, 5));
    }, 150);
    return () => clearTimeout(debounce);
  }, [vrmSearch, stats?.activityFeed]);

  // Activity filter categories
  const ACTIVITY_FILTERS = {
    all: { label: "All", types: null },
    sales: {
      label: "Sales",
      types: ["DEAL_CREATED", "DEPOSIT_TAKEN", "INVOICE_GENERATED", "DELIVERED", "COMPLETED", "VEHICLE_DELIVERED", "SALE_COMPLETED"],
    },
    stockPrep: {
      label: "Stock & Prep",
      types: [
        "VEHICLE_ADDED", "VEHICLE_STATUS_CHANGED", "VEHICLE_LOCATION_CHANGED",
        "TASK_COMPLETED", "TASK_CREATED", "TASK_PARTS_ORDERED", "TASK_PARTS_RECEIVED",
        "ISSUE_CREATED", "ISSUE_RESOLVED", "ISSUE_UPDATED", "ISSUE_PARTS_ORDERED", "ISSUE_PARTS_RECEIVED",
        "DOCUMENT_UPLOADED", "LABELS_UPDATED"
      ],
    },
    aftersales: {
      label: "Aftersales",
      types: ["AFTERCARE_CASE_CREATED", "AFTERCARE_CASE_UPDATED", "AFTERCARE_CASE_CLOSED"],
    },
    forms: {
      label: "Forms",
      types: ["FORM_SUBMITTED"],
    },
  };

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
    aftersalesCosts: {
      thisMonth: { totalNet: 0, totalGross: 0, partsNet: 0, labourNet: 0, caseCount: 0, avgPerCase: 0 },
      lastMonth: { totalNet: 0, totalGross: 0, partsNet: 0, labourNet: 0, caseCount: 0, avgPerCase: 0 },
      ytd: { totalNet: 0, totalGross: 0, partsNet: 0, labourNet: 0, caseCount: 0, avgPerCase: 0 }
    },
  };

  // Fetch stats immediately when slug is available from URL (parallel with dealer context)
  useEffect(() => {
    // Wait for router to be ready with the slug
    if (!slugFromUrl) return;

    const safeJsonParse = async (res) => {
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("[Dashboard] Non-JSON response:", res.status, contentType);
        return null;
      }
      return res.json();
    };

    // Pass slug directly to API for parallel fetch (bypasses waiting for dealer context)
    fetch(`/api/dashboard/stats?slug=${encodeURIComponent(slugFromUrl)}`)
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

    // Fetch personal notifications (My Tasks) - all notifications for history
    setMyTasksLoading(true);
    fetch("/api/notifications")
      .then(async (res) => {
        if (!res.ok) return { notifications: [] };
        return res.json();
      })
      .then((data) => {
        const all = data.notifications || [];
        setNewTasks(all.filter(t => !t.isRead));
        setDoneTasks(all.filter(t => t.isRead));
        setMyTasksLoading(false);
      })
      .catch((err) => {
        console.error("Notifications fetch error:", err);
        setNewTasks([]);
        setDoneTasks([]);
        setMyTasksLoading(false);
      });
  }, [slugFromUrl]);

  // Dismiss a notification (mark as read) - moves from new to done
  const dismissTask = async (notificationId) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      if (res.ok) {
        // Move from new to done in local state
        const task = newTasks.find(t => t.id === notificationId);
        if (task) {
          setNewTasks(prev => prev.filter(t => t.id !== notificationId));
          setDoneTasks(prev => [{ ...task, isRead: true }, ...prev]);
        }
      }
    } catch (error) {
      console.error("Failed to dismiss task:", error);
    }
  };

  const handleFormClick = (form) => {
    if (form.isPublic && form.publicSlug) {
      window.open(`/public/forms/${form.publicSlug}`, '_blank');
    } else {
      router.push(getPath(`/forms/fill/${form.id || form._id}`));
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
      <Head><title>Dashboard | DealerHQ</title></Head>

      {/* Hero Header with Rich Gradient */}
      <div className="relative -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 md:px-6 pt-8 pb-10 mb-8 hero-gradient border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
              </h1>
              <p className="text-slate-600 mt-1.5 text-base">Here's what's happening with your dealership today</p>
              <div className="mt-2"><PageHint id="dashboard">Your daily overview. See key stats, quick actions, and things needing attention at a glance.</PageHint></div>
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
                  <Link href={getPath("/calendar")} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#0066CC]/20 text-[#0066CC] rounded-xl text-sm font-semibold hover:bg-[#0066CC]/5 hover:border-[#0066CC]/40 transition-all shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0066CC] animate-pulse" />
                    {stats.today.events} event{stats.today.events !== 1 ? "s" : ""}
                  </Link>
                )}
                {(stats?.today?.deliveries ?? 0) > 0 && (
                  <Link href={getPath("/calendar")} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-all shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    {stats.today.deliveries} deliver{stats.today.deliveries !== 1 ? "ies" : "y"}
                  </Link>
                )}
                {(stats?.today?.testDrives ?? 0) > 0 && (
                  <Link href={getPath("/calendar")} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-cyan-200 text-cyan-700 rounded-xl text-sm font-semibold hover:bg-cyan-50 transition-all shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    {stats.today.testDrives} test drive{stats.today.testDrives !== 1 ? "s" : ""}
                  </Link>
                )}
                {(stats?.today?.courtesyDueBack ?? 0) > 0 && (
                  <Link href={getPath("/aftersales")} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50 transition-all shadow-sm">
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
              title="Total Stock"
              value={(stats?.vehicles?.inStock ?? 0) + (stats?.vehicles?.inPrep ?? 0)}
              trend={stats?.vehicles?.inPrep > 0 ? `${stats.vehicles.inPrep} in prep` : null}
              icon="🚗"
              color="primary"
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
            <StatsCard
              title="Pending Appraisals"
              value={stats?.appraisals?.pending ?? 0}
              trend={typeof stats?.oldestAppraisalDays === "number" ? `Oldest: ${stats.oldestAppraisalDays}d` : null}
              icon="📋"
              color="secondary"
              variant="gradient"
            />
          </div>

          {/* My Tasks - Personal Notifications with History */}
          {(newTasks.length > 0 || doneTasks.length > 0) && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden mb-6">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">My Tasks</h2>
                    <p className="text-xs text-slate-500">Tasks assigned to you</p>
                  </div>
                </div>
              </div>
              {/* Tab buttons */}
              <div className="flex gap-2 px-6 py-2 border-b border-slate-100">
                <button
                  onClick={() => setTaskTab("new")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    taskTab === "new"
                      ? "bg-amber-100 text-amber-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  New ({newTasks.length})
                </button>
                <button
                  onClick={() => setTaskTab("done")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    taskTab === "done"
                      ? "bg-slate-200 text-slate-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Done ({doneTasks.length})
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {(taskTab === "new" ? newTasks : doneTasks).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                  >
                    {/* Dismiss checkbox - only show for new tasks */}
                    {taskTab === "new" ? (
                      <button
                        onClick={() => dismissTask(task.id)}
                        className="flex-shrink-0 w-5 h-5 rounded border-2 border-slate-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center transition-colors group"
                        title="Mark as done"
                      >
                        <svg className="w-3 h-3 text-transparent group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : (
                      <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-green-300 bg-green-50 flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Task content - clickable to navigate */}
                    <Link
                      href={
                        task.relatedCalendarEventId
                          ? getPath("/calendar")
                          : task.relatedAftercareCaseId
                            ? getPath(`/aftersales?caseId=${task.relatedAftercareCaseId}`)
                            : task.type === "TASK_ASSIGNED" && task.relatedVehicleId
                              ? getPath(`/prep?vehicleId=${task.relatedVehicleId}&tab=checklist`)
                              : task.relatedVehicleId
                                ? getPath(`/prep?vehicleId=${task.relatedVehicleId}`)
                                : getPath("/prep")
                      }
                      className="flex-1 min-w-0"
                    >
                      {/* Calendar Event Assignment */}
                      {task.type === "CALENDAR_EVENT_ASSIGNED" && task.calendarEvent ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-slate-900">
                              {task.calendarEvent.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-medium rounded">
                              Calendar
                            </span>
                            <span className="text-sm text-slate-500">
                              {new Date(task.calendarEvent.startDatetime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} at {new Date(task.calendarEvent.startDatetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(task.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                        </>
                      ) : task.type === "TASK_ASSIGNED" ? (
                        /* Checklist Task Assignment */
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {task.vehicle?.regCurrent || "Unknown"}
                            </span>
                            <span className="text-slate-400">-</span>
                            <span className="text-sm text-slate-600 truncate">
                              {task.vehicle?.make} {task.vehicle?.model}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs font-medium rounded">
                              Task
                            </span>
                            <span className="text-sm text-slate-500 truncate">
                              {task.task?.name || task.message}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Assigned {new Date(task.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                        </>
                      ) : (
                        /* Issue Assignment */
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {task.vehicle?.regCurrent || "Unknown"}
                            </span>
                            <span className="text-slate-400">-</span>
                            <span className="text-sm text-slate-600 truncate">
                              {task.vehicle?.make} {task.vehicle?.model}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                              {task.issue?.category || "Issue"}
                            </span>
                            <span className="text-sm text-slate-500 truncate">
                              {task.issue?.description || task.message}
                            </span>
                          </div>
                          {task.assignedBy && (
                            <p className="text-xs text-slate-400 mt-1">
                              Assigned by {task.assignedBy} - {new Date(task.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </p>
                          )}
                        </>
                      )}
                    </Link>

                    {/* Priority indicator for issues */}
                    {task.issue?.status && (
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        task.issue.status === "Outstanding" ? "bg-red-100 text-red-700" :
                        task.issue.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                        task.issue.status === "Ordered" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {task.issue.status}
                      </span>
                    )}
                    {/* Status indicator for checklist tasks */}
                    {task.task?.status && (
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        task.task.status === "pending" ? "bg-slate-100 text-slate-600" :
                        task.task.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                        task.task.status === "done" ? "bg-green-100 text-green-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {task.task.status === "pending" ? "Pending" :
                         task.task.status === "in_progress" ? "In Progress" :
                         task.task.status === "done" ? "Done" :
                         task.task.status === "not_required" ? "Not Required" :
                         task.task.status}
                      </span>
                    )}
                  </div>
                ))}
                {/* Empty state for each tab */}
                {taskTab === "new" && newTasks.length === 0 && (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-slate-500">No new tasks</p>
                  </div>
                )}
                {taskTab === "done" && doneTasks.length === 0 && (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-slate-500">No completed tasks yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Feed */}
          {stats?.activityFeed?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Activity Feed</h2>
                    <p className="text-xs text-slate-500">Latest updates across your dealership</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* VRM Search */}
                  <div className="relative flex-1 md:flex-initial">
                    <div className="relative">
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search VRM..."
                        value={vrmSearch}
                        onChange={(e) => {
                          setVrmSearch(e.target.value.toUpperCase());
                          setShowVrmSuggestions(true);
                        }}
                        onFocus={() => setShowVrmSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowVrmSuggestions(false), 150)}
                        className="w-full md:w-40 pl-8 pr-8 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC]"
                      />
                      {vrmSearch && (
                        <button
                          onClick={() => {
                            setVrmSearch("");
                            setVrmSuggestions([]);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {/* Suggestions dropdown */}
                    {showVrmSuggestions && vrmSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
                        {vrmSuggestions.map((vrm) => (
                          <button
                            key={vrm}
                            onMouseDown={() => {
                              setVrmSearch(vrm);
                              setShowVrmSuggestions(false);
                            }}
                            className="w-full px-3 py-2 text-xs font-mono text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                          >
                            {vrm}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Filter Tabs - Desktop */}
                  <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    {Object.entries(ACTIVITY_FILTERS).map(([key, { label }]) => (
                      <button
                        key={key}
                        onClick={() => setActivityFilter(key)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          activityFilter === key
                            ? "bg-white text-[#0066CC] shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {/* Filter Dropdown - Mobile */}
                  <div className="md:hidden flex-1">
                    <select
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-100 border-0 rounded-lg focus:ring-2 focus:ring-[#0066CC]/20"
                    >
                      {Object.entries(ACTIVITY_FILTERS).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {stats.activityFeed
                  .filter((event) => {
                    // VRM filter
                    if (vrmSearch && (!event.vehicleReg || !event.vehicleReg.toUpperCase().includes(vrmSearch.toUpperCase()))) {
                      return false;
                    }
                    // Category filter
                    if (activityFilter === "all") return true;
                    const filterTypes = ACTIVITY_FILTERS[activityFilter]?.types;
                    return filterTypes?.includes(event.type);
                  })
                  .map((event, idx) => {
                    // Activity icons (filled SVG style)
                    const icons = {
                      document: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>,
                      pound: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.75 10.818v2.614A3.13 3.13 0 0111.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.202.592.037.051.08.102.128.152zM10 18a8 8 0 100-16 8 8 0 000 16zm.75-13v.25A1.75 1.75 0 0112.5 7h.5c.281 0 .5.22.5.5V8a.5.5 0 01-.5.5H12a.75.75 0 00-.75.75v.3a3.63 3.63 0 011.538.432c.482.315.962.827.962 1.518 0 .69-.48 1.203-.962 1.518a3.63 3.63 0 01-1.538.432v.062a.75.75 0 01-.75.75h-1a.75.75 0 01-.75-.75v-.062a3.63 3.63 0 01-1.538-.432c-.482-.315-.962-.827-.962-1.518 0-.69.48-1.203.962-1.518a3.63 3.63 0 011.538-.432V9.25a.75.75 0 00-.75-.75h-.5a.5.5 0 01-.5-.5v-.5c0-.28.22-.5.5-.5h.5A1.75 1.75 0 019.25 5.25V5a.75.75 0 01.75-.75h.5c.414 0 .75.336.75.75v.25z" /></svg>,
                      truck: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.5 3c-1.051 0-2.093.04-3.125.117A1.49 1.49 0 002 4.607V10.5h-.5a.5.5 0 00-.5.5v2a2 2 0 002 2h1a2 2 0 002-2h6a2 2 0 002 2h1a2 2 0 002-2v-.5h.026a1.5 1.5 0 001.41-.993l.588-1.568c.118-.316.276-.616.467-.895A9.342 9.342 0 0118 6.5a1 1 0 00-1-1h-1.532a1.49 1.49 0 00-1.093.483L13.5 7h-.25a.75.75 0 010-1.5h.25a.75.75 0 01.75.75V6H17a2 2 0 012 2v.5h-1V8a1 1 0 00-1-1h-2.5V6.25a.75.75 0 01.75-.75H16V4a1 1 0 00-1-1h-.5c-1.031-.077-2.074-.117-3.125-.117H6.5zm.25 7.25a.75.75 0 000 1.5.75.75 0 000-1.5zm7.5 0a.75.75 0 000 1.5.75.75 0 000-1.5z" /></svg>,
                      check: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>,
                      warning: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>,
                      wrench: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.5 10a4.5 4.5 0 004.284-5.882c-.105-.324-.51-.391-.752-.15L15.34 6.66a.454.454 0 01-.493.11 3.01 3.01 0 01-1.618-1.616.455.455 0 01.11-.494l2.694-2.692c.24-.241.174-.647-.15-.752a4.5 4.5 0 00-5.873 4.575c.055.873-.128 1.808-.8 2.368l-7.23 6.024a2.724 2.724 0 103.837 3.837l6.024-7.23c.56-.672 1.495-.855 2.368-.8.096.007.193.01.291.01zM5 16a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" /></svg>,
                      pencil: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>,
                      cube: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.362 1.093a.75.75 0 00-.724 0L2.523 5.018 10 9.143l7.477-4.125-7.115-3.925zM18 6.443l-7.25 4v8.25l6.862-3.786A.75.75 0 0018 14.25V6.443zm-8.75 12.25v-8.25l-7.25-4v7.807a.75.75 0 00.388.657l6.862 3.786z" clipRule="evenodd" /></svg>,
                      checkBadge: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>,
                      clipboard: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14H13.5V7A2.5 2.5 0 0011 4.5H8.128a2.252 2.252 0 011.884-1.488A2.25 2.25 0 0112.25 1h1.5a2.25 2.25 0 012.238 2.012zM11.5 3.25a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v.25h-3v-.25z" clipRule="evenodd" /><path fillRule="evenodd" d="M2 7a1 1 0 011-1h8a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7zm2 3.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zm0 3.5a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>,
                      plusCircle: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" /></svg>,
                      arrowPath: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" /></svg>,
                      mapPin: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" /></svg>,
                      shield: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 01-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 01.48-.425 11.947 11.947 0 007.077-2.75z" clipRule="evenodd" /></svg>,
                      shieldCheck: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.425A12.11 12.11 0 0118 7c0 5.162-3.26 9.563-7.834 11.256a.48.48 0 01-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 01.48-.425 11.947 11.947 0 007.077-2.75zm4.196 5.954a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>,
                      folder: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75zM3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" /></svg>,
                      tag: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.767l6.5 6.5a2.5 2.5 0 003.536 0l2.878-2.878a2.5 2.5 0 000-3.536l-6.5-6.5A2.5 2.5 0 008.38 3H5.5zM6 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>,
                      pin: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>,
                    };

                    // Comprehensive activity type configuration with filled SVG icons
                    const eventConfig = {
                      DEAL_CREATED: { icon: icons.clipboard, color: "bg-blue-100 text-blue-600" },
                      DEPOSIT_TAKEN: { icon: icons.pound, color: "bg-emerald-100 text-emerald-600" },
                      INVOICE_GENERATED: { icon: icons.document, color: "bg-purple-100 text-purple-600" },
                      DELIVERED: { icon: icons.truck, color: "bg-cyan-100 text-cyan-600" },
                      VEHICLE_DELIVERED: { icon: icons.truck, color: "bg-cyan-100 text-cyan-600" },
                      COMPLETED: { icon: icons.check, color: "bg-green-100 text-green-600" },
                      SALE_COMPLETED: { icon: icons.check, color: "bg-green-100 text-green-600" },
                      ISSUE_CREATED: { icon: icons.warning, color: "bg-red-100 text-red-600" },
                      ISSUE_RESOLVED: { icon: icons.wrench, color: "bg-green-100 text-green-600" },
                      ISSUE_UPDATED: { icon: icons.pencil, color: "bg-amber-100 text-amber-600" },
                      ISSUE_PARTS_ORDERED: { icon: icons.cube, color: "bg-blue-100 text-blue-600" },
                      ISSUE_PARTS_RECEIVED: { icon: icons.checkBadge, color: "bg-emerald-100 text-emerald-600" },
                      TASK_COMPLETED: { icon: icons.check, color: "bg-green-100 text-green-600" },
                      TASK_CREATED: { icon: icons.clipboard, color: "bg-blue-100 text-blue-600" },
                      TASK_PARTS_ORDERED: { icon: icons.cube, color: "bg-blue-100 text-blue-600" },
                      TASK_PARTS_RECEIVED: { icon: icons.checkBadge, color: "bg-emerald-100 text-emerald-600" },
                      VEHICLE_ADDED: { icon: icons.plusCircle, color: "bg-blue-100 text-blue-600" },
                      VEHICLE_STATUS_CHANGED: { icon: icons.arrowPath, color: "bg-purple-100 text-purple-600" },
                      VEHICLE_LOCATION_CHANGED: { icon: icons.mapPin, color: "bg-cyan-100 text-cyan-600" },
                      AFTERCARE_CASE_CREATED: { icon: icons.shield, color: "bg-orange-100 text-orange-600" },
                      AFTERCARE_CASE_UPDATED: { icon: icons.shield, color: "bg-amber-100 text-amber-600" },
                      AFTERCARE_CASE_CLOSED: { icon: icons.shieldCheck, color: "bg-green-100 text-green-600" },
                      FORM_SUBMITTED: { icon: icons.document, color: "bg-blue-100 text-blue-600" },
                      DOCUMENT_UPLOADED: { icon: icons.folder, color: "bg-cyan-100 text-cyan-600" },
                      LABELS_UPDATED: { icon: icons.tag, color: "bg-purple-100 text-purple-600" },
                    }[event.type] || { icon: icons.pin, color: "bg-slate-100 text-slate-600" };

                    const timeAgo = (timestamp) => {
                      const now = new Date();
                      const then = new Date(timestamp);
                      const diffMs = now - then;
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);
                      if (diffMins < 1) return "Just now";
                      if (diffMins < 60) return `${diffMins}m ago`;
                      if (diffHours < 24) return `${diffHours}h ago`;
                      if (diffDays === 1) return "Yesterday";
                      if (diffDays < 7) return `${diffDays}d ago`;
                      return then.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                    };

                    const handleClick = () => {
                      if (event.dealId) {
                        router.push(getPath(`/sales?id=${event.dealId}`));
                      } else if (event.vehicleId) {
                        router.push(getPath(`/prep?vehicleId=${event.vehicleId}`));
                      }
                    };

                    return (
                      <div
                        key={`${event.type}-${event.timestamp}-${idx}`}
                        onClick={handleClick}
                        className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className={`w-9 h-9 rounded-lg ${eventConfig.color} flex items-center justify-center text-base flex-shrink-0`}>
                          {eventConfig.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* VRM and Make/Model as header */}
                          {(event.vehicleReg || event.vehicleMakeModel) && (
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {event.vehicleReg && (
                                <span className="text-sm font-mono font-semibold text-slate-900">{event.vehicleReg}</span>
                              )}
                              {event.vehicleMakeModel && (
                                <span className="text-sm text-slate-500">{event.vehicleMakeModel}</span>
                              )}
                            </div>
                          )}
                          <p className="text-sm text-slate-600 leading-tight">{event.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {event.userName && event.userName !== "System" && (
                              <span className="text-xs text-slate-400">{event.userName}</span>
                            )}
                            {event.customer && !event.vehicleReg && (
                              <span className="text-xs text-slate-500">{event.customer}</span>
                            )}
                          </div>
                        </div>
                        {event.amount > 0 && (
                          <span className="text-sm font-bold text-slate-700 flex-shrink-0">
                            £{event.amount.toLocaleString("en-GB")}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                          {timeAgo(event.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                {stats.activityFeed.filter((event) => {
                  // VRM filter
                  if (vrmSearch && (!event.vehicleReg || !event.vehicleReg.toUpperCase().includes(vrmSearch.toUpperCase()))) {
                    return false;
                  }
                  // Category filter
                  if (activityFilter === "all") return true;
                  const filterTypes = ACTIVITY_FILTERS[activityFilter]?.types;
                  return filterTypes?.includes(event.type);
                }).length === 0 && (
                  <div className="px-6 py-8 text-center text-slate-400">
                    <p>
                      {vrmSearch
                        ? `No activity found for "${vrmSearch}"`
                        : `No ${ACTIVITY_FILTERS[activityFilter]?.label.toLowerCase()} activity yet`
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Aftersales KPI Row */}
          <div className="space-y-2">
            {/* Net/Gross Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Aftersales Costs</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Show:</span>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    className={`px-2.5 py-1 font-medium transition-colors ${kpiDisplayMode === "net" ? "bg-[#0066CC] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                    onClick={() => setKpiDisplayMode("net")}
                  >
                    Net
                  </button>
                  <button
                    className={`px-2.5 py-1 font-medium transition-colors border-l border-slate-200 ${kpiDisplayMode === "gross" ? "bg-[#0066CC] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                    onClick={() => setKpiDisplayMode("gross")}
                  >
                    Gross
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <Link href={getPath("/aftersales")} className="block">
                <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-[#0066CC]/30 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Open Cases</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.aftercare?.open ?? 0}</p>
                      <p className="text-xs text-slate-400 mt-1">Warranty & aftercare</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">This Month{kpiDisplayMode === "gross" ? " (Gross)" : ""}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">£{(kpiDisplayMode === "gross" ? stats?.aftersalesCosts?.thisMonth?.totalGross : stats?.aftersalesCosts?.thisMonth?.totalNet ?? 0)?.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</p>
                    <p className="text-xs text-slate-400 mt-1">{stats?.aftersalesCosts?.thisMonth?.caseCount ?? 0} cases</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Last Month{kpiDisplayMode === "gross" ? " (Gross)" : ""}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">£{(kpiDisplayMode === "gross" ? stats?.aftersalesCosts?.lastMonth?.totalGross : stats?.aftersalesCosts?.lastMonth?.totalNet ?? 0)?.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</p>
                    <p className="text-xs text-slate-400 mt-1">{stats?.aftersalesCosts?.lastMonth?.caseCount ?? 0} cases</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Year to Date{kpiDisplayMode === "gross" ? " (Gross)" : ""}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">£{(kpiDisplayMode === "gross" ? stats?.aftersalesCosts?.ytd?.totalGross : stats?.aftersalesCosts?.ytd?.totalNet ?? 0)?.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</p>
                    <p className="text-xs text-slate-400 mt-1">{stats?.aftersalesCosts?.ytd?.caseCount ?? 0} cases • Avg £{(kpiDisplayMode === "gross" ? stats?.aftersalesCosts?.ytd?.avgPerCaseGross : stats?.aftersalesCosts?.ytd?.avgPerCase ?? 0)?.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
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
                <Link href={getPath("/forms")} className="text-sm text-[#0066CC] hover:text-[#0055BB] font-semibold transition-colors flex items-center gap-1">
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

          {/* Needs Attention */}
          <div>
            {/* Needs Attention - Modern Card Layout */}
            <div>
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
                          href={getPath(item.href)}
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
          </div>

        </div>
      )}
    </DashboardLayout>
  );
}
