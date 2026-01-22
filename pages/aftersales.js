import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import DashboardLayout from "@/components/DashboardLayout";
import VehicleDrawer from "@/components/VehicleDrawer";
// TEMPORARILY DISABLED - AI features commented out for later reinstatement
// import AISuggestionsPanel from "@/components/AISuggestionsPanel";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { MobileStageSelector } from "@/components/ui/PageShell";
import { PageHint } from "@/components/ui";
import { PhotoGallery } from "@/components/ui/PhotoGallery";
import { toast } from "react-hot-toast";
import useDealerRedirect from "@/hooks/useDealerRedirect";
import InlineFormModal from "@/components/InlineFormModal";

// Column config matching Sales & Prep style
// NOTE: Internal keys are legacy names - keep stable for database compatibility
// Display labels have been updated for clarity
const COLUMNS = [
  { key: "not_booked_in", label: "Not Booked In", gradient: "from-red-100/60", accent: "border-l-red-400", accentBg: "bg-red-400" },
  { key: "on_site", label: "Booked In", gradient: "from-amber-100/60", accent: "border-l-amber-400", accentBg: "bg-amber-400" }, // Legacy key: "on_site" displays as "Booked In"
  { key: "work_complete", label: "Work Complete", gradient: "from-blue-100/60", accent: "border-l-blue-400", accentBg: "bg-blue-400" },
  { key: "collected", label: "Closed", gradient: "from-emerald-100/60", accent: "border-l-emerald-400", accentBg: "bg-emerald-400" }, // Legacy key: "collected" displays as "Closed"
];

const PRIORITIES = {
  low: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  normal: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
  high: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-100" },
};

const SOURCE_LABELS = {
  warranty_claim_form: "Warranty Claim",
  low_review: "Low Review",
  complaint_form: "Complaint",
  manual: "Manual",
};

// Timeline event styling - using SVG icons for consistency
const TIMELINE_STYLES = {
  // System events - very subtle (low visual weight)
  CASE_CREATED: {
    color: "text-slate-300",
    bg: "bg-transparent",
    border: "border-slate-100",
    label: "Case Created",
    subtle: true
  },
  STATUS_CHANGED: {
    color: "text-slate-400",
    bg: "bg-transparent",
    border: "border-slate-100",
    label: "Status Changed",
    subtle: true
  },
  WARRANTY_STAGE_MOVED: {
    color: "text-slate-400",
    bg: "bg-transparent",
    border: "border-slate-100",
    label: "Stage Updated",
    subtle: true
  },
  // Booking events - moderate emphasis
  BOOKING_UPDATED: {
    color: "text-amber-400",
    bg: "bg-amber-50/50",
    border: "border-amber-100",
    label: "Booking Updated"
  },
  WARRANTY_BOOKED_IN: {
    color: "text-amber-400",
    bg: "bg-amber-50/50",
    border: "border-amber-100",
    label: "Booking Set"
  },
  WARRANTY_BOOKING_UPDATED: {
    color: "text-amber-400",
    bg: "bg-amber-50/50",
    border: "border-amber-100",
    label: "Booking Changed"
  },
  WARRANTY_BOOKING_CANCELLED: {
    color: "text-red-400",
    bg: "bg-red-50/50",
    border: "border-red-100",
    label: "Booking Cancelled"
  },
  // Dealer activity - HIGH PROMINENCE (most visible)
  COMMENT_ADDED: {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Dealer Update",
    prominent: true
  },
  DEALER_UPDATE: {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Dealer Update",
    prominent: true
  },
  // AI events - moderate
  AI_REVIEW_GENERATED: {
    color: "text-purple-400",
    bg: "bg-purple-50/50",
    border: "border-purple-100",
    label: "AI Review"
  },
  // Attachments - subtle (low visual weight)
  ATTACHMENT_ADDED: {
    color: "text-slate-300",
    bg: "bg-transparent",
    border: "border-slate-100",
    label: "File Attached",
    subtle: true
  },
  SUBMISSION_LINKED: {
    color: "text-slate-400",
    bg: "bg-transparent",
    border: "border-slate-100",
    label: "Form Linked",
    subtle: true
  },
  // Location & Parts - subtle (low visual weight)
  LOCATION_UPDATED: {
    color: "text-slate-300",
    bg: "bg-transparent",
    border: "border-slate-100",
    label: "Location Updated",
    subtle: true
  },
  PARTS_UPDATED: {
    color: "text-slate-300",
    bg: "bg-transparent",
    border: "border-slate-100",
    label: "Parts Updated",
    subtle: true
  },
  // Courtesy car - subtle
  COURTESY_REQUIRED_TOGGLED: {
    color: "text-slate-400",
    bg: "bg-transparent",
    border: "border-slate-100",
    label: "Courtesy Car",
    subtle: true
  },
  COURTESY_ALLOCATED: {
    color: "text-cyan-400",
    bg: "bg-cyan-50/30",
    border: "border-cyan-100",
    label: "Courtesy Allocated"
  },
  COURTESY_RETURNED: {
    color: "text-cyan-400",
    bg: "bg-cyan-50/30",
    border: "border-cyan-100",
    label: "Courtesy Returned"
  },
  COURTESY_OUT_RECORDED: {
    color: "text-cyan-400",
    bg: "bg-cyan-50/30",
    border: "border-cyan-100",
    label: "Courtesy Out"
  },
  COURTESY_IN_RECORDED: {
    color: "text-cyan-500",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    label: "Courtesy In"
  },
};

// Quick update templates for dealer updates
const QUICK_UPDATE_TEMPLATES = [
  { label: "Attempted call", text: "Attempted to call customer - no answer" },
  { label: "Spoke to customer", text: "Spoke to customer" },
  { label: "Awaiting parts", text: "Awaiting parts" },
  { label: "Customer update", text: "Customer notified of progress" },
];

// Timeline Icon components
const TimelineIcons = {
  status: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  calendar: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  comment: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  ai: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  attachment: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  ),
  location: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  parts: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  car: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  link: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  file: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

// Get icon component for event type
const getTimelineIcon = (type) => {
  const iconMap = {
    CASE_CREATED: TimelineIcons.file,
    STATUS_CHANGED: TimelineIcons.status,
    WARRANTY_STAGE_MOVED: TimelineIcons.status,
    BOOKING_UPDATED: TimelineIcons.calendar,
    WARRANTY_BOOKED_IN: TimelineIcons.calendar,
    WARRANTY_BOOKING_UPDATED: TimelineIcons.calendar,
    WARRANTY_BOOKING_CANCELLED: TimelineIcons.calendar,
    COMMENT_ADDED: TimelineIcons.comment,
    DEALER_UPDATE: TimelineIcons.comment,
    AI_REVIEW_GENERATED: TimelineIcons.ai,
    ATTACHMENT_ADDED: TimelineIcons.attachment,
    SUBMISSION_LINKED: TimelineIcons.link,
    LOCATION_UPDATED: TimelineIcons.location,
    PARTS_UPDATED: TimelineIcons.parts,
    COURTESY_REQUIRED_TOGGLED: TimelineIcons.car,
    COURTESY_ALLOCATED: TimelineIcons.car,
    COURTESY_RETURNED: TimelineIcons.car,
    COURTESY_OUT_RECORDED: TimelineIcons.car,
    COURTESY_IN_RECORDED: TimelineIcons.car,
  };
  return iconMap[type] || TimelineIcons.file;
};

// Format timestamp for timeline (readable format)
const formatTimelineDate = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` ${time}`;
};

// Merge events and comments into unified timeline
const buildUnifiedTimeline = (events = [], comments = []) => {
  const timeline = [];

  // Add events
  events.forEach(event => {
    timeline.push({
      ...event,
      itemType: 'event',
      sortDate: new Date(event.createdAt)
    });
  });

  // Add comments as DEALER_UPDATE type (unless already represented in events)
  comments.forEach(comment => {
    // Check if this comment is already represented in events
    const hasEvent = events.some(e =>
      e.type === 'COMMENT_ADDED' &&
      e.metadata?.commentId === (comment.id || comment._id)
    );

    if (!hasEvent) {
      timeline.push({
        type: 'DEALER_UPDATE',
        itemType: 'comment',
        comment: comment,
        createdAt: comment.createdAt,
        createdByName: comment.authorType === 'customer' ? 'Customer' : (comment.authorName || 'Staff'),
        isCustomer: comment.authorType === 'customer',
        sortDate: new Date(comment.createdAt)
      });
    }
  });

  // Sort by date (newest first)
  return timeline.sort((a, b) => b.sortDate - a.sortDate);
};

// Timeline grouping constant
const STATUS_FLIP_GROUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// Group consecutive STATUS_CHANGED events within the time window
const groupTimelineEvents = (events) => {
  if (!events || events.length === 0) return [];

  const sorted = [...events].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const grouped = [];
  let currentGroup = null;

  for (const event of sorted) {
    if (event.type === "STATUS_CHANGED") {
      if (currentGroup) {
        // Check if this event is within the time window of the last event in the group
        const lastEventTime = new Date(currentGroup.events[currentGroup.events.length - 1].createdAt).getTime();
        const thisEventTime = new Date(event.createdAt).getTime();

        if (lastEventTime - thisEventTime <= STATUS_FLIP_GROUP_WINDOW_MS) {
          currentGroup.events.push(event);
          continue;
        } else {
          // Close current group and start new one
          grouped.push(currentGroup);
          currentGroup = { isGroup: true, type: "STATUS_CHANGED_GROUP", events: [event] };
        }
      } else {
        currentGroup = { isGroup: true, type: "STATUS_CHANGED_GROUP", events: [event] };
      }
    } else {
      // Non-status event - close any current group and add this event
      if (currentGroup) {
        grouped.push(currentGroup);
        currentGroup = null;
      }
      grouped.push(event);
    }
  }

  // Don't forget to add the last group if exists
  if (currentGroup) {
    grouped.push(currentGroup);
  }

  return grouped;
};

// Repair location type labels
const REPAIR_LOCATION_LABELS = {
  WITH_CUSTOMER: "With customer",
  ON_SITE: "On-site",
  THIRD_PARTY: "Third-party",
};

// Repair location type badge styles
const REPAIR_LOCATION_STYLES = {
  WITH_CUSTOMER: { bg: "bg-slate-100", text: "text-slate-600" },
  ON_SITE: { bg: "bg-emerald-100", text: "text-emerald-700" },
  THIRD_PARTY: { bg: "bg-[#14B8A6]/10", text: "text-[#14B8A6]" },
};

// Format booked date/time for display
const formatBookedDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

// Helper to calculate days since date
const daysSince = (date) => {
  if (!date) return 0;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// Helper for relative time display
const relativeTime = (date) => {
  const days = daysSince(date);
  if (days === 0) {
    const hours = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
    if (hours === 0) {
      const mins = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60));
      return mins <= 1 ? "Just now" : `${mins}m ago`;
    }
    return `${hours}h ago`;
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export default function Warranty() {
  const router = useRouter();
  const { isRedirecting } = useDealerRedirect();
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [isUploadingCaseMedia, setIsUploadingCaseMedia] = useState(false);
  // TEMPORARILY DISABLED - AI features
  // const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  // const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  // const [aiDiagnostics, setAiDiagnostics] = useState(null);
  // const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [expandedTimelineGroups, setExpandedTimelineGroups] = useState({});
  const [isVehicleDrawerOpen, setIsVehicleDrawerOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const fileInputRef = useRef(null);

  // Parts order form state
  const [showPartsOrderForm, setShowPartsOrderForm] = useState(false);
  const [partsOrderForm, setPartsOrderForm] = useState({
    supplierName: "",
    orderRef: "",
    expectedAt: "",
    notes: "",
  });

  // Drag state - matching Sales & Prep
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  // Courtesy car state
  const [courtesyVehicles, setCourtesyVehicles] = useState([]);
  const [isLoadingCourtesy, setIsLoadingCourtesy] = useState(false);

  // Column sorting state
  const [columnSortOptions, setColumnSortOptions] = useState({});

  // Archive toggle for "Closed" column - when false, hides cases closed >90 days ago
  const [showAllClosed, setShowAllClosed] = useState(false);

  // Search filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Filter state (matching stock board style)
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    location: "all",      // "all" | "ON_SITE" | "THIRD_PARTY"
    booked: "all",        // "all" | "booked" | "not_booked"
    partsRequired: "all", // "all" | "yes" | "no"
    priority: "all",      // "all" | "low" | "normal" | "high" | "critical"
    contactDue: "all",    // "all" | "due" | "not_due"
  });

  // Mobile column selection
  const [mobileActiveColumn, setMobileActiveColumn] = useState("not_booked_in");

  // Job sheet share state
  const [showJobSheetModal, setShowJobSheetModal] = useState(false);
  const [jobSheetLink, setJobSheetLink] = useState(null);
  const [isGeneratingJobSheet, setIsGeneratingJobSheet] = useState(false);

  // Mobile move bottom sheet
  const [moveCase, setMoveCase] = useState(null);
  const [moveCaseCurrentColumn, setMoveCaseCurrentColumn] = useState(null);

  // Aftersales cost KPIs
  const [costKpis, setCostKpis] = useState({
    thisMonth: { totalNet: 0, totalGross: 0, parts: 0, labour: 0, caseCount: 0, avgPerCase: 0 },
    lastMonth: { totalNet: 0, totalGross: 0, parts: 0, labour: 0, caseCount: 0, avgPerCase: 0 },
    ytd: { totalNet: 0, totalGross: 0, parts: 0, labour: 0, caseCount: 0, avgPerCase: 0 }
  });
  // KPI display mode: "net" (default) or "gross"
  const [kpiDisplayMode, setKpiDisplayMode] = useState("net");

  // Inline form modals state
  const [showCourtesyOutModal, setShowCourtesyOutModal] = useState(false);
  const [showCourtesyInModal, setShowCourtesyInModal] = useState(false);

  useEffect(() => { fetchCases(showAllClosed); fetchCostKpis(); }, []);

  // Refetch when showAllClosed toggle changes
  useEffect(() => {
    fetchCases(showAllClosed);
  }, [showAllClosed]);

  // Auto-open case from query param (e.g., /aftersales?caseId=123)
  useEffect(() => {
    if (router.query.caseId && !selectedCase) {
      fetchCaseDetail(router.query.caseId);
    }
  }, [router.query.caseId]);

  // Handle addCase query param (from Quick Add menu)
  useEffect(() => {
    if (router.query.addCase === "1") {
      setShowAddModal(true);
      // Remove the query param from URL without reload
      router.replace("/aftersales", undefined, { shallow: true });
    }
  }, [router.query.addCase]);

  const fetchCases = async (includeAllClosed = false) => {
    try {
      // Use excludeOldClosed filter unless showing all
      const params = new URLSearchParams();
      if (!includeAllClosed) {
        params.append("excludeOldClosed", "true");
      }
      const url = `/api/aftercare${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      // Check for JSON response
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("[Warranty] Non-JSON response:", res.status);
        toast.error(res.status === 401 || res.status === 403 ? "Session expired - please sign in" : "Failed to load cases");
        setCases([]);
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to load cases");
        setCases([]);
        return;
      }
      const data = await res.json();
      setCases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[Warranty] Fetch error:", error);
      toast.error("Failed to load cases");
      setCases([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCostKpis = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) return;
      const data = await res.json();
      if (data.aftersalesCosts) {
        setCostKpis(data.aftersalesCosts);
      }
    } catch (error) {
      console.error("[Warranty] Failed to load cost KPIs:", error);
    }
  };

  const fetchCaseDetail = async (caseId) => {
    if (!caseId) return; // Guard against undefined/null caseId
    // TEMPORARILY DISABLED - AI diagnostics
    // setAiDiagnostics(null);
    try {
      const res = await fetch(`/api/aftercare/${caseId}`);
      // Check for JSON response
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("[Warranty] Case detail non-JSON response:", res.status);
        toast.error("Failed to load case details");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to load case");
        return;
      }
      const data = await res.json();
      // Normalize id field (API returns _id, we use id internally)
      setSelectedCase({ ...data, id: data._id || data.id });
    } catch (error) {
      console.error("[Warranty] Case detail error:", error);
      toast.error("Failed to load case");
    }
  };

  // Helper function to update case fields with proper error handling and optimistic updates
  const updateCase = async (updates, successMessage) => {
    const caseId = selectedCase?.id || selectedCase?._id;
    if (!caseId) return false;

    // Optimistic update: apply changes immediately
    const previousCase = selectedCase;
    const previousCases = cases;

    // Filter out internal event metadata from optimistic update
    const optimisticUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => !key.startsWith("_"))
    );

    if (Object.keys(optimisticUpdates).length > 0) {
      setSelectedCase(prev => ({ ...prev, ...optimisticUpdates }));
      setCases(prev => prev.map(c =>
        (c.id || c._id) === caseId ? { ...c, ...optimisticUpdates } : c
      ));
    }

    try {
      const res = await fetch(`/api/aftercare/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update case");
      }
      // Update local state from response (sync with server data)
      if (data.case) {
        setSelectedCase({ ...data.case, id: data.case._id || data.case.id });
        setCases(prev => prev.map(c =>
          (c.id || c._id) === caseId ? { ...data.case, id: data.case._id || data.case.id } : c
        ));
      }

      // Handle auto-move toast messages for booking changes
      if (data.autoMoved) {
        const COLUMN_LABELS = {
          not_booked_in: "Not Booked In",
          on_site: "Booked In",
          work_complete: "Work Complete",
          collected: "Closed"
        };
        if (data.autoMovedTo === "on_site") {
          toast.success(`Booked in — moved to Booked In`, { duration: 4000 });
        } else if (data.autoMovedFrom === "on_site") {
          toast.success(`Booking cancelled — moved back to ${COLUMN_LABELS[data.autoMovedTo] || data.autoMovedTo}`, { duration: 4000 });
        }
      } else if (successMessage) {
        toast.success(successMessage);
      }
      return data;
    } catch (error) {
      // Rollback on error
      toast.error(error.message || "Failed to update case");
      setSelectedCase(previousCase);
      setCases(previousCases);
      return false;
    }
  };

  // Load available courtesy vehicles
  const loadCourtesyVehicles = async () => {
    setIsLoadingCourtesy(true);
    try {
      const res = await fetch("/api/aftercare/courtesy");
      const data = await res.json();
      setCourtesyVehicles(data.available || []);
    } catch (error) {
      console.error("Error loading courtesy vehicles:", error);
    } finally {
      setIsLoadingCourtesy(false);
    }
  };

  // Parts order modal helpers
  const closePartsOrderModal = () => {
    setShowPartsOrderForm(false);
    setPartsOrderForm({
      supplierName: "",
      orderRef: "",
      expectedAt: "",
      notes: "",
    });
  };

  const addPartsOrder = async () => {
    if (!partsOrderForm.supplierName.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    await updateCase({
      _eventType: "PARTS_ORDER_ADDED",
      _eventMetadata: {
        supplierName: partsOrderForm.supplierName.trim(),
        orderRef: partsOrderForm.orderRef.trim() || undefined,
        expectedAt: partsOrderForm.expectedAt || undefined,
        notes: partsOrderForm.notes.trim() || undefined,
      }
    }, "Parts order added");
    closePartsOrderModal();
  };

  // Allocate courtesy vehicle to case
  const allocateCourtesy = async (courtesyVehicleId, dateDueBack) => {
    const caseId = selectedCase?.id || selectedCase?._id;
    if (!caseId || !courtesyVehicleId) return false;
    try {
      const res = await fetch("/api/aftercare/courtesy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, courtesyVehicleId, dateDueBack }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to allocate courtesy vehicle");
      }
      if (data.case) {
        setSelectedCase({ ...data.case, id: data.case._id || data.case.id });
        setCases(prev => prev.map(c =>
          (c.id || c._id) === caseId ? { ...data.case, id: data.case._id || data.case.id } : c
        ));
      }
      toast.success("Courtesy vehicle allocated");
      loadCourtesyVehicles(); // Refresh available list
      return true;
    } catch (error) {
      toast.error(error.message || "Failed to allocate courtesy vehicle");
      return false;
    }
  };

  // Return courtesy vehicle
  const returnCourtesy = async () => {
    const allocationId = selectedCase?.courtesyAllocationId || selectedCase?.courtesyAllocation?._id;
    if (!allocationId) return false;
    try {
      const res = await fetch("/api/aftercare/courtesy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocationId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to return courtesy vehicle");
      }
      // Refresh case detail
      fetchCaseDetail(selectedCase.id || selectedCase._id);
      loadCourtesyVehicles(); // Refresh available list
      toast.success("Courtesy vehicle returned");
      return true;
    } catch (error) {
      toast.error(error.message || "Failed to return courtesy vehicle");
      return false;
    }
  };

  // Generate job sheet share link
  const handleGenerateJobSheet = async () => {
    const caseId = selectedCase?.id || selectedCase?._id;
    if (!caseId) return;
    setIsGeneratingJobSheet(true);
    setShowJobSheetModal(true);
    try {
      const res = await fetch(`/api/aftercare/${caseId}/job-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 60 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate share link");
      }
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setJobSheetLink(fullUrl);
      toast.success("Job sheet link generated");
    } catch (error) {
      toast.error(error.message || "Failed to generate share link");
      setShowJobSheetModal(false);
    } finally {
      setIsGeneratingJobSheet(false);
    }
  };

  // Copy job sheet link to clipboard
  const copyJobSheetLink = () => {
    if (jobSheetLink) {
      navigator.clipboard.writeText(jobSheetLink);
      toast.success("Link copied to clipboard");
    }
  };

  // Share job sheet via WhatsApp
  const shareViaWhatsApp = () => {
    if (jobSheetLink) {
      const reg = selectedCase?.regAtPurchase || selectedCase?.currentReg || "Vehicle";
      const text = `Job Sheet for ${reg}: ${jobSheetLink}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  // Drag handlers - matching Sales & Prep exactly
  const handleDragStart = (e, caseItem) => {
    setDraggedCard(caseItem);
    setDragPosition({ x: e.clientX, y: e.clientY });
    e.dataTransfer.effectAllowed = "move";
    // Create invisible drag image (we render our own preview)
    const emptyImg = new Image();
    emptyImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
  };

  const handleDrag = (e) => {
    if (e.clientX !== 0 && e.clientY !== 0) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Mobile-friendly move function (no drag required)
  const moveCaseToStatus = async (caseItem, newStatus) => {
    const caseId = caseItem.id || caseItem._id;
    if (caseItem.boardStatus === newStatus) return;

    // Optimistic update
    setCases(prev => prev.map(c =>
      (c.id || c._id) === caseId ? { ...c, boardStatus: newStatus } : c
    ));

    try {
      const res = await fetch(`/api/aftercare/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardStatus: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update status");
      }
      toast.success(`Moved to ${COLUMNS.find(c => c.key === newStatus)?.label || newStatus}`);
      if (data.case) {
        setCases(prev => prev.map(c =>
          (c.id || c._id) === caseId ? { ...data.case, id: data.case._id || data.case.id } : c
        ));
      }
    } catch (err) {
      console.error("Move error:", err);
      toast.error(err.message || "Failed to move case");
      // Revert optimistic update
      setCases(prev => prev.map(c =>
        (c.id || c._id) === caseId ? { ...c, boardStatus: caseItem.boardStatus } : c
      ));
    }
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedCard || draggedCard.boardStatus === newStatus) {
      setDraggedCard(null);
      return;
    }
    const caseId = draggedCard.id || draggedCard._id;

    // Optimistic update
    setCases(prev => prev.map(c =>
      (c.id || c._id) === caseId ? { ...c, boardStatus: newStatus } : c
    ));

    try {
      const res = await fetch(`/api/aftercare/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardStatus: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update status");
      }
      toast.success(`Moved to ${COLUMNS.find(c => c.key === newStatus)?.label || newStatus}`);
      // Update local state from response
      if (data.case) {
        setCases(prev => prev.map(c =>
          (c.id || c._id) === caseId ? { ...data.case, id: data.case._id || data.case.id } : c
        ));
      } else {
        fetchCases();
      }
    } catch (error) {
      toast.error(error.message || "Failed to update");
      fetchCases(); // Revert on error
    }
    setDraggedCard(null);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const uploadedFiles = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/vehicles/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) {
          uploadedFiles.push({ url: data.url, filename: data.filename || file.name });
        }
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setCommentAttachments([...commentAttachments, ...uploadedFiles]);
  };

  // Upload media to case (not comment)
  const handleCaseMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !selectedCase) return;

    setIsUploadingCaseMedia(true);
    const uploadedFiles = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/vehicles/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) {
          uploadedFiles.push({ url: data.url, filename: data.filename || file.name });
        }
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploadedFiles.length > 0) {
      try {
        await fetch(`/api/aftercare/${selectedCase.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _addAttachments: uploadedFiles }),
        });
        toast.success(`${uploadedFiles.length} file(s) added to case`);
        fetchCaseDetail(selectedCase.id);
      } catch (err) {
        toast.error("Failed to add media to case");
      }
    }

    setIsUploadingCaseMedia(false);
    // Reset the input
    e.target.value = "";
  };

  const addComment = async () => {
    if (!newComment.trim() && commentAttachments.length === 0) return;
    try {
      const res = await fetch(`/api/aftercare/${selectedCase.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment || "(attachment)",
          authorType: "staff",
          attachments: commentAttachments
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to add comment");
      }
      setNewComment("");
      setCommentAttachments([]);
      // Refetch the case to get updated comments and timeline events
      fetchCaseDetail(selectedCase.id);
      toast.success("Comment added");
    } catch (error) {
      toast.error(error.message || "Failed to add comment");
    }
  };

  // TEMPORARILY DISABLED - AI functions
  /*
  const generateAIReview = async (regenerate = false) => {
    if (regenerate) {
      setShowRegenerateConfirm(false);
    }
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/ai/case-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selectedCase.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      fetchCaseDetail(selectedCase.id);
      toast.success("AI review generated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Fetch AI diagnostic suggestions
  const fetchAIDiagnostics = async () => {
    if (!selectedCase) return;
    setIsLoadingDiagnostics(true);
    setAiDiagnostics(null);
    try {
      const vehicle = selectedCase.vehicleId;
      const res = await fetch("/api/ai/warranty-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleMake: vehicle?.make,
          vehicleModel: vehicle?.model,
          vehicleYear: vehicle?.year,
          mileage: vehicle?.mileage,
          fuelType: vehicle?.fuelType,
          symptomDescription: selectedCase.summary || selectedCase.details?.description || "",
          faultCodes: selectedCase.details?.faultCodes,
          warrantyType: selectedCase.warrantyType,
          additionalContext: selectedCase.details ? JSON.stringify(selectedCase.details) : null,
        }),
      });

      // Handle auth errors separately
      if (res.status === 401 || res.status === 403) {
        setAiDiagnostics({
          suggestions: null,
          isDummy: true,
          errorCode: "UNAUTHORIZED",
          errorMessage: "Please sign in to use AI features.",
        });
        return;
      }

      const data = await res.json();
      if (data.success) {
        setAiDiagnostics({
          suggestions: data.suggestions,
          isDummy: data.isDummy,
          errorCode: data.isDummy ? "NOT_CONFIGURED" : null,
          errorMessage: data.message,
        });
      } else {
        setAiDiagnostics({
          suggestions: null,
          isDummy: true,
          errorCode: data.errorCode || "SERVICE_ERROR",
          errorMessage: data.error || "Failed to get AI suggestions",
        });
      }
    } catch (error) {
      console.error("AI diagnostics error:", error);
      setAiDiagnostics({
        suggestions: null,
        isDummy: true,
        errorCode: "SERVICE_ERROR",
        errorMessage: "Failed to connect to AI service",
      });
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };
  */

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Filter cases by search query and filters
  const getFilteredCases = () => {
    let filtered = cases;

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toUpperCase().replace(/\s/g, "");
      filtered = filtered.filter(c => {
        // Search by VRM
        const regAtPurchase = (c.regAtPurchase || "").toUpperCase().replace(/\s/g, "");
        const currentReg = (c.currentReg || "").toUpperCase().replace(/\s/g, "");
        const detailsReg = (c.details?.vehicleReg || "").toUpperCase().replace(/\s/g, "");
        // Search by customer name
        const customerName = (c.contactId?.name || "").toUpperCase();
        return regAtPurchase.includes(query) ||
               currentReg.includes(query) ||
               detailsReg.includes(query) ||
               customerName.includes(query);
      });
    }

    // Apply location filter
    if (filters.location !== "all") {
      filtered = filtered.filter(c => (c.repairLocationType || "WITH_CUSTOMER") === filters.location);
    }

    // Apply booked filter
    if (filters.booked === "booked") {
      filtered = filtered.filter(c => c.bookedInAt);
    } else if (filters.booked === "not_booked") {
      filtered = filtered.filter(c => !c.bookedInAt);
    }

    // Apply parts required filter
    if (filters.partsRequired === "yes") {
      filtered = filtered.filter(c => c.partsRequired === true);
    } else if (filters.partsRequired === "no") {
      filtered = filtered.filter(c => !c.partsRequired);
    }

    // Apply priority filter
    if (filters.priority !== "all") {
      filtered = filtered.filter(c => (c.priority || "normal") === filters.priority);
    }

    // Apply contact due filter
    if (filters.contactDue === "due") {
      const now = new Date();
      filtered = filtered.filter(c => c.nextContactAt && new Date(c.nextContactAt) <= now);
    } else if (filters.contactDue === "not_due") {
      const now = new Date();
      filtered = filtered.filter(c => !c.nextContactAt || new Date(c.nextContactAt) > now);
    }

    return filtered;
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return filters.location !== "all" ||
           filters.booked !== "all" ||
           filters.partsRequired !== "all" ||
           filters.priority !== "all" ||
           filters.contactDue !== "all";
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      location: "all",
      booked: "all",
      partsRequired: "all",
      priority: "all",
      contactDue: "all",
    });
  };

  // Get cases by status with sorting
  const getCasesByStatus = (status) => {
    const filteredBySearch = getFilteredCases();
    const filtered = filteredBySearch.filter(c => c.boardStatus === status);
    const sortOption = columnSortOptions[status] || "oldest_first";

    return filtered.sort((a, b) => {
      if (sortOption === "newest_first") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortOption === "alphabetical") {
        const nameA = a.contactId?.name || "";
        const nameB = b.contactId?.name || "";
        return nameA.localeCompare(nameB);
      }
      // oldest_first (default)
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  };

  // Calculate attachment count for a case
  const getAttachmentCount = (c) => {
    const caseAttachments = c.attachments?.length || 0;
    const submissionAttachments = c.submissionAttachmentCount || 0;
    const commentAttachments = c.commentAttachmentCount || 0;
    return caseAttachments + submissionAttachments + commentAttachments;
  };

  // Get activity count (events count)
  const getActivityCount = (c) => c.events?.length || 0;

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
      <Head><title>Aftersales/Warranty | DealerHQ</title></Head>

      {/* Hero Header - Modern gradient design */}
      <div className="relative rounded-2xl mb-6 bg-gradient-to-br from-[#0066CC]/[0.06] via-[#14B8A6]/[0.04] to-[#0EA5E9]/[0.03] border border-slate-100/50">
        <div className="relative px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#0066CC] flex items-center justify-center shadow-md shadow-[#0066CC]/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Aftersales / Warranty</h1>
            </div>
            <p className="text-slate-500 text-sm md:text-base">Manage warranty cases and aftercare. Customer submissions via the public form automatically appear here.</p>
            <div className="mt-2 relative z-50"><PageHint id="warranty">Track warranty claims and service cases. Drag cards between stages to update their status.</PageHint></div>
          </div>
          <button
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0066CC] hover:bg-[#0055AA] text-white font-medium rounded-xl shadow-md shadow-[#0066CC]/25 hover:shadow-lg transition-all"
            onClick={() => setShowAddModal(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Case
          </button>
        </div>
      </div>

      {/* Aftersales Cost KPI Strip */}
      <div className="mb-6">
        {/* Net/Gross Toggle */}
        <div className="flex items-center justify-end mb-2">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Open Cases</p>
              <p className="text-xl font-bold text-slate-900">{cases.filter(c => c.status !== "closed" && c.status !== "resolved").length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">This Month{kpiDisplayMode === "gross" ? " (Gross)" : ""}</p>
              <p className="text-xl font-bold text-slate-900">£{(kpiDisplayMode === "gross" ? costKpis.thisMonth.totalGross : costKpis.thisMonth.totalNet)?.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Last Month{kpiDisplayMode === "gross" ? " (Gross)" : ""}</p>
              <p className="text-xl font-bold text-slate-900">£{(kpiDisplayMode === "gross" ? costKpis.lastMonth.totalGross : costKpis.lastMonth.totalNet)?.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Year to Date{kpiDisplayMode === "gross" ? " (Gross)" : ""}</p>
              <p className="text-xl font-bold text-slate-900">£{(kpiDisplayMode === "gross" ? costKpis.ytd.totalGross : costKpis.ytd.totalNet)?.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by VRM or customer name..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => setSearchQuery("")}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Button - Mobile opens BottomSheet, Desktop opens dropdown */}
        <div className="relative">
          {/* Mobile Filter Button */}
          <button
            className={`md:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              hasActiveFilters()
                ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25"
                : "bg-white border border-slate-200 text-slate-600 hover:border-[#0066CC] hover:text-[#0066CC]"
            }`}
            onClick={() => setShowMobileFilters(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {hasActiveFilters() && (
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                hasActiveFilters() ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {Object.values(filters).filter(v => v !== "all").length}
              </span>
            )}
          </button>

          {/* Desktop Filter Button */}
          <button
            className={`hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              hasActiveFilters()
                ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25"
                : "bg-white border border-slate-200 text-slate-600 hover:border-[#0066CC] hover:text-[#0066CC]"
            }`}
            onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {hasActiveFilters() && (
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                hasActiveFilters() ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {Object.values(filters).filter(v => v !== "all").length}
              </span>
            )}
          </button>

          {/* Desktop Filter Dropdown */}
          {showFiltersDropdown && (
            <div className="hidden md:block absolute z-30 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-sm">Filters</h4>
                {hasActiveFilters() && (
                  <button className="btn btn-ghost btn-xs" onClick={clearFilters}>
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {/* Location Filter */}
                <div className="form-control">
                  <label className="label label-text text-xs py-0">Location</label>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  >
                    <option value="all">All</option>
                    <option value="WITH_CUSTOMER">With customer</option>
                    <option value="ON_SITE">On-site</option>
                    <option value="THIRD_PARTY">Third-party</option>
                  </select>
                </div>

                {/* Booked Filter */}
                <div className="form-control">
                  <label className="label label-text text-xs py-0">Booked Status</label>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={filters.booked}
                    onChange={(e) => setFilters({ ...filters, booked: e.target.value })}
                  >
                    <option value="all">All</option>
                    <option value="booked">Booked</option>
                    <option value="not_booked">Not Booked</option>
                  </select>
                </div>

                {/* Parts Required Filter */}
                <div className="form-control">
                  <label className="label label-text text-xs py-0">Parts Required</label>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={filters.partsRequired}
                    onChange={(e) => setFilters({ ...filters, partsRequired: e.target.value })}
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="form-control">
                  <label className="label label-text text-xs py-0">Priority</label>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  >
                    <option value="all">All</option>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Contact Due Filter */}
                <div className="form-control">
                  <label className="label label-text text-xs py-0">Contact Due</label>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={filters.contactDue}
                    onChange={(e) => setFilters({ ...filters, contactDue: e.target.value })}
                  >
                    <option value="all">All</option>
                    <option value="due">Due Today</option>
                    <option value="not_due">Not Due</option>
                  </select>
                </div>
              </div>

              <button
                className="btn btn-sm btn-block mt-4"
                onClick={() => setShowFiltersDropdown(false)}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters BottomSheet */}
      <BottomSheet
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        title="Filters"
        footer={
          <div className="flex gap-2">
            {hasActiveFilters() && (
              <button
                className="btn btn-ghost flex-1"
                onClick={() => {
                  clearFilters();
                  setShowMobileFilters(false);
                }}
              >
                Clear All
              </button>
            )}
            <button
              className="btn btn-primary flex-1"
              onClick={() => setShowMobileFilters(false)}
            >
              Apply Filters
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Location Filter */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Location</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            >
              <option value="all">All Locations</option>
              <option value="WITH_CUSTOMER">With customer</option>
              <option value="ON_SITE">On-site</option>
              <option value="THIRD_PARTY">Third-party</option>
            </select>
          </div>

          {/* Booked Filter */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Booked Status</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={filters.booked}
              onChange={(e) => setFilters({ ...filters, booked: e.target.value })}
            >
              <option value="all">All</option>
              <option value="booked">Booked</option>
              <option value="not_booked">Not Booked</option>
            </select>
          </div>

          {/* Parts Required Filter */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Parts Required</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={filters.partsRequired}
              onChange={(e) => setFilters({ ...filters, partsRequired: e.target.value })}
            >
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Priority</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Contact Due Filter */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Contact Due</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={filters.contactDue}
              onChange={(e) => setFilters({ ...filters, contactDue: e.target.value })}
            >
              <option value="all">All</option>
              <option value="due">Due Today</option>
              <option value="not_due">Not Due</option>
            </select>
          </div>
        </div>
      </BottomSheet>

      {/* Active filters / result count summary */}
      {(searchQuery || hasActiveFilters()) && (
        <div className="mb-4">
          <p className="text-sm text-slate-500">
            Showing {getFilteredCases().length} of {cases.length} cases
            {hasActiveFilters() && (
              <button className="ml-2 text-primary hover:underline" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="overflow-x-hidden">
          {/* Mobile Overview Strip */}
          <div className="md:hidden mb-4 overflow-x-hidden">
            {/* Stats Chips Row */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                Total Open
                <span className="font-bold">{cases.filter(c => c.status !== "collected").length}</span>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                Not Booked
                <span className="font-bold">{getCasesByStatus("not_booked_in").length}</span>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Booked In
                <span className="font-bold">{getCasesByStatus("on_site").length}</span>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Contact Due
                <span className="font-bold">{cases.filter(c => c.nextContactAt && new Date(c.nextContactAt) <= new Date() && c.status !== "collected").length}</span>
              </div>
            </div>

            {/* Contact Due Section - Show top 3 */}
            {cases.filter(c => c.nextContactAt && new Date(c.nextContactAt) <= new Date() && c.status !== "collected").length > 0 && (
              <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-orange-800">Contact Due</span>
                </div>
                <div className="space-y-2">
                  {cases
                    .filter(c => c.nextContactAt && new Date(c.nextContactAt) <= new Date() && c.status !== "collected")
                    .slice(0, 3)
                    .map((caseItem) => (
                      <button
                        key={caseItem.id || caseItem._id}
                        className="w-full flex items-center justify-between p-2 bg-white rounded-lg hover:bg-orange-100 transition-colors text-left"
                        onClick={() => fetchCaseDetail(caseItem.id || caseItem._id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm md:text-xs font-bold bg-[#F7D117] text-black px-2.5 py-1 md:py-0.5 rounded border border-black/30 tracking-wider uppercase shadow-sm">
                            {caseItem.regAtPurchase || caseItem.details?.vehicleReg || "?"}
                          </span>
                          <span className="text-sm text-slate-700 truncate max-w-[120px]">
                            {caseItem.contactId?.name || "Unknown"}
                          </span>
                        </div>
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Column Selector */}
          <MobileStageSelector
            stages={COLUMNS.map((col) => ({
              value: col.key,
              label: col.label,
              count: getCasesByStatus(col.key).length,
            }))}
            activeStage={mobileActiveColumn}
            onStageChange={setMobileActiveColumn}
            className="mb-4"
          />

          {/* Mobile Single Column View */}
          <div className="md:hidden">
            {COLUMNS.filter(col => col.key === mobileActiveColumn).map((col) => {
              const columnCases = getCasesByStatus(col.key);
              return (
                <div key={col.key} className="space-y-3">
                  {columnCases.map((caseItem) => {
                    const daysOpen = daysSince(caseItem.createdAt);
                    const priority = caseItem.priority || "normal";
                    const priorityStyle = PRIORITIES[priority] || PRIORITIES.normal;
                    const locationType = caseItem.repairLocationType || "WITH_CUSTOMER";
                    const locationStyle = REPAIR_LOCATION_STYLES[locationType] || REPAIR_LOCATION_STYLES.WITH_CUSTOMER;
                    const attachmentCount = (caseItem.submissionAttachmentCount || 0) + (caseItem.commentAttachmentCount || 0);
                    const activityCount = (caseItem.comments?.length || 0) + (caseItem.events?.length || 0);

                    return (
                      <div
                        key={caseItem.id || caseItem._id}
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100/50 overflow-hidden active:scale-[0.98]"
                        onClick={() => {
                          const id = caseItem.id || caseItem._id;
                          fetchCaseDetail(id);
                        }}
                      >
                        <div className={`border-l-4 ${col.accent}`}>
                          <div className="p-4">
                            {/* Top row: Reg + badges */}
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-block bg-[#fcd34d] border border-yellow-500/50 rounded-md px-2 py-0.5 shadow-sm font-mono font-bold text-slate-900 text-xs tracking-wider uppercase">
                                    {caseItem.regAtPurchase || caseItem.details?.vehicleReg || "NO REG"}
                                  </span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${locationStyle.bg} ${locationStyle.text}`}>
                                    {REPAIR_LOCATION_LABELS[locationType]}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityStyle.bg} ${priorityStyle.text} border ${priorityStyle.border}`}>
                                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Customer name + Vehicle make/model */}
                            <div className="mb-2">
                              <p className="font-semibold text-slate-900 text-sm truncate">
                                {caseItem.contactId?.name || "Unknown"}
                              </p>
                              {caseItem.vehicleId && (
                                <p className="text-xs text-slate-500">
                                  {caseItem.vehicleId.make} {caseItem.vehicleId.model}
                                </p>
                              )}
                            </div>

                            {/* Booked date row */}
                            {caseItem.bookedInAt && (
                              <div className="flex items-center gap-1 mb-1.5 text-xs text-amber-700">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">Booked: {formatBookedDate(caseItem.bookedInAt)}</span>
                              </div>
                            )}

                            {/* Courtesy badge row */}
                            {(caseItem.courtesyRequired || caseItem.courtesyAllocationId) && (
                              <div className="flex items-center gap-1 mb-1.5 text-xs">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                {caseItem.courtesyAllocationId ? (
                                  <span className="font-medium text-emerald-700">
                                    Courtesy: {caseItem.courtesyAllocation?.courtesyVehicle?.regCurrent || "Allocated"}
                                  </span>
                                ) : (
                                  <span className="font-medium text-amber-600">Courtesy needed</span>
                                )}
                              </div>
                            )}

                            {/* Contact due badge */}
                            {caseItem.nextContactAt && new Date(caseItem.nextContactAt) <= new Date() && (
                              <div className="flex items-center gap-1 mb-1.5 text-xs text-orange-600">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">Contact due</span>
                              </div>
                            )}

                            {/* Footer row: Days open + icons */}
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className="font-medium">{daysOpen}d open</span>
                              <div className="flex items-center gap-2">
                                {caseItem.partsRequired && (
                                  <span className="flex items-center gap-0.5 text-orange-600" title="Parts Required">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </span>
                                )}
                                {attachmentCount > 0 && (
                                  <span className="flex items-center gap-0.5" title="Attachments">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    {attachmentCount}
                                  </span>
                                )}
                                {activityCount > 0 && (
                                  <span className="flex items-center gap-0.5" title="Activity">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    {activityCount}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Mobile Move Button */}
                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                              <button
                                className="btn btn-sm btn-ghost gap-1 text-slate-500 hover:text-[#0066CC] hover:bg-[#0066CC]/5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMoveCase(caseItem);
                                  setMoveCaseCurrentColumn(col.key);
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Move
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {columnCases.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-sm">No cases in {col.label}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Floating Action Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="md:hidden fixed fab-safe right-4 z-40 w-14 h-14 bg-[#0066CC] hover:bg-[#0055AA] text-white rounded-2xl shadow-lg shadow-[#0066CC]/30 flex items-center justify-center transition-all active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Desktop Multi-Column View - Matching Sales & Prep exactly */}
          <div className="hidden md:flex gap-4 overflow-x-auto pb-6">
            {COLUMNS.map((col) => {
              const columnCases = getCasesByStatus(col.key);
              return (
                <div
                  key={col.key}
                  data-column-key={col.key}
                  className={`flex-shrink-0 w-64 bg-gradient-to-b ${col.gradient} to-transparent rounded-2xl p-3 min-h-[400px]`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  {/* Integrated Header - Same as Sales & Prep */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-700 text-sm">
                        {col.label}
                      </h3>
                      <span className="bg-slate-900/10 text-slate-700 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center">
                        {columnCases.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Archive Toggle for Closed column */}
                      {col.key === "collected" && (
                        <button
                          onClick={() => setShowAllClosed(!showAllClosed)}
                          className={`btn btn-xs gap-1 rounded-full ${showAllClosed ? "btn-primary" : "bg-white/30 backdrop-blur-sm hover:bg-white/50 text-slate-600"}`}
                          title={showAllClosed ? "Showing all closed cases" : "Showing last 90 days only"}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          <span className="text-xs">{showAllClosed ? "All" : "90d"}</span>
                        </button>
                      )}
                      <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-ghost btn-xs gap-1 bg-white/30 backdrop-blur-sm hover:bg-white/50 rounded-full">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                          </svg>
                          <span className="text-xs">
                            {columnSortOptions[col.key] === "newest_first" ? "Newest" :
                             columnSortOptions[col.key] === "alphabetical" ? "A-Z" : "Oldest"}
                          </span>
                        </label>
                        <ul tabIndex={0} className="dropdown-content z-30 menu p-2 shadow-lg bg-white rounded-xl w-44 mt-2">
                          <li>
                            <button
                              className={`rounded-lg ${columnSortOptions[col.key] === "oldest_first" || !columnSortOptions[col.key] ? "active bg-slate-100" : ""}`}
                              onClick={() => setColumnSortOptions(prev => ({ ...prev, [col.key]: "oldest_first" }))}
                            >
                              Oldest First
                            </button>
                          </li>
                          <li>
                            <button
                              className={`rounded-lg ${columnSortOptions[col.key] === "newest_first" ? "active bg-slate-100" : ""}`}
                              onClick={() => setColumnSortOptions(prev => ({ ...prev, [col.key]: "newest_first" }))}
                            >
                              Newest First
                            </button>
                          </li>
                          <li>
                            <button
                              className={`rounded-lg ${columnSortOptions[col.key] === "alphabetical" ? "active bg-slate-100" : ""}`}
                              onClick={() => setColumnSortOptions(prev => ({ ...prev, [col.key]: "alphabetical" }))}
                            >
                              Alphabetical (Name)
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-3">
                    {columnCases.map((caseItem) => {
                      const daysOpen = daysSince(caseItem.createdAt);
                      const attachmentCount = getAttachmentCount(caseItem);
                      const activityCount = getActivityCount(caseItem);
                      // Default priority to "normal" if missing
                      const priority = caseItem.priority || "normal";
                      const priorityStyle = PRIORITIES[priority] || PRIORITIES.normal;
                      // Default location to WITH_CUSTOMER if missing (vehicle starts with customer)
                      const locationType = caseItem.repairLocationType || "WITH_CUSTOMER";
                      const locationStyle = REPAIR_LOCATION_STYLES[locationType] || REPAIR_LOCATION_STYLES.WITH_CUSTOMER;

                      return (
                        <div
                          key={caseItem.id || caseItem._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, caseItem)}
                          onDrag={handleDrag}
                          onDragEnd={handleDragEnd}
                          className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border border-slate-100/50 overflow-hidden ${(draggedCard?.id || draggedCard?._id) === (caseItem.id || caseItem._id) ? "opacity-40 scale-95" : "opacity-100"}`}
                          onClick={() => fetchCaseDetail(caseItem.id || caseItem._id)}
                        >
                          <div className="p-3">
                            {/* Top row: Reg + badges */}
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-block bg-[#fcd34d] border border-yellow-500/50 rounded-md px-2 py-0.5 shadow-sm font-mono font-bold text-slate-900 text-xs tracking-wider uppercase">
                                    {caseItem.regAtPurchase || caseItem.details?.vehicleReg || "NO REG"}
                                  </span>
                                  {/* Location badge - always shown */}
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${locationStyle.bg} ${locationStyle.text}`}>
                                    {REPAIR_LOCATION_LABELS[locationType]}
                                  </span>
                                  {/* Warranty type badge */}
                                  {caseItem.warrantyType && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#0066CC]/10 text-[#0066CC]">
                                      {caseItem.warrantyType === "Dealer Warranty" ? "Dealer" : "External"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Priority badge */}
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityStyle.bg} ${priorityStyle.text} border ${priorityStyle.border}`}>
                                {priority.charAt(0).toUpperCase() + priority.slice(1)}
                              </span>
                            </div>

                            {/* Customer name + Vehicle make/model */}
                            <div className="mb-2">
                              <p className="font-semibold text-slate-900 text-sm truncate">
                                {caseItem.contactId?.name || "Unknown"}
                              </p>
                              {caseItem.vehicleId && (
                                <p className="text-xs text-slate-500">
                                  {caseItem.vehicleId.make} {caseItem.vehicleId.model}
                                </p>
                              )}
                              {!caseItem.vehicleId && caseItem.details?.make && (
                                <p className="text-xs text-slate-500">
                                  {caseItem.details.make} {caseItem.details.model}
                                </p>
                              )}
                            </div>

                            {/* Booked date row - shown if bookedInAt exists */}
                            {caseItem.bookedInAt && (
                              <div className="flex items-center gap-1 mb-1.5 text-xs text-amber-700">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">Booked: {formatBookedDate(caseItem.bookedInAt)}</span>
                              </div>
                            )}

                            {/* Courtesy badge row - shown if courtesyRequired or has allocation */}
                            {(caseItem.courtesyRequired || caseItem.courtesyAllocationId) && (
                              <div className="flex items-center gap-1 mb-1.5 text-xs">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                {caseItem.courtesyAllocationId ? (
                                  <span className="font-medium text-emerald-700">
                                    Courtesy: {caseItem.courtesyAllocation?.courtesyVehicle?.regCurrent || "Allocated"}
                                  </span>
                                ) : (
                                  <span className="font-medium text-amber-600">Courtesy needed</span>
                                )}
                              </div>
                            )}

                            {/* Footer row: Days open + icons + source */}
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className="font-medium">{daysOpen}d open</span>
                              <div className="flex items-center gap-2">
                                {caseItem.partsRequired && (
                                  <span className="flex items-center gap-0.5 text-orange-600" title="Parts Required">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Parts
                                  </span>
                                )}
                                {attachmentCount > 0 && (
                                  <span className="flex items-center gap-0.5" title="Attachments">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    {attachmentCount}
                                  </span>
                                )}
                                {activityCount > 0 && (
                                  <span className="flex items-center gap-0.5" title="Activity">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    {activityCount}
                                  </span>
                                )}
                                {caseItem.source === "warranty_claim_form" && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600">
                                    Warranty Claim
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {columnCases.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <p className="text-sm">No cases in {col.label}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drag Preview - floating card that follows cursor (same as Sales & Prep) */}
          {draggedCard && (
            <div
              className="fixed pointer-events-none z-50"
              style={{
                left: dragPosition.x - 120,
                top: dragPosition.y - 30,
                transform: "rotate(3deg)",
              }}
            >
              <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-400 w-60 p-3 opacity-90">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {draggedCard.contactId?.name || "Unknown"}
                  </p>
                </div>
                <span className="inline-block bg-[#fcd34d] border border-yellow-500/50 rounded-md px-2 py-0.5 shadow-sm font-mono font-bold text-slate-900 text-xs tracking-wider uppercase mt-1">
                  {draggedCard.regAtPurchase || draggedCard.details?.vehicleReg || "NO REG"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Case Detail Drawer */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="bg-black/40 absolute inset-0 backdrop-blur-sm" onClick={() => setSelectedCase(null)}></div>
          <div className="relative bg-white w-full max-w-xl h-[100dvh] overflow-y-auto overflow-x-hidden shadow-2xl">
            {/* Modern Sticky Header */}
            <div
              className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 z-10"
              style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
            >
              <div className="flex justify-between items-start gap-3">
                {/* Back button on mobile */}
                <button className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors" onClick={() => setSelectedCase(null)}>
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  {/* VRM + Status Pills Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center bg-[#F7D117] border border-black/20 rounded px-3 py-1.5 font-mono font-bold text-black text-base tracking-wider uppercase shadow-sm">
                      {selectedCase.regAtPurchase || selectedCase.details?.vehicleReg || "NO REG"}
                    </span>
                    {selectedCase.warrantyType && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0066CC]/10 text-[#0066CC] border border-[#0066CC]/20">
                        {selectedCase.warrantyType}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${PRIORITIES[selectedCase.priority]?.bg} ${PRIORITIES[selectedCase.priority]?.text} ${PRIORITIES[selectedCase.priority]?.border} border`}>
                      {selectedCase.priority}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1.5 truncate">
                    {selectedCase.contactId?.name || "Unknown"} &middot; {daysSince(selectedCase.createdAt)}d open
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-1.5">
                  <button
                    onClick={handleGenerateJobSheet}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    title="Share Job Sheet"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                  <button
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    onClick={() => setSelectedCase(null)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Status Segmented Control */}
              <div className="flex gap-2 mt-4">
                <div className="flex-1 bg-slate-100 rounded-lg p-1 flex">
                  {COLUMNS.map(c => (
                    <button
                      key={c.key}
                      onClick={async () => {
                        if (selectedCase.boardStatus !== c.key) {
                          await updateCase(
                            { boardStatus: c.key },
                            `Moved to ${c.label}`
                          );
                        }
                      }}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                        selectedCase.boardStatus === c.key
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <select
                  className="select select-sm bg-slate-50 border-slate-200 text-sm font-medium rounded-lg"
                  value={selectedCase.priority || "normal"}
                  onChange={async (e) => {
                    if (selectedCase.priority !== e.target.value) {
                      await updateCase({ priority: e.target.value }, "Priority updated");
                    }
                  }}
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical Priority</option>
                </select>
              </div>

              {/* Reopen Case Banner - shown when case is closed */}
              {selectedCase.boardStatus === "collected" && (
                <div className="mt-3 px-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-amber-800">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>This case is closed</span>
                    </div>
                    <button
                      onClick={async () => {
                        await updateCase(
                          { boardStatus: "not_booked_in" },
                          "Case reopened"
                        );
                        toast.success("Case reopened and moved to 'Not Booked In'");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reopen Case
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 space-y-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
              {/* Customer & Vehicle Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">Customer & Vehicle</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</span>
                      <p className="text-slate-900 mt-0.5">{selectedCase.contactId?.name || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</span>
                      <p className="text-slate-900 mt-0.5">{selectedCase.contactId?.phone || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</span>
                      <p className="text-slate-900 mt-0.5">{selectedCase.contactId?.email || "—"}</p>
                    </div>
                    {selectedCase.customerAddress && (selectedCase.customerAddress.street || selectedCase.customerAddress.city || selectedCase.customerAddress.postcode) && (
                      <div className="col-span-2">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Address</span>
                        <p className="text-slate-900 mt-0.5">
                          {[
                            selectedCase.customerAddress.street,
                            selectedCase.customerAddress.city,
                            selectedCase.customerAddress.postcode
                          ].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Reg at Purchase</span>
                      <p className="text-slate-900 mt-0.5">{selectedCase.regAtPurchase || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current Reg</span>
                      <p className="text-slate-900 mt-0.5">{selectedCase.currentReg || selectedCase.details?.vehicleReg || "—"}</p>
                    </div>
                    {selectedCase.mileageAtPurchase && (
                      <div>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mileage at Purchase</span>
                        <p className="text-slate-900 mt-0.5">{selectedCase.mileageAtPurchase.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedCase.details?.mileage && (
                      <div>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current Mileage</span>
                        <p className="text-slate-900 mt-0.5">{Number(selectedCase.details.mileage).toLocaleString()}</p>
                      </div>
                    )}
                    {selectedCase.vehicleId && (
                      <>
                        <div className="col-span-2">
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vehicle</span>
                          <p className="text-slate-900 mt-0.5">
                            {selectedCase.vehicleId.make} {selectedCase.vehicleId.model} {selectedCase.vehicleId.year}
                          </p>
                        </div>
                        <div className="col-span-2 pt-1">
                          <button
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0066CC] bg-[#0066CC]/5 hover:bg-[#0066CC]/10 border border-[#0066CC]/20 rounded-lg transition-colors"
                            onClick={() => {
                              setSelectedVehicleId(selectedCase.vehicleId._id || selectedCase.vehicleId.id);
                              setIsVehicleDrawerOpen(true);
                            }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Vehicle
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Contact Tracking Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Customer Contact</h3>
                  {selectedCase.nextContactAt && new Date(selectedCase.nextContactAt) <= new Date() && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Contact Due
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-4">
                  {/* Last Contacted Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last Contacted</span>
                      <p className="text-sm text-slate-900 mt-0.5">
                        {selectedCase.lastContactedAt ? (
                          <>
                            {new Date(selectedCase.lastContactedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {selectedCase.lastContactedByName && (
                              <span className="text-slate-500"> by {selectedCase.lastContactedByName}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">Not contacted yet</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const note = window.prompt("Add a note about this contact (optional):");
                        await updateCase({
                          _eventType: "CUSTOMER_CONTACTED",
                          _eventMetadata: { note: note || null }
                        }, "Customer contacted");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark Contacted
                    </button>
                  </div>

                  {/* Contact Reminder */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contact Reminder</span>
                      {selectedCase.nextContactAt && (
                        <button
                          onClick={async () => {
                            await updateCase({
                              _eventType: "CONTACT_REMINDER_SET",
                              _eventMetadata: { nextContactAt: null }
                            }, "Contact reminder cleared");
                          }}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-transparent rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition-all outline-none text-sm"
                        value={selectedCase.nextContactAt ? new Date(selectedCase.nextContactAt).toISOString().slice(0, 16) : ""}
                        onChange={async (e) => {
                          const newDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                          await updateCase({
                            _eventType: "CONTACT_REMINDER_SET",
                            _eventMetadata: { nextContactAt: newDate }
                          }, newDate ? "Contact reminder set" : "Contact reminder cleared");
                        }}
                      />
                    </div>
                    {selectedCase.nextContactAt && (
                      <p className="text-xs text-slate-500 mt-1.5">
                        Reminder will show on dashboard and warranty board
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Repair Location Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Repair Location</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${REPAIR_LOCATION_STYLES[selectedCase.repairLocationType || "WITH_CUSTOMER"]?.bg} ${REPAIR_LOCATION_STYLES[selectedCase.repairLocationType || "WITH_CUSTOMER"]?.text}`}>
                    {REPAIR_LOCATION_LABELS[selectedCase.repairLocationType || "WITH_CUSTOMER"]}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  {/* Location Type Segmented Control - Modern Pill Selector */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">Location Type</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          key: "WITH_CUSTOMER",
                          label: "With Customer",
                          icon: (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          ),
                          selectedBg: "bg-slate-700",
                          selectedText: "text-white",
                          selectedBorder: "border-slate-700",
                        },
                        {
                          key: "ON_SITE",
                          label: "On-site",
                          icon: (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          ),
                          selectedBg: "bg-emerald-600",
                          selectedText: "text-white",
                          selectedBorder: "border-emerald-600",
                        },
                        {
                          key: "THIRD_PARTY",
                          label: "Third-party",
                          icon: (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          ),
                          selectedBg: "bg-teal-600",
                          selectedText: "text-white",
                          selectedBorder: "border-teal-600",
                        },
                      ].map(loc => {
                        const isSelected = (selectedCase.repairLocationType || "WITH_CUSTOMER") === loc.key;
                        return (
                          <button
                            key={loc.key}
                            onClick={async () => {
                              if (!isSelected) {
                                // Optimistic update
                                const oldValue = selectedCase.repairLocationType || "WITH_CUSTOMER";
                                setSelectedCase(prev => ({ ...prev, repairLocationType: loc.key }));
                                await updateCase({
                                  repairLocationType: loc.key,
                                  _eventType: "LOCATION_UPDATED",
                                  _eventMetadata: { fromLocation: oldValue, toLocation: loc.key }
                                }, "Location updated");
                              }
                            }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                              isSelected
                                ? `${loc.selectedBg} ${loc.selectedText} ${loc.selectedBorder} shadow-md`
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {loc.icon}
                            <span>{loc.label}</span>
                            {isSelected && (
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Show additional fields for third-party repairs */}
                  {selectedCase.repairLocationType === "THIRD_PARTY" && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Garage Name</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition-all outline-none text-sm"
                          value={selectedCase.repairLocationName || ""}
                          placeholder="e.g., ABC Motors"
                          onChange={(e) => setSelectedCase({ ...selectedCase, repairLocationName: e.target.value })}
                          onBlur={() => updateCase({ repairLocationName: selectedCase.repairLocationName })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Notes</label>
                        <textarea
                          className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition-all outline-none text-sm resize-none"
                          rows={2}
                          value={selectedCase.repairLocationNotes || ""}
                          placeholder="Any notes about the repair location..."
                          onChange={(e) => setSelectedCase({ ...selectedCase, repairLocationNotes: e.target.value })}
                          onBlur={() => updateCase({ repairLocationNotes: selectedCase.repairLocationNotes })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Section - Accent Styled */}
              <div className={`rounded-xl border-2 shadow-sm overflow-hidden ${
                selectedCase.bookedInAt
                  ? "bg-emerald-50/50 border-emerald-200"
                  : "bg-amber-50/50 border-amber-200"
              }`}>
                <div className={`px-4 py-3 flex items-center justify-between ${
                  selectedCase.bookedInAt
                    ? "bg-emerald-100/50 border-b border-emerald-200"
                    : "bg-amber-100/50 border-b border-amber-200"
                }`}>
                  <div className="flex items-center gap-2">
                    {selectedCase.bookedInAt ? (
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <h3 className="text-sm font-semibold text-slate-900">Booking</h3>
                  </div>
                  {selectedCase.bookedInAt ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      {formatBookedDate(selectedCase.bookedInAt)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                      Not Booked
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Booked Date & Time</label>
                    <input
                      type="datetime-local"
                      className={`w-full px-3 py-2.5 rounded-lg text-slate-900 transition-all outline-none text-sm font-medium ${
                        selectedCase.bookedInAt
                          ? "bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-500"
                          : "bg-white border border-amber-200 focus:ring-2 focus:ring-amber-500"
                      }`}
                      value={selectedCase.bookedInAt ? new Date(selectedCase.bookedInAt).toISOString().slice(0, 16) : ""}
                      onChange={async (e) => {
                        const newValue = e.target.value ? new Date(e.target.value).toISOString() : null;
                        const oldValue = selectedCase.bookedInAt || null;
                        await updateCase({
                          bookedInAt: newValue,
                          _eventType: "BOOKING_UPDATED",
                          _eventMetadata: { oldBookedAt: oldValue, newBookedAt: newValue }
                        }, newValue ? "Booking updated" : null);
                      }}
                    />
                    {selectedCase.bookedInAt && (
                      <button
                        className="inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        onClick={async () => {
                          const oldValue = selectedCase.bookedInAt;
                          await updateCase({
                            bookedInAt: null,
                            _eventType: "BOOKING_UPDATED",
                            _eventMetadata: { oldBookedAt: oldValue, newBookedAt: null }
                          }, "Booking cleared");
                        }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear booking
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Parts Required Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Parts</h3>
                  {selectedCase.partsRequired && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      Required
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={selectedCase.partsRequired || false}
                        onChange={async (e) => {
                          const newValue = e.target.checked;
                          const oldValue = selectedCase.partsRequired || false;
                          await updateCase({
                            partsRequired: newValue,
                            _eventType: "PARTS_UPDATED",
                            _eventMetadata: { partsRequired: newValue, wasRequired: oldValue }
                          }, newValue ? "Parts required marked" : "Parts not required");
                        }}
                      />
                      <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-[#0066CC] transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Parts required</span>
                  </label>

                  {selectedCase.partsRequired && (
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      {/* Parts Orders List */}
                      {selectedCase.partsOrders?.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Orders</label>
                          {selectedCase.partsOrders.map((order, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border ${order.status === "RECEIVED" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-slate-900">{order.supplierName}</p>
                                  {order.orderRef && <p className="text-xs text-slate-500">Ref: {order.orderRef}</p>}
                                  {order.expectedAt && (
                                    <p className="text-xs text-slate-500">
                                      Expected: {new Date(order.expectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                    </p>
                                  )}
                                  {order.notes && <p className="text-xs text-slate-600 mt-1">{order.notes}</p>}
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  {order.status === "ORDERED" ? (
                                    <button
                                      onClick={() => updateCase({
                                        _eventType: "PARTS_ORDER_RECEIVED",
                                        _eventMetadata: { orderIndex: idx }
                                      }, "Parts received")}
                                      className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
                                      title="Mark Received"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                  ) : (
                                    <span className="text-xs font-medium text-emerald-700 px-2 py-0.5 bg-emerald-100 rounded-full">Received</span>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (confirm("Remove this parts order?")) {
                                        updateCase({
                                          _eventType: "PARTS_ORDER_REMOVED",
                                          _eventMetadata: { orderIndex: idx }
                                        }, "Parts order removed");
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Remove"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Parts Order Button */}
                      <button
                        onClick={() => setShowPartsOrderForm(true)}
                        className="w-full py-2 px-3 text-sm font-medium text-[#0066CC] bg-[#0066CC]/5 hover:bg-[#0066CC]/10 border border-dashed border-[#0066CC]/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Parts Order
                      </button>

                      {/* Parts Notes */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Notes</label>
                        <textarea
                          className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition-all outline-none text-sm resize-none"
                          rows={2}
                          value={selectedCase.partsNotes || ""}
                          placeholder="Additional notes about parts..."
                          onChange={(e) => setSelectedCase({ ...selectedCase, partsNotes: e.target.value })}
                          onBlur={() => updateCase({
                            partsNotes: selectedCase.partsNotes,
                            _eventType: "PARTS_UPDATED",
                            _eventMetadata: { partsNotes: selectedCase.partsNotes }
                          })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Courtesy Car Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM16 17a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 11.5V15a1 1 0 001 1h1.5M4 11.5L6 6.5A1 1 0 017 6h7m-10 5.5h4m10 0V15a1 1 0 01-1 1h-1.5m2.5-4.5L16.5 6.5a1 1 0 00-1-.5H14m4 5.5h-4M14 6v5.5m-4 0V6m0 5.5h4" />
                    </svg>
                    <h3 className="text-sm font-semibold text-slate-900">Courtesy Car</h3>
                  </div>
                  {selectedCase.courtesyAllocation?.status === "OUT" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      Out
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  {/* Toggle: Courtesy Required */}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={selectedCase.courtesyRequired || false}
                        onChange={async (e) => {
                          const newValue = e.target.checked;
                          await updateCase({
                            courtesyRequired: newValue,
                            _eventType: "COURTESY_REQUIRED_TOGGLED",
                            _eventMetadata: { courtesyRequired: newValue }
                          }, newValue ? "Courtesy car marked as required" : "Courtesy car not required");
                        }}
                      />
                      <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-[#0066CC] transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Courtesy car required</span>
                  </label>

                  {/* Allocation Display / Controls */}
                  {selectedCase.courtesyAllocation && selectedCase.courtesyAllocation.status === "OUT" ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-800">Currently Allocated</span>
                        <span className="inline-flex items-center bg-amber-100 border border-amber-300 rounded-lg px-2 py-0.5 font-mono font-bold text-slate-900 text-xs tracking-wider uppercase">
                          {selectedCase.courtesyAllocation.courtesyVehicle?.regCurrent || "N/A"}
                        </span>
                      </div>
                      {selectedCase.courtesyAllocation.courtesyVehicle && (
                        <p className="text-xs text-emerald-700">
                          {selectedCase.courtesyAllocation.courtesyVehicle.make} {selectedCase.courtesyAllocation.courtesyVehicle.model}
                        </p>
                      )}
                      {selectedCase.courtesyAllocation.dateDueBack && (
                        <p className="text-xs text-emerald-700">
                          Due back: {new Date(selectedCase.courtesyAllocation.dateDueBack).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setShowCourtesyInModal(true)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          Return Courtesy Car
                        </button>
                        <button
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
                          onClick={returnCourtesy}
                          title="Quick return without form"
                        >
                          Quick
                        </button>
                      </div>
                    </div>
                  ) : selectedCase.courtesyAllocation && selectedCase.courtesyAllocation.status === "RETURNED" ? (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Courtesy car returned
                        {selectedCase.courtesyAllocation.courtesyVehicle?.regCurrent && (
                          <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-emerald-200">({selectedCase.courtesyAllocation.courtesyVehicle.regCurrent})</span>
                        )}
                      </div>
                    </div>
                  ) : selectedCase.courtesyRequired ? (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        No courtesy car allocated yet
                      </p>
                      {/* Quick allocation */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Quick Allocate</label>
                        {courtesyVehicles.length === 0 && !isLoadingCourtesy ? (
                          <a
                            href="/stock-book"
                            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Select Courtesy Vehicles in Stock Book
                          </a>
                        ) : (
                          <>
                            <select
                              className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition-all outline-none text-sm"
                              onFocus={loadCourtesyVehicles}
                              onChange={(e) => {
                                if (e.target.value) {
                                  allocateCourtesy(e.target.value);
                                }
                              }}
                              defaultValue=""
                            >
                              <option value="" disabled>
                                {isLoadingCourtesy ? "Loading..." : "Choose courtesy vehicle..."}
                              </option>
                              {courtesyVehicles.map((v) => (
                                <option key={v._id} value={v._id}>
                                  {v.regCurrent} - {v.make} {v.model}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-slate-400 mt-1">Select to allocate immediately</p>
                          </>
                        )}
                      </div>
                      {/* Full form option */}
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowCourtesyOutModal(true)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          Book Out with Full Form
                        </button>
                        <p className="text-xs text-slate-400 mt-1 text-center">Includes licence check, terms & signature</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Costing Section - Simplified Gross Only */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-slate-900">Costing</h3>
                  </div>
                  {(() => {
                    // Support both new partsGross/labourGross and legacy partsNet/labourNet fields
                    const pGross = selectedCase.costing?.partsGross || selectedCase.costing?.partsNet || selectedCase.costing?.partsCost || 0;
                    const lGross = selectedCase.costing?.labourGross || selectedCase.costing?.labourNet || selectedCase.costing?.labourCost || 0;
                    const totalGross = pGross + lGross;
                    return totalGross > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        £{totalGross.toFixed(2)} total
                      </span>
                    );
                  })()}
                </div>
                <div className="p-4 space-y-4">
                  {/* Parts Section */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Parts (Gross)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition-all outline-none text-sm"
                        value={selectedCase.costing?.partsGross ?? selectedCase.costing?.partsNet ?? selectedCase.costing?.partsCost ?? ""}
                        placeholder="0.00"
                        onChange={(e) => setSelectedCase({
                          ...selectedCase,
                          costing: { ...selectedCase.costing, partsGross: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>

                  {/* Labour Section */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Labour (Gross)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition-all outline-none text-sm"
                        value={selectedCase.costing?.labourGross ?? selectedCase.costing?.labourNet ?? selectedCase.costing?.labourCost ?? ""}
                        placeholder="0.00"
                        onChange={(e) => setSelectedCase({
                          ...selectedCase,
                          costing: { ...selectedCase.costing, labourGross: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>

                  {/* Total */}
                  {(() => {
                    const pGross = selectedCase.costing?.partsGross || selectedCase.costing?.partsNet || selectedCase.costing?.partsCost || 0;
                    const lGross = selectedCase.costing?.labourGross || selectedCase.costing?.labourNet || selectedCase.costing?.labourCost || 0;
                    const totalGross = pGross + lGross;

                    if (totalGross === 0) return null;

                    return (
                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-slate-900">Total</span>
                          <span className="text-slate-900">£{totalGross.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Notes</label>
                    <textarea
                      className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition-all outline-none text-sm resize-none"
                      rows={2}
                      value={selectedCase.costing?.notes || ""}
                      placeholder="Cost breakdown, supplier info, invoice refs..."
                      onChange={(e) => setSelectedCase({
                        ...selectedCase,
                        costing: { ...selectedCase.costing, notes: e.target.value }
                      })}
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    className="w-full py-2 px-4 bg-[#0066CC] hover:bg-[#0055AA] text-white text-sm font-medium rounded-lg transition-colors"
                    onClick={async () => {
                      const costing = selectedCase.costing || {};
                      await updateCase({
                        _eventType: "COSTING_UPDATED",
                        _eventMetadata: {
                          partsGross: costing.partsGross || costing.partsNet || costing.partsCost || 0,
                          labourGross: costing.labourGross || costing.labourNet || costing.labourCost || 0,
                          notes: costing.notes || ""
                        }
                      });
                      // Refresh KPIs after save
                      fetchCostKpis();
                    }}
                  >
                    Save Costing
                  </button>
                </div>
              </div>

              {/* TEMPORARILY DISABLED - AI Quick Actions Row
              <div className="flex gap-2 flex-wrap">
                {selectedCase.aiReview?.payload ? (
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    onClick={() => setShowRegenerateConfirm(true)}
                    disabled={isGeneratingAI}
                  >
                    {isGeneratingAI ? (
                      <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    Regenerate AI
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#0066CC] hover:bg-[#0055BB] rounded-lg transition-colors shadow-sm"
                    onClick={() => generateAIReview()}
                    disabled={isGeneratingAI}
                  >
                    {isGeneratingAI ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                    Generate AI Review
                  </button>
                )}
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedCase.aiReview?.payload?.draftCustomerReply}
                  onClick={() => copyToClipboard(selectedCase.aiReview?.payload?.draftCustomerReply, "Customer reply")}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Customer Reply
                </button>
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedCase.aiReview?.payload?.draftInternalNote}
                  onClick={() => copyToClipboard(selectedCase.aiReview?.payload?.draftInternalNote, "Internal note")}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Internal Note
                </button>
              </div>
              */}

              {/* TEMPORARILY DISABLED - AI Case Review Panel and AI Diagnostics Panel
              {selectedCase.aiReview?.payload ? (
                <div className="bg-[#0066CC]/5/50 rounded-xl border border-[#0066CC]/20 overflow-hidden">
                  ...AI Case Review content...
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#0066CC]/5 to-purple-50 rounded-xl border border-[#0066CC]/10 p-6 text-center">
                  ...placeholder content...
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                ...AI Diagnostics Panel content...
              </div>
              */}

              {/* Issue Summary */}
              {selectedCase.summary && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900">Issue Summary</h3>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedCase.summary}</p>
                  </div>
                </div>
              )}

              {/* Attachments/Media */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Attachments {(selectedCase.attachments?.length || 0) > 0 && (
                      <span className="ml-1 text-slate-400 font-normal">({selectedCase.attachments.length})</span>
                    )}
                  </h3>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer">
                    {isUploadingCaseMedia ? (
                      <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                    Add Media
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf"
                      className="hidden"
                      onChange={handleCaseMediaUpload}
                      disabled={isUploadingCaseMedia}
                    />
                  </label>
                </div>
                <div className="p-4">
                  {selectedCase.attachments?.length > 0 ? (
                    <div className="space-y-3">
                      {/* Images - with lightbox */}
                      {(() => {
                        const images = selectedCase.attachments.filter(att => att.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                        if (images.length === 0) return null;
                        return (
                          <PhotoGallery
                            photos={images.map(att => ({ url: att.url, caption: att.filename }))}
                            thumbnailSize="lg"
                            showCount={false}
                          />
                        );
                      })()}
                      {/* Videos & Documents - open in new tab */}
                      {(() => {
                        const nonImages = selectedCase.attachments.filter(att => !att.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                        if (nonImages.length === 0) return null;
                        return (
                          <div className="grid grid-cols-3 gap-2">
                            {nonImages.map((att, i) => (
                              <a
                                key={i}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block aspect-square bg-slate-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                              >
                                {att.url?.match(/\.(mp4|webm|mov)$/i) ? (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-200">
                                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 p-2">
                                    <svg className="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-xs text-slate-500 text-center truncate w-full">{att.filename}</span>
                                  </div>
                                )}
                              </a>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-2">No attachments yet. Click "Add Media" to upload photos or documents.</p>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Timeline</h3>
                </div>
                <div className="p-4">
                  {/* Add Update - Quick Templates + Input */}
                  <div className="mb-4 pb-4 border-b border-slate-100">
                    {/* Quick Templates */}
                    <div className="flex gap-2 flex-wrap mb-3">
                      {QUICK_UPDATE_TEMPLATES.map((template, i) => (
                        <button
                          key={i}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                          onClick={() => setNewComment(template.text)}
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>

                    {/* Attachments Preview */}
                    {commentAttachments.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-2">
                        {commentAttachments.map((att, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {att.filename}
                            <button
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              onClick={() => setCommentAttachments(commentAttachments.filter((_, j) => j !== i))}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Input Row */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#0066CC] focus:border-transparent transition-all outline-none text-sm"
                        placeholder="Add an update..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addComment()}
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        onChange={handleFileSelect}
                      />
                      <button
                        className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach files"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </button>
                      <button
                        className="px-4 py-2.5 text-sm font-medium text-white bg-[#0066CC] hover:bg-[#0055BB] rounded-lg transition-colors disabled:opacity-50"
                        onClick={addComment}
                        disabled={!newComment.trim()}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Unified Timeline - Events + Comments merged */}
                  <div className="space-y-3">
                    {buildUnifiedTimeline(selectedCase.events || [], selectedCase.comments || []).map((item, idx) => {
                      const style = TIMELINE_STYLES[item.type] || TIMELINE_STYLES.CASE_CREATED;
                      const IconComponent = getTimelineIcon(item.type);
                      const isComment = item.itemType === 'comment' || item.type === 'COMMENT_ADDED' || item.type === 'DEALER_UPDATE';
                      const isAI = item.type === 'AI_REVIEW_GENERATED';
                      const isSystemEvent = ['STATUS_CHANGED', 'WARRANTY_STAGE_MOVED', 'CASE_CREATED'].includes(item.type);

                      // Render dealer comments as speech bubbles
                      if (isComment) {
                        const content = item.comment?.content || item.metadata?.content || item.summary || '';
                        const isCustomer = item.isCustomer || item.comment?.authorType === 'customer';
                        const attachments = item.comment?.attachments || [];

                        return (
                          <div key={idx} className={`relative pl-8 ${isCustomer ? '' : ''}`}>
                            {/* Icon */}
                            <div className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center ${isCustomer ? 'bg-[#0066CC]/10' : 'bg-emerald-50'}`}>
                              <IconComponent className={`w-3.5 h-3.5 ${isCustomer ? 'text-[#0066CC]' : 'text-emerald-600'}`} />
                            </div>
                            {/* Speech bubble */}
                            <div className={`rounded-xl p-3 ${isCustomer ? 'bg-[#0066CC]/5 border border-[#0066CC]/10' : 'bg-emerald-50 border border-emerald-100'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wide ${isCustomer ? 'text-[#0066CC]' : 'text-emerald-700'}`}>
                                  {isCustomer ? 'Customer' : 'Dealer Update'}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {formatTimelineDate(item.createdAt)}
                                </span>
                                {item.createdByName && !isCustomer && (
                                  <span className="text-xs text-slate-400">• {item.createdByName}</span>
                                )}
                              </div>
                              <p className="text-sm text-slate-700">{content}</p>
                              {attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {/* Images with lightbox */}
                                  {(() => {
                                    const images = attachments.filter(att => (att.url || att)?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                                    if (images.length === 0) return null;
                                    return (
                                      <PhotoGallery
                                        photos={images.map(att => ({ url: att.url || att, caption: att.filename }))}
                                        thumbnailSize="sm"
                                        showCount={false}
                                      />
                                    );
                                  })()}
                                  {/* Non-images - open in new tab */}
                                  {(() => {
                                    const nonImages = attachments.filter(att => !(att.url || att)?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                                    if (nonImages.length === 0) return null;
                                    return (
                                      <div className="flex gap-2 flex-wrap">
                                        {nonImages.map((att, i) => (
                                          <a
                                            key={i}
                                            href={att.url || att}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                            {att.filename || "File"}
                                          </a>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Render AI review prominently
                      if (isAI) {
                        return (
                          <div key={idx} className="relative pl-8">
                            <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                              <IconComponent className="w-3.5 h-3.5 text-purple-600" />
                            </div>
                            <div className="rounded-xl p-3 bg-purple-50 border border-purple-100">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-purple-700">AI Review</span>
                                <span className="text-xs text-slate-400">{formatTimelineDate(item.createdAt)}</span>
                              </div>
                              <p className="text-sm text-slate-700">{item.summary || 'AI review generated'}</p>
                            </div>
                          </div>
                        );
                      }

                      // Render system events (status, booking, etc.) with subtle styling
                      // Use smaller, more compact layout for subtle events
                      if (style.subtle) {
                        return (
                          <div key={idx} className="relative pl-6 py-0.5">
                            <div className="absolute left-0 top-1 w-4 h-4 rounded-full flex items-center justify-center bg-slate-50 border border-slate-100">
                              <IconComponent className="w-2.5 h-2.5 text-slate-300" />
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                              <span className="text-[10px]">{style.label}</span>
                              <span className="text-[10px]">{formatTimelineDate(item.createdAt)}</span>
                              {item.summary && item.summary !== item.type.replace(/_/g, ' ') && (
                                <span className="text-[10px]">• {item.summary}</span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Regular non-subtle events
                      return (
                        <div key={idx} className="relative pl-8">
                          <div className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${style.bg} border ${style.border}`}>
                            <IconComponent className={`w-3 h-3 ${style.color}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold uppercase tracking-wide ${style.color}`}>
                                {style.label}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatTimelineDate(item.createdAt)}
                              </span>
                              {item.createdByName && (
                                <span className="text-xs text-slate-400">• {item.createdByName}</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mt-0.5">{item.summary || item.type.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      );
                    })}

                    {(!selectedCase.events?.length && !selectedCase.comments?.length) && (
                      <p className="text-sm text-slate-500 text-center py-4">No activity yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPORARILY DISABLED - Regenerate Confirm Modal
      {showRegenerateConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Regenerate AI Review?</h3>
            <p className="py-4">This will replace the existing AI review with a new one. This action cannot be undone.</p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowRegenerateConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => generateAIReview(true)}>Regenerate</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowRegenerateConfirm(false)}></div>
        </div>
      )}
      */}

      {/* Add Case Modal */}
      {showAddModal && (
        <AddCaseModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchCases(); }} />
      )}

      {/* Vehicle Drawer - Stacked over warranty case drawer */}
      <VehicleDrawer
        vehicleId={selectedVehicleId}
        isOpen={isVehicleDrawerOpen}
        onClose={() => {
          setIsVehicleDrawerOpen(false);
          setSelectedVehicleId(null);
        }}
        isStacked={true}
        readOnly={true}
      />

      {/* Job Sheet Share Modal */}
      {showJobSheetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Share Job Sheet</h3>
              <button
                onClick={() => {
                  setShowJobSheetModal(false);
                  setJobSheetLink(null);
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {isGeneratingJobSheet ? (
                <div className="flex flex-col items-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-slate-600">Generating share link...</p>
                </div>
              ) : jobSheetLink ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Shareable Link</p>
                    <p className="text-sm font-mono text-slate-900 break-all">{jobSheetLink}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    This link expires in 60 days. Anyone with this link can view the job sheet.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={copyJobSheetLink}
                      className="btn btn-outline btn-sm gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Link
                    </button>
                    <button
                      onClick={shareViaWhatsApp}
                      className="btn btn-success btn-sm gap-2 text-white"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        const reg = selectedCase?.regAtPurchase || selectedCase?.currentReg || "Vehicle";
                        const subject = `Job Sheet - ${reg}`;
                        const body = `Here is the warranty job sheet for ${reg}:\n\n${jobSheetLink}`;
                        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                      }}
                      className="btn btn-outline btn-sm gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </button>
                    <button
                      onClick={() => window.open(jobSheetLink, '_blank')}
                      className="btn btn-outline btn-sm gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print / PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No link generated yet
                </div>
              )}
            </div>
            <div className="flex justify-end p-4 border-t border-slate-200">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowJobSheetModal(false);
                  setJobSheetLink(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parts Order Modal */}
      {showPartsOrderForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Add Parts Order</h3>
              <button
                onClick={closePartsOrderModal}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Supplier Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Euro Car Parts, TPS, Main Dealer"
                  className="input input-bordered w-full"
                  value={partsOrderForm.supplierName}
                  onChange={(e) => setPartsOrderForm({ ...partsOrderForm, supplierName: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Order Reference (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., ORD-123456"
                  className="input input-bordered w-full"
                  value={partsOrderForm.orderRef}
                  onChange={(e) => setPartsOrderForm({ ...partsOrderForm, orderRef: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Expected Delivery (Optional)</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={partsOrderForm.expectedAt}
                  onChange={(e) => setPartsOrderForm({ ...partsOrderForm, expectedAt: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Notes (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Oil filter + air filter"
                  className="input input-bordered w-full"
                  value={partsOrderForm.notes}
                  onChange={(e) => setPartsOrderForm({ ...partsOrderForm, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
              <button
                className="btn btn-ghost"
                onClick={closePartsOrderModal}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={addPartsOrder}
              >
                Add Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Move Case Bottom Sheet */}
      <BottomSheet
        isOpen={!!moveCase}
        onClose={() => {
          setMoveCase(null);
          setMoveCaseCurrentColumn(null);
        }}
        title={`Move ${moveCase?.regAtPurchase || moveCase?.details?.vehicleReg || "Case"}`}
        hideAbove="md"
      >
        <div className="space-y-2">
          {COLUMNS.filter(c => c.key !== moveCaseCurrentColumn).map((targetCol) => (
            <button
              key={targetCol.key}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 transition-colors"
              onClick={async () => {
                if (moveCase) {
                  await moveCaseToStatus(moveCase, targetCol.key);
                  setMoveCase(null);
                  setMoveCaseCurrentColumn(null);
                }
              }}
            >
              <span className={`w-3 h-3 rounded-full ${targetCol.accentBg}`}></span>
              <span className="font-medium text-slate-700">{targetCol.label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Inline Form Modals */}
      <InlineFormModal
        isOpen={showCourtesyOutModal}
        onClose={() => setShowCourtesyOutModal(false)}
        formType="COURTESY_OUT"
        prefill={{
          customer_name: selectedCase?.contactId?.name,
          customer_phone: selectedCase?.contactId?.phone,
          customer_email: selectedCase?.contactId?.email,
          customer_address: selectedCase?.customerAddress
            ? [selectedCase.customerAddress.street, selectedCase.customerAddress.city, selectedCase.customerAddress.postcode].filter(Boolean).join(", ")
            : "",
          customer_vehicle_reg: selectedCase?.regAtPurchase || selectedCase?.currentReg,
          caseId: selectedCase?.id || selectedCase?._id,
        }}
        onSuccess={() => {
          toast.success("Courtesy car booked out");
          fetchCaseDetail(selectedCase.id || selectedCase._id);
          loadCourtesyVehicles();
          setShowCourtesyOutModal(false);
        }}
      />

      <InlineFormModal
        isOpen={showCourtesyInModal}
        onClose={() => setShowCourtesyInModal(false)}
        formType="COURTESY_IN"
        prefill={{
          courtesy_vrm: selectedCase?.courtesyAllocation?.courtesyVehicle?.regCurrent,
          customer_vehicle_reg: selectedCase?.regAtPurchase || selectedCase?.currentReg,
          caseId: selectedCase?.id || selectedCase?._id,
          allocationId: selectedCase?.courtesyAllocation?._id || selectedCase?.courtesyAllocationId,
        }}
        onSuccess={() => {
          toast.success("Courtesy car returned");
          fetchCaseDetail(selectedCase.id || selectedCase._id);
          loadCourtesyVehicles();
          setShowCourtesyInModal(false);
        }}
      />
    </DashboardLayout>
  );
}

function AddCaseModal({ onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaAttachments, setMediaAttachments] = useState([]);

  // VRM lookup state
  const [vrmLookup, setVrmLookup] = useState("");
  const [isSearchingVrm, setIsSearchingVrm] = useState(false);
  const [matchingDeals, setMatchingDeals] = useState([]);
  const [showDealDropdown, setShowDealDropdown] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);

  const [formData, setFormData] = useState({
    customerName: "", customerEmail: "", customerPhone: "",
    vehicleReg: "", regAtPurchase: "", summary: "", priority: "normal",
    warrantyType: "", mileage: "", mileageAtPurchase: "",
    addressStreet: "", addressCity: "", addressPostcode: "",
    partsRequired: false, partsNotes: "",
    vehicleId: null, // linked vehicle ID
  });

  // Debounced VRM search
  useEffect(() => {
    if (!vrmLookup || vrmLookup.length < 2) {
      setMatchingDeals([]);
      setShowDealDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingVrm(true);
      try {
        const res = await fetch(`/api/deals?vehicleVrm=${encodeURIComponent(vrmLookup)}&status=COMPLETED,DELIVERED`);
        if (res.ok) {
          const data = await res.json();
          setMatchingDeals(data.deals || []);
          setShowDealDropdown(true);
        }
      } catch (err) {
        console.error("VRM lookup error:", err);
      } finally {
        setIsSearchingVrm(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [vrmLookup]);

  // Handle deal selection
  const handleDealSelect = (deal) => {
    setSelectedDeal(deal);
    setShowDealDropdown(false);
    setVrmLookup(deal.vehicleId?.regCurrent || deal.vehicleId?.vrm || "");

    // Auto-populate form from deal
    const customer = deal.customerId || deal.contactId;
    setFormData({
      ...formData,
      customerName: customer?.name || "",
      customerEmail: customer?.email || "",
      customerPhone: customer?.phone || "",
      vehicleReg: deal.vehicleId?.regCurrent || deal.vehicleId?.vrm || "",
      regAtPurchase: deal.vehicleId?.vrm || "",
      vehicleId: deal.vehicleId?._id || deal.vehicleId?.id || null,
      mileage: deal.snapshot?.vehicleMileage || deal.vehicleId?.mileage || "",
      mileageAtPurchase: deal.deliveryMileage || deal.snapshot?.vehicleMileage || deal.vehicleId?.mileageCurrent || "",
      addressStreet: customer?.address?.street || "",
      addressCity: customer?.address?.city || "",
      addressPostcode: customer?.address?.postcode || "",
    });
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setIsUploadingMedia(true);
    const uploadedFiles = [];
    for (const file of files) {
      const formDataObj = new FormData();
      formDataObj.append("file", file);
      try {
        const res = await fetch("/api/vehicles/upload", { method: "POST", body: formDataObj });
        const data = await res.json();
        if (data.url) {
          uploadedFiles.push({ url: data.url, filename: data.filename || file.name });
        }
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setMediaAttachments([...mediaAttachments, ...uploadedFiles]);
    setIsUploadingMedia(false);
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName) return toast.error("Customer name required");
    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        source: "manual",
        attachments: mediaAttachments,
        partsRequired: formData.partsRequired,
        partsNotes: formData.partsNotes,
        mileageAtPurchase: formData.mileageAtPurchase || undefined,
        details: {
          mileage: formData.mileage,
          customerAddress: {
            street: formData.addressStreet,
            city: formData.addressCity,
            postcode: formData.addressPostcode,
          }
        }
      };
      const res = await fetch("/api/aftercare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create");
      toast.success("Case created!");
      onSuccess();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div
        className="modal-box flex flex-col h-[100dvh] md:h-auto md:max-h-[90vh] p-0 rounded-none md:rounded-xl"
      >
        {/* Sticky Header */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-slate-200 bg-white"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <h3 className="font-bold text-lg">New Aftercare Case</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {/* VRM Lookup - Search for existing deals */}
          <div className="form-control mb-4 relative">
            <label className="label"><span className="label-text font-semibold">Search by VRM (optional)</span></label>
            <div className="relative">
              <input
                type="text"
                className="input input-bordered w-full uppercase pr-10"
                placeholder="Enter vehicle registration..."
                value={vrmLookup}
                onChange={(e) => setVrmLookup(e.target.value.toUpperCase())}
              />
              {isSearchingVrm && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="loading loading-spinner loading-sm text-slate-400"></span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Search completed sales to auto-fill customer details</p>

            {/* Matching deals dropdown */}
            {showDealDropdown && matchingDeals.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {matchingDeals.map((deal) => (
                  <button
                    key={deal._id || deal.id}
                    type="button"
                    onClick={() => handleDealSelect(deal)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm">
                      {deal.vehicleId?.make} {deal.vehicleId?.model} ({deal.vehicleId?.year})
                    </div>
                    <div className="text-xs text-slate-500">
                      {deal.customerId?.name || deal.contactId?.name || "Unknown"} &middot;{" "}
                      {new Date(deal.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showDealDropdown && matchingDeals.length === 0 && !isSearchingVrm && vrmLookup.length >= 2 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm text-slate-500 text-center">
                No matching sales found for "{vrmLookup}"
              </div>
            )}
          </div>

          {/* Selected deal indicator */}
          {selectedDeal && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    Linked to sale: {selectedDeal.vehicleId?.make} {selectedDeal.vehicleId?.model}
                  </p>
                  <p className="text-xs text-emerald-600">Customer details auto-filled</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeal(null);
                    setVrmLookup("");
                    setFormData({
                      ...formData,
                      customerName: "", customerEmail: "", customerPhone: "",
                      vehicleReg: "", regAtPurchase: "", vehicleId: null, mileage: "",
                      addressStreet: "", addressCity: "", addressPostcode: "",
                    });
                  }}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="divider text-xs text-slate-400">Customer Details</div>

          <div className="form-control mb-3">
            <label className="label"><span className="label-text">Customer Name *</span></label>
            <input type="text" className="input input-bordered" value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label"><span className="label-text">Phone</span></label>
              <input type="tel" className="input input-bordered" value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Email</span></label>
              <input type="email" className="input input-bordered" value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="form-control">
              <label className="label"><span className="label-text">Current Reg (If different)</span></label>
              <input type="text" className="input input-bordered uppercase" value={formData.vehicleReg}
                onChange={(e) => setFormData({ ...formData, vehicleReg: e.target.value.toUpperCase() })} />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Reg at Purchase</span></label>
              <input type="text" className="input input-bordered uppercase" value={formData.regAtPurchase}
                onChange={(e) => setFormData({ ...formData, regAtPurchase: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="form-control">
              <label className="label"><span className="label-text">Priority</span></label>
              <select className="select select-bordered" value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Warranty Type</span></label>
              <select className="select select-bordered" value={formData.warrantyType}
                onChange={(e) => setFormData({ ...formData, warrantyType: e.target.value })}>
                <option value="">Not specified</option>
                <option value="Dealer Warranty">Dealer Warranty</option>
                <option value="External Warranty">External Warranty</option>
              </select>
            </div>
          </div>
          <div className="form-control mt-3">
            <label className="label"><span className="label-text">Current Mileage</span></label>
            <input type="number" className="input input-bordered" placeholder="e.g. 45000"
              value={formData.mileage}
              onChange={(e) => setFormData({ ...formData, mileage: e.target.value })} />
          </div>
          <div className="form-control mt-3">
            <label className="label"><span className="label-text">Mileage at Date of Purchase</span></label>
            <input type="number" className="input input-bordered" placeholder="e.g. 35000"
              value={formData.mileageAtPurchase}
              onChange={(e) => setFormData({ ...formData, mileageAtPurchase: e.target.value })} />
            {selectedDeal && formData.mileageAtPurchase && (
              <p className="text-xs text-emerald-600 mt-1">
                Mileage obtained from sale record matching this VRM
              </p>
            )}
          </div>
          <div className="form-control mt-3">
            <label className="label"><span className="label-text">Customer Address</span></label>
            <input type="text" className="input input-bordered mb-2" placeholder="Street address"
              value={formData.addressStreet}
              onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" className="input input-bordered" placeholder="City"
                value={formData.addressCity}
                onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })} />
              <input type="text" className="input input-bordered uppercase" placeholder="Postcode"
                value={formData.addressPostcode}
                onChange={(e) => setFormData({ ...formData, addressPostcode: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div className="form-control mt-3">
            <label className="label"><span className="label-text">Issue Summary</span></label>
            <textarea className="textarea textarea-bordered" value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}></textarea>
          </div>

          {/* Parts Required Section */}
          <div className="form-control mt-4">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={formData.partsRequired}
                onChange={(e) => setFormData({ ...formData, partsRequired: e.target.checked })}
              />
              <span className="label-text font-medium">Parts Required</span>
            </label>
            {formData.partsRequired && (
              <textarea
                className="textarea textarea-bordered mt-2"
                placeholder="Describe parts needed, supplier, order reference..."
                value={formData.partsNotes}
                onChange={(e) => setFormData({ ...formData, partsNotes: e.target.value })}
              ></textarea>
            )}
          </div>

          <div className="form-control mt-3">
            <label className="label"><span className="label-text">Photos/Documents</span></label>
            <div className="flex flex-wrap gap-2 mb-2">
              {mediaAttachments.map((att, i) => (
                <div key={i} className="relative w-16 h-16 bg-slate-100 rounded overflow-hidden group">
                  {att.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={att.url} alt={att.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 p-1">
                      {att.filename}
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 text-xs flex items-center justify-center rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setMediaAttachments(mediaAttachments.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className="btn btn-outline btn-sm gap-2 w-fit cursor-pointer">
              {isUploadingMedia ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
              Add Photos
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleMediaUpload}
                disabled={isUploadingMedia}
              />
            </label>
          </div>
          </div>{/* End scrollable content */}

          {/* Sticky Footer */}
          <div
            className="shrink-0 flex items-center justify-end gap-3 px-4 py-4 border-t border-slate-200 bg-white"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <span className="loading loading-spinner"></span> : "Create Case"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
