import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import StatsCard from "@/components/StatsCard";

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

// Default priority forms (fallback if no usage data)
const DEFAULT_PRIORITY_FORM_TYPES = ["PDI", "SERVICE_RECEIPT", "TEST_DRIVE"];

// Needs Attention item configurations
const NEEDS_ATTENTION_ITEMS = [
  {
    key: "soldInProgress",
    label: "Sold in progress",
    href: "/sales-prep",
    color: "bg-amber-500",
    description: "vehicles awaiting delivery"
  },
  {
    key: "warrantyNotBookedIn",
    label: "Warranty not booked in",
    href: "/warranty",
    color: "bg-red-500",
    description: "cases need scheduling"
  },
  {
    key: "eventsToday",
    label: "Events today",
    href: "/calendar",
    color: "bg-blue-500",
    description: "on your calendar"
  },
  {
    key: "courtesyDueBack",
    label: "Courtesy due back",
    href: "/warranty",
    color: "bg-amber-500",
    description: "vehicles due today or overdue"
  },
  {
    key: "motExpiringSoon",
    label: "MOT expiring soon",
    href: "/sales-prep",
    color: "bg-red-500",
    description: "within 14 days"
  }
];

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then(res => {
        if (!res.ok) throw new Error("Failed to fetch stats");
        return res.json();
      }),
      fetch("/api/forms").then(res => {
        if (!res.ok) throw new Error("Failed to fetch forms");
        return res.json();
      }),
    ])
      .then(([statsData, formsData]) => {
        if (statsData.error) {
          console.error("Dashboard stats error:", statsData.error);
          setStats(null);
        } else {
          setStats(statsData);
        }
        setForms(Array.isArray(formsData) ? formsData : []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard fetch error:", err);
        setIsLoading(false);
      });
  }, []);

  const handleFormClick = (form) => {
    if (form.isPublic && form.publicSlug) {
      window.open(`/public/forms/${form.publicSlug}`, '_blank');
    } else {
      router.push(`/forms/fill/${form.id || form._id}`);
    }
  };

  // Get top forms from stats (by submission count) or fall back to defaults
  const getTopForms = () => {
    if (stats?.topForms?.length > 0) {
      // Map topForms to actual form objects
      return stats.topForms
        .map(tf => forms.find(f => (f.id || f._id) === tf.formId?.toString()))
        .filter(Boolean)
        .slice(0, 3);
    }
    // Fallback to default priority forms
    return forms.filter(f => DEFAULT_PRIORITY_FORM_TYPES.includes(f.type)).slice(0, 3);
  };

  const topForms = getTopForms();
  const otherForms = forms.filter(f => !topForms.find(tf => (tf.id || tf._id) === (f.id || f._id)));

  // Get active needs attention items (only those with count > 0)
  const activeNeedsAttention = NEEDS_ATTENTION_ITEMS.filter(item =>
    stats?.needsAttention?.[item.key] > 0
  );

  // Check if today strip has any data to show
  const hasTodayData = stats?.today && (
    stats.today.events > 0 ||
    stats.today.deliveries > 0 ||
    stats.today.testDrives > 0 ||
    stats.today.courtesyDueBack > 0
  );

  return (
    <DashboardLayout>
      <Head><title>Dashboard | DealerFlow</title></Head>

      {/* Header - Compact */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Here's what needs attention today</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Today Strip - Only show if there's data */}
          {hasTodayData && (
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-slate-700">Today</span>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-3 flex-wrap">
                {stats.today.events > 0 && (
                  <Link href="/calendar" className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {stats.today.events} event{stats.today.events !== 1 ? "s" : ""}
                  </Link>
                )}
                {stats.today.deliveries > 0 && (
                  <Link href="/calendar" className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-200 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {stats.today.deliveries} deliver{stats.today.deliveries !== 1 ? "ies" : "y"}
                  </Link>
                )}
                {stats.today.testDrives > 0 && (
                  <Link href="/calendar" className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium hover:bg-cyan-200 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    {stats.today.testDrives} test drive{stats.today.testDrives !== 1 ? "s" : ""}
                  </Link>
                )}
                {stats.today.courtesyDueBack > 0 && (
                  <Link href="/warranty" className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium hover:bg-amber-200 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {stats.today.courtesyDueBack} courtesy due
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Top Row - KPI Cards with micro-context */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Stock"
              value={(stats?.vehicles?.inStock || 0) + (stats?.vehicles?.inPrep || 0)}
              trend={stats?.vehicles?.inPrep > 0 ? `${stats.vehicles.inPrep} in prep` : null}
              icon="🚗"
              color="primary"
            />
            <StatsCard
              title="Pending Appraisals"
              value={stats?.appraisals?.pending || 0}
              trend={stats?.oldestAppraisalDays !== null ? `Oldest: ${stats.oldestAppraisalDays}d` : null}
              icon="📋"
              color="warning"
            />
            <StatsCard
              title="Live Vehicles"
              value={stats?.vehicles?.live || 0}
              trend={stats?.vehicles?.inPrep > 0 ? `${stats.vehicles.inPrep} in prep` : null}
              icon="✨"
              color="success"
            />
            <StatsCard
              title="Avg Rating"
              value={stats?.reviews?.avgRating || "N/A"}
              trend={
                stats?.reviews?.lastReviewDays !== null
                  ? `Last review: ${stats.reviews.lastReviewDays}d ago`
                  : stats?.reviews?.count === 0
                  ? "No reviews yet"
                  : null
              }
              icon="⭐"
              color="info"
            />
          </div>

          {/* Quick Forms - Glass Pills */}
          {forms.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 mr-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Quick Forms</span>
              </div>
              {/* Top form buttons - Glass Pills */}
              {topForms.map((form) => (
                <button
                  key={form.id || form._id}
                  onClick={() => handleFormClick(form)}
                  className="bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 hover:text-blue-600 rounded-full px-5 py-2.5 transition-all text-sm font-semibold text-slate-600"
                >
                  {FORM_TYPE_LABELS[form.type] || form.name}
                </button>
              ))}
              {/* More dropdown */}
              {otherForms.length > 0 && (
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 rounded-full px-5 py-2.5 transition-all text-sm font-semibold text-slate-500 cursor-pointer flex items-center gap-1.5">
                    <span>More</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </label>
                  <ul tabIndex={0} className="dropdown-content z-20 menu p-2 shadow-xl bg-white rounded-2xl w-56 max-h-60 overflow-y-auto border border-slate-100 mt-2">
                    {otherForms.map((form) => (
                      <li key={form.id || form._id}>
                        <button onClick={() => handleFormClick(form)} className="text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          {form.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link href="/forms" className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors">All Submissions →</Link>
            </div>
          )}

          {/* Middle Row - Needs Attention + Dealer Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Needs Attention - 2/3 width - Task Style */}
            <div className="lg:col-span-2 bg-white border border-red-100 rounded-xl p-1 shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-base font-bold text-slate-800">Needs Attention</h3>
              </div>
              {activeNeedsAttention.length > 0 ? (
                <div className="p-2">
                  {activeNeedsAttention.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="flex items-center gap-4 p-3 hover:bg-red-50/50 rounded-lg cursor-pointer transition-colors"
                    >
                      {/* Soft Circle Counter */}
                      <div className="bg-red-100 text-red-600 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                        {stats.needsAttention[item.key]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-slate-300 group-hover:text-red-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 m-2 bg-emerald-50 rounded-xl">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-emerald-700 font-semibold text-sm">All clear!</p>
                    <p className="text-xs text-emerald-600/70 mt-0.5">Nothing needs attention right now</p>
                  </div>
                </div>
              )}
            </div>

            {/* Dealer Actions - 1/3 width - Command Cards */}
            <div className="bg-slate-50/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-base font-bold text-slate-800">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                {/* Add Vehicle Card */}
                <Link href="/sales-prep" className="group flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                  <div className="bg-slate-50 text-slate-500 p-2.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <span className="font-bold text-slate-700">Add Vehicle</span>
                </Link>

                {/* New Appraisal Card */}
                <Link href="/appraisals/new" className="group flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                  <div className="bg-slate-50 text-slate-500 p-2.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="font-bold text-slate-700">New Appraisal</span>
                </Link>

                {/* View Submissions Card */}
                <Link href="/forms" className="group flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                  <div className="bg-slate-50 text-slate-500 p-2.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="font-bold text-slate-700">View Submissions</span>
                </Link>

                {/* Invite Team Card - Distinct Purple Style */}
                <Link href="/settings/team" className="group flex items-center gap-3 p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl shadow-sm hover:shadow-md hover:border-violet-400 transition-all">
                  <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white p-2.5 rounded-lg shadow">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-bold text-violet-700 block">Invite Team</span>
                    <span className="text-xs text-violet-500">Add staff members</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Row - Recent Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Appraisals */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Recent Appraisals</h3>
                <Link href="/appraisals" className="text-xs font-bold text-blue-600 uppercase tracking-wide hover:underline">View All</Link>
              </div>

              {stats?.recent?.appraisals?.length > 0 ? (
                <div className="overflow-y-auto max-h-[240px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  {/* Column Headers */}
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 mb-2">
                    <div className="col-span-4">Vehicle</div>
                    <div className="col-span-4">Contact</div>
                    <div className="col-span-4 text-right">Status</div>
                  </div>
                  {/* Data Rows */}
                  <div className="space-y-1">
                    {stats.recent.appraisals.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => router.push(`/appraisals/${a.id}`)}
                        className="grid grid-cols-12 gap-2 items-center py-4 hover:bg-slate-50 transition-colors cursor-pointer rounded-lg -mx-2 px-2"
                      >
                        <div className="col-span-4">
                          <span className="font-mono text-xs bg-[#fcd34d] border border-yellow-500/50 rounded px-1.5 py-0.5 text-slate-900 font-bold">{a.vehicleReg}</span>
                        </div>
                        <div className="col-span-4">
                          <p className="text-sm text-slate-600 truncate">{a.contactId?.name || "—"}</p>
                        </div>
                        <div className="col-span-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            a.decision === "purchased" || a.decision === "converted"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : a.decision === "not_purchased" || a.decision === "declined"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {a.decision}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-10 bg-slate-50 rounded-xl">
                  <p className="text-slate-400 text-sm">No appraisals yet</p>
                </div>
              )}
            </div>

            {/* Pending Prep */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Pending Prep</h3>
                <Link href="/sales-prep" className="text-xs font-bold text-blue-600 uppercase tracking-wide hover:underline">View All</Link>
              </div>

              {stats?.recent?.vehicles?.length > 0 ? (
                <div className="overflow-y-auto max-h-[240px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  {/* Column Headers */}
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 mb-2">
                    <div className="col-span-4">Vehicle</div>
                    <div className="col-span-4">Reg</div>
                    <div className="col-span-4 text-right">Status</div>
                  </div>
                  {/* Data Rows */}
                  <div className="space-y-1">
                    {stats.recent.vehicles.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => router.push("/sales-prep")}
                        className="grid grid-cols-12 gap-2 items-center py-4 hover:bg-slate-50 transition-colors cursor-pointer rounded-lg -mx-2 px-2"
                      >
                        <div className="col-span-4">
                          <p className="font-bold text-slate-700 text-sm truncate">{v.make} {v.model}</p>
                        </div>
                        <div className="col-span-4">
                          <span className="font-mono text-xs bg-[#fcd34d] border border-yellow-500/50 rounded px-1.5 py-0.5 text-slate-900 font-bold">{v.regCurrent}</span>
                        </div>
                        <div className="col-span-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            v.status === "delivered"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : v.status === "live"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : v.status === "in_prep"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : v.status === "in_stock"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {v.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-10 bg-slate-50 rounded-xl">
                  <p className="text-slate-400 text-sm">No vehicles yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
