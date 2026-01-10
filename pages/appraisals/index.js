import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import { MobileStageSelector } from "@/components/ui/PageShell";
import { PageHint } from "@/components/ui";
import { toast } from "react-hot-toast";
import useDealerRedirect from "@/hooks/useDealerRedirect";

const STATUS_LABELS = {
  pending: "New",
  reviewed: "Reviewed",
  converted: "Converted",
  declined: "Declined",
};

const STATUS_STYLES = {
  pending: "bg-blue-50 text-blue-700 border-blue-100",
  reviewed: "bg-amber-50 text-amber-700 border-amber-100",
  converted: "bg-emerald-50 text-emerald-700 border-emerald-100",
  declined: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function Appraisals() {
  const router = useRouter();
  const { isRedirecting } = useDealerRedirect();
  const [activeTab, setActiveTab] = useState("all");
  const [appraisals, setAppraisals] = useState([]);
  const [pxAppraisals, setPxAppraisals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isConverting, setIsConverting] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [dealerSlug, setDealerSlug] = useState("");
  const [vrmSearch, setVrmSearch] = useState("");
  const [showVrmSuggestions, setShowVrmSuggestions] = useState(false);
  const menuRef = useRef(null);
  const newDropdownRef = useRef(null);
  const vrmSearchRef = useRef(null);

  useEffect(() => {
    fetchAppraisals();
    fetchPxAppraisals();
    fetchDealerInfo();
  }, [filter]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target)) {
        setShowNewDropdown(false);
      }
      if (vrmSearchRef.current && !vrmSearchRef.current.contains(event.target)) {
        setShowVrmSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDealerInfo = async () => {
    try {
      const res = await fetch("/api/dealer");
      if (res.ok) {
        const data = await res.json();
        setDealerSlug(data.slug || data._id || data.id);
      }
    } catch (error) {
      console.error("Failed to fetch dealer info");
    }
  };

  const fetchAppraisals = async () => {
    try {
      const res = await fetch(`/api/appraisals?decision=${filter}`);
      // Check for JSON response
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("[Appraisals] Non-JSON response:", res.status);
        toast.error(res.status === 401 || res.status === 403 ? "Session expired - please sign in" : "Failed to load appraisals");
        setAppraisals([]);
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to load appraisals");
        setAppraisals([]);
        return;
      }
      const data = await res.json();
      setAppraisals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[Appraisals] Fetch error:", error);
      toast.error("Failed to load buying appraisals");
      setAppraisals([]);
    }
  };

  const fetchPxAppraisals = async () => {
    try {
      const res = await fetch(`/api/customer-px?decision=${filter}`);
      // Check for JSON response
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("[PX Appraisals] Non-JSON response:", res.status);
        setPxAppraisals([]);
        return;
      }
      if (!res.ok) {
        setPxAppraisals([]);
        return;
      }
      const data = await res.json();
      setPxAppraisals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load PX appraisals", error);
      setPxAppraisals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, type = "buying") => {
    if (!confirm("Delete this appraisal?")) return;
    setOpenMenuId(null);
    try {
      const endpoint = type === "px" ? `/api/customer-px/${id}` : `/api/appraisals/${id}`;
      await fetch(endpoint, { method: "DELETE" });
      toast.success("Deleted");
      if (type === "px") fetchPxAppraisals();
      else fetchAppraisals();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleConvertToStock = async (appraisal, type = "buying") => {
    if (!confirm(`Convert "${appraisal.vehicleReg}" to stock? All issues and documents will be transferred.`)) return;

    setIsConverting(appraisal.id || appraisal._id);
    try {
      const endpoint = type === "px"
        ? `/api/customer-px/${appraisal.id || appraisal._id}/convert`
        : `/api/appraisals/${appraisal.id || appraisal._id}/convert`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialStatus: "in_stock" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to convert");
      }

      toast.success("Vehicle added to stock with all issues and documents!");
      if (type === "px") fetchPxAppraisals();
      else fetchAppraisals();

      if (confirm("Vehicle created. View it on Stock & Prep board?")) {
        router.push("/sales-prep");
      }
    } catch (error) {
      console.error("Convert error:", error);
      toast.error(error.message || "Failed to convert to stock");
    } finally {
      setIsConverting(null);
    }
  };

  const handleUpdateStatus = async (id, status, type = "buying") => {
    setOpenMenuId(null);
    try {
      const endpoint = type === "px" ? `/api/customer-px/${id}` : `/api/appraisals/${id}`;
      await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: status, decidedAt: new Date() }),
      });
      toast.success(`Marked as ${STATUS_LABELS[status]}`);
      if (type === "px") fetchPxAppraisals();
      else fetchAppraisals();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/px/${dealerSlug}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

  // Combine and filter appraisals based on tab
  const getAllAppraisals = () => {
    const buying = appraisals.map(a => ({ ...a, source: "buying" }));
    const px = pxAppraisals.map(a => ({ ...a, source: "px" }));
    return [...buying, ...px].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const getCurrentAppraisals = () => {
    let result;
    if (activeTab === "all") result = getAllAppraisals();
    else if (activeTab === "buying") result = appraisals.map(a => ({ ...a, source: "buying" }));
    else result = pxAppraisals.map(a => ({ ...a, source: "px" }));

    // Apply VRM search filter
    if (vrmSearch.trim()) {
      const searchTerm = vrmSearch.toUpperCase().replace(/\s/g, "");
      result = result.filter(a =>
        a.vehicleReg?.toUpperCase().replace(/\s/g, "").includes(searchTerm)
      );
    }
    return result;
  };

  const currentAppraisals = getCurrentAppraisals();

  // Get unique VRMs for suggestions
  const getVrmSuggestions = () => {
    if (!vrmSearch.trim()) return [];
    const allAppraisals = getAllAppraisals();
    const searchTerm = vrmSearch.toUpperCase().replace(/\s/g, "");
    const uniqueVrms = [...new Set(allAppraisals.map(a => a.vehicleReg).filter(Boolean))];
    return uniqueVrms
      .filter(vrm => vrm.toUpperCase().replace(/\s/g, "").includes(searchTerm))
      .slice(0, 5);
  };

  const vrmSuggestions = getVrmSuggestions();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

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
      <Head><title>Appraisals | DealerHQ</title></Head>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appraisals</h1>
          <p className="text-slate-500 mt-1">Manage vehicle appraisals and part-exchange valuations</p>
          <div className="mt-2"><PageHint id="appraisals">Value trade-ins and part-exchanges. Share the appraisal link to let customers submit details directly.</PageHint></div>
        </div>
        <div className="flex items-center gap-3">
          {/* Share Links Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Links
          </button>

          {/* New Appraisal Dropdown */}
          <div className="relative" ref={newDropdownRef}>
            <button
              onClick={() => setShowNewDropdown(!showNewDropdown)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0066CC] to-[#14B8A6] text-white rounded-xl font-medium shadow-lg shadow-[#0066CC]/30 hover:shadow-[#0066CC]/40 hover:from-[#0055BB] hover:to-[#119D8D] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Appraisal
              <svg className={`w-4 h-4 transition-transform ${showNewDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showNewDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                <Link
                  href="/appraisals/new"
                  className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  onClick={() => setShowNewDropdown(false)}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Dealer Appraisal</p>
                    <p className="text-xs text-slate-500">Staff fills out when appraising a vehicle</p>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    setShowNewDropdown(false);
                    setShowShareModal(true);
                  }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#14B8A6]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Customer PX Link</p>
                    <p className="text-xs text-slate-500">Get shareable link for customers</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-8">
          <button
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "all"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("all")}
          >
            <span className="flex items-center gap-2">
              All
              {(appraisals.length + pxAppraisals.length) > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "all" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {appraisals.length + pxAppraisals.length}
                </span>
              )}
            </span>
          </button>
          <button
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "buying"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("buying")}
          >
            <span className="flex items-center gap-2">
              Dealer Appraisals
              {appraisals.length > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "buying" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {appraisals.length}
                </span>
              )}
            </span>
          </button>
          <button
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "px"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("px")}
          >
            <span className="flex items-center gap-2">
              Customer PX
              {pxAppraisals.length > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "px" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {pxAppraisals.length}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Pills and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <MobileStageSelector
          stages={[
            { value: "all", label: "All" },
            { value: "pending", label: STATUS_LABELS.pending },
            { value: "reviewed", label: STATUS_LABELS.reviewed },
            { value: "converted", label: STATUS_LABELS.converted },
            { value: "declined", label: STATUS_LABELS.declined },
          ]}
          activeStage={filter}
          onStageChange={setFilter}
        />

        {/* VRM Search Box */}
        <div className="relative" ref={vrmSearchRef}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search VRM..."
              value={vrmSearch}
              onChange={(e) => {
                setVrmSearch(e.target.value);
                setShowVrmSuggestions(true);
              }}
              onFocus={() => setShowVrmSuggestions(true)}
              className="w-full sm:w-56 pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {vrmSearch && (
              <button
                onClick={() => {
                  setVrmSearch("");
                  setShowVrmSuggestions(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* VRM Suggestions Dropdown */}
          {showVrmSuggestions && vrmSuggestions.length > 0 && (
            <div className="absolute right-0 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
              {vrmSuggestions.map((vrm) => (
                <button
                  key={vrm}
                  onClick={() => {
                    setVrmSearch(vrm);
                    setShowVrmSuggestions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                >
                  <span className="font-mono text-slate-900">{vrm}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : currentAppraisals.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl border border-slate-200">
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-slate-700 mb-1">
              {activeTab === "buying" ? "No dealer appraisals found" : activeTab === "px" ? "No customer PX appraisals found" : "No appraisals found"}
            </p>
            <p className="text-sm text-slate-500 mb-6">
              {activeTab === "buying"
                ? "Start by creating your first vehicle appraisal"
                : activeTab === "px"
                ? "Share the Customer PX link with your customers"
                : "Create a dealer appraisal or share the Customer PX link"}
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/appraisals/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0066CC] to-[#14B8A6] text-white rounded-xl font-medium shadow-lg shadow-[#0066CC]/30 hover:shadow-[#0066CC]/40 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Appraisal
              </Link>
              {activeTab !== "buying" && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share PX Link
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {currentAppraisals.map((a) => {
            const id = a.id || a._id;
            const isMenuOpen = openMenuId === id;
            const type = a.source;
            const viewUrl = type === "px" ? `/appraisals/px/${id}` : `/appraisals/${id}`;

            return (
              <div
                key={`${type}-${id}`}
                className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Identity Section */}
                <div className="flex items-center gap-4">
                  {/* Car Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>

                  {/* Vehicle Info */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">
                        {a.vehicleYear && `${a.vehicleYear} `}
                        {a.vehicleMake || "Unknown"} {a.vehicleModel || "Vehicle"}
                      </span>
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {a.vehicleReg}
                      </span>
                    </div>
                    {type === "px" && (a.customerName || a.contactId?.name) && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {a.customerName || a.contactId?.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Center: Meta Data */}
                <div className="flex items-center gap-4 text-sm text-slate-400 sm:ml-4">
                  {/* Source Badge */}
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    type === "px" ? "bg-[#14B8A6]/10 text-[#14B8A6]" : "bg-[#0066CC]/10 text-[#0066CC]"
                  }`}>
                    {type === "px" ? "Customer PX" : "Dealer"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {a.mileage?.toLocaleString() || "-"} mi
                  </span>
                  <span className="w-px h-4 bg-slate-200"></span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(a.createdAt)}
                  </span>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex items-center gap-3 sm:ml-auto">
                  {/* Status Badge */}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[a.decision] || STATUS_STYLES.pending}`}>
                    {STATUS_LABELS[a.decision] || "New"}
                  </span>

                  {/* In Stock Badge */}
                  {a.vehicleId && (
                    <Link
                      href="/sales-prep"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      In Stock
                    </Link>
                  )}

                  {/* Convert Button */}
                  {(a.decision === "pending" || a.decision === "reviewed") && !a.vehicleId && (
                    <button
                      onClick={() => handleConvertToStock(a, type)}
                      disabled={isConverting === id}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-white rounded-lg text-sm font-medium shadow-lg transition-all disabled:opacity-50 ${
                        a.decision === "pending"
                          ? "bg-[#0066CC] shadow-[#0066CC]/20 hover:shadow-[#0066CC]/30 hover:bg-[#0055BB]"
                          : "bg-gradient-to-r from-emerald-500 to-green-500 shadow-emerald-200 hover:shadow-emerald-300"
                      }`}
                    >
                      {isConverting === id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.decision === "pending" ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 4v16m8-8H4"} />
                          </svg>
                          {a.decision === "pending" ? "Add to Stock" : "Convert"}
                        </>
                      )}
                    </button>
                  )}

                  {/* View Button */}
                  <Link
                    href={viewUrl}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    View
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  {/* More Menu */}
                  <div className="relative" ref={isMenuOpen ? menuRef : null}>
                    <button
                      onClick={() => setOpenMenuId(isMenuOpen ? null : id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                        {a.decision === "pending" && (
                          <button
                            onClick={() => handleUpdateStatus(id, "declined", type)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Decline
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(id, type)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Links Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowShareModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#14B8A6]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Share Appraisal Forms</h2>
              <p className="text-sm text-slate-500 mt-1">
                Share these links to receive vehicle appraisals
              </p>
            </div>

            {/* Customer PX Form */}
            <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Customer Part Exchange</h3>
                  <p className="text-xs text-slate-500">For customers trading in their vehicle</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/px/${dealerSlug}`}
                  className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/px/${dealerSlug}`);
                    toast.success("Customer PX link copied!");
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  title="Copy link"
                >
                  Copy
                </button>
                <a
                  href={`mailto:?subject=${encodeURIComponent("Part Exchange Appraisal Form")}&body=${encodeURIComponent(`Hi,\n\nPlease complete this part exchange appraisal form:\n\n${typeof window !== "undefined" ? window.location.origin : ""}/px/${dealerSlug}\n\nThank you`)}`}
                  className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                  title="Share via email"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/px/${dealerSlug}`;
                    window.open(`https://wa.me/?text=Get a free valuation for your vehicle: ${encodeURIComponent(link)}`, "_blank");
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  title="Share via WhatsApp"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Dealer Buying Form */}
            <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Dealer Buying Appraisal</h3>
                  <p className="text-xs text-slate-500">For trade/wholesale vehicle offers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/appraisal/${dealerSlug}`}
                  className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/appraisal/${dealerSlug}`);
                    toast.success("Dealer Buying link copied!");
                  }}
                  className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                  title="Copy link"
                >
                  Copy
                </button>
                <a
                  href={`mailto:?subject=${encodeURIComponent("Vehicle Appraisal Form")}&body=${encodeURIComponent(`Hi,\n\nPlease submit your vehicle appraisal using this form:\n\n${typeof window !== "undefined" ? window.location.origin : ""}/appraisal/${dealerSlug}\n\nThank you`)}`}
                  className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                  title="Share via email"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/appraisal/${dealerSlug}`;
                    window.open(`https://wa.me/?text=Submit a vehicle appraisal: ${encodeURIComponent(link)}`, "_blank");
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  title="Share via WhatsApp"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Share these links via email, WhatsApp, or embed them on your website
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
