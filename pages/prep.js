import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import { showDummyNotification } from "@/utils/notifications";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PageHint } from "@/components/ui";
import { Portal } from "@/components/ui/Portal";
import { MobileStageSelector } from "@/components/ui/PageShell";
import useDealerRedirect from "@/hooks/useDealerRedirect";
import VehicleImage from "@/components/VehicleImage";
import { compressImages } from "@/libs/imageCompression";
import ContactPicker from "@/components/ContactPicker";
import TeamMemberPicker from "@/components/TeamMemberPicker";
import InlineFormModal from "@/components/InlineFormModal";

const COLUMNS = [
  { key: "in_stock", label: "In Stock", gradient: "from-slate-100/60", accent: "border-l-slate-400", accentBg: "bg-slate-400" },
  { key: "live", label: "Sold In Progress", gradient: "from-cyan-100/60", accent: "border-l-cyan-400", accentBg: "bg-cyan-400" },
  { key: "reserved", label: "Completed", gradient: "from-emerald-100/60", accent: "border-l-emerald-400", accentBg: "bg-emerald-400" },
  { key: "delivered", label: "Handed Over", gradient: "from-teal-100/60", accent: "border-l-teal-400", accentBg: "bg-teal-400" },
];

const ISSUE_SUBCATEGORIES = {
  mechanical: ["Engine", "Transmission", "Suspension", "Brakes", "Exhaust", "Other"],
  electrical: ["Battery", "Lights", "Starter Motor", "Alternator", "Sensors", "Other"],
  bodywork: ["Panel Damage", "Scratches", "Dents", "Bumper", "Windscreen", "Other"],
  interior: ["Seats", "Dashboard", "Trim", "Carpet", "Controls", "Other"],
  tyres: ["Tread Depth", "Puncture", "Alloys", "Alignment", "Other"],
  mot: ["Advisory", "Failed Item", "Due Soon", "Other"],
  service: ["Oil Change", "Filters", "Fluids", "Timing Belt", "Other"],
  fault_codes: ["Engine", "Transmission", "ABS", "Airbag", "Emissions", "Other"],
  other: ["General", "Misc"],
};

// Sold statuses - these show "Sold X days" instead of "In stock X days"
const SOLD_STATUSES = ["live", "reserved", "delivered"];

// Helper to determine if text should be dark or light based on background color
const getLabelTextColor = (hexColor) => {
  if (!hexColor) return "#1e293b";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1e293b" : "#ffffff";
};

// Helper to compute duration label based on status
const getVehicleDuration = (vehicle) => {
  const isSold = SOLD_STATUSES.includes(vehicle.status);

  if (isSold) {
    if (vehicle.soldAt) {
      const daysSold = Math.floor((Date.now() - new Date(vehicle.soldAt).getTime()) / (1000 * 60 * 60 * 24));
      return { days: daysSold, label: `Sold ${daysSold}d`, isSold: true, soldDate: vehicle.soldAt };
    }
    // Legacy sold vehicle without soldAt - just show "Sold"
    return { days: 0, label: "Sold", isSold: true, soldDate: null };
  }

  const daysInStock = vehicle.createdAt
    ? Math.floor((Date.now() - new Date(vehicle.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  return { days: daysInStock, label: `${daysInStock}d in stock`, isSold: false, soldDate: null };
};

export default function SalesPrep() {
  const router = useRouter();
  const { isRedirecting } = useDealerRedirect();
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isLookingUpDrawer, setIsLookingUpDrawer] = useState(false);
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [draggedPriorityIndex, setDraggedPriorityIndex] = useState(null);
  const [dragOverPriorityIndex, setDragOverPriorityIndex] = useState(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showMotDetails, setShowMotDetails] = useState(false);
  const [isRefreshingMot, setIsRefreshingMot] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskName, setEditingTaskName] = useState("");

  // Inline title editing state
  const [editingVehicleTitle, setEditingVehicleTitle] = useState(null); // vehicle.id
  const [editTitleValue, setEditTitleValue] = useState("");

  // Task drag-and-drop state
  const [draggedTaskIndex, setDraggedTaskIndex] = useState(null);
  const [dragOverTaskIndex, setDragOverTaskIndex] = useState(null);

  // Parts ordering state
  const [showPartsOrderModal, setShowPartsOrderModal] = useState(false);
  const [partsOrderTaskId, setPartsOrderTaskId] = useState(null);
  const [partsOrderForm, setPartsOrderForm] = useState({
    supplierType: "EURO_CAR_PARTS",
    supplierName: "",
    orderRef: "",
    expectedAt: "",
    notes: "",
  });
  const [editingPartsOrderId, setEditingPartsOrderId] = useState(null);

  // Task assignee state
  const [teamMembers, setTeamMembers] = useState([]);
  const [taskAssigneeDropdownId, setTaskAssigneeDropdownId] = useState(null);

  // Column sorting state
  const [columnSortOptions, setColumnSortOptions] = useState({});

  // Archive toggle for delivered column - when false, hides vehicles delivered >90 days ago
  const [showAllDelivered, setShowAllDelivered] = useState(false);

  // Job sheet share state
  const [showJobSheetModal, setShowJobSheetModal] = useState(false);
  const [jobSheetLink, setJobSheetLink] = useState(null);
  const [isGeneratingJobSheet, setIsGeneratingJobSheet] = useState(false);

  // Prep summary share state
  const [showPrepSummaryModal, setShowPrepSummaryModal] = useState(false);
  const [prepSummaryLink, setPrepSummaryLink] = useState(null);
  const [isGeneratingPrepSummary, setIsGeneratingPrepSummary] = useState(false);

  // Manual share fallback modal
  const [showManualShareModal, setShowManualShareModal] = useState(false);
  const [manualShareUrl, setManualShareUrl] = useState("");

  // Mobile move bottom sheet
  const [moveVehicle, setMoveVehicle] = useState(null);
  const [moveCurrentColumn, setMoveCurrentColumn] = useState(null);

  // Touch device detection for adaptive hints
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    // Check for touch capability
    const hasTouch = window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(hasTouch);
  }, []);

  // Touch drag state for mobile
  const [touchDragActive, setTouchDragActive] = useState(false);
  const [touchDropTarget, setTouchDropTarget] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(null);
  const touchStartRef = useRef({ x: 0, y: 0, timer: null });
  const scrollIntervalRef = useRef(null);

  // Load columnSortOptions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("prepColumnSortOptions");
    if (saved) {
      try {
        setColumnSortOptions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved sort options:", e);
      }
    }
  }, []);

  // Save columnSortOptions to localStorage on change
  useEffect(() => {
    if (Object.keys(columnSortOptions).length > 0) {
      localStorage.setItem("prepColumnSortOptions", JSON.stringify(columnSortOptions));
    }
  }, [columnSortOptions]);

  // Inline form modals state
  const [showPdiModal, setShowPdiModal] = useState(false);
  const [showServiceReceiptModal, setShowServiceReceiptModal] = useState(false);

  // Issues state
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null); // For edit mode
  const [issueForm, setIssueForm] = useState({
    category: "",
    subcategory: "",
    description: "",
    actionNeeded: "",
    priority: "medium",
    location: "",
    status: "outstanding",
    notes: "",
    photos: [],
    partsRequired: false,
    partsDetails: "",
    assignedToUserIds: [],
  });
  const [issueUpdateContent, setIssueUpdateContent] = useState({});
  const [expandedIssues, setExpandedIssues] = useState({});

  // Filters state - with localStorage persistence
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const filterButtonRef = useRef(null);
  const [filterPopoverPos, setFilterPopoverPos] = useState({ top: 0, right: 0 });

  // Calculate popover position when opening
  const openFiltersDropdown = useCallback(() => {
    if (filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Position below the button, aligned to right edge
      let top = rect.bottom + 8;
      let right = viewportWidth - rect.right;

      // Ensure popover doesn't go below viewport (max 70vh height + 16px padding)
      const popoverHeight = Math.min(viewportHeight * 0.7, 600);
      if (top + popoverHeight > viewportHeight - 16) {
        top = Math.max(16, viewportHeight - popoverHeight - 16);
      }

      // Ensure popover doesn't go off right edge
      right = Math.max(16, right);

      setFilterPopoverPos({ top, right });
    }
    setShowFiltersDropdown(true);
  }, []);

  // Location state
  const [locations, setLocations] = useState([]);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);

  // Vehicle Labels state
  const [availableLabels, setAvailableLabels] = useState([]);
  const [showLabelsDropdown, setShowLabelsDropdown] = useState(false);
  const [showAddLabelModal, setShowAddLabelModal] = useState(false);
  const [newLabelForm, setNewLabelForm] = useState({ name: "", colour: "#6366f1" });

  // Activity log state
  const [activityData, setActivityData] = useState({ activities: [], total: 0, hasMore: false });
  const [activityLoading, setActivityLoading] = useState(false);

  // Sales/Deal state for quick action
  const [vehicleDeal, setVehicleDeal] = useState(null);
  const [dealLoading, setDealLoading] = useState(false);
  const [creatingDeal, setCreatingDeal] = useState(false);

  // VRM Search state
  const [vrmSearch, setVrmSearch] = useState("");
  const [showVrmDropdown, setShowVrmDropdown] = useState(false);
  const [vrmSelectedIndex, setVrmSelectedIndex] = useState(-1);
  const [vrmFilter, setVrmFilter] = useState(""); // Persisted filter applied to board
  const [vrmSearchResults, setVrmSearchResults] = useState([]); // API search results
  const [isSearchingVrm, setIsSearchingVrm] = useState(false);
  const vrmSearchInputRef = useRef(null);
  const vrmDropdownRef = useRef(null);
  const vrmSearchDebounceRef = useRef(null);

  // VRM dropdown position state - calculated once and updated on changes
  const [vrmDropdownPos, setVrmDropdownPos] = useState({ top: 0, left: 0, width: 320 });

  // Calculate dropdown position relative to input (with mobile Safari fixes)
  const updateVrmDropdownPosition = useCallback(() => {
    if (!vrmSearchInputRef.current) return;
    const rect = vrmSearchInputRef.current.getBoundingClientRect();

    // Use visualViewport for more accurate positioning on mobile (especially iOS Safari with keyboard)
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportOffsetTop = window.visualViewport?.offsetTop || 0;

    // Calculate available space below the input
    const spaceBelow = viewportHeight - (rect.bottom - viewportOffsetTop);
    const dropdownHeight = 280; // Approximate max height of dropdown

    // If not enough space below, position above (mobile-friendly)
    const shouldPositionAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const top = shouldPositionAbove
      ? rect.top + viewportOffsetTop - dropdownHeight - 4
      : rect.bottom + viewportOffsetTop + 4;

    // On mobile, use full width minus padding for better usability
    const isMobile = viewportWidth < 640;
    const desiredWidth = isMobile ? viewportWidth - 32 : Math.max(rect.width, 320);
    const maxWidth = viewportWidth - 32; // 16px padding on each side
    const width = Math.min(desiredWidth, maxWidth);

    // Adjust left position to keep dropdown in viewport
    let left = isMobile ? 16 : rect.left;
    if (left + width > viewportWidth - 16) {
      left = viewportWidth - width - 16;
    }
    if (left < 16) {
      left = 16;
    }

    setVrmDropdownPos({ top, left, width });
  }, []);

  // Fetch VRM search results from API (searches ALL vehicles including archived)
  useEffect(() => {
    // Clear previous debounce
    if (vrmSearchDebounceRef.current) {
      clearTimeout(vrmSearchDebounceRef.current);
    }

    if (vrmSearch.length < 2) {
      setVrmSearchResults([]);
      setIsSearchingVrm(false);
      return;
    }

    setIsSearchingVrm(true);

    // Debounce API calls
    vrmSearchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vehicles/search?q=${encodeURIComponent(vrmSearch)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setVrmSearchResults(data);
        }
      } catch (error) {
        console.error("VRM search error:", error);
      } finally {
        setIsSearchingVrm(false);
      }
    }, 200);

    return () => {
      if (vrmSearchDebounceRef.current) {
        clearTimeout(vrmSearchDebounceRef.current);
      }
    };
  }, [vrmSearch]);

  // Reset selection when dropdown opens
  useEffect(() => {
    if (showVrmDropdown) {
      setVrmSelectedIndex(-1);
    }
  }, [showVrmDropdown]);

  // Update dropdown position when it opens and on viewport changes
  useEffect(() => {
    if (!showVrmDropdown) return;

    // Initial position calculation
    updateVrmDropdownPosition();

    // Handle viewport changes (iOS Safari keyboard handling)
    const handleViewportChange = () => {
      updateVrmDropdownPosition();
    };

    // Handle scroll in parent containers
    const handleScroll = () => {
      updateVrmDropdownPosition();
    };

    // Listen to visualViewport for mobile keyboard handling
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
      window.visualViewport.addEventListener("scroll", handleViewportChange);
    }

    // Also listen to window scroll and resize
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportChange);
        window.visualViewport.removeEventListener("scroll", handleViewportChange);
      }
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [showVrmDropdown, updateVrmDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showVrmDropdown &&
        vrmSearchInputRef.current &&
        !vrmSearchInputRef.current.contains(e.target) &&
        vrmDropdownRef.current &&
        !vrmDropdownRef.current.contains(e.target)
      ) {
        setShowVrmDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showVrmDropdown]);

  // Close task assignee dropdown when clicking outside
  useEffect(() => {
    if (!taskAssigneeDropdownId) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest("[data-task-assignee-dropdown]")) {
        setTaskAssigneeDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [taskAssigneeDropdownId]);

  // Mobile state
  const [mobileActiveColumn, setMobileActiveColumn] = useState("in_stock");

  useEffect(() => {
    fetchVehicles(showAllDelivered);
    fetchLocations();
    fetchLabels();
    fetchTeamMembers();
  }, []);

  // Refetch when showAllDelivered toggle changes
  useEffect(() => {
    fetchVehicles(showAllDelivered);
  }, [showAllDelivered]);

  // Handle addVehicle query param (from Quick Add menu) - redirect to Stock Book
  useEffect(() => {
    if (router.query.addVehicle === "1") {
      router.replace("/stock-book?addVehicle=1");
    }
  }, [router.query.addVehicle]);

  // Handle vehicleId query param (from notification clicks) - auto-open vehicle card
  useEffect(() => {
    if (router.isReady && router.query.vehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === router.query.vehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        // Also handle tab query param
        if (router.query.tab) {
          setActiveTab(router.query.tab);
        }
        router.replace(router.pathname, undefined, { shallow: true });
      }
    }
  }, [router.isReady, router.query.vehicleId, router.query.tab, vehicles]);

  const fetchVehicles = async (includeAllDelivered = false) => {
    try {
      // Use excludeOldDelivered filter unless showing all
      const params = new URLSearchParams();
      if (!includeAllDelivered) {
        params.append("excludeOldDelivered", "true");
      }
      const url = `/api/vehicles${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load vehicles:", error);
      toast.error("Failed to load vehicles");
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      setLocations(data);
    } catch (error) {
      console.error("Failed to load locations:", error);
    }
  };

  const fetchLabels = async () => {
    try {
      const res = await fetch("/api/labels");
      const data = await res.json();
      setAvailableLabels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load labels:", error);
    }
  };

  // Fetch team members for task assignment
  const fetchTeamMembers = async () => {
    try {
      const res = await fetch("/api/team/members");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data);
      }
    } catch (error) {
      console.error("Failed to load team members:", error);
    }
  };

  // Fetch vehicle activity log
  const fetchActivity = async (vehicleId, loadMore = false) => {
    if (!vehicleId) return;
    setActivityLoading(true);
    try {
      const offset = loadMore ? activityData.activities.length : 0;
      const res = await fetch(`/api/vehicles/${vehicleId}/activity?limit=25&offset=${offset}`);
      const data = await res.json();
      if (loadMore) {
        setActivityData(prev => ({
          activities: [...prev.activities, ...data.activities],
          total: data.total,
          hasMore: data.hasMore,
        }));
      } else {
        setActivityData(data);
      }
    } catch (error) {
      console.error("Failed to load activity:", error);
    } finally {
      setActivityLoading(false);
    }
  };

  // Format relative time for activity log
  const formatRelativeTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  // Toggle a label on/off for a vehicle
  const toggleVehicleLabel = async (vehicleId, labelId) => {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/labels/${labelId}`, {
        method: "POST",
      });
      if (res.ok) {
        const updatedData = await res.json();
        // Update vehicle in list (optimistic update - no full refetch needed)
        setVehicles(prev => prev.map(v =>
          v.id === vehicleId ? { ...v, labels: updatedData.labels || [] } : v
        ));
        // Update selected vehicle if it's the same one
        if (selectedVehicle?.id === vehicleId) {
          setSelectedVehicle(prev => ({
            ...prev,
            labels: updatedData.labels || [],
          }));
        }
      }
    } catch (error) {
      toast.error("Failed to update label");
    }
  };

  // Create a new label
  const createLabel = async () => {
    if (!newLabelForm.name.trim()) {
      toast.error("Label name is required");
      return;
    }
    try {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLabelForm),
      });
      if (res.ok) {
        const newLabel = await res.json();
        setAvailableLabels(prev => [...prev, newLabel]);
        setNewLabelForm({ name: "", colour: "#6366f1" });
        setShowAddLabelModal(false);
        toast.success("Label created");
      }
    } catch (error) {
      toast.error("Failed to create label");
    }
  };

  // Open vehicle drawer - vehicle from grid already has tasks, issues, documents, and activeDeal
  const openVehicleDrawer = (vehicle) => {
    const vehicleId = vehicle.id || vehicle._id;
    setSelectedVehicle({ ...vehicle, id: vehicleId });
    setActiveTab("overview");
    setShowLabelsDropdown(false); // Close labels dropdown when opening new vehicle
    setShowMotDetails(false); // Reset MOT details when opening new vehicle
    setActivityData({ activities: [], total: 0, hasMore: false }); // Reset activity when opening new vehicle
    // Use deal data already loaded with vehicle (no extra API call needed)
    setVehicleDeal(vehicle.activeDeal || null);
  };

  // Fetch deal for the selected vehicle
  const fetchVehicleDeal = async (vehicleId) => {
    setDealLoading(true);
    try {
      const res = await fetch(`/api/deals?vehicleId=${vehicleId}`);
      if (!res.ok) throw new Error("Failed to fetch deals");
      const deals = await res.json();
      // Find active deal (not cancelled/completed)
      const activeDeal = deals.find(d => !["CANCELLED", "COMPLETED"].includes(d.status)) || deals[0];
      setVehicleDeal(activeDeal || null);
    } catch (error) {
      console.error("Failed to fetch deal:", error);
      setVehicleDeal(null);
    } finally {
      setDealLoading(false);
    }
  };

  // Handle Create/Open Sale action
  const handleSaleAction = async () => {
    if (!selectedVehicle) return;

    // If there's an existing deal, navigate to it
    if (vehicleDeal) {
      router.push(`/sales?id=${vehicleDeal.id}`);
      return;
    }

    // Create a new deal
    setCreatingDeal(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: selectedVehicle.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check if the error is because vehicle already has a deal
        if (data.existingDealId) {
          router.push(`/sales?id=${data.existingDealId}`);
          return;
        }
        throw new Error(data.error || "Failed to create deal");
      }

      toast.success("Sale created");
      router.push(`/sales?id=${data.id || data._id}`);
    } catch (error) {
      console.error("Failed to create sale:", error);
      toast.error(error.message || "Failed to create sale");
    } finally {
      setCreatingDeal(false);
    }
  };

  const updateVehicleStatus = async (vehicleId, newStatus) => {
    try {
      const updateData = { status: newStatus };

      // When moving to "live" (Sold In Progress), set prepBoardOrder to bottom
      if (newStatus === "live") {
        const liveVehicles = vehicles.filter(v => v.status === "live" && v.id !== vehicleId);
        const maxOrder = Math.max(0, ...liveVehicles.map(v => v.prepBoardOrder || 0));
        updateData.prepBoardOrder = maxOrder + 1;
      }

      await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      fetchVehicles();
      const columnLabel = COLUMNS.find(col => col.key === newStatus)?.label || newStatus.replace("_", " ");
      toast.success(`Moved to ${columnLabel}`);
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  // Update vehicle prep board order (for priority sorting)
  const updateVehiclePrepOrder = async (vehicleId, newOrder) => {
    try {
      await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prepBoardOrder: newOrder }),
      });
    } catch (error) {
      console.error("Failed to update prep order:", error);
    }
  };

  // Toggle pin to top for a vehicle
  const toggleVehiclePin = async (vehicleId, currentPinState) => {
    try {
      // Optimistic update
      setVehicles(prev => prev.map(v =>
        v.id === vehicleId ? { ...v, isPinnedOnPrepBoard: !currentPinState } : v
      ));

      await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinnedOnPrepBoard: !currentPinState }),
      });

      toast.success(currentPinState ? "Unpinned from top" : "Pinned to top");
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast.error("Failed to update pin");
      // Revert on error
      fetchVehicles();
    }
  };

  // Save inline title edit (make/model)
  const saveVehicleTitle = async (vehicleId, titleValue) => {
    const parts = titleValue.trim().split(/\s+/);
    if (parts.length < 2) {
      toast.error("Please enter both make and model");
      return false;
    }
    const make = parts[0];
    const model = parts.slice(1).join(" ");
    try {
      await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ make, model }),
      });
      fetchVehicles();
      toast.success("Vehicle updated");
      return true;
    } catch (error) {
      toast.error("Failed to update vehicle");
      return false;
    }
  };

  // Refresh MOT data from DVSA
  const refreshMotData = async (vehicleId) => {
    setIsRefreshingMot(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/refresh-mot`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to refresh MOT data");
        return;
      }

      // Refresh the vehicle data
      const vehicleRes = await fetch(`/api/vehicles/${vehicleId}`);
      const vehicleData = await vehicleRes.json();
      setSelectedVehicle(vehicleData);
      fetchVehicles();
      toast.success(`MOT data refreshed - ${data.motHistoryCount} test(s) found`);
    } catch (error) {
      toast.error("Failed to refresh MOT data");
    } finally {
      setIsRefreshingMot(false);
    }
  };

  // Add MOT defects to vehicle checklist
  const addMotDefectsToChecklist = async (defects, defectType) => {
    if (!selectedVehicle || !defects?.length) return;

    try {
      let addedCount = 0;
      for (const defect of defects) {
        const taskName = `[MOT ${defectType}] ${defect.text}`;
        const res = await fetch(`/api/vehicles/${selectedVehicle.id}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: taskName,
            notes: `Added from MOT defect - ${defectType}`,
          }),
        });
        if (res.ok) addedCount++;
      }
      if (addedCount > 0) {
        toast.success(`Added ${addedCount} task(s) to checklist`);
        // Refresh vehicle data
        const vehicleRes = await fetch(`/api/vehicles/${selectedVehicle.id}`);
        const vehicleData = await vehicleRes.json();
        setSelectedVehicle(vehicleData);
        fetchVehicles();
      }
    } catch (error) {
      toast.error("Failed to add tasks");
    }
  };

  // DVLA lookup for existing vehicle in drawer
  const lookupVehicleDVLA = async () => {
    if (!selectedVehicle?.regCurrent) {
      toast.error("No registration to lookup");
      return;
    }
    setIsLookingUpDrawer(true);
    try {
      const res = await fetch("/api/dvla-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleReg: selectedVehicle.regCurrent }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.message || data.error || "Vehicle not found");
        return;
      }

      if (data.isDummy) showDummyNotification("DVLA API");

      // Update the vehicle with DVLA data
      const updatePayload = {
        make: data.make || selectedVehicle.make,
        model: data.model || selectedVehicle.model,
        year: data.yearOfManufacture || data.year || selectedVehicle.year,
        colour: data.colour || selectedVehicle.colour,
        fuelType: data.fuelType || selectedVehicle.fuelType,
        transmission: data.transmission || selectedVehicle.transmission,
        motExpiryDate: data.motExpiryDate || selectedVehicle.motExpiryDate,
        dvlaDetails: data.dvlaDetails || null,
        lastDvlaFetchAt: data.lastDvlaFetchAt || new Date().toISOString(),
      };

      await fetch(`/api/vehicles/${selectedVehicle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      // Refresh vehicle data
      const updatedRes = await fetch(`/api/vehicles/${selectedVehicle.id}`);
      const updatedVehicle = await updatedRes.json();
      setSelectedVehicle(updatedVehicle);
      fetchVehicles();

      toast.success(`Updated: ${data.make} ${data.model || ""} (${data.yearOfManufacture || ""})`);
    } catch (error) {
      toast.error("Lookup failed - please try again");
    } finally {
      setIsLookingUpDrawer(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    // Optimistic update: immediately update local state
    const previousVehicle = selectedVehicle;
    const previousVehicles = vehicles;

    // Update selectedVehicle optimistically
    if (selectedVehicle) {
      const updatedTasks = selectedVehicle.tasks?.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: newStatus,
              completedAt: newStatus === "done" ? new Date().toISOString() : task.completedAt,
              progress: newStatus !== "in_progress" ? "NONE" : task.progress,
              progressNote: newStatus !== "in_progress" ? "" : task.progressNote,
            }
          : task
      );
      setSelectedVehicle({ ...selectedVehicle, tasks: updatedTasks });
    }

    // Update vehicles list optimistically
    setVehicles(vehicles.map(v =>
      v.id === selectedVehicle?.id
        ? {
            ...v,
            tasks: v.tasks?.map(task =>
              task.id === taskId
                ? { ...task, status: newStatus }
                : task
            ),
          }
        : v
    ));

    try {
      const payload = { status: newStatus };
      if (newStatus === "done") {
        payload.completedAt = new Date().toISOString();
      }
      // Clear progress when changing status (optional: keep if staying in_progress)
      if (newStatus !== "in_progress") {
        payload.progress = "NONE";
        payload.progressNote = "";
      }
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update");

      // Background refresh to sync any server-side changes
      fetchVehicles();
    } catch (error) {
      // Rollback on error
      toast.error("Failed to update task");
      setSelectedVehicle(previousVehicle);
      setVehicles(previousVehicles);
    }
  };

  // Update task assignee
  const updateTaskAssignee = async (taskId, userId) => {
    // Optimistic update
    const previousVehicle = selectedVehicle;
    const previousVehicles = vehicles;
    const assignedMember = userId ? teamMembers.find(m => m.userId === userId) : null;

    // Update selectedVehicle optimistically
    if (selectedVehicle) {
      const updatedTasks = selectedVehicle.tasks?.map(task =>
        task.id === taskId
          ? {
              ...task,
              assignedUserId: userId || null,
              assignedUserName: assignedMember?.name || null,
            }
          : task
      );
      setSelectedVehicle({ ...selectedVehicle, tasks: updatedTasks });
    }

    // Update vehicles list optimistically
    setVehicles(vehicles.map(v =>
      v.id === selectedVehicle?.id
        ? {
            ...v,
            tasks: v.tasks?.map(task =>
              task.id === taskId
                ? { ...task, assignedUserId: userId || null, assignedUserName: assignedMember?.name || null }
                : task
            ),
          }
        : v
    ));

    // Close the dropdown
    setTaskAssigneeDropdownId(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: userId ? String(userId) : null }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Task assignment failed:", errorData);
        throw new Error(errorData.error || "Failed to update");
      }

      // Background refresh to sync any server-side changes
      fetchVehicles();
      if (userId) {
        toast.success(`Task assigned to ${assignedMember?.name || "team member"}`);
      }
    } catch (error) {
      // Rollback on error
      console.error("Task assignment error:", error);
      toast.error("Failed to assign task");
      setSelectedVehicle(previousVehicle);
      setVehicles(previousVehicles);
    }
  };

  // Update task progress sub-status (for parts ordering, booking, etc.)
  const updateTaskProgress = async (taskId, progress, progressNote = null) => {
    // Optimistic update
    const previousVehicle = selectedVehicle;

    if (selectedVehicle) {
      const updatedTasks = selectedVehicle.tasks?.map(task =>
        task.id === taskId
          ? {
              ...task,
              progress,
              progressNote: progressNote !== null ? progressNote : task.progressNote,
            }
          : task
      );
      setSelectedVehicle({ ...selectedVehicle, tasks: updatedTasks });
    }

    try {
      const payload = { progress };
      if (progressNote !== null) {
        payload.progressNote = progressNote;
      }
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update");

      // Background refresh
      fetchVehicles();
    } catch (error) {
      // Rollback on error
      toast.error("Failed to update task progress");
      setSelectedVehicle(previousVehicle);
    }
  };

  // Parts order management functions
  const openPartsOrderModal = (taskId, existingOrder = null) => {
    setPartsOrderTaskId(taskId);
    if (existingOrder) {
      setEditingPartsOrderId(existingOrder._id || existingOrder.id);
      setPartsOrderForm({
        supplierName: existingOrder.supplierName || "",
        orderRef: existingOrder.orderRef || "",
        expectedAt: existingOrder.expectedAt ? existingOrder.expectedAt.split("T")[0] : "",
        notes: existingOrder.notes || "",
      });
    } else {
      setEditingPartsOrderId(null);
      setPartsOrderForm({
        supplierName: "",
        orderRef: "",
        expectedAt: "",
        notes: "",
      });
    }
    setShowPartsOrderModal(true);
  };

  const closePartsOrderModal = () => {
    setShowPartsOrderModal(false);
    setPartsOrderTaskId(null);
    setEditingPartsOrderId(null);
    setPartsOrderForm({
      supplierType: "EURO_CAR_PARTS",
      supplierName: "",
      orderRef: "",
      expectedAt: "",
      notes: "",
    });
  };

  const addPartsOrder = async () => {
    if (!partsOrderTaskId) return;
    try {
      const orderData = {
        supplierType: partsOrderForm.supplierType,
        supplierName: partsOrderForm.supplierName || null,
        ...(partsOrderForm.orderRef && { orderRef: partsOrderForm.orderRef }),
        ...(partsOrderForm.expectedAt && { expectedAt: partsOrderForm.expectedAt }),
        ...(partsOrderForm.notes && { notes: partsOrderForm.notes }),
      };

      await fetch(`/api/tasks/${partsOrderTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addPartsOrder: orderData }),
      });

      const res = await fetch(`/api/vehicles/${selectedVehicle.id}`);
      const data = await res.json();
      setSelectedVehicle(data);
      fetchVehicles();
      closePartsOrderModal();
      toast.success("Parts order added");
    } catch (error) {
      toast.error("Failed to add parts order");
    }
  };

  const updatePartsOrder = async () => {
    if (!partsOrderTaskId || !editingPartsOrderId) return;
    try {
      const orderData = {
        orderId: editingPartsOrderId,
        supplierType: partsOrderForm.supplierType,
        supplierName: partsOrderForm.supplierName || null,
        orderRef: partsOrderForm.orderRef || null,
        expectedAt: partsOrderForm.expectedAt || null,
        notes: partsOrderForm.notes || null,
      };

      await fetch(`/api/tasks/${partsOrderTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updatePartsOrder: orderData }),
      });

      const res = await fetch(`/api/vehicles/${selectedVehicle.id}`);
      const data = await res.json();
      setSelectedVehicle(data);
      fetchVehicles();
      closePartsOrderModal();
      toast.success("Parts order updated");
    } catch (error) {
      toast.error("Failed to update parts order");
    }
  };

  const removePartsOrder = async (taskId, orderId) => {
    if (!confirm("Remove this parts order?")) return;
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removePartsOrderId: orderId }),
      });

      const res = await fetch(`/api/vehicles/${selectedVehicle.id}`);
      const data = await res.json();
      setSelectedVehicle(data);
      fetchVehicles();
      toast.success("Parts order removed");
    } catch (error) {
      toast.error("Failed to remove parts order");
    }
  };

  const markPartsReceived = async (taskId, orderId) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updatePartsOrder: {
            orderId,
            status: "RECEIVED",
            receivedAt: new Date().toISOString(),
          },
        }),
      });

      const res = await fetch(`/api/vehicles/${selectedVehicle.id}`);
      const data = await res.json();
      setSelectedVehicle(data);
      fetchVehicles();
      toast.success("Parts marked as received");
    } catch (error) {
      toast.error("Failed to update parts order");
    }
  };

  // Helper to get supplier display name
  const getSupplierDisplay = (order) => {
    return order.supplierName || "Supplier not specified";
  };

  const updateTaskName = async (taskId, newName) => {
    if (!newName.trim()) {
      toast.error("Task name cannot be empty");
      return;
    }
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const res = await fetch(`/api/vehicles/${selectedVehicle.id}`);
      const data = await res.json();
      setSelectedVehicle(data);
      fetchVehicles();
      setEditingTaskId(null);
      setEditingTaskName("");
      toast.success("Task updated");
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const addTask = async () => {
    if (!newTaskName.trim()) return toast.error("Task name is required");
    try {
      const res = await fetch(`/api/vehicles/${selectedVehicle.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTaskName }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add task");
      }
      const updatedVehicle = await fetch(`/api/vehicles/${selectedVehicle.id}`).then(r => r.json());
      setSelectedVehicle(updatedVehicle);
      setNewTaskName("");
      fetchVehicles();
      toast.success("Task added");
    } catch (error) {
      console.error("Add task error:", error);
      toast.error(error.message || "Failed to add task");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const updatedVehicle = await fetch(`/api/vehicles/${selectedVehicle.id}`).then(r => r.json());
      setSelectedVehicle(updatedVehicle);
      fetchVehicles();
      toast.success("Task removed");
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  // Reorder tasks (for drag-and-drop)
  const reorderTasks = async (taskIds) => {
    if (!selectedVehicle?.id) return;
    try {
      await fetch(`/api/vehicles/${selectedVehicle.id}/tasks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });
    } catch (error) {
      console.error("Failed to reorder tasks:", error);
    }
  };

  // Issue functions
  const addIssue = async (photoUrls = []) => {
    if (!issueForm.category || !issueForm.subcategory || !issueForm.description) {
      return toast.error("Category, subcategory, and description are required");
    }
    try {
      const issueData = {
        ...issueForm,
        photos: [...(issueForm.photos || []), ...photoUrls],
      };
      const res = await fetch(`/api/vehicles/${selectedVehicle.id}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issueData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add issue");
      }
      const updatedVehicle = await fetch(`/api/vehicles/${selectedVehicle.id}`).then(r => r.json());
      setSelectedVehicle(updatedVehicle);
      fetchVehicles();
      setShowAddIssueModal(false);
      setIssueForm({
        category: "",
        subcategory: "",
        description: "",
        actionNeeded: "",
        priority: "medium",
        location: "",
        status: "outstanding",
        notes: "",
        photos: [],
        partsRequired: false,
        partsDetails: "",
        assignedToUserIds: [],
      });
      toast.success("Issue added");
    } catch (error) {
      console.error("Add issue error:", error);
      toast.error(error.message || "Failed to add issue");
    }
  };

  const updateIssue = async (issueId, updates) => {
    // Handle both id and _id formats
    const resolvedId = typeof issueId === 'object' ? (issueId.id || issueId._id || issueId) : issueId;
    if (!resolvedId) {
      console.error("[updateIssue] No issue ID provided");
      toast.error("Issue ID not found");
      return;
    }

    // Optimistic update
    const previousVehicle = selectedVehicle;
    const previousVehicles = vehicles;

    // Update selectedVehicle optimistically
    if (selectedVehicle) {
      const updatedIssues = selectedVehicle.issues?.map(issue =>
        (issue.id || issue._id) === resolvedId ? { ...issue, ...updates } : issue
      );
      setSelectedVehicle({ ...selectedVehicle, issues: updatedIssues });
    }

    // Update vehicles list optimistically
    setVehicles(vehicles.map(v =>
      v.id === selectedVehicle?.id
        ? {
            ...v,
            issues: v.issues?.map(issue =>
              (issue.id || issue._id) === resolvedId ? { ...issue, ...updates } : issue
            ),
          }
        : v
    ));

    try {
      const res = await fetch(`/api/issues/${resolvedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("[updateIssue] API error:", errorData);
        throw new Error(errorData.error || "Failed to update issue");
      }

      // Background refresh
      fetchVehicles();
    } catch (error) {
      // Rollback on error
      console.error("[updateIssue] Error:", error);
      toast.error(error.message || "Failed to update issue");
      setSelectedVehicle(previousVehicle);
      setVehicles(previousVehicles);
    }
  };

  // Open edit issue modal with prefilled data
  const openEditIssue = (issue) => {
    setEditingIssue(issue);
    setIssueForm({
      category: issue.category?.toLowerCase() || "",
      subcategory: issue.subcategory || "",
      description: issue.description || "",
      actionNeeded: issue.actionNeeded || "",
      priority: issue.priority || "medium",
      location: issue.location || "",
      status: issue.status?.toLowerCase().replace(" ", "_") || "outstanding",
      notes: issue.notes || "",
      photos: issue.photos || [],
      partsRequired: issue.partsRequired || false,
      partsDetails: issue.partsDetails || "",
      assignedToUserIds: issue.assignedToUserIds || [],
    });
    setShowAddIssueModal(true);
  };

  // Save edited issue
  const saveEditedIssue = async (photoUrls = []) => {
    if (!editingIssue) return;
    const issueId = editingIssue.id || editingIssue._id;
    if (!issueId) {
      toast.error("Issue ID not found");
      return;
    }
    try {
      const updates = {
        ...issueForm,
        photos: [...(issueForm.photos || []), ...photoUrls],
      };
      await updateIssue(issueId, updates);
      setShowAddIssueModal(false);
      setEditingIssue(null);
      setIssueForm({
        category: "",
        subcategory: "",
        description: "",
        actionNeeded: "",
        priority: "medium",
        location: "",
        status: "outstanding",
        notes: "",
        photos: [],
        partsRequired: false,
        partsDetails: "",
        assignedToUserIds: [],
      });
    } catch (error) {
      toast.error("Failed to save issue");
    }
  };

  const deleteIssue = async (issueId) => {
    try {
      await fetch(`/api/issues/${issueId}`, { method: "DELETE" });
      const updatedVehicle = await fetch(`/api/vehicles/${selectedVehicle.id}`).then(r => r.json());
      setSelectedVehicle(updatedVehicle);
      fetchVehicles();
      toast.success("Issue removed");
    } catch (error) {
      toast.error("Failed to delete issue");
    }
  };

  const addIssueUpdate = async (issueId, content) => {
    if (!content?.trim()) {
      return toast.error("Update content cannot be empty");
    }

    try {
      await fetch(`/api/issues/${issueId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          userName: "Current User" // TODO: Replace with actual user name from auth
        }),
      });

      const updatedVehicle = await fetch(`/api/vehicles/${selectedVehicle.id}`).then(r => r.json());
      setSelectedVehicle(updatedVehicle);
      fetchVehicles();
      setIssueUpdateContent(prev => ({ ...prev, [issueId]: "" }));
      toast.success("Update added");
    } catch (error) {
      toast.error("Failed to add update");
    }
  };

  // Robust drag cleanup - ensures drag state is always reset
  const cleanupDrag = useCallback(() => {
    setDraggedCard(null);
    setDragPosition({ x: 0, y: 0 });
  }, []);

  // Global escape key, blur, and fallback handlers for drag cancellation
  useEffect(() => {
    if (!draggedCard) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        cleanupDrag();
      }
    };

    const handleWindowBlur = () => {
      cleanupDrag();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanupDrag();
      }
    };

    // Fallback: if mouse is released anywhere, cleanup
    // This catches edge cases where dragEnd doesn't fire
    const handleMouseUp = () => {
      // Small delay to let normal dragEnd fire first
      setTimeout(() => {
        if (draggedCard) {
          cleanupDrag();
        }
      }, 100);
    };

    // Cleanup if drag event fires with no buttons (drag ended unexpectedly)
    const handleDragEndFallback = (e) => {
      if (e.buttons === 0) {
        cleanupDrag();
      }
    };

    // Safety timeout - if drag lasts more than 30 seconds, something is wrong
    const safetyTimeout = setTimeout(() => {
      if (draggedCard) {
        console.warn("Drag safety timeout triggered - resetting state");
        cleanupDrag();
      }
    }, 30000);

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("drag", handleDragEndFallback);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("drag", handleDragEndFallback);
      clearTimeout(safetyTimeout);
    };
  }, [draggedCard, cleanupDrag]);

  const handleDragStart = (e, vehicle) => {
    setDraggedCard(vehicle);
    setDragPosition({ x: e.clientX, y: e.clientY });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", vehicle.id || ""); // Required for drag to work in all browsers
    // Create invisible drag image (we'll render our own preview)
    const emptyImg = new Image();
    emptyImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
  };

  const handleDrag = (e) => {
    // Only update position if we have valid coordinates
    // (0,0) is sent at the end of drag, ignore it
    if (e.clientX > 0 && e.clientY > 0) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = () => {
    // Always clean up on drag end, regardless of drop success
    cleanupDrag();
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();

    // Store reference before cleanup
    const card = draggedCard;

    // Always cleanup immediately to prevent stale state
    cleanupDrag();
    // Also cleanup priority drag state
    setDraggedPriorityIndex(null);
    setDragOverPriorityIndex(null);

    if (!card || card.status === newStatus) {
      return;
    }

    const vehicleId = card.id || card._id;
    await updateVehicleStatus(vehicleId, newStatus);
  };

  // Touch drag handlers for mobile
  const LONG_PRESS_DURATION = 350; // ms
  const TOUCH_MOVE_THRESHOLD = 10; // px - movement beyond this cancels long press

  const handleTouchStart = (e, vehicle, isPrioritySort, cardIndex) => {
    if (!isTouchDevice) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timer: setTimeout(() => {
        // Long press triggered - start drag mode
        setIsLongPressing(vehicle.id);
        setTouchDragActive(true);
        setDraggedCard(vehicle);
        setDragPosition({ x: touch.clientX, y: touch.clientY });

        if (isPrioritySort) {
          setDraggedPriorityIndex(cardIndex);
        }

        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, LONG_PRESS_DURATION),
    };
  };

  const handleTouchMove = (e, isPrioritySort) => {
    const touch = e.touches[0];

    // If not in drag mode, check if movement exceeds threshold (user is scrolling)
    if (!touchDragActive) {
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > TOUCH_MOVE_THRESHOLD) {
        // Cancel long press timer - user is scrolling
        if (touchStartRef.current.timer) {
          clearTimeout(touchStartRef.current.timer);
          touchStartRef.current.timer = null;
        }
        setIsLongPressing(null);
      }
      return;
    }

    // In drag mode - prevent scrolling and update position
    e.preventDefault();
    setDragPosition({ x: touch.clientX, y: touch.clientY });

    // Find drop target under finger
    const elementUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);

    if (isPrioritySort) {
      // Find card element for priority reordering
      const cardElement = elementUnderFinger?.closest('[data-card-index]');
      if (cardElement) {
        const targetIndex = parseInt(cardElement.dataset.cardIndex, 10);
        if (!isNaN(targetIndex) && targetIndex !== draggedPriorityIndex) {
          setDragOverPriorityIndex(targetIndex);
        }
      } else {
        setDragOverPriorityIndex(null);
      }
    } else {
      // Find column element for stage-to-stage drag
      const columnElement = elementUnderFinger?.closest('[data-column-key]');
      if (columnElement) {
        const columnKey = columnElement.dataset.columnKey;
        setTouchDropTarget(columnKey);
      } else {
        setTouchDropTarget(null);
      }
    }

    // Edge scrolling
    handleEdgeScroll(touch.clientY);
  };

  const handleTouchEnd = async (isPrioritySort, columnVehicles) => {
    // Clear long press timer
    if (touchStartRef.current.timer) {
      clearTimeout(touchStartRef.current.timer);
      touchStartRef.current.timer = null;
    }

    // Stop edge scrolling
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    // If not in drag mode, let the click handler fire
    if (!touchDragActive) {
      setIsLongPressing(null);
      return;
    }

    const card = draggedCard;

    if (isPrioritySort && draggedPriorityIndex !== null && dragOverPriorityIndex !== null) {
      // Handle priority reorder drop
      if (draggedPriorityIndex !== dragOverPriorityIndex) {
        const reordered = [...columnVehicles];
        const [moved] = reordered.splice(draggedPriorityIndex, 1);
        const adjustedIndex = draggedPriorityIndex < dragOverPriorityIndex
          ? dragOverPriorityIndex - 1
          : dragOverPriorityIndex;
        reordered.splice(adjustedIndex, 0, moved);

        // Optimistic UI update - update local state immediately
        setVehicles(prev => prev.map(v => {
          const newIndex = reordered.findIndex(r => r.id === v.id);
          if (newIndex !== -1) {
            return { ...v, prepBoardOrder: newIndex };
          }
          return v;
        }));

        // Persist to server in background (fire and forget)
        for (let i = 0; i < reordered.length; i++) {
          updateVehiclePrepOrder(reordered[i].id, i);
        }
      }
    } else if (touchDropTarget && card && touchDropTarget !== card.status) {
      // Handle stage-to-stage drop
      await updateVehicleStatus(card.id, touchDropTarget);
    }

    // Clean up all drag state
    setTouchDragActive(false);
    setTouchDropTarget(null);
    setIsLongPressing(null);
    cleanupDrag();
    setDraggedPriorityIndex(null);
    setDragOverPriorityIndex(null);
  };

  const handleTouchCancel = () => {
    if (touchStartRef.current.timer) {
      clearTimeout(touchStartRef.current.timer);
      touchStartRef.current.timer = null;
    }
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    setTouchDragActive(false);
    setTouchDropTarget(null);
    setIsLongPressing(null);
    cleanupDrag();
    setDraggedPriorityIndex(null);
    setDragOverPriorityIndex(null);
  };

  const handleEdgeScroll = (touchY) => {
    const EDGE_ZONE = 60; // px from edge to trigger scroll
    const SCROLL_SPEED = 10; // px per frame

    const viewportHeight = window.innerHeight;

    // Clear existing interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    if (touchY < EDGE_ZONE) {
      // Near top - scroll up
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, -SCROLL_SPEED);
      }, 16);
    } else if (touchY > viewportHeight - EDGE_ZONE) {
      // Near bottom - scroll down
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, SCROLL_SPEED);
      }, 16);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const toggleFilter = (filter) => {
    setActiveFilters(prev => {
      const isRemoving = prev.includes(filter);
      const newFilters = isRemoving
        ? prev.filter(f => f !== filter)
        : [...prev, filter];

      // Auto-select "all" on mobile when first filter is applied
      if (prev.length === 0 && newFilters.length > 0) {
        setMobileActiveColumn("all");
      }
      // Reset to default column when all filters are cleared
      if (newFilters.length === 0 && mobileActiveColumn === "all") {
        setMobileActiveColumn("in_stock");
      }

      return newFilters;
    });
  };

  const clearFilters = () => {
    setActiveFilters([]);
    // Reset mobile column when clearing filters if viewing "all"
    if (mobileActiveColumn === "all") {
      setMobileActiveColumn("in_stock");
    }
  };

  // Close drawer and clear filters to prevent vehicles from disappearing
  const closeDrawer = () => {
    setSelectedVehicle(null);
    setVrmFilter("");
    clearFilters();
  };

  const getFilteredVehicles = (vehicleList) => {
    if (activeFilters.length === 0) return vehicleList;

    return vehicleList.filter(vehicle => {
      return activeFilters.every(filter => {
        const tasks = vehicle.tasks || [];
        const issues = vehicle.issues || [];
        const activeIssues = issues.filter(i => {
          const status = (i.status || "").toLowerCase();
          return ["outstanding", "ordered", "in progress", "in_progress"].includes(status);
        });

        // Prep task filters
        if (filter === "awaiting_pdi") return !tasks.find(t => t.name.toLowerCase().includes("pdi") && t.status === "done");
        if (filter === "awaiting_valet") return !tasks.find(t => t.name.toLowerCase().includes("valet") && t.status === "done");
        if (filter === "awaiting_photos") return !tasks.find(t => t.name.toLowerCase().includes("photo") && t.status === "done");
        if (filter === "awaiting_mot") return !tasks.find(t => t.name.toLowerCase().includes("mot") && t.status === "done");

        // Issue filters
        if (filter === "needs_paint") return activeIssues.some(i => {
          const cat = (i.category || "").toLowerCase();
          return cat === "bodywork" || cat === "cosmetic";
        });
        if (filter === "needs_mechanical") return activeIssues.some(i => {
          const cat = (i.category || "").toLowerCase();
          return cat === "mechanical";
        });
        if (filter === "needs_electrical") return activeIssues.some(i => {
          const cat = (i.category || "").toLowerCase();
          return cat === "electrical";
        });

        // Bodywork subcategory filters
        if (filter === "has_dents") return activeIssues.some(i =>
          (i.subcategory || "").toLowerCase() === "dents"
        );
        if (filter === "has_scratches") return activeIssues.some(i =>
          (i.subcategory || "").toLowerCase() === "scratches"
        );
        if (filter === "has_panel_damage") return activeIssues.some(i =>
          (i.subcategory || "").toLowerCase() === "panel damage"
        );
        if (filter === "has_windscreen") return activeIssues.some(i =>
          (i.subcategory || "").toLowerCase() === "windscreen"
        );

        // Location filter
        if (filter === "offsite") return vehicle.locationId != null;

        // MOT filters
        if (filter === "mot_due_soon") {
          if (!vehicle.motExpiryDate) return false;
          const expiry = new Date(vehicle.motExpiryDate);
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
        }
        if (filter === "mot_expired") {
          if (!vehicle.motExpiryDate) return false;
          const expiry = new Date(vehicle.motExpiryDate);
          const now = new Date();
          return expiry < now;
        }
        if (filter === "mot_failed") {
          const motHistory = vehicle.motHistory || [];
          return motHistory.length > 0 && motHistory[0].testResult === "FAILED";
        }

        // Sale type filters
        if (filter === "trade_only") return vehicle.saleType === "TRADE";
        if (filter === "retail_only") return vehicle.saleType === "RETAIL" || !vehicle.saleType;

        // Vehicle type filters
        if (filter === "type_stock") return vehicle.type === "STOCK" || !vehicle.type;
        if (filter === "type_courtesy") return vehicle.type === "COURTESY";
        if (filter === "type_fleet") return vehicle.type === "FLEET_OTHER";

        // Advertised status filters
        if (filter === "advertised") return vehicle.isAdvertised === true;
        if (filter === "not_advertised") return vehicle.isAdvertised !== true;

        // Has active issues filter
        if (filter === "has_issues") return activeIssues.length > 0;

        // Awaiting parts filter (checks both tasks and issues)
        if (filter === "awaiting_parts") {
          // Check tasks for pending parts orders
          const hasPendingTaskParts = tasks.some(task => {
            const orders = task.partsOrders || [];
            return orders.some(o => o.status !== "RECEIVED" && o.status !== "received");
          });
          // Check issues for parts required
          const hasIssueParts = issues.some(i =>
            i.partsRequired &&
            ["outstanding", "ordered", "in_progress"].includes((i.status || "").toLowerCase())
          );
          return hasPendingTaskParts || hasIssueParts;
        }

        // Label filters (format: label_{labelId})
        if (filter.startsWith("label_")) {
          const labelId = filter.replace("label_", "");
          const vehicleLabels = vehicle.labels || [];
          // Compare as strings to handle ObjectId and various label formats
          return vehicleLabels.some(l => String(l.id || l._id || l) === labelId);
        }

        return true;
      });
    });
  };

  const getVehiclesByStatus = (status) => {
    // Only show vehicles that are on the prep board (showOnPrepBoard !== false)
    // This allows vehicles to be "removed" from prep without deleting them from stock book
    // Note: "in_prep" vehicles are now included in "in_stock" column (columns merged)
    let statusVehicles = vehicles.filter(v => {
      if (v.showOnPrepBoard === false) return false;
      if (status === "in_stock") {
        return v.status === "in_stock" || v.status === "in_prep";
      }
      return v.status === status;
    });

    // Apply VRM filter if set
    if (vrmFilter) {
      const query = vrmFilter.toUpperCase().replace(/\s/g, "");
      statusVehicles = statusVehicles.filter((v) => {
        const vrm = (v.regCurrent || "").toUpperCase().replace(/\s/g, "");
        const make = (v.make || "").toUpperCase();
        const model = (v.model || "").toUpperCase();
        return vrm.includes(query) || make.includes(query) || model.includes(query);
      });
    }

    const filtered = getFilteredVehicles(statusVehicles);

    // Apply sorting based on columnSortOptions
    const sortOption = columnSortOptions[status] || "oldest_first";

    return [...filtered].sort((a, b) => {
      // Pinned vehicles always come first
      if (a.isPinnedOnPrepBoard && !b.isPinnedOnPrepBoard) return -1;
      if (!a.isPinnedOnPrepBoard && b.isPinnedOnPrepBoard) return 1;

      // For sold vehicles (live/reserved/delivered), sort by soldAt; otherwise use createdAt
      const isSoldColumn = SOLD_STATUSES.includes(status);
      const dateA = isSoldColumn ? (a.soldAt || a.createdAt) : a.createdAt;
      const dateB = isSoldColumn ? (b.soldAt || b.createdAt) : b.createdAt;
      const daysA = dateA ? Math.floor((new Date() - new Date(dateA)) / (1000 * 60 * 60 * 24)) : 0;
      const daysB = dateB ? Math.floor((new Date() - new Date(dateB)) / (1000 * 60 * 60 * 24)) : 0;

      switch (sortOption) {
        case "oldest_first":
          return daysB - daysA; // More days = older = first
        case "newest_first":
          return daysA - daysB; // Fewer days = newer = first
        case "alphabetical":
          const nameA = `${a.make || ""} ${a.model || ""}`.toLowerCase();
          const nameB = `${b.make || ""} ${b.model || ""}`.toLowerCase();
          return nameA.localeCompare(nameB);
        case "priority":
          // Sort by prepBoardOrder (lower = higher priority), fallback to createdAt
          const orderA = a.prepBoardOrder ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const orderB = b.prepBoardOrder ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return orderA - orderB;
        default:
          return daysB - daysA;
      }
    });
  };

  const getFilterCount = (filter) => {
    const allFiltered = getFilteredVehicles(vehicles.filter(v => {
      const tasks = v.tasks || [];
      const issues = v.issues || [];
      const activeIssues = issues.filter(i => {
        const status = (i.status || "").toLowerCase();
        return ["outstanding", "ordered", "in progress", "in_progress"].includes(status);
      });

      if (filter === "awaiting_pdi") return !tasks.find(t => t.name.toLowerCase().includes("pdi") && t.status === "done");
      if (filter === "awaiting_valet") return !tasks.find(t => t.name.toLowerCase().includes("valet") && t.status === "done");
      if (filter === "awaiting_photos") return !tasks.find(t => t.name.toLowerCase().includes("photo") && t.status === "done");
      if (filter === "awaiting_mot") return !tasks.find(t => t.name.toLowerCase().includes("mot") && t.status === "done");
      if (filter === "awaiting_parts") {
        const hasPendingTaskParts = tasks.some(task => {
          const orders = task.partsOrders || [];
          return orders.some(o => o.status !== "RECEIVED" && o.status !== "received");
        });
        const hasIssueParts = issues.some(i =>
          i.partsRequired &&
          ["outstanding", "ordered", "in_progress"].includes((i.status || "").toLowerCase())
        );
        return hasPendingTaskParts || hasIssueParts;
      }
      if (filter === "needs_paint") return activeIssues.some(i => {
        const cat = (i.category || "").toLowerCase();
        return cat === "bodywork" || cat === "cosmetic";
      });
      if (filter === "needs_mechanical") return activeIssues.some(i => {
        const cat = (i.category || "").toLowerCase();
        return cat === "mechanical";
      });
      if (filter === "needs_electrical") return activeIssues.some(i => {
        const cat = (i.category || "").toLowerCase();
        return cat === "electrical";
      });
      // Bodywork subcategory filters
      if (filter === "has_dents") return activeIssues.some(i =>
        (i.subcategory || "").toLowerCase() === "dents"
      );
      if (filter === "has_scratches") return activeIssues.some(i =>
        (i.subcategory || "").toLowerCase() === "scratches"
      );
      if (filter === "has_panel_damage") return activeIssues.some(i =>
        (i.subcategory || "").toLowerCase() === "panel damage"
      );
      if (filter === "has_windscreen") return activeIssues.some(i =>
        (i.subcategory || "").toLowerCase() === "windscreen"
      );
      if (filter === "offsite") return v.locationId != null;
      if (filter === "mot_due_soon") {
        if (!v.motExpiryDate) return false;
        const expiry = new Date(v.motExpiryDate);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
      }
      if (filter === "mot_expired") {
        if (!v.motExpiryDate) return false;
        const expiry = new Date(v.motExpiryDate);
        return expiry < new Date();
      }
      if (filter === "mot_failed") {
        const motHistory = v.motHistory || [];
        return motHistory.length > 0 && motHistory[0].testResult === "FAILED";
      }
      if (filter === "trade_only") return v.saleType === "TRADE";
      if (filter === "retail_only") return v.saleType === "RETAIL" || !v.saleType;
      if (filter === "type_stock") return v.type === "STOCK" || !v.type;
      if (filter === "type_courtesy") return v.type === "COURTESY";
      if (filter === "type_fleet") return v.type === "FLEET_OTHER";
      // Label filters
      if (filter.startsWith("label_")) {
        const labelId = filter.replace("label_", "");
        const vehicleLabels = v.labels || [];
        // Compare as strings to handle ObjectId and various label formats
        return vehicleLabels.some(l => String(l.id || l._id || l) === labelId);
      }
      return false;
    }));
    return allFiltered.length;
  };

  // Helper to get count for a label filter
  const getLabelFilterCount = (labelId) => {
    // Convert labelId to string for comparison (handles ObjectId instances)
    const targetId = String(labelId);
    return vehicles.filter(v => {
      const vehicleLabels = v.labels || [];
      return vehicleLabels.some(l => {
        // Handle multiple label formats: object with id/id, or just string ID
        const vehicleLabelId = String(l.id || l._id || l);
        return vehicleLabelId === targetId;
      });
    }).length;
  };

  // Format date for VRM search results
  const formatStockDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
  };

  const handleVrmSearchChange = (value) => {
    const normalized = value.toUpperCase();
    setVrmSearch(normalized);
    setVrmFilter(normalized.trim()); // Live filtering as user types
    setVrmSelectedIndex(-1); // Reset selection on input change

    // Show dropdown when 2+ characters
    if (normalized.length >= 2) {
      setShowVrmDropdown(true);
    } else {
      setShowVrmDropdown(false);
    }
  };

  // Apply VRM filter to board (pressing Enter)
  const applyVrmFilter = () => {
    const filterValue = vrmSearch.trim();
    setVrmFilter(filterValue);
    setShowVrmDropdown(false);
    if (filterValue) {
      toast.success(`Filtering by: ${filterValue}`);
    }
  };

  // Clear VRM filter
  const clearVrmFilter = () => {
    setVrmSearch("");
    setVrmFilter("");
    setShowVrmDropdown(false);
  };

  // Keyboard navigation for VRM search
  const handleVrmKeyDown = (e) => {
    // Only handle keyboard when dropdown is open with results
    if (!showVrmDropdown || vrmSearchResults.length === 0) {
      if (e.key === "Escape") {
        setShowVrmDropdown(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setVrmSelectedIndex((prev) =>
          prev < vrmSearchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setVrmSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        // Select highlighted vehicle, or first result if none highlighted
        const selectedVehicle = vrmSelectedIndex >= 0
          ? vrmSearchResults[vrmSelectedIndex]
          : vrmSearchResults[0];
        if (selectedVehicle) {
          handleVrmSelect(selectedVehicle);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowVrmDropdown(false);
        vrmSearchInputRef.current?.blur();
        break;
    }
  };

  const handleVrmSelect = async (vehicle) => {
    // Clear search and close dropdown
    setVrmSearch("");
    setShowVrmDropdown(false);

    // Find which column this vehicle is in and scroll to it
    const columnIndex = COLUMNS.findIndex(col => col.key === vehicle.status);
    if (columnIndex >= 0) {
      // Scroll the column into view
      const columnElements = document.querySelectorAll('[data-column-key]');
      if (columnElements[columnIndex]) {
        columnElements[columnIndex].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    // Check if this vehicle is already in the loaded vehicles list (has full data)
    const fullVehicle = vehicles.find(v => v.id === vehicle.id);
    if (fullVehicle) {
      openVehicleDrawer(fullVehicle);
    } else {
      // Vehicle not on prep board (e.g., archived) - fetch full data
      try {
        const res = await fetch(`/api/vehicles/${vehicle.id}`);
        if (res.ok) {
          const data = await res.json();
          openVehicleDrawer(data);
        } else {
          // Fallback to limited data
          openVehicleDrawer(vehicle);
        }
      } catch (error) {
        console.error("Failed to fetch vehicle details:", error);
        openVehicleDrawer(vehicle);
      }
    }
  };

  const getStatusLabel = (statusKey) => {
    const col = COLUMNS.find(c => c.key === statusKey);
    return col ? col.label : statusKey;
  };

  const handlePrintVehicle = () => {
    if (!selectedVehicle) return;

    const vehicle = selectedVehicle;
    const tasks = vehicle.tasks || [];
    const issues = vehicle.issues || [];
    const documents = vehicle.documents || [];
    const completedTasks = tasks.filter(t => t.status === "done").length;
    const daysInStock = vehicle.createdAt
      ? Math.floor((new Date() - new Date(vehicle.createdAt)) / (1000 * 60 * 60 * 24))
      : 0;

    // Get status label from COLUMNS
    const statusColumn = COLUMNS.find(col => col.key === vehicle.status);
    const statusLabel = statusColumn ? statusColumn.label : vehicle.status;

    // Generate HTML for print
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${vehicle.year || ""} ${vehicle.make} ${vehicle.model} - ${vehicle.regCurrent}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
    .title { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
    .reg { font-size: 18px; font-family: monospace; color: #64748b; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 16px; font-weight: 600; color: #475569; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .field { margin-bottom: 12px; }
    .field-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
    .field-value { font-size: 14px; color: #1e293b; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .badge-status { background: #e0e7ff; color: #4338ca; }
    .badge-days { background: ${daysInStock > 30 ? '#fef2f2' : '#f1f5f9'}; color: ${daysInStock > 30 ? '#dc2626' : '#475569'}; }
    .task-list { list-style: none; }
    .task-item { padding: 8px 0; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 10px; }
    .task-status { width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    .task-done { background: #dcfce7; color: #16a34a; }
    .task-pending { background: #fef3c7; color: #d97706; }
    .task-progress { background: #dbeafe; color: #2563eb; }
    .issue-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .issue-header { display: flex; gap: 8px; margin-bottom: 8px; }
    .issue-badge { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .issue-desc { font-size: 14px; color: #1e293b; }
    .doc-item { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${vehicle.year || ""} ${vehicle.make} ${vehicle.model}</div>
    <div class="reg">${vehicle.regCurrent}</div>
  </div>

  <div class="section">
    <div class="section-title">Overview</div>
    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
      <span class="badge badge-status">${statusLabel}</span>
      <span class="badge badge-days">Days in Stock: ${daysInStock}</span>
      ${vehicle.locationId ? `<span class="badge" style="background:#eef2ff;color:#4f46e5;">📍 ${vehicle.locationId.name || 'Offsite'}</span>` : '<span class="badge" style="background:#f0fdf4;color:#16a34a;">📍 On Site</span>'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Vehicle Details</div>
    <div class="grid">
      <div class="field">
        <div class="field-label">Registration</div>
        <div class="field-value">${vehicle.regCurrent || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">VIN</div>
        <div class="field-value">${vehicle.vin || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Make</div>
        <div class="field-value">${vehicle.make || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Model</div>
        <div class="field-value">${vehicle.model || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Year</div>
        <div class="field-value">${vehicle.year || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Mileage</div>
        <div class="field-value">${vehicle.mileageCurrent ? vehicle.mileageCurrent.toLocaleString() + ' miles' : '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Colour</div>
        <div class="field-value">${vehicle.colour || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Fuel Type</div>
        <div class="field-value">${vehicle.fuelType || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">MOT Expiry</div>
        <div class="field-value">${vehicle.motExpiryDate ? new Date(vehicle.motExpiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Prep Checklist (${completedTasks}/${tasks.length} complete)</div>
    ${tasks.length > 0 ? `
    <ul class="task-list">
      ${tasks.map(task => `
        <li class="task-item">
          <span class="task-status ${task.status === 'done' ? 'task-done' : task.status === 'in_progress' ? 'task-progress' : 'task-pending'}">
            ${task.status === 'done' ? '✓' : task.status === 'in_progress' ? '→' : '○'}
          </span>
          <span style="${task.status === 'done' ? 'text-decoration: line-through; color: #94a3b8;' : ''}">${task.name}</span>
          ${task.completedAt ? `<span style="font-size: 11px; color: #94a3b8; margin-left: auto;">${new Date(task.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>` : ''}
        </li>
      `).join('')}
    </ul>
    ` : '<p style="color: #94a3b8; font-size: 14px;">No tasks</p>'}
  </div>

  <div class="section">
    <div class="section-title">Issues (${issues.length})</div>
    ${issues.length > 0 ? issues.map(issue => `
      <div class="issue-card">
        <div class="issue-header">
          <span class="issue-badge">${issue.category}</span>
          ${issue.subcategory ? `<span class="issue-badge">${issue.subcategory}</span>` : ''}
          <span class="issue-badge" style="margin-left: auto;">${issue.status || 'Outstanding'}</span>
        </div>
        <div class="issue-desc">${issue.description}</div>
        ${issue.actionNeeded ? `<div style="font-size: 12px; color: #64748b; margin-top: 6px;">Action: ${issue.actionNeeded}</div>` : ''}
      </div>
    `).join('') : '<p style="color: #94a3b8; font-size: 14px;">No issues recorded</p>'}
  </div>

  <div class="section">
    <div class="section-title">Documents (${documents.length})</div>
    ${documents.length > 0 ? documents.map(doc => `
      <div class="doc-item">
        <span style="font-weight: 500;">${doc.name}</span>
        <span style="font-size: 12px; color: #94a3b8; margin-left: 8px;">(${doc.type.replace(/_/g, ' ')})</span>
      </div>
    `).join('') : '<p style="color: #94a3b8; font-size: 14px;">No documents uploaded</p>'}
    ${vehicle.v5Url ? '<div class="doc-item"><span style="font-weight: 500;">V5 Document</span> <span style="font-size: 12px; color: #16a34a;">✓ Uploaded</span></div>' : ''}
  </div>

  ${vehicle.notes ? `
  <div class="section">
    <div class="section-title">Notes</div>
    <p style="font-size: 14px; white-space: pre-wrap;">${vehicle.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    Printed from DealerHQ on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
  </div>
</body>
</html>
    `;

    // Open in new tab
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Share utility with fallback chain: Web Share API → Clipboard → Manual modal
  // SSR-safe: only runs client-side, with guards for browser API availability
  const shareWithFallback = async (url, title, text) => {
    // Guard against SSR - this should only run client-side
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }

    // 1. Try Web Share API (native sharing on mobile/supported browsers)
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch (error) {
        // User cancelled or share failed - continue to fallback
        if (error.name !== "AbortError") {
          console.log("Web Share API failed, trying clipboard fallback");
        }
      }
    }

    // 2. Try Clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
        return true;
      } catch (error) {
        console.log("Clipboard API failed, showing manual modal");
      }
    }

    // 3. Fallback to manual modal
    setManualShareUrl(url);
    setShowManualShareModal(true);
    return false;
  };

  // Job sheet share handlers
  const handleGenerateJobSheet = async () => {
    if (!selectedVehicle) return;
    setIsGeneratingJobSheet(true);
    try {
      const res = await fetch(`/api/vehicles/${selectedVehicle.id}/job-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 60 }),
      });
      if (!res.ok) throw new Error("Failed to generate share link");
      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setJobSheetLink({
        url: fullUrl,
        expiresAt: data.expiresAt,
      });
      setShowJobSheetModal(true);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsGeneratingJobSheet(false);
    }
  };

  const copyJobSheetLink = async () => {
    if (jobSheetLink?.url) {
      await shareWithFallback(
        jobSheetLink.url,
        `Job Sheet - ${selectedVehicle?.regCurrent || "Vehicle"}`,
        `Job sheet for ${selectedVehicle?.regCurrent}: ${jobSheetLink.url}`
      );
    }
  };

  const shareViaWhatsApp = () => {
    if (typeof window === "undefined") return;
    if (jobSheetLink?.url) {
      const text = `Job sheet for ${selectedVehicle?.regCurrent || "Vehicle"}: ${jobSheetLink.url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  // Prep summary share handlers
  const handleGeneratePrepSummary = async () => {
    if (!selectedVehicle) return;
    setIsGeneratingPrepSummary(true);
    try {
      const res = await fetch(`/api/vehicles/${selectedVehicle.id}/prep-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 60 }),
      });
      if (!res.ok) throw new Error("Failed to generate share link");
      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setPrepSummaryLink({
        url: fullUrl,
        expiresAt: data.expiresAt,
      });
      setShowPrepSummaryModal(true);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsGeneratingPrepSummary(false);
    }
  };

  const copyPrepSummaryLink = async () => {
    if (prepSummaryLink?.url) {
      await shareWithFallback(
        prepSummaryLink.url,
        `Prep Summary - ${selectedVehicle?.regCurrent || "Vehicle"}`,
        `Prep summary for ${selectedVehicle?.regCurrent}: ${prepSummaryLink.url}`
      );
    }
  };

  const sharePrepSummaryViaWhatsApp = () => {
    if (typeof window === "undefined") return;
    if (prepSummaryLink?.url) {
      const text = `Prep summary for ${selectedVehicle?.regCurrent || "Vehicle"}: ${prepSummaryLink.url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const getMOTStatus = (vehicle) => {
    const { motExpiryDate, motHistory } = vehicle || {};

    // Check if last MOT test failed (highest priority)
    if (motHistory?.length > 0 && motHistory[0].testResult === "FAILED") {
      return {
        type: "failed",
        label: "MOT Failed",
        days: null,
        class: "bg-red-50 text-red-700 border border-red-200"
      };
    }

    if (!motExpiryDate) {
      return { type: "unknown", label: "Unknown", days: null, class: "bg-slate-100 text-slate-500 border border-slate-200" };
    }
    const expiry = new Date(motExpiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      const daysOverdue = Math.abs(daysUntilExpiry);
      return { type: "expired", label: `Expired ${daysOverdue}d`, days: daysOverdue, class: "bg-red-50 text-red-700 border border-red-200" };
    }
    if (daysUntilExpiry <= 30) {
      return { type: "due_soon", label: `${daysUntilExpiry}d`, days: daysUntilExpiry, class: "bg-amber-50 text-amber-700 border border-amber-200" };
    }
    return { type: "valid", label: `${daysUntilExpiry}d`, days: daysUntilExpiry, class: null };
  };

  const getActiveIssuesByCategory = (issues = []) => {
    const activeIssues = issues.filter(i => {
      const status = (i.status || "").toLowerCase();
      return ["outstanding", "ordered", "in_progress", "in progress"].includes(status);
    });
    const categoryCounts = {};
    activeIssues.forEach(issue => {
      categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
    });
    return categoryCounts;
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
      <Head><title>Vehicle Prep | DealerHQ</title></Head>

      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold">Vehicle Prep</h1>
          <p className="text-base-content/60 mt-1">Manage vehicle prep and sales pipeline &bull; {isTouchDevice ? "Long-press and drag to move, or tap for details" : "Drag cards to move between stages"}</p>
          <div className="mt-1"><PageHint id="sales-prep">{isTouchDevice ? "Tap a card to view details. Long-press and drag to move between stages, or use the Move button." : "Drag vehicles between columns to track their progress. Click a card to view details and manage tasks."}</PageHint></div>
        </div>
        <Link href="/stock-book" className="btn btn-outline btn-sm text-slate-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add via Stock Book
        </Link>
      </div>

      {/* Consolidated Filters */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 mb-2 -mx-6 px-6 py-2">
        <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide pb-1 -mb-1">
            {/* VRM Search */}
            <div className="relative shrink-0">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={vrmSearchInputRef}
                  type="text"
                  placeholder="Search VRM, make, model..."
                  className="input input-sm input-bordered pl-9 pr-8 w-40 sm:w-56 font-mono uppercase text-base"
                  value={vrmSearch}
                  onChange={(e) => handleVrmSearchChange(e.target.value)}
                  onFocus={() => {
                    if (vrmSearch.length >= 2) {
                      setShowVrmDropdown(true);
                    }
                  }}
                  onKeyDown={handleVrmKeyDown}
                />
                {vrmSearch && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={clearVrmFilter}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="divider divider-horizontal mx-1 shrink-0 hidden sm:flex"></div>

            {/* All Vehicles Button */}
            <button
              className={`btn btn-sm shrink-0 ${activeFilters.length === 0 ? "btn-primary" : "btn-outline"}`}
              onClick={clearFilters}
            >
              <span className="hidden sm:inline">All Vehicles</span>
              <span className="sm:hidden">All</span>
              <span className="text-xs opacity-70">({vehicles.length})</span>
            </button>

            <div className="divider divider-horizontal mx-1 shrink-0 hidden sm:flex"></div>

            {/* Consolidated Filters - Strictly Separated Desktop/Mobile */}
            <div className="shrink-0">
              {/* Trigger Button */}
              <button
                ref={filterButtonRef}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg shrink-0 whitespace-nowrap text-sm font-medium transition-all ${
                  activeFilters.length > 0
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
                onClick={() => showFiltersDropdown ? setShowFiltersDropdown(false) : openFiltersDropdown()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden sm:inline">Filters</span>
                {activeFilters.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeFilters.length > 0 ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>{activeFilters.length}</span>
                )}
              </button>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* DESKTOP: Fixed Popover via Portal (lg: and up) */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              {showFiltersDropdown && (
                <Portal>
                  <div className="hidden lg:block fixed inset-0 z-[9998]">
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0"
                      onClick={() => setShowFiltersDropdown(false)}
                    />

                    {/* Desktop Filter Panel - Fixed position, viewport-clamped */}
                    <div
                      className="fixed w-[360px] max-h-[70vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                      style={{ top: filterPopoverPos.top, right: filterPopoverPos.right }}
                    >
                      {/* Sticky Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
                        <h3 className="font-semibold text-slate-900">Filters</h3>
                        <button
                          onClick={() => setShowFiltersDropdown(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Scrollable Content */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-5">
                        {/* Prep Tasks Section */}
                        <div>
                          <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Prep Tasks</h5>
                          <div className="space-y-1.5">
                            {[
                              { key: "awaiting_pdi", label: "Awaiting PDI" },
                              { key: "awaiting_valet", label: "Awaiting Valet" },
                              { key: "awaiting_photos", label: "Awaiting Photos" },
                              { key: "awaiting_mot", label: "Awaiting MOT" },
                              { key: "awaiting_parts", label: "Awaiting Parts" },
                            ].map(filter => {
                              const isActive = activeFilters.includes(filter.key);
                              const count = getFilterCount(filter.key);
                              return (
                                <button
                                  key={filter.key}
                                  onClick={() => toggleFilter(filter.key)}
                                  className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                      : "text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{filter.label}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                                  }`}>{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Issues Section */}
                        <div>
                          <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Issues</h5>
                          <div className="space-y-1.5">
                            {[
                              { key: "needs_paint", label: "Needs Paint" },
                              { key: "needs_mechanical", label: "Needs Mechanical" },
                              { key: "needs_electrical", label: "Needs Electrical" },
                              { key: "has_dents", label: "Has Dents" },
                              { key: "has_scratches", label: "Has Scratches" },
                              { key: "has_panel_damage", label: "Has Panel Damage" },
                              { key: "has_windscreen", label: "Has Windscreen Issue" },
                            ].map(filter => {
                              const isActive = activeFilters.includes(filter.key);
                              const count = getFilterCount(filter.key);
                              return (
                                <button
                                  key={filter.key}
                                  onClick={() => toggleFilter(filter.key)}
                                  className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                      : "text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{filter.label}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                                  }`}>{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Location Section */}
                        <div>
                          <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Location</h5>
                          <div className="space-y-1.5">
                            {(() => {
                              const isActive = activeFilters.includes("offsite");
                              const count = getFilterCount("offsite");
                              return (
                                <button
                                  onClick={() => toggleFilter("offsite")}
                                  className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                      : "text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>Offsite Only</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                                  }`}>{count}</span>
                                </button>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Vehicle Type Section */}
                        <div>
                          <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Vehicle Type</h5>
                          <div className="space-y-1.5">
                            {[
                              { key: "type_stock", label: "Stock Vehicles" },
                              { key: "type_courtesy", label: "Courtesy Vehicles" },
                              { key: "type_fleet", label: "Fleet Vehicles" },
                            ].map(filter => {
                              const isActive = activeFilters.includes(filter.key);
                              const count = getFilterCount(filter.key);
                              return (
                                <button
                                  key={filter.key}
                                  onClick={() => toggleFilter(filter.key)}
                                  className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                      : "text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{filter.label}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                                  }`}>{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Sale Type Section */}
                        <div>
                          <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Sale Type</h5>
                          <div className="space-y-1.5">
                            {[
                              { key: "trade_only", label: "Trade Only" },
                              { key: "retail_only", label: "Retail Only" },
                            ].map(filter => {
                              const isActive = activeFilters.includes(filter.key);
                              const count = getFilterCount(filter.key);
                              return (
                                <button
                                  key={filter.key}
                                  onClick={() => toggleFilter(filter.key)}
                                  className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                      : "text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{filter.label}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                                  }`}>{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* MOT Status Section */}
                        <div>
                          <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">MOT Status</h5>
                          <div className="space-y-1.5">
                            {[
                              { key: "mot_expired", label: "MOT Expired" },
                              { key: "mot_due_soon", label: "MOT Due Soon" },
                              { key: "mot_failed", label: "MOT Failed" },
                            ].map(filter => {
                              const isActive = activeFilters.includes(filter.key);
                              const count = getFilterCount(filter.key);
                              return (
                                <button
                                  key={filter.key}
                                  onClick={() => toggleFilter(filter.key)}
                                  className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                      : "text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{filter.label}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                                  }`}>{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Labels Section */}
                        {availableLabels.length > 0 && (
                          <div>
                            <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Labels</h5>
                            <div className="space-y-1.5">
                              {availableLabels.map(label => {
                                const filterKey = `label_${label.id || label._id}`;
                                const isActive = activeFilters.includes(filterKey);
                                const count = getLabelFilterCount(label.id || label._id);
                                return (
                                  <button
                                    key={label.id || label._id}
                                    onClick={() => toggleFilter(filterKey)}
                                    className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                      isActive
                                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                        : "text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: label.colour || "#6366f1" }}
                                      />
                                      {label.name}
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                                    }`}>{count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sticky Footer */}
                      <div className="border-t border-slate-200 p-3 bg-white flex gap-2 shrink-0">
                        <button
                          onClick={clearFilters}
                          className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setShowFiltersDropdown(false)}
                          className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </Portal>
              )}

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* MOBILE/TABLET: Bottom Sheet (< lg screens) */}
              {/* Uses its own internal Portal for correct positioning */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <BottomSheet
                    isOpen={showFiltersDropdown}
                    onClose={() => setShowFiltersDropdown(false)}
                    hideAbove="lg"
                    title="Filters"
                    footer={
                      <div className="flex gap-3">
                        <button
                          onClick={clearFilters}
                          className="flex-1 px-4 py-3 text-base font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setShowFiltersDropdown(false)}
                          className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-base font-bold hover:bg-slate-800 transition-colors"
                        >
                          Apply {activeFilters.length > 0 && `(${activeFilters.length})`}
                        </button>
                      </div>
                    }
                  >
                    {/* Prep Tasks */}
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Prep Tasks</h5>
                    {[
                      { key: "awaiting_pdi", label: "Awaiting PDI" },
                      { key: "awaiting_valet", label: "Awaiting Valet" },
                      { key: "awaiting_photos", label: "Awaiting Photos" },
                      { key: "awaiting_mot", label: "Awaiting MOT" },
                      { key: "awaiting_parts", label: "Awaiting Parts" },
                    ].map(filter => {
                      const isActive = activeFilters.includes(filter.key);
                      const count = getFilterCount(filter.key);
                      return (
                        <button
                          key={filter.key}
                          onClick={() => toggleFilter(filter.key)}
                          className={`w-full flex justify-between items-center px-4 py-3.5 mb-2 rounded-xl text-base font-medium transition-all ${
                            isActive
                              ? "bg-blue-50 text-blue-700 border-2 border-blue-400 shadow-sm"
                              : "text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100"
                          }`}
                        >
                          <span>{filter.label}</span>
                          <span className={`text-sm px-2.5 py-1 rounded-lg ${
                            isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                          }`}>{count}</span>
                        </button>
                      );
                    })}

                    {/* Issues */}
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6">Issues</h5>
                    {[
                      { key: "needs_paint", label: "Needs Paint" },
                      { key: "needs_mechanical", label: "Needs Mechanical" },
                      { key: "needs_electrical", label: "Needs Electrical" },
                      { key: "has_dents", label: "Has Dents" },
                      { key: "has_scratches", label: "Has Scratches" },
                      { key: "has_panel_damage", label: "Has Panel Damage" },
                      { key: "has_windscreen", label: "Has Windscreen Issue" },
                    ].map(filter => {
                      const isActive = activeFilters.includes(filter.key);
                      const count = getFilterCount(filter.key);
                      return (
                        <button
                          key={filter.key}
                          onClick={() => toggleFilter(filter.key)}
                          className={`w-full flex justify-between items-center px-4 py-3.5 mb-2 rounded-xl text-base font-medium transition-all ${
                            isActive
                              ? "bg-blue-50 text-blue-700 border-2 border-blue-400 shadow-sm"
                              : "text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100"
                          }`}
                        >
                          <span>{filter.label}</span>
                          <span className={`text-sm px-2.5 py-1 rounded-lg ${
                            isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                          }`}>{count}</span>
                        </button>
                      );
                    })}

                    {/* Location */}
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6">Location</h5>
                    {(() => {
                      const isActive = activeFilters.includes("offsite");
                      const count = getFilterCount("offsite");
                      return (
                        <button
                          onClick={() => toggleFilter("offsite")}
                          className={`w-full flex justify-between items-center px-4 py-3.5 mb-2 rounded-xl text-base font-medium transition-all ${
                            isActive
                              ? "bg-blue-50 text-blue-700 border-2 border-blue-400 shadow-sm"
                              : "text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100"
                          }`}
                        >
                          <span>Offsite Only</span>
                          <span className={`text-sm px-2.5 py-1 rounded-lg ${
                            isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                          }`}>{count}</span>
                        </button>
                      );
                    })()}

                    {/* Vehicle Type */}
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6">Vehicle Type</h5>
                    {[
                      { key: "type_stock", label: "Stock Vehicles" },
                      { key: "type_courtesy", label: "Courtesy Vehicles" },
                      { key: "type_fleet", label: "Fleet Vehicles" },
                    ].map(filter => {
                      const isActive = activeFilters.includes(filter.key);
                      const count = getFilterCount(filter.key);
                      return (
                        <button
                          key={filter.key}
                          onClick={() => toggleFilter(filter.key)}
                          className={`w-full flex justify-between items-center px-4 py-3.5 mb-2 rounded-xl text-base font-medium transition-all ${
                            isActive
                              ? "bg-blue-50 text-blue-700 border-2 border-blue-400 shadow-sm"
                              : "text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100"
                          }`}
                        >
                          <span>{filter.label}</span>
                          <span className={`text-sm px-2.5 py-1 rounded-lg ${
                            isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                          }`}>{count}</span>
                        </button>
                      );
                    })}

                    {/* Sale Type */}
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6">Sale Type</h5>
                    {[
                      { key: "trade_only", label: "Trade Only" },
                      { key: "retail_only", label: "Retail Only" },
                    ].map(filter => {
                      const isActive = activeFilters.includes(filter.key);
                      const count = getFilterCount(filter.key);
                      return (
                        <button
                          key={filter.key}
                          onClick={() => toggleFilter(filter.key)}
                          className={`w-full flex justify-between items-center px-4 py-3.5 mb-2 rounded-xl text-base font-medium transition-all ${
                            isActive
                              ? "bg-blue-50 text-blue-700 border-2 border-blue-400 shadow-sm"
                              : "text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100"
                          }`}
                        >
                          <span>{filter.label}</span>
                          <span className={`text-sm px-2.5 py-1 rounded-lg ${
                            isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                          }`}>{count}</span>
                        </button>
                      );
                    })}

                    {/* MOT Status */}
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6">MOT Status</h5>
                    {[
                      { key: "mot_expired", label: "MOT Expired" },
                      { key: "mot_due_soon", label: "MOT Due Soon" },
                      { key: "mot_failed", label: "MOT Failed" },
                    ].map(filter => {
                      const isActive = activeFilters.includes(filter.key);
                      const count = getFilterCount(filter.key);
                      return (
                        <button
                          key={filter.key}
                          onClick={() => toggleFilter(filter.key)}
                          className={`w-full flex justify-between items-center px-4 py-3.5 mb-2 rounded-xl text-base font-medium transition-all ${
                            isActive
                              ? "bg-blue-50 text-blue-700 border-2 border-blue-400 shadow-sm"
                              : "text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100"
                          }`}
                        >
                          <span>{filter.label}</span>
                          <span className={`text-sm px-2.5 py-1 rounded-lg ${
                            isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                          }`}>{count}</span>
                        </button>
                      );
                    })}

                    {/* Labels */}
                    {availableLabels.length > 0 && (
                      <>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6">Labels</h5>
                        {availableLabels.map(label => {
                          const filterKey = `label_${label.id || label._id}`;
                          const isActive = activeFilters.includes(filterKey);
                          const count = getLabelFilterCount(label.id || label._id);
                          return (
                            <button
                              key={label.id || label._id}
                              onClick={() => toggleFilter(filterKey)}
                              className={`w-full flex justify-between items-center px-4 py-3.5 mb-2 rounded-xl text-base font-medium transition-all ${
                                isActive
                                  ? "bg-blue-50 text-blue-700 border-2 border-blue-400 shadow-sm"
                                  : "text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: label.colour || "#6366f1" }}
                                />
                                {label.name}
                              </span>
                              <span className={`text-sm px-2.5 py-1 rounded-lg ${
                                isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                              }`}>{count}</span>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </BottomSheet>
            </div>
          </div>
      </div>

      {/* KPI Bar - Quick Stats */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 items-center py-1.5 px-2 bg-slate-50/50 border-b border-slate-100 text-xs text-slate-500 -mx-6 px-6 mb-2">
        {(() => {
          const inStockVehicles = vehicles.filter(v =>
            v.showOnPrepBoard !== false &&
            (v.status === "in_stock" || v.status === "in_prep")
          );
          const advertised = inStockVehicles.filter(v => v.isAdvertised).length;
          const notAdvertised = inStockVehicles.filter(v => !v.isAdvertised).length;
          const offsite = vehicles.filter(v => v.showOnPrepBoard !== false && v.locationId).length;
          const withIssues = vehicles.filter(v =>
            v.showOnPrepBoard !== false &&
            (v.issues || []).some(i => ["outstanding", "ordered", "in_progress"].includes((i.status || "").toLowerCase()))
          ).length;

          return (
            <>
              <button
                onClick={() => {
                  if (activeFilters.includes("advertised")) {
                    setActiveFilters(activeFilters.filter(f => f !== "advertised"));
                  } else {
                    setActiveFilters([...activeFilters.filter(f => f !== "not_advertised"), "advertised"]);
                  }
                }}
                className={`flex items-center gap-1.5 hover:text-slate-700 ${activeFilters.includes("advertised") ? "text-green-600 font-medium" : ""}`}
              >
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Advertised: <strong>{advertised}</strong>
              </button>
              <button
                onClick={() => {
                  if (activeFilters.includes("not_advertised")) {
                    setActiveFilters(activeFilters.filter(f => f !== "not_advertised"));
                  } else {
                    setActiveFilters([...activeFilters.filter(f => f !== "advertised"), "not_advertised"]);
                  }
                }}
                className={`flex items-center gap-1.5 hover:text-slate-700 ${activeFilters.includes("not_advertised") ? "text-orange-600 font-medium" : ""}`}
              >
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                Not Advertised: <strong>{notAdvertised}</strong>
              </button>
              <button
                onClick={() => {
                  if (activeFilters.includes("offsite")) {
                    setActiveFilters(activeFilters.filter(f => f !== "offsite"));
                  } else {
                    setActiveFilters([...activeFilters, "offsite"]);
                  }
                }}
                className={`flex items-center gap-1.5 hover:text-slate-700 ${activeFilters.includes("offsite") ? "text-purple-600 font-medium" : ""}`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Offsite: <strong>{offsite}</strong>
              </button>
              <button
                onClick={() => {
                  if (activeFilters.includes("has_issues")) {
                    setActiveFilters(activeFilters.filter(f => f !== "has_issues"));
                  } else {
                    setActiveFilters([...activeFilters, "has_issues"]);
                  }
                }}
                className={`flex items-center gap-1.5 hover:text-slate-700 ${activeFilters.includes("has_issues") ? "text-red-600 font-medium" : ""}`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                With Issues: <strong>{withIssues}</strong>
              </button>
            </>
          );
        })()}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <>
          {/* Mobile Column Tabs - Dropdown for clearer UX */}
          <div className="md:hidden mb-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <MobileStageSelector
                  stages={[
                    // Add "All Matching" option when filters are active
                    ...(activeFilters.length > 0 ? [{
                      value: "all",
                      label: "All Matching",
                      count: getFilteredVehicles(vehicles.filter(v => v.showOnPrepBoard !== false)).length,
                    }] : []),
                    // Normal columns
                    ...COLUMNS.map((col) => ({
                      value: col.key,
                      label: col.label,
                      count: getVehiclesByStatus(col.key).length,
                    })),
                  ]}
                  activeStage={mobileActiveColumn}
                  onStageChange={setMobileActiveColumn}
                />
              </div>
              {/* Mobile Sort Button */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-1">Sort</label>
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-3 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <span className="text-xs font-medium">
                    {columnSortOptions[mobileActiveColumn] === "newest_first" ? "Newest" :
                     columnSortOptions[mobileActiveColumn] === "alphabetical" ? "A-Z" : "Oldest"}
                  </span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </label>
                <ul tabIndex={0} className="dropdown-content z-30 menu p-2 shadow-lg bg-white rounded-xl w-48 mt-2 border border-slate-100">
                  <li className="menu-title text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Sort By</li>
                  <li>
                    <button
                      className={`rounded-lg py-2.5 ${columnSortOptions[mobileActiveColumn] === "oldest_first" || !columnSortOptions[mobileActiveColumn] ? "active bg-slate-100" : ""}`}
                      onClick={() => setColumnSortOptions(prev => ({ ...prev, [mobileActiveColumn]: "oldest_first" }))}
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Oldest First
                    </button>
                  </li>
                  <li>
                    <button
                      className={`rounded-lg py-2.5 ${columnSortOptions[mobileActiveColumn] === "newest_first" ? "active bg-slate-100" : ""}`}
                      onClick={() => setColumnSortOptions(prev => ({ ...prev, [mobileActiveColumn]: "newest_first" }))}
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Newest First
                    </button>
                  </li>
                  <li>
                    <button
                      className={`rounded-lg py-2.5 ${columnSortOptions[mobileActiveColumn] === "alphabetical" ? "active bg-slate-100" : ""}`}
                      onClick={() => setColumnSortOptions(prev => ({ ...prev, [mobileActiveColumn]: "alphabetical" }))}
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0h8" />
                      </svg>
                      A-Z (Make/Model)
                    </button>
                  </li>
                  </ul>
                </div>
              </div>
              {/* Mobile Archive toggle - only for delivered column */}
              {mobileActiveColumn === "delivered" && (
                <button
                  onClick={() => setShowAllDelivered(!showAllDelivered)}
                  className={`btn btn-sm gap-1.5 rounded-xl h-10 px-3 ${showAllDelivered ? "btn-primary" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                  title={showAllDelivered ? "Showing all" : "Last 90 days"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span className="text-xs font-medium">{showAllDelivered ? "All" : "90d"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Touch Drag Drop Zones - shown when dragging */}
          {touchDragActive && isTouchDevice && (
            <div className="md:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-sm py-3 px-4 shadow-md border-b border-slate-200 -mx-4">
              <p className="text-xs text-slate-500 mb-2 text-center font-medium">Drop to move to stage</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {COLUMNS.filter(c => c.key !== draggedCard?.status).map((col) => (
                  <div
                    key={col.key}
                    data-column-key={col.key}
                    className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all ${
                      touchDropTarget === col.key
                        ? `border-solid ${col.accentBg} text-white shadow-lg scale-105`
                        : "border-dashed border-slate-300 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span className="text-sm font-medium whitespace-nowrap">{col.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Single Column View */}
          <div className="md:hidden">
            {(() => {
              // Get vehicles based on selected mode
              const isAllMode = mobileActiveColumn === "all";
              const columnVehicles = isAllMode
                ? getFilteredVehicles(vehicles.filter(v => v.showOnPrepBoard !== false))
                : getVehiclesByStatus(mobileActiveColumn);
              const currentCol = isAllMode ? null : COLUMNS.find(col => col.key === mobileActiveColumn);

              // Issue category styling with icons (mobile)
              const issueCategoryStyles = {
                Mechanical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-100", icon: (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )},
                Cosmetic: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100", icon: (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                )},
                Electrical: { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-100", icon: (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )},
                Other: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100", icon: (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )},
              };

              const isPrioritySort = mobileActiveColumn === "live" && columnSortOptions[mobileActiveColumn] === "priority";

              return (
                <div key={isAllMode ? "all" : currentCol?.key} className="space-y-3">
                  {columnVehicles.map((vehicle, cardIndex) => {
                    const tasks = vehicle.tasks || [];
                    const completedTasks = tasks.filter(t => t.status === "done").length;
                    const motStatus = getMOTStatus(vehicle);
                    const issueCounts = getActiveIssuesByCategory(vehicle.issues);
                    const duration = getVehicleDuration(vehicle);

                    return (
                      <div
                        key={vehicle.id}
                        data-card-index={cardIndex}
                        className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100/50 overflow-hidden ${
                          touchDragActive && draggedCard?.id === vehicle.id ? "opacity-40 scale-95" : ""
                        } ${
                          isLongPressing === vehicle.id ? "scale-[1.02] shadow-lg ring-2 ring-blue-400" : ""
                        } ${
                          isPrioritySort && dragOverPriorityIndex === cardIndex ? "border-t-4 border-t-cyan-400" : ""
                        } ${
                          !touchDragActive ? "active:scale-[0.98]" : ""
                        }`}
                        onClick={() => {
                          if (!touchDragActive) {
                            openVehicleDrawer(vehicle);
                          }
                        }}
                        onTouchStart={(e) => handleTouchStart(e, vehicle, isPrioritySort, cardIndex)}
                        onTouchMove={(e) => handleTouchMove(e, isPrioritySort)}
                        onTouchEnd={() => handleTouchEnd(isPrioritySort, columnVehicles)}
                        onTouchCancel={handleTouchCancel}
                      >
                        <div className="p-4">
                          {/* Title with Registration Badge */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="font-bold text-slate-900 text-base">
                                  {vehicle.year || ""} {vehicle.make} {vehicle.model}
                                </p>
                                <span className="font-mono text-sm md:text-xs font-bold bg-[#F7D117] text-black px-2.5 py-1 md:py-0.5 rounded border border-black/30 tracking-wider uppercase shadow-sm">
                                  {vehicle.regCurrent}
                                </span>
                                {/* Status badge in All mode */}
                                {isAllMode && (() => {
                                  const statusCol = COLUMNS.find(c => c.key === vehicle.status);
                                  return statusCol && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold text-white ${statusCol.accentBg}`}>
                                      {statusCol.label}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                            {/* Duration badge - Sold or In Stock */}
                            <span className={`inline-flex items-center gap-1 text-xs ${
                              duration.isSold ? "text-emerald-600" : duration.days > 30 ? "text-red-500" : "text-slate-400"
                            }`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {duration.label}
                              {duration.soldDate && (
                                <span className="text-slate-400 ml-0.5">
                                  ({new Date(duration.soldDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Tags - Modern Pill Style */}
                          <div className="flex gap-1.5 flex-wrap mb-3">
                            {vehicle.locationId && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#0066CC]/10 text-[#0066CC] border border-[#0066CC]/20">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {vehicle.locationId.name || "Offsite"}
                              </span>
                            )}
                            {/* Advertised badge - hide for sold statuses */}
                            {vehicle.isAdvertised && !["live", "reserved", "delivered"].includes(vehicle.status) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Advertised
                              </span>
                            )}
                            {vehicle.saleType === "TRADE" && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white uppercase">
                                Trade
                              </span>
                            )}
                            {vehicle.type === "COURTESY" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-600 text-white uppercase">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Courtesy
                              </span>
                            )}
                            {vehicle.type === "FLEET_OTHER" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0066CC] text-white uppercase">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Fleet
                              </span>
                            )}
                            {motStatus?.type === "expired" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                MOT {motStatus.label}
                              </span>
                            )}
                            {motStatus?.type === "failed" && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                MOT Failed
                              </span>
                            )}
                            {motStatus?.type === "due_soon" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                MOT {motStatus.label}
                              </span>
                            )}
                            {motStatus?.type === "valid" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                MOT {vehicle.motExpiryDate ? new Date(vehicle.motExpiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : motStatus.label}
                              </span>
                            )}
                            {motStatus?.type === "unknown" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                MOT ?
                              </span>
                            )}
                            {/* Issue Pills with Icons */}
                            {Object.entries(issueCounts).map(([category, count]) => {
                              const style = issueCategoryStyles[category] || issueCategoryStyles.Other;
                              return (
                                <span key={category} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${style.bg} ${style.text} border ${style.border}`}>
                                  {style.icon}
                                  {count} {category}
                                </span>
                              );
                            })}
                            {/* Custom Labels */}
                            {vehicle.labels?.map((label) => (
                              <span
                                key={label.id}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{
                                  backgroundColor: label.colour,
                                  color: getLabelTextColor(label.colour),
                                }}
                              >
                                {label.name}
                              </span>
                            ))}
                            {/* Missing SIV Badge - only for stock vehicles without purchase price */}
                            {vehicle.type === "STOCK" && !vehicle.purchase?.purchasePriceNet && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                No SIV
                              </span>
                            )}
                            {/* Delivery Badge - shows when deal has delivery set */}
                            {vehicle.hasDelivery && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Delivery
                              </span>
                            )}
                            {/* Not Viewed Badge - shows when buyer has not seen the vehicle */}
                            {vehicle.buyerHasNotSeenVehicle && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Not Viewed
                              </span>
                            )}
                            {/* PDI Badge - shows PDI status */}
                            {vehicle.pdiSubmission ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                vehicle.pdiSubmission.outstandingIssues > 0
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-green-50 text-green-700 border border-green-200"
                              }`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                PDI {vehicle.pdiSubmission.outstandingIssues > 0 ? `(${vehicle.pdiSubmission.outstandingIssues})` : ""}
                              </span>
                            ) : null}
                          </div>

                          {/* Slick Progress Bar */}
                          {tasks.length > 0 && (
                            <div>
                              <span className="text-xs text-slate-400 mb-1 block">
                                {completedTasks}/{tasks.length} tasks
                              </span>
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all bg-gradient-to-r from-blue-500 to-cyan-400"
                                  style={{ width: `${(completedTasks / tasks.length) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {/* Mobile Move Button */}
                          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                            <button
                              className="btn btn-sm btn-ghost gap-1 text-slate-500 hover:text-[#0066CC] hover:bg-[#0066CC]/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoveVehicle(vehicle);
                                setMoveCurrentColumn(vehicle.status);
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
                    );
                  })}
                  {columnVehicles.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-sm">
                        {isAllMode ? "No vehicles match the current filters" : `No vehicles in ${currentCol?.label || "this column"}`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Mobile Floating Action Button - Link to Stock Book */}
          <Link
            href="/stock-book?addVehicle=1"
            className="md:hidden fixed fab-safe right-4 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>

          {/* Desktop Multi-Column View */}
          <div className="hidden md:flex gap-4 overflow-x-auto pb-6">
            {COLUMNS.map((col) => {
              const columnVehicles = getVehiclesByStatus(col.key);
              return (
                <div
                  key={col.key}
                  data-column-key={col.key}
                  className={`flex-shrink-0 w-64 bg-gradient-to-b ${col.gradient} to-transparent rounded-2xl p-3 min-h-[400px]`}
                  onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Integrated Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-700 text-sm">
                      {col.label}
                    </h3>
                    <span className="bg-slate-900/10 text-slate-700 min-w-[24px] h-6 px-1.5 rounded-full text-xs font-bold flex items-center justify-center">
                      {columnVehicles.length}
                    </span>
                  </div>
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
                          Alphabetical (Make/Model)
                        </button>
                      </li>
                    </ul>
                  </div>
                  {/* Archive toggle - only for delivered column */}
                  {col.key === "delivered" && (
                    <button
                      onClick={() => setShowAllDelivered(!showAllDelivered)}
                      className={`btn btn-xs gap-1 rounded-full ${showAllDelivered ? "btn-primary" : "bg-white/30 backdrop-blur-sm hover:bg-white/50 text-slate-600"}`}
                      title={showAllDelivered ? "Showing all delivered vehicles" : "Showing last 90 days only"}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span className="text-xs">{showAllDelivered ? "All" : "90d"}</span>
                    </button>
                  )}
                </div>

                {/* Cards Container */}
                <div className="space-y-3">
                  {columnVehicles.map((vehicle, cardIndex) => {
                    const tasks = vehicle.tasks || [];
                    const completedTasks = tasks.filter(t => t.status === "done").length;
                    const motStatus = getMOTStatus(vehicle);
                    const issueCounts = getActiveIssuesByCategory(vehicle.issues);
                    const duration = getVehicleDuration(vehicle);
                    const isPrioritySort = col.key === "live" && columnSortOptions[col.key] === "priority";

                    // Issue category styling with icons
                    const issueCategoryStyles = {
                      Mechanical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-100", icon: (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )},
                      Cosmetic: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100", icon: (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      )},
                      Electrical: { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-100", icon: (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )},
                      Other: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100", icon: (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )},
                    };

                    return (
                      <div
                        key={vehicle.id}
                        draggable
                        onDragStart={(e) => {
                          if (isPrioritySort) {
                            setDraggedPriorityIndex(cardIndex);
                            setDraggedCard(vehicle); // For visual preview
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", "");
                            // Create invisible drag image (hide browser's default ghost)
                            const img = new Image();
                            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                            e.dataTransfer.setDragImage(img, 0, 0);
                            setDragPosition({ x: e.clientX, y: e.clientY });
                          } else {
                            handleDragStart(e, vehicle);
                          }
                        }}
                        onDrag={(e) => {
                          if (isPrioritySort) {
                            if (e.clientX > 0 && e.clientY > 0) {
                              setDragPosition({ x: e.clientX, y: e.clientY });
                            }
                          } else {
                            handleDrag(e);
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (isPrioritySort && draggedPriorityIndex !== null && draggedPriorityIndex !== cardIndex) {
                            setDragOverPriorityIndex(cardIndex);
                          }
                        }}
                        onDragLeave={() => isPrioritySort && setDragOverPriorityIndex(null)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          if (isPrioritySort) {
                            e.stopPropagation(); // Prevent column handler from firing
                            if (draggedPriorityIndex !== null && draggedPriorityIndex !== cardIndex) {
                              // Reorder the vehicles
                              const reordered = [...columnVehicles];
                              const [moved] = reordered.splice(draggedPriorityIndex, 1);
                              // Adjust target index when moving forward (source was before target)
                              const adjustedIndex = draggedPriorityIndex < cardIndex ? cardIndex - 1 : cardIndex;
                              reordered.splice(adjustedIndex, 0, moved);

                              // Optimistic UI update - update local state immediately
                              setVehicles(prev => prev.map(v => {
                                const newIndex = reordered.findIndex(r => r.id === v.id);
                                if (newIndex !== -1) {
                                  return { ...v, prepBoardOrder: newIndex };
                                }
                                return v;
                              }));

                              // Persist to server in background (fire and forget)
                              for (let i = 0; i < reordered.length; i++) {
                                updateVehiclePrepOrder(reordered[i].id, i);
                              }
                            }
                            // Only cleanup in priority mode - for stage-to-stage drags, let the column handler do it
                            setDraggedPriorityIndex(null);
                            setDragOverPriorityIndex(null);
                            setDraggedCard(null);
                            setDragPosition({ x: 0, y: 0 });
                          }
                          // For non-priority drops, let the event bubble to the column handler
                        }}
                        onDragEnd={() => {
                          if (isPrioritySort) {
                            setDraggedPriorityIndex(null);
                            setDragOverPriorityIndex(null);
                            setDraggedCard(null);
                            setDragPosition({ x: 0, y: 0 });
                          } else {
                            handleDragEnd();
                          }
                        }}
                        className={`group bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border border-slate-100/50 overflow-hidden ${
                          draggedCard?.id === vehicle.id ? "opacity-40 scale-95" : ""
                        } ${
                          isPrioritySort && draggedPriorityIndex === cardIndex ? "opacity-40 scale-95" : ""
                        } ${
                          isPrioritySort && dragOverPriorityIndex === cardIndex ? "border-t-4 border-t-cyan-400" : ""
                        }`}
                        onClick={() => openVehicleDrawer(vehicle)}
                      >
                        {/* Vehicle Thumbnail */}
                        {(vehicle.primaryImageUrl || vehicle.images?.[0]?.url) && (
                          <div className="relative w-full h-24 bg-slate-100">
                            <VehicleImage
                              src={vehicle.primaryImageUrl || vehicle.images[0].url}
                              imageKey={vehicle.images?.[0]?.key}
                              alt={`${vehicle.make} ${vehicle.model}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {vehicle.images?.length > 1 && (
                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                                +{vehicle.images.length - 1}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="p-3">
                          {/* Title with Registration Badge */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-slate-900 text-sm leading-tight">
                                  {vehicle.year || ""} {vehicle.make} {vehicle.model}
                                </p>
                                <span className="font-mono text-sm md:text-xs font-bold bg-[#F7D117] text-black px-2.5 py-1 md:py-0.5 rounded border border-black/30 tracking-wider uppercase shadow-sm">
                                  {vehicle.regCurrent}
                                </span>
                              </div>
                            </div>
                            {/* Pin to Top Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleVehiclePin(vehicle.id, vehicle.isPinnedOnPrepBoard);
                              }}
                              className={`shrink-0 p-1.5 rounded-full transition-all ${
                                vehicle.isPinnedOnPrepBoard
                                  ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                                  : "text-slate-300 hover:text-slate-500 hover:bg-slate-100 md:opacity-0 md:group-hover:opacity-100"
                              }`}
                              title={vehicle.isPinnedOnPrepBoard ? "Unpin from top" : "Pin to top"}
                            >
                              <svg className="w-4 h-4" fill={vehicle.isPinnedOnPrepBoard ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                            </button>
                          </div>

                          {/* Tags - Modern Pill Style */}
                          <div className="flex gap-1.5 flex-wrap mb-2">
                            {/* Advertised badge - hide for sold statuses */}
                            {vehicle.isAdvertised && !["live", "reserved", "delivered"].includes(vehicle.status) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Advertised
                              </span>
                            )}
                            {/* Trade badge */}
                            {vehicle.saleType === "TRADE" && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white uppercase">
                                Trade
                              </span>
                            )}
                            {/* Courtesy/Fleet badges */}
                            {vehicle.type === "COURTESY" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-600 text-white uppercase">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Courtesy
                              </span>
                            )}
                            {vehicle.type === "FLEET_OTHER" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0066CC] text-white uppercase">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Fleet
                              </span>
                            )}
                            {motStatus?.type === "expired" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                MOT {motStatus.label}
                              </span>
                            )}
                            {motStatus?.type === "failed" && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                MOT Failed
                              </span>
                            )}
                            {motStatus?.type === "due_soon" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                MOT {motStatus.label}
                              </span>
                            )}
                            {motStatus?.type === "valid" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                MOT {vehicle.motExpiryDate ? new Date(vehicle.motExpiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : motStatus.label}
                              </span>
                            )}
                            {motStatus?.type === "unknown" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                MOT ?
                              </span>
                            )}
                            {/* Issue Pills with Icons */}
                            {Object.entries(issueCounts).map(([category, count]) => {
                              const style = issueCategoryStyles[category] || issueCategoryStyles.Other;
                              return (
                                <span key={category} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${style.bg} ${style.text} border ${style.border}`}>
                                  {style.icon}
                                  {count} {category}
                                </span>
                              );
                            })}
                            {vehicle.locationId && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#0066CC]/10 text-[#0066CC] border border-[#0066CC]/20">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {vehicle.locationId.name}
                              </span>
                            )}
                            {/* Custom Labels */}
                            {vehicle.labels?.map((label) => (
                              <span
                                key={label.id}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{
                                  backgroundColor: label.colour,
                                  color: getLabelTextColor(label.colour),
                                }}
                              >
                                {label.name}
                              </span>
                            ))}
                            {/* Missing SIV Badge - only for stock vehicles without purchase price */}
                            {vehicle.type === "STOCK" && !vehicle.purchase?.purchasePriceNet && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                No SIV
                              </span>
                            )}
                            {/* Delivery Badge - shows when deal has delivery set */}
                            {vehicle.hasDelivery && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Delivery
                              </span>
                            )}
                            {/* Not Viewed Badge - shows when buyer has not seen the vehicle */}
                            {vehicle.buyerHasNotSeenVehicle && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Not Viewed
                              </span>
                            )}
                            {/* PDI Badge - shows PDI status */}
                            {vehicle.pdiSubmission ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                vehicle.pdiSubmission.outstandingIssues > 0
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-green-50 text-green-700 border border-green-200"
                              }`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                PDI {vehicle.pdiSubmission.outstandingIssues > 0 ? `(${vehicle.pdiSubmission.outstandingIssues})` : ""}
                              </span>
                            ) : null}
                          </div>

                          {/* Slick Progress Bar */}
                          {tasks.length > 0 && (
                            <div className="mb-2">
                              <span className="text-xs text-slate-400 mb-1 block">
                                {completedTasks}/{tasks.length} tasks
                              </span>
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all bg-gradient-to-r from-blue-500 to-cyan-400"
                                  style={{ width: `${(completedTasks / tasks.length) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {/* Footer - Duration (Sold or In Stock) */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                              duration.isSold ? "text-emerald-600" : duration.days > 30 ? "text-red-500" : "text-slate-400"
                            }`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {duration.label}
                              {duration.soldDate && (
                                <span className="text-slate-400 ml-0.5">
                                  ({new Date(duration.soldDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
                                </span>
                              )}
                            </span>
                            {!duration.isSold && duration.days > 30 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500 border border-red-100">
                                Aging
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty State */}
                  {columnVehicles.length === 0 && (
                    <div className="text-center py-8 px-4">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/50 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <p className="text-sm text-slate-500 font-medium">No vehicles</p>
                      <p className="text-xs text-slate-400 mt-1">{isTouchDevice ? "Use Move button to add vehicles" : "Drag cards here to move"}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </>
      )}

      {/* Vehicle Detail Drawer - Full Screen on Mobile */}
      {selectedVehicle && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
        >
          <div className="bg-black/50 absolute inset-0 hidden md:block" onClick={closeDrawer}></div>
          <div
            className="relative bg-white w-full md:max-w-3xl flex flex-col"
            style={{
              height: "100dvh",
              maxHeight: "100dvh",
              overflowX: "hidden",
            }}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 z-10">
              {/* Top row: back, title, close */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Back button on mobile */}
                  <button className="md:hidden btn btn-ghost btn-sm btn-circle shrink-0" onClick={closeDrawer}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1 md:pr-56">
                    {editingVehicleTitle === selectedVehicle.id ? (
                      <input
                        type="text"
                        className="text-lg md:text-xl font-bold text-slate-900 border border-cyan-400 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-cyan-300 w-full"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onBlur={async () => {
                          const success = await saveVehicleTitle(selectedVehicle.id, editTitleValue);
                          if (success) setEditingVehicleTitle(null);
                        }}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            const success = await saveVehicleTitle(selectedVehicle.id, editTitleValue);
                            if (success) setEditingVehicleTitle(null);
                          } else if (e.key === "Escape") {
                            setEditingVehicleTitle(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <h2
                        className="text-lg md:text-xl font-bold text-slate-900 truncate cursor-pointer hover:text-cyan-700"
                        onClick={() => {
                          setEditingVehicleTitle(selectedVehicle.id);
                          setEditTitleValue(`${selectedVehicle.make} ${selectedVehicle.model}`);
                        }}
                        title="Click to edit"
                      >
                        {selectedVehicle.year || ""} {selectedVehicle.make} {selectedVehicle.model}
                      </h2>
                    )}
                    <p className="text-xs md:text-sm text-slate-500 font-mono mt-0.5">{selectedVehicle.regCurrent}</p>
                  </div>
                </div>
                {/* Desktop close button only */}
                <button className="hidden md:flex btn btn-ghost btn-sm shrink-0" onClick={closeDrawer}>
                  ✕
                </button>
              </div>
              {/* Mobile action buttons row - separated to avoid overlap */}
              <div className="flex items-center gap-2 mt-3 md:hidden">
                {/* Create Sale button - only show if no active deal */}
                {(!vehicleDeal || vehicleDeal.status === "CANCELLED") && (
                  <button
                    onClick={handleSaleAction}
                    disabled={creatingDeal || dealLoading}
                    className="btn btn-sm bg-[#0066CC] hover:bg-[#0052a3] text-white border-none flex-1"
                  >
                    {creatingDeal || dealLoading ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs">Create Sale</span>
                      </>
                    )}
                  </button>
                )}
                {/* Open Sale button - only show if active deal exists (not cancelled) */}
                {vehicleDeal && vehicleDeal.status !== "CANCELLED" && (
                  <button
                    onClick={handleSaleAction}
                    disabled={dealLoading}
                    className="btn btn-sm bg-amber-500 hover:bg-amber-600 text-white border-none flex-1"
                  >
                    {dealLoading ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs">Open Sale</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  className="btn btn-sm btn-outline border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                  onClick={async () => {
                    if (confirm("Remove this vehicle from the Prep Board?\n\nThe vehicle will remain in your Stock Book. Tasks will be preserved for restore.")) {
                      await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          showOnPrepBoard: false,
                          prepBoardRemovedAt: new Date().toISOString(),
                        }),
                      });
                      closeDrawer();
                      fetchVehicles();
                      toast.success("Vehicle removed from Prep Board");
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="text-xs">Remove</span>
                </button>
              </div>
              {/* Desktop action buttons - inline with title */}
              <div className="hidden md:flex items-center gap-1 absolute top-3 right-12">
                {/* Create Sale button - only show if no active deal */}
                {(!vehicleDeal || vehicleDeal.status === "CANCELLED") && (
                  <button
                    onClick={handleSaleAction}
                    disabled={creatingDeal || dealLoading}
                    className="btn btn-sm bg-[#0066CC] hover:bg-[#0052a3] text-white border-none"
                    title="Create new sale"
                  >
                    {creatingDeal || dealLoading ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs">Create Sale</span>
                      </>
                    )}
                  </button>
                )}
                {/* Open Sale button - only show if active deal exists (not cancelled) */}
                {vehicleDeal && vehicleDeal.status !== "CANCELLED" && (
                  <button
                    onClick={handleSaleAction}
                    disabled={dealLoading}
                    className="btn btn-sm bg-amber-500 hover:bg-amber-600 text-white border-none"
                    title="Open existing sale"
                  >
                    {dealLoading ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs">Open Sale</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm text-warning"
                  onClick={async () => {
                    if (confirm("Remove this vehicle from the Prep Board?\n\nThe vehicle will remain in your Stock Book. Tasks will be preserved for restore.")) {
                      await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          showOnPrepBoard: false,
                          prepBoardRemovedAt: new Date().toISOString(),
                        }),
                      });
                      closeDrawer();
                      fetchVehicles();
                      toast.success("Vehicle removed from Prep Board");
                    }
                  }}
                  title="Remove from Prep Board"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              {/* Action buttons row - visible on all screens */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  className="btn btn-outline btn-sm flex-1 md:flex-none"
                  onClick={handleGenerateJobSheet}
                  disabled={isGeneratingJobSheet}
                  title="Share job sheet with mechanic"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {isGeneratingJobSheet ? "..." : "Share"}
                </button>
                <button
                  className="btn btn-outline btn-sm flex-1 md:flex-none"
                  onClick={handleGeneratePrepSummary}
                  disabled={isGeneratingPrepSummary}
                  title="Download prep summary as PDF"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {isGeneratingPrepSummary ? "..." : "Download PDF"}
                </button>
              </div>
            </div>

            {/* Tabs - Simple native select on mobile, pills on desktop */}
            <div className="border-b border-slate-200 bg-white">
              {/* Mobile: Native select - simple and reliable */}
              <div className="block md:hidden px-4 py-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Section
                </label>
                <select
                  value={activeTab}
                  onChange={(e) => {
                    setActiveTab(e.target.value);
                    if (e.target.value === "activity" && selectedVehicle?.id) {
                      fetchActivity(selectedVehicle.id);
                    }
                  }}
                  className="block w-full px-4 py-3 text-base font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ fontSize: "16px" }}
                >
                  <option value="overview">Overview</option>
                  <option value="checklist">
                    Checklist {selectedVehicle.tasks?.length > 0 ? `(${selectedVehicle.tasks.length})` : ""}
                  </option>
                  <option value="issues">
                    Issues {selectedVehicle.issues?.length > 0 ? `(${selectedVehicle.issues.length})` : ""}
                  </option>
                  <option value="activity">Activity</option>
                </select>
              </div>

              {/* Desktop: Tab pills */}
              <div className="hidden md:block px-4 py-2">
                <div className="flex gap-1">
                  {[
                    { key: "overview", label: "Overview" },
                    { key: "checklist", label: "Checklist", count: selectedVehicle.tasks?.length },
                    { key: "issues", label: "Issues", count: selectedVehicle.issues?.length },
                    { key: "activity", label: "Activity" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveTab(tab.key);
                        if (tab.key === "activity" && selectedVehicle?.id) {
                          fetchActivity(selectedVehicle.id);
                        }
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.key
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                      {tab.count > 0 && ` (${tab.count})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6 overscroll-contain"
              style={{
                // Generous bottom padding for mobile bottom nav and safe area
                paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Advertised Toggle */}
                  {(() => {
                    const isSoldStatus = ["live", "reserved", "delivered"].includes(selectedVehicle.status);
                    return (
                      <div className={`flex items-center justify-between p-3 border rounded-lg ${isSoldStatus ? "bg-slate-100 border-slate-200" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-center gap-2">
                          {selectedVehicle.isAdvertised && !isSoldStatus ? (
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                          )}
                          <span className={`text-sm font-medium ${isSoldStatus ? "text-slate-400" : "text-slate-700"}`}>
                            {isSoldStatus ? "N/A (vehicle sold)" : selectedVehicle.isAdvertised ? "Advertised online" : "Not advertised"}
                          </span>
                        </div>
                        <label className={`flex items-center gap-2 ${isSoldStatus ? "cursor-not-allowed" : "cursor-pointer"}`}>
                          <input
                            type="checkbox"
                            className={`toggle toggle-sm ${isSoldStatus ? "toggle-disabled" : "toggle-success"}`}
                            checked={!isSoldStatus && (selectedVehicle.isAdvertised || false)}
                            disabled={isSoldStatus}
                            onChange={async (e) => {
                              if (isSoldStatus) return;
                              const newValue = e.target.checked;
                              setSelectedVehicle({ ...selectedVehicle, isAdvertised: newValue });
                              await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ isAdvertised: newValue }),
                              });
                              fetchVehicles();
                              toast.success(newValue ? "Marked as advertised" : "Marked as not advertised");
                            }}
                          />
                        </label>
                      </div>
                    );
                  })()}

                  {/* Vehicle Documentation Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Vehicle Documentation
                    </h3>
                    <div className="space-y-4">
                      {/* PDI Status */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600">Pre-Delivery Inspection</span>
                          {selectedVehicle.pdiSubmission ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              selectedVehicle.pdiSubmission.outstandingIssues > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}>
                              {selectedVehicle.pdiSubmission.outstandingIssues > 0
                                ? `${selectedVehicle.pdiSubmission.outstandingIssues} issues`
                                : "Complete"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              Not completed
                            </span>
                          )}
                        </div>
                        {selectedVehicle.pdiSubmission ? (
                          <div className="flex gap-2">
                            <Link
                              href={`/forms?tab=submissions&viewSubmission=${selectedVehicle.pdiSubmission.id}`}
                              className="btn btn-xs btn-outline flex-1"
                            >
                              View
                            </Link>
                            <Link
                              href={`/forms?tab=submissions&editSubmission=${selectedVehicle.pdiSubmission.id}`}
                              className="btn btn-xs btn-outline flex-1"
                            >
                              Modify
                            </Link>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowPdiModal(true)}
                            className="btn btn-xs btn-primary w-full"
                          >
                            Complete PDI
                          </button>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="border-t border-slate-200"></div>

                      {/* Service Receipt */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600">Service Receipt</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            Optional
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowServiceReceiptModal(true)}
                          className="btn btn-xs btn-outline w-full"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Service Receipt
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Identity Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Identity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Registration</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="input input-sm bg-slate-50 border-slate-200 text-slate-900 flex-1 font-mono uppercase"
                            value={selectedVehicle.regCurrent || ""}
                            onChange={(e) => setSelectedVehicle({ ...selectedVehicle, regCurrent: e.target.value.toUpperCase() })}
                            onBlur={async () => {
                              await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ regCurrent: selectedVehicle.regCurrent }),
                              });
                              fetchVehicles();
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-primary shrink-0"
                            onClick={lookupVehicleDVLA}
                            disabled={isLookingUpDrawer}
                            title="Lookup DVLA data for this registration"
                          >
                            {isLookingUpDrawer ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Click lookup to refresh DVLA data</p>
                      </div>
                      <div className="form-control">
                        <label className="text-xs font-medium text-slate-600 mb-1 block">VIN</label>
                        <input
                          type="text"
                          className="input input-sm bg-slate-50 border-slate-200 text-slate-900 w-full font-mono"
                          value={selectedVehicle.vin || ""}
                          onChange={(e) => setSelectedVehicle({ ...selectedVehicle, vin: e.target.value })}
                          onBlur={async () => {
                            await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ vin: selectedVehicle.vin }),
                            });
                            fetchVehicles();
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Labels Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Custom Labels</h3>

                    {/* Applied Labels Display */}
                    {selectedVehicle.labels?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedVehicle.labels.map((label) => (
                          <span
                            key={label.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: label.colour,
                              color: getLabelTextColor(label.colour),
                            }}
                          >
                            {label.name}
                            <button
                              type="button"
                              onClick={() => toggleVehicleLabel(selectedVehicle.id, label.id)}
                              className="ml-0.5 hover:opacity-70"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Labels Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowLabelsDropdown(!showLabelsDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm hover:border-slate-400 transition-colors"
                      >
                        <span className="text-slate-600">
                          {selectedVehicle.labels?.length > 0
                            ? `${selectedVehicle.labels.length} label${selectedVehicle.labels.length > 1 ? 's' : ''} selected`
                            : "Select labels..."
                          }
                        </span>
                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${showLabelsDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showLabelsDropdown && (
                        <>
                          {/* Click-outside overlay to close dropdown */}
                          <div className="fixed inset-0 z-40" onClick={() => setShowLabelsDropdown(false)} />
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {availableLabels.map((label) => {
                            const isApplied = selectedVehicle.labels?.some(l => l.id === label.id);
                            return (
                              <button
                                key={label.id}
                                type="button"
                                onClick={() => toggleVehicleLabel(selectedVehicle.id, label.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                              >
                                <span
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: label.colour }}
                                ></span>
                                <span className="flex-1 text-sm text-slate-700">{label.name}</span>
                                {isApplied && (
                                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}

                          {/* Add New Label Option */}
                          <div className="border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setShowLabelsDropdown(false);
                                setShowAddLabelModal(true);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-left text-[#0066CC]"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-sm font-medium">Add new label</span>
                            </button>
                          </div>
                        </div>
                        </>
                      )}
                    </div>

                    {availableLabels.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAddLabelModal(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create your first label
                      </button>
                    )}
                  </div>

                  {/* Status & Location Section - Now below Identity */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Status & Location</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Vehicle Type</label>
                        <select
                          className="select select-sm select-bordered w-full"
                          value={selectedVehicle.type || "STOCK"}
                          onChange={async (e) => {
                            const newType = e.target.value;
                            const updates = { type: newType };
                            // Clear saleType if not Stock
                            if (newType !== "STOCK") {
                              updates.saleType = null;
                            }
                            setSelectedVehicle({ ...selectedVehicle, ...updates });
                            await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(updates),
                            });
                            fetchVehicles();
                            toast.success("Vehicle type updated");
                          }}
                        >
                          <option value="STOCK">Stock</option>
                          <option value="COURTESY">Courtesy</option>
                          <option value="FLEET_OTHER">Fleet</option>
                        </select>
                      </div>
                      {/* Sale Type - Only show for Stock vehicles */}
                      {(selectedVehicle.type === "STOCK" || !selectedVehicle.type) && (
                        <div className="form-control">
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Sale Type</label>
                          <select
                            className="select select-sm select-bordered w-full"
                            value={selectedVehicle.saleType || "RETAIL"}
                            onChange={async (e) => {
                              const newSaleType = e.target.value;
                              setSelectedVehicle({ ...selectedVehicle, saleType: newSaleType });
                              await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ saleType: newSaleType }),
                              });
                              fetchVehicles();
                              toast.success("Sale type updated");
                            }}
                          >
                            <option value="RETAIL">Retail</option>
                            <option value="TRADE">Trade</option>
                          </select>
                        </div>
                      )}
                      <div className="form-control">
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
                        <select
                          className="select select-sm select-bordered w-full"
                          value={selectedVehicle.status || "in_stock"}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            setSelectedVehicle({ ...selectedVehicle, status: newStatus });
                            await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: newStatus }),
                            });
                            fetchVehicles();
                            toast.success(`Status updated to ${COLUMNS.find(c => c.key === newStatus)?.label || newStatus}`);
                          }}
                        >
                          {COLUMNS.map(col => (
                            <option key={col.key} value={col.key}>{col.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-control">
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Location</label>
                        <select
                          className="select select-sm select-bordered w-full"
                          value={selectedVehicle.locationId?.id || selectedVehicle.locationId?._id || selectedVehicle.locationId || ""}
                          onChange={async (e) => {
                            const value = e.target.value;
                            if (value === "__add_new__") {
                              setShowAddLocationModal(true);
                              return;
                            }
                            const locationId = value || null;
                            setSelectedVehicle({ ...selectedVehicle, locationId: locationId });
                            await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ locationId }),
                            });
                            const updated = await fetch(`/api/vehicles/${selectedVehicle.id}`).then(r => r.json());
                            setSelectedVehicle(updated);
                            fetchVehicles();
                            toast.success("Location updated");
                          }}
                        >
                          <option value="">On Site</option>
                          {locations.map(loc => (
                            <option key={loc.id || loc._id} value={loc.id || loc._id}>{loc.name}</option>
                          ))}
                          <option value="__add_new__">+ Add Location</option>
                        </select>
                      </div>
                    </div>
                  </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4">Specs</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="form-control">
                            <label className="label label-text text-xs">Make</label>
                            <input
                              type="text"
                              className="input input-sm input-bordered"
                              value={selectedVehicle.make || ""}
                              onChange={(e) => setSelectedVehicle({ ...selectedVehicle, make: e.target.value })}
                              onBlur={async () => {
                                await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ make: selectedVehicle.make }),
                                });
                                fetchVehicles();
                              }}
                            />
                          </div>

                          <div className="form-control">
                            <label className="label label-text text-xs">Model</label>
                            <input
                              type="text"
                              className="input input-sm input-bordered"
                              value={selectedVehicle.model || ""}
                              onChange={(e) => setSelectedVehicle({ ...selectedVehicle, model: e.target.value })}
                              onBlur={async () => {
                                await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ model: selectedVehicle.model }),
                                });
                                fetchVehicles();
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="form-control">
                            <label className="label label-text text-xs">Year</label>
                            <input
                              type="number"
                              className="input input-sm input-bordered"
                              value={selectedVehicle.year || ""}
                              onChange={(e) => setSelectedVehicle({ ...selectedVehicle, year: e.target.value })}
                              onBlur={async () => {
                                await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ year: selectedVehicle.year }),
                                });
                                fetchVehicles();
                              }}
                            />
                          </div>

                          <div className="form-control">
                            <label className="label label-text text-xs">Mileage</label>
                            <input
                              type="number"
                              className="input input-sm input-bordered"
                              value={selectedVehicle.mileageCurrent || ""}
                              onChange={(e) => setSelectedVehicle({ ...selectedVehicle, mileageCurrent: e.target.value })}
                              onBlur={async () => {
                                await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ mileageCurrent: selectedVehicle.mileageCurrent }),
                                });
                                fetchVehicles();
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="form-control">
                            <label className="label label-text text-xs">Colour</label>
                            <input
                              type="text"
                              className="input input-sm input-bordered"
                              value={selectedVehicle.colour || ""}
                              onChange={(e) => setSelectedVehicle({ ...selectedVehicle, colour: e.target.value })}
                              onBlur={async () => {
                                await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ colour: selectedVehicle.colour }),
                                });
                                fetchVehicles();
                              }}
                            />
                          </div>

                          <div className="form-control">
                            <label className="label label-text text-xs">Fuel Type</label>
                            <select
                              className="select select-sm select-bordered"
                              value={selectedVehicle.fuelType || ""}
                              onChange={async (e) => {
                                const newValue = e.target.value;
                                setSelectedVehicle({ ...selectedVehicle, fuelType: newValue });
                                await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ fuelType: newValue }),
                                });
                                fetchVehicles();
                              }}
                            >
                              <option value="">Select...</option>
                              <option value="Petrol">Petrol</option>
                              <option value="Diesel">Diesel</option>
                              <option value="Hybrid">Hybrid</option>
                              <option value="Electric">Electric</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-control">
                          <label className="label label-text text-xs">MOT Expiry Date</label>
                          <input
                            type="date"
                            className="input input-sm input-bordered"
                            value={selectedVehicle.motExpiryDate ? new Date(selectedVehicle.motExpiryDate).toISOString().split('T')[0] : ""}
                            onChange={async (e) => {
                              const newValue = e.target.value;
                              setSelectedVehicle({ ...selectedVehicle, motExpiryDate: newValue });
                              await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ motExpiryDate: newValue }),
                              });
                              fetchVehicles();
                            }}
                          />
                        </div>

                        {/* MOT History Details Toggle + Refresh */}
                        <div className="col-span-2 mt-2 flex items-center gap-3">
                          {selectedVehicle.motHistory && selectedVehicle.motHistory.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setShowMotDetails(!showMotDetails)}
                              className="text-xs text-[#0066CC] hover:underline flex items-center gap-1"
                            >
                              <svg className={`w-3 h-3 transition-transform ${showMotDetails ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              {showMotDetails ? "Hide MOT Details" : "View MOT Details"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">No MOT history available</span>
                          )}
                          <button
                            type="button"
                            onClick={() => refreshMotData(selectedVehicle.id)}
                            disabled={isRefreshingMot}
                            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 disabled:opacity-50"
                          >
                            <svg className={`w-3 h-3 ${isRefreshingMot ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isRefreshingMot ? "Refreshing..." : "Refresh MOT"}
                          </button>
                        </div>

                        {selectedVehicle.motHistory && selectedVehicle.motHistory.length > 0 && (
                          <div className="col-span-2">

                            {showMotDetails && (() => {
                              const latestMot = selectedVehicle.motHistory[0];
                              const defects = latestMot?.defects || [];
                              const dangerous = defects.filter(d => d.type === "DANGEROUS" || d.dangerous);
                              const major = defects.filter(d => d.type === "MAJOR" && !d.dangerous);
                              const minor = defects.filter(d => d.type === "MINOR");
                              const advisory = defects.filter(d => d.type === "ADVISORY");

                              return (
                                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                                  {/* Test Result Header */}
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-600">
                                      {latestMot.completedDate ? new Date(latestMot.completedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "Unknown date"}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded font-semibold ${latestMot.testResult === "PASSED" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                      {latestMot.testResult || "Unknown"}
                                    </span>
                                  </div>

                                  {/* Mileage */}
                                  {latestMot.odometerValue && (
                                    <p className="text-slate-500 mb-2">
                                      Mileage: {latestMot.odometerValue.toLocaleString()} {latestMot.odometerUnit?.toLowerCase() || "miles"}
                                    </p>
                                  )}

                                  {/* Defects */}
                                  {defects.length > 0 ? (
                                    <div className="space-y-2">
                                      {/* Dangerous */}
                                      {dangerous.length > 0 && (
                                        <div>
                                          <div className="flex items-center justify-between">
                                            <p className="font-semibold text-red-700 flex items-center gap-1">
                                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                              </svg>
                                              Dangerous ({dangerous.length})
                                            </p>
                                            <button
                                              type="button"
                                              onClick={() => addMotDefectsToChecklist(dangerous, "DANGEROUS")}
                                              className="text-[10px] text-slate-500 hover:text-slate-700"
                                            >
                                              + Add to checklist
                                            </button>
                                          </div>
                                          <ul className="ml-4 text-red-600">
                                            {dangerous.map((d, i) => <li key={i} className="mt-0.5">• {d.text}</li>)}
                                          </ul>
                                        </div>
                                      )}

                                      {/* Major */}
                                      {major.length > 0 && (
                                        <div>
                                          <div className="flex items-center justify-between">
                                            <p className="font-semibold text-red-600">Major ({major.length})</p>
                                            <button
                                              type="button"
                                              onClick={() => addMotDefectsToChecklist(major, "MAJOR")}
                                              className="text-[10px] text-slate-500 hover:text-slate-700"
                                            >
                                              + Add to checklist
                                            </button>
                                          </div>
                                          <ul className="ml-4 text-red-500">
                                            {major.map((d, i) => <li key={i} className="mt-0.5">• {d.text}</li>)}
                                          </ul>
                                        </div>
                                      )}

                                      {/* Minor */}
                                      {minor.length > 0 && (
                                        <div>
                                          <div className="flex items-center justify-between">
                                            <p className="font-semibold text-amber-600">Minor ({minor.length})</p>
                                            <button
                                              type="button"
                                              onClick={() => addMotDefectsToChecklist(minor, "MINOR")}
                                              className="text-[10px] text-slate-500 hover:text-slate-700"
                                            >
                                              + Add to checklist
                                            </button>
                                          </div>
                                          <ul className="ml-4 text-amber-600">
                                            {minor.map((d, i) => <li key={i} className="mt-0.5">• {d.text}</li>)}
                                          </ul>
                                        </div>
                                      )}

                                      {/* Advisory */}
                                      {advisory.length > 0 && (
                                        <div>
                                          <div className="flex items-center justify-between">
                                            <p className="font-semibold text-slate-600 flex items-center gap-1">
                                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                              </svg>
                                              Advisories ({advisory.length})
                                            </p>
                                            <button
                                              type="button"
                                              onClick={() => addMotDefectsToChecklist(advisory, "ADVISORY")}
                                              className="text-[10px] text-slate-500 hover:text-slate-700"
                                            >
                                              + Add to checklist
                                            </button>
                                          </div>
                                          <ul className="ml-4 text-slate-500">
                                            {advisory.map((d, i) => <li key={i} className="mt-0.5">• {d.text}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-emerald-600 flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      No defects or advisories
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>



                  {/* Vehicle Notes Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Notes
                    </h3>
                    <textarea
                      className="textarea textarea-bordered w-full text-sm"
                      rows={4}
                      placeholder="Add notes about this vehicle..."
                      value={selectedVehicle.notes || ""}
                      onChange={(e) => setSelectedVehicle({ ...selectedVehicle, notes: e.target.value })}
                      onBlur={async () => {
                        await fetch(`/api/vehicles/${selectedVehicle.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ notes: selectedVehicle.notes }),
                        });
                        fetchVehicles();
                      }}
                    />
                  </div>
                </div>
              )}


              {/* Prep Checklist Tab */}
              {activeTab === "checklist" && (
                <div className="card bg-base-200">
                  <div className="card-body p-4">
                    <h3 className="font-semibold mb-3">Prep Checklist</h3>
                    <div className="space-y-2">
                      {[...(selectedVehicle.tasks || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((task, index) => (
                        <div
                          key={task.id}
                          className={`p-2 rounded hover:bg-base-300 group cursor-grab active:cursor-grabbing ${
                            draggedTaskIndex === index ? "opacity-40" : ""
                          } ${dragOverTaskIndex === index ? "border-t-2 border-primary" : ""}`}
                          draggable
                          onDragStart={(e) => {
                            setDraggedTaskIndex(index);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedTaskIndex !== null && draggedTaskIndex !== index) {
                              setDragOverTaskIndex(index);
                            }
                          }}
                          onDragLeave={() => setDragOverTaskIndex(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedTaskIndex !== null && draggedTaskIndex !== index) {
                              const sortedTasks = [...(selectedVehicle.tasks || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                              const reordered = [...sortedTasks];
                              const [moved] = reordered.splice(draggedTaskIndex, 1);
                              reordered.splice(index, 0, moved);
                              const newTaskIds = reordered.map(t => t.id || t._id);
                              // Update locally first for immediate feedback
                              setSelectedVehicle({
                                ...selectedVehicle,
                                tasks: reordered.map((t, i) => ({ ...t, order: i })),
                              });
                              reorderTasks(newTaskIds);
                            }
                            setDraggedTaskIndex(null);
                            setDragOverTaskIndex(null);
                          }}
                          onDragEnd={() => {
                            setDraggedTaskIndex(null);
                            setDragOverTaskIndex(null);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {/* Drag handle */}
                            <span className="text-base-content/30 hover:text-base-content/60 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                                <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                              </svg>
                            </span>
                            <select
                              className="select select-bordered select-xs"
                              value={task.status || "pending"}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="done">Done</option>
                              <option value="not_required">Not Required</option>
                            </select>
                            {editingTaskId === task.id ? (
                              <input
                                type="text"
                                className="input input-bordered input-xs flex-1"
                                value={editingTaskName}
                                onChange={(e) => setEditingTaskName(e.target.value)}
                                onBlur={() => {
                                  if (editingTaskName.trim() && editingTaskName !== task.name) {
                                    updateTaskName(task.id, editingTaskName);
                                  } else {
                                    setEditingTaskId(null);
                                    setEditingTaskName("");
                                  }
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    if (editingTaskName.trim() && editingTaskName !== task.name) {
                                      updateTaskName(task.id, editingTaskName);
                                    } else {
                                      setEditingTaskId(null);
                                      setEditingTaskName("");
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setEditingTaskId(null);
                                    setEditingTaskName("");
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <span
                                className={`flex-1 text-sm cursor-pointer ${task.status === "done" ? "line-through text-base-content/50" : ""}`}
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditingTaskName(task.name);
                                }}
                                title="Click to edit"
                              >
                                {task.name}
                                {/* Show parts status chip next to task name */}
                                {task.partsOrders?.length > 0 && (
                                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    task.partsOrders.every(o => o.status === "RECEIVED")
                                      ? "bg-green-100 text-green-800 border border-green-200"
                                      : task.partsOrders.some(o => o.status === "RECEIVED")
                                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                                        : "bg-amber-100 text-amber-800 border border-amber-200"
                                  }`}>
                                    {task.partsOrders.every(o => o.status === "RECEIVED")
                                      ? `✓ Parts Received (${task.partsOrders.length})`
                                      : task.partsOrders.some(o => o.status === "RECEIVED")
                                        ? `Parts: ${task.partsOrders.filter(o => o.status === "RECEIVED").length}/${task.partsOrders.length} Received`
                                        : `Parts Ordered (${task.partsOrders.length})`
                                    }
                                  </span>
                                )}
                              </span>
                            )}
                            {task.completedAt && !editingTaskId && (
                              <span className="text-xs text-base-content/50">
                                {formatDate(task.completedAt)}
                              </span>
                            )}
                            {/* Assignee indicator */}
                            <div className="relative" data-task-assignee-dropdown>
                              {task.assignedUserId ? (
                                <button
                                  className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium flex items-center justify-center hover:bg-blue-200 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTaskAssigneeDropdownId(taskAssigneeDropdownId === task.id ? null : task.id);
                                  }}
                                  title={`Assigned to ${task.assignedUserName || "team member"}`}
                                >
                                  {(task.assignedUserName || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </button>
                              ) : (
                                <button
                                  className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity text-blue-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTaskAssigneeDropdownId(task.id);
                                  }}
                                  title="Assign to team member"
                                >
                                  Assign
                                </button>
                              )}
                              {/* Assignee dropdown */}
                              {taskAssigneeDropdownId === task.id && (
                                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px] max-h-48 overflow-y-auto">
                                  <div className="py-1">
                                    {task.assignedUserId && (
                                      <button
                                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateTaskAssignee(task.id, null);
                                        }}
                                      >
                                        <span className="text-xs">✕</span> Unassign
                                      </button>
                                    )}
                                    {teamMembers.map((member) => (
                                      <button
                                        key={member.userId}
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                                          task.assignedUserId === member.userId ? "bg-blue-50 text-blue-700" : ""
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateTaskAssignee(task.id, member.userId);
                                        }}
                                      >
                                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium flex items-center justify-center">
                                          {(member.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                        </span>
                                        <span className="truncate">{member.name || member.email}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Order Parts button - show for pending/in_progress tasks */}
                            {task.status !== "done" && task.status !== "not_required" && (
                              <button
                                className="btn btn-ghost btn-xs text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPartsOrderModal(task.id);
                                }}
                                title="Order Parts"
                              >
                                + Parts
                              </button>
                            )}
                            <button
                              className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteTask(task.id)}
                            >
                              ✕
                            </button>
                          </div>
                          {/* Parts orders section - show if task has parts orders */}
                          {task.partsOrders?.length > 0 && (
                            <div className="mt-2 ml-6 pl-2 border-l-2 border-amber-300 space-y-1">
                              {task.partsOrders.map((order) => (
                                <div key={order._id || order.id} className="flex items-center gap-2 text-xs">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    order.status === "RECEIVED"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}>
                                    {order.status === "RECEIVED" ? "✓" : "⏳"}
                                  </span>
                                  <span className="text-base-content/80">{getSupplierDisplay(order)}</span>
                                  {order.orderRef && (
                                    <span className="text-base-content/50">Ref: {order.orderRef}</span>
                                  )}
                                  {order.expectedAt && order.status !== "RECEIVED" && (
                                    <span className="text-base-content/50">
                                      ETA: {formatDate(order.expectedAt)}
                                    </span>
                                  )}
                                  {order.status !== "RECEIVED" && (
                                    <button
                                      className="btn btn-ghost btn-xs text-green-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markPartsReceived(task.id, order._id || order.id);
                                      }}
                                      title="Mark as Received"
                                    >
                                      ✓ Received
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-ghost btn-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPartsOrderModal(task.id, order);
                                    }}
                                    title="Edit"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-xs text-error"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removePartsOrder(task.id, order._id || order.id);
                                    }}
                                    title="Remove"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        className="input input-bordered input-sm flex-1"
                        placeholder="Add new task..."
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addTask()}
                      />
                      <button className="btn btn-primary btn-sm" onClick={addTask}>
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Issues Tab */}
              {activeTab === "issues" && (
                <div className="space-y-4">
                  <button
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#0066CC] hover:bg-[#0055AA] text-white text-sm font-medium rounded-xl shadow-sm shadow-[#0066CC]/25 hover:shadow-md transition-all"
                    onClick={() => setShowAddIssueModal(true)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Issue
                  </button>

                  {selectedVehicle.issues && selectedVehicle.issues.length > 0 ? (
                    <div className="space-y-3">
                      {selectedVehicle.issues.map((issue) => (
                        <div key={issue.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                          {/* Issue Header with Status Bar */}
                          <div className={`px-4 py-3 border-b border-slate-100 ${
                            issue.status === "Complete" ? "bg-emerald-50/50" :
                            issue.status === "In Progress" ? "bg-amber-50/50" :
                            issue.status === "Ordered" ? "bg-blue-50/50" :
                            "bg-red-50/50"
                          }`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0066CC]/10 text-[#0066CC]">
                                  {issue.category}
                                </span>
                                {issue.subcategory && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                    {issue.subcategory}
                                  </span>
                                )}
                                {issue.dealNumber && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                    {issue.dealNumber}
                                  </span>
                                )}
                              </div>
                              <select
                                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border-0 cursor-pointer transition-colors ${
                                  issue.status === "Complete" ? "bg-emerald-100 text-emerald-700" :
                                  issue.status === "In Progress" ? "bg-amber-100 text-amber-700" :
                                  issue.status === "Ordered" ? "bg-blue-100 text-blue-700" :
                                  "bg-red-100 text-red-700"
                                }`}
                                value={issue.status || "Outstanding"}
                                onChange={(e) => updateIssue(issue.id, { status: e.target.value })}
                              >
                                <option value="Outstanding">Outstanding</option>
                                <option value="Ordered">Ordered</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Complete">Complete</option>
                              </select>
                            </div>
                          </div>

                          {/* Issue Body */}
                          <div className="p-4 space-y-3">
                            {/* Description */}
                            <p className="text-sm font-medium text-slate-800">{issue.description}</p>

                            {/* Details Grid */}
                            <div className="space-y-2">
                              {issue.actionNeeded && (
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0 pt-0.5 w-14">Action</span>
                                  <p className="text-sm text-slate-600">{issue.actionNeeded}</p>
                                </div>
                              )}
                              {issue.notes && (
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0 pt-0.5 w-14">Notes</span>
                                  <p className="text-sm text-slate-600">{issue.notes}</p>
                                </div>
                              )}
                            </div>

                            {/* Parts Details */}
                            {issue.partsRequired && (
                              <div className="p-3 bg-[#0066CC]/5 rounded-xl border border-[#0066CC]/10 space-y-3">
                                <div className="flex items-start gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-[#0066CC]/10 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#0066CC]/10 text-[#0066CC]">
                                      Parts Required
                                    </span>
                                    {issue.partsDetails && (
                                      <p className="text-sm text-slate-600 mt-1">{issue.partsDetails}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Parts Ordered Checkbox */}
                                <div className="border-t border-[#0066CC]/10 pt-3">
                                  <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                      type="checkbox"
                                      checked={issue.partsOrdered || false}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          updateIssue(issue.id, { partsOrdered: true });
                                        } else {
                                          updateIssue(issue.id, {
                                            partsOrdered: false,
                                            partsSupplier: null,
                                            partsNotes: null,
                                            partsReceived: false
                                          });
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-slate-300 text-[#0066CC] focus:ring-[#0066CC]"
                                    />
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Parts Ordered</span>
                                  </label>
                                  {issue.partsOrderedAt && (
                                    <p className="text-xs text-slate-500 mt-1 ml-6">
                                      Ordered {new Date(issue.partsOrderedAt).toLocaleDateString('en-GB')}
                                    </p>
                                  )}

                                  {/* Supplier & Notes - show when ordered */}
                                  {issue.partsOrdered && (
                                    <div className="mt-2 ml-6 space-y-2">
                                      <input
                                        type="text"
                                        placeholder="Supplier name"
                                        value={issue.partsSupplier || ""}
                                        onChange={(e) => updateIssue(issue.id, { partsSupplier: e.target.value || null })}
                                        className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC]"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Notes (order ref, ETA, etc.)"
                                        value={issue.partsNotes || ""}
                                        onChange={(e) => updateIssue(issue.id, { partsNotes: e.target.value })}
                                        className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-[#0066CC] focus:border-[#0066CC]"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Parts Received Checkbox - only show if ordered */}
                                {issue.partsOrdered && (
                                  <div className="border-t border-[#0066CC]/10 pt-3">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                      <input
                                        type="checkbox"
                                        checked={issue.partsReceived || false}
                                        onChange={(e) => updateIssue(issue.id, { partsReceived: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                                      />
                                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Parts Received</span>
                                    </label>
                                    {issue.partsReceivedAt && (
                                      <p className="text-xs text-slate-500 mt-1 ml-6">
                                        Received {new Date(issue.partsReceivedAt).toLocaleDateString('en-GB')}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Photos */}
                            {issue.photos && issue.photos.length > 0 && (
                              <div className="pt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                                  Photos ({issue.photos.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {issue.photos.map((photo, idx) => (
                                    <IssuePhoto key={idx} photoKey={photo} idx={idx} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Updates Accordion */}
                          <div className="border-t border-slate-100">
                            <button
                              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                              onClick={() => setExpandedIssues(prev => ({
                                ...prev,
                                [issue.id]: !prev[issue.id]
                              }))}
                            >
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Updates {issue.updates?.length > 0 && `(${issue.updates.length})`}
                              </span>
                              <svg
                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedIssues[issue.id] ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {expandedIssues[issue.id] && (
                              <div className="px-4 pb-4 space-y-3 bg-slate-50/50">
                                {/* Creation timestamp */}
                                <div className="flex gap-3 text-xs">
                                  <div className="w-1 bg-slate-200 rounded-full"></div>
                                  <p className="text-slate-500">
                                    Created {formatDate(issue.createdAt)}
                                  </p>
                                </div>

                                {/* Updates timeline */}
                                {issue.updates && issue.updates.length > 0 ? (
                                  issue.updates.map((update, idx) => (
                                    <div key={idx} className="flex gap-3">
                                      <div className="w-1 bg-[#0066CC]/30 rounded-full"></div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="text-sm font-semibold text-slate-700">{update.userName || "User"}</p>
                                          <span className="text-xs text-slate-400">{formatDate(update.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-slate-600">{update.content}</p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-slate-400 text-center py-2">No updates yet</p>
                                )}

                                {/* Add update input */}
                                <div className="flex gap-2 pt-2">
                                  <input
                                    type="text"
                                    className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]/20 outline-none transition-all"
                                    placeholder="Add an update..."
                                    value={issueUpdateContent[issue.id] || ""}
                                    onChange={(e) => setIssueUpdateContent(prev => ({
                                      ...prev,
                                      [issue.id]: e.target.value
                                    }))}
                                    onKeyPress={(e) => {
                                      if (e.key === "Enter") {
                                        addIssueUpdate(issue.id, issueUpdateContent[issue.id]);
                                      }
                                    }}
                                  />
                                  <button
                                    className="px-4 py-2 bg-[#0066CC] hover:bg-[#0055AA] text-white text-sm font-medium rounded-xl transition-colors"
                                    onClick={() => addIssueUpdate(issue.id, issueUpdateContent[issue.id])}
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions Footer */}
                          <div className="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50/50 border-t border-slate-100">
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-[#0066CC] hover:bg-[#0066CC]/5 rounded-lg transition-colors"
                              onClick={() => openEditIssue(issue)}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              onClick={() => {
                                if (confirm("Delete this issue?")) deleteIssue(issue.id);
                              }}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-600">No issues recorded</p>
                      <p className="text-xs text-slate-400 mt-1">Add an issue to track problems with this vehicle</p>
                    </div>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === "activity" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900">Activity Log</h3>

                  {activityLoading && activityData.activities.length === 0 ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : activityData.activities.length === 0 ? (
                    <div className="text-center py-8 text-base-content/60">
                      No activity recorded yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activityData.activities.map((activity) => (
                        <div
                          key={activity._id || activity.id}
                          className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            activity.type === "VEHICLE_CREATED" ? "bg-green-100" :
                            activity.type === "STATUS_CHANGED" ? "bg-blue-100" :
                            activity.type === "TYPE_CHANGED" ? "bg-[#0066CC]/10" :
                            activity.type === "LOCATION_CHANGED" ? "bg-[#0066CC]/10" :
                            activity.type === "TASK_COMPLETED" ? "bg-emerald-100" :
                            activity.type === "TASK_STATUS_UPDATED" ? "bg-amber-100" :
                            activity.type === "TASK_PROGRESS_UPDATED" ? "bg-orange-100" :
                            activity.type === "TASK_PARTS_STATUS_CHANGED" || activity.type === "TASK_PARTS_ORDER_ADDED" ? "bg-amber-100" :
                            activity.type === "TASK_PARTS_ORDER_UPDATED" ? "bg-blue-100" :
                            activity.type === "TASK_PARTS_ORDER_REMOVED" ? "bg-red-100" :
                            activity.type === "TASK_ADDED" || activity.type === "TASK_DELETED" ? "bg-slate-100" :
                            activity.type === "ISSUE_ADDED" ? "bg-red-100" :
                            activity.type === "ISSUE_RESOLVED" ? "bg-green-100" :
                            activity.type === "ISSUE_UPDATED" || activity.type === "ISSUE_COMMENT_ADDED" ? "bg-yellow-100" :
                            "bg-slate-100"
                          }`}>
                            {/* Vehicle lifecycle */}
                            {activity.type === "VEHICLE_CREATED" && (
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {activity.type === "STATUS_CHANGED" && (
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            )}
                            {activity.type === "TYPE_CHANGED" && (
                              <svg className="w-4 h-4 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            )}
                            {activity.type === "LOCATION_CHANGED" && (
                              <svg className="w-4 h-4 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            )}
                            {activity.type === "DETAILS_UPDATED" && (
                              <svg className="w-4 h-4 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            )}
                            {/* Task events */}
                            {activity.type === "TASK_COMPLETED" && (
                              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {activity.type === "TASK_STATUS_UPDATED" && (
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                            {activity.type === "TASK_PROGRESS_UPDATED" && (
                              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            )}
                            {(activity.type === "TASK_ADDED" || activity.type === "TASK_UPDATED") && (
                              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            )}
                            {activity.type === "TASK_DELETED" && (
                              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                            {/* Parts ordering events */}
                            {(activity.type === "TASK_PARTS_STATUS_CHANGED" || activity.type === "TASK_PARTS_ORDER_ADDED") && (
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            )}
                            {activity.type === "TASK_PARTS_ORDER_UPDATED" && (
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                            {activity.type === "TASK_PARTS_ORDER_REMOVED" && (
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                            {/* Issue events */}
                            {activity.type === "ISSUE_ADDED" && (
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                            {activity.type === "ISSUE_RESOLVED" && (
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {(activity.type === "ISSUE_UPDATED" || activity.type === "ISSUE_COMMENT_ADDED") && (
                              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            )}
                            {activity.type === "ISSUE_DELETED" && (
                              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                            {/* Document events */}
                            {(activity.type === "DOC_UPLOADED" || activity.type === "DOC_DELETED") && (
                              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            {/* Fallback for any unhandled types */}
                            {!["VEHICLE_CREATED", "STATUS_CHANGED", "TYPE_CHANGED", "LOCATION_CHANGED", "DETAILS_UPDATED",
                               "TASK_COMPLETED", "TASK_STATUS_UPDATED", "TASK_PROGRESS_UPDATED", "TASK_ADDED", "TASK_UPDATED", "TASK_DELETED",
                               "TASK_PARTS_STATUS_CHANGED", "TASK_PARTS_ORDER_ADDED", "TASK_PARTS_ORDER_UPDATED", "TASK_PARTS_ORDER_REMOVED",
                               "ISSUE_ADDED", "ISSUE_RESOLVED", "ISSUE_UPDATED", "ISSUE_COMMENT_ADDED", "ISSUE_DELETED",
                               "DOC_UPLOADED", "DOC_DELETED"].includes(activity.type) && (
                              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900">{activity.message}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              by {activity.actorName || "Unknown"} &middot; {formatRelativeTime(activity.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}

                      {activityData.hasMore && (
                        <button
                          onClick={() => fetchActivity(selectedVehicle.id, true)}
                          disabled={activityLoading}
                          className="w-full btn btn-ghost btn-sm text-slate-600"
                        >
                          {activityLoading ? (
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                              Loading...
                            </span>
                          ) : (
                            "Load more"
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drag Preview - floating card that follows cursor */}
      {draggedCard && dragPosition.x > 0 && dragPosition.y > 0 && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: dragPosition.x - 120,
            top: dragPosition.y - 30,
            transform: "rotate(3deg)",
            willChange: "left, top",
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-400 w-60 p-3 opacity-95">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900 text-sm truncate">
                {draggedCard.year} {draggedCard.make} {draggedCard.model}
              </p>
            </div>
            <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md inline-block mt-1">
              {draggedCard.regCurrent}
            </span>
          </div>
        </div>
      )}

      {showAddIssueModal && (
        <AddIssueModal
          issueForm={issueForm}
          setIssueForm={setIssueForm}
          isEditing={!!editingIssue}
          onClose={() => {
            setShowAddIssueModal(false);
            setEditingIssue(null);
            setIssueForm({
              category: "",
              subcategory: "",
              description: "",
              actionNeeded: "",
              priority: "medium",
              location: "",
              status: "outstanding",
              notes: "",
              photos: [],
              partsRequired: false,
              partsDetails: "",
            });
          }}
          onSubmit={editingIssue ? saveEditedIssue : addIssue}
        />
      )}

      {showAddLocationModal && (
        <AddLocationModal
          onClose={() => setShowAddLocationModal(false)}
          onSuccess={(newLocation) => {
            setLocations([...locations, newLocation]);
            setSelectedVehicle({ ...selectedVehicle, locationId: newLocation.id || newLocation._id });
            fetch(`/api/vehicles/${selectedVehicle.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ locationId: newLocation.id || newLocation._id }),
            }).then(() => {
              fetchVehicles();
              setShowAddLocationModal(false);
            });
          }}
        />
      )}

      {/* Parts Order Modal */}
      {showPartsOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPartsOrderId ? "Edit Parts Order" : "Add Parts Order"}
              </h3>
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
                  <span className="label-text font-medium">Supplier Type</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={partsOrderForm.supplierType}
                  onChange={(e) => setPartsOrderForm({ ...partsOrderForm, supplierType: e.target.value })}
                >
                  <option value="EURO_CAR_PARTS">Euro Car Parts</option>
                  <option value="TPS">TPS</option>
                  <option value="MAIN_DEALER">Main Dealer</option>
                  <option value="LOCAL_FACTOR">Local Factor</option>
                  <option value="ONLINE">Online</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              {partsOrderForm.supplierType === "OTHER" && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Supplier Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter supplier name"
                    className="input input-bordered w-full"
                    value={partsOrderForm.supplierName}
                    onChange={(e) => setPartsOrderForm({ ...partsOrderForm, supplierName: e.target.value })}
                  />
                </div>
              )}
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
                onClick={editingPartsOrderId ? updatePartsOrder : addPartsOrder}
              >
                {editingPartsOrderId ? "Update" : "Add Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Label Modal */}
      {showAddLabelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Create New Label</h3>
              <button
                onClick={() => {
                  setShowAddLabelModal(false);
                  setNewLabelForm({ name: "", colour: "#6366f1" });
                }}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Label Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Hot Lead, Awaiting Finance"
                  className="input input-bordered w-full"
                  value={newLabelForm.name}
                  onChange={(e) => setNewLabelForm({ ...newLabelForm, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Colour</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="w-12 h-10 rounded cursor-pointer border border-slate-300"
                    value={newLabelForm.colour}
                    onChange={(e) => setNewLabelForm({ ...newLabelForm, colour: e.target.value })}
                  />
                  <div className="flex gap-2">
                    {["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewLabelForm({ ...newLabelForm, colour: color })}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${newLabelForm.colour === color ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {/* Preview */}
              {newLabelForm.name && (
                <div className="pt-2">
                  <label className="label">
                    <span className="label-text font-medium">Preview</span>
                  </label>
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: newLabelForm.colour,
                      color: getLabelTextColor(newLabelForm.colour),
                    }}
                  >
                    {newLabelForm.name}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowAddLabelModal(false);
                  setNewLabelForm({ name: "", colour: "#6366f1" });
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={createLabel}
                disabled={!newLabelForm.name.trim()}
              >
                Create Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Sheet Share Modal */}
      {showJobSheetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Share Job Sheet</h3>
              <button
                onClick={() => {
                  setShowJobSheetModal(false);
                  setJobSheetLink(null);
                }}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
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
                    <p className="text-sm font-mono text-slate-900 break-all">{jobSheetLink.url}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    This link expires in 60 days. Anyone with this link can view the job sheet.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={copyJobSheetLink}
                      className="btn btn-outline btn-sm gap-2 min-w-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Link
                    </button>
                    <button
                      onClick={shareViaWhatsApp}
                      className="btn btn-success btn-sm gap-2 text-white min-w-0"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        const subject = `Job Sheet - ${selectedVehicle?.regCurrent || 'Vehicle'}`;
                        const body = `Here is the job sheet for ${selectedVehicle?.regCurrent || 'the vehicle'}:\n\n${jobSheetLink.url}`;
                        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                      }}
                      className="btn btn-outline btn-sm gap-2 min-w-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </button>
                    <button
                      onClick={() => window.open(jobSheetLink.url, '_blank')}
                      className="btn btn-outline btn-sm gap-2 min-w-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open & Download
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

      {/* Prep Summary Share Modal */}
      {showPrepSummaryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Prep Summary PDF</h3>
              <button
                onClick={() => {
                  setShowPrepSummaryModal(false);
                  setPrepSummaryLink(null);
                }}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {isGeneratingPrepSummary ? (
                <div className="flex flex-col items-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-slate-600">Generating prep summary...</p>
                </div>
              ) : prepSummaryLink ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Shareable Link</p>
                    <p className="text-sm font-mono text-slate-900 break-all">{prepSummaryLink.url}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    This link expires in 60 days. Click Print/PDF to save a PDF of the prep summary.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={copyPrepSummaryLink}
                      className="btn btn-outline btn-sm gap-2 min-w-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Link
                    </button>
                    <button
                      onClick={sharePrepSummaryViaWhatsApp}
                      className="btn btn-success btn-sm gap-2 text-white min-w-0"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        const subject = `Prep Summary - ${selectedVehicle?.regCurrent || 'Vehicle'}`;
                        const body = `Here is the prep summary for ${selectedVehicle?.regCurrent || 'the vehicle'}:\n\n${prepSummaryLink.url}`;
                        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                      }}
                      className="btn btn-outline btn-sm gap-2 min-w-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </button>
                    <button
                      onClick={() => window.open(prepSummaryLink.url, '_blank')}
                      className="btn btn-primary btn-sm gap-2 min-w-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open & Download
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
                  setShowPrepSummaryModal(false);
                  setPrepSummaryLink(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Share Fallback Modal */}
      {showManualShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Share Link</h3>
              <button
                onClick={() => {
                  setShowManualShareModal(false);
                  setManualShareUrl("");
                }}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-600">
                Copy the link below to share:
              </p>
              <div className="bg-slate-50 rounded-lg p-3 relative">
                <input
                  type="text"
                  value={manualShareUrl}
                  readOnly
                  className="w-full bg-transparent text-sm font-mono text-slate-900 border-none focus:outline-none pr-10"
                  onClick={(e) => e.target.select()}
                />
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(manualShareUrl);
                      toast.success("Link copied!");
                    } catch {
                      // If clipboard still fails, user can manually copy
                      toast.info("Select and copy the link manually");
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Click the link to select it, then use Ctrl+C (or Cmd+C on Mac) to copy.
              </p>
            </div>
            <div className="flex justify-end p-4 border-t border-slate-200">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowManualShareModal(false);
                  setManualShareUrl("");
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Move Vehicle Bottom Sheet */}
      <BottomSheet
        isOpen={!!moveVehicle}
        onClose={() => {
          setMoveVehicle(null);
          setMoveCurrentColumn(null);
        }}
        title={`Move ${moveVehicle?.regCurrent || "Vehicle"}`}
        hideAbove="md"
      >
        <div className="space-y-2">
          {COLUMNS.filter(c => c.key !== moveCurrentColumn).map((targetCol) => (
            <button
              key={targetCol.key}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 transition-colors"
              onClick={async () => {
                if (moveVehicle) {
                  await updateVehicleStatus(moveVehicle.id, targetCol.key);
                  toast.success(`Moved to ${targetCol.label}`);
                  setMoveVehicle(null);
                  setMoveCurrentColumn(null);
                }
              }}
            >
              <span className={`w-3 h-3 rounded-full ${targetCol.accentBg}`}></span>
              <span className="font-medium text-slate-700">{targetCol.label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* VRM Search Dropdown - Portal for proper positioning outside overflow containers */}
      {showVrmDropdown && (
        <Portal>
          <div
            ref={vrmDropdownRef}
            className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            style={{
              top: vrmDropdownPos.top,
              left: vrmDropdownPos.left,
              width: vrmDropdownPos.width,
              maxWidth: 'calc(100vw - 2rem)',
              maxHeight: 'min(320px, 50vh)',
              zIndex: 99999,
            }}
          >
            {isSearchingVrm ? (
              <div className="px-4 py-6 text-center">
                <span className="loading loading-spinner loading-sm text-slate-400"></span>
                <p className="text-sm text-slate-500 mt-2">Searching...</p>
              </div>
            ) : vrmSearchResults.length > 0 ? (
              <>
                <ul className="py-1 max-h-60 sm:max-h-64 overflow-y-auto overscroll-contain">
                  {vrmSearchResults.map((vehicle, idx) => {
                    const vrm = (vehicle.regCurrent || "").toUpperCase();
                    const duplicateCount = vrmSearchResults.filter(v => (v.regCurrent || "").toUpperCase() === vrm).length;
                    const isFirstOfDuplicate = idx === vrmSearchResults.findIndex(v => (v.regCurrent || "").toUpperCase() === vrm);
                    const isSelected = idx === vrmSelectedIndex;

                    // Check if vehicle is archived (delivered > 90 days ago)
                    const isArchived = vehicle.status === "delivered" && vehicle.soldAt &&
                      (Date.now() - new Date(vehicle.soldAt).getTime()) > (90 * 24 * 60 * 60 * 1000);

                    return (
                      <li key={vehicle.id || vehicle._id}>
                        <button
                          className={`w-full px-4 py-3.5 text-left transition-colors border-b border-slate-50 last:border-0 active:bg-blue-100 ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                          onClick={() => handleVrmSelect(vehicle)}
                          onTouchStart={() => setVrmSelectedIndex(idx)}
                          onMouseEnter={() => setVrmSelectedIndex(idx)}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-sm">{vehicle.regCurrent || vehicle.vrm}</span>
                              {duplicateCount > 1 && isFirstOfDuplicate && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold">
                                  Latest
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isArchived ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                              }`}>
                                {getStatusLabel(vehicle.status)}{isArchived ? " (Archived)" : ""}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">{vehicle.make} {vehicle.model} {vehicle.year || ""}</span>
                            <span className="text-slate-400">
                              Added: {formatStockDate(vehicle.createdAt)}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="px-3 py-2 bg-slate-50 border-t text-xs text-slate-500 flex items-center justify-between">
                  <span>Click to select vehicle</span>
                  <span className="text-slate-400">↑↓ Navigate • Enter to select</span>
                </div>
              </>
            ) : vrmSearch.length >= 2 ? (
              <div className="px-4 py-6 text-center">
                <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-slate-500">No vehicles found</p>
              </div>
            ) : (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-slate-500">Type 2+ characters to search</p>
              </div>
            )}
          </div>
        </Portal>
      )}

      {/* Inline Form Modals */}
      <InlineFormModal
        isOpen={showPdiModal}
        onClose={() => setShowPdiModal(false)}
        formType="PDI"
        prefill={{
          vrm: selectedVehicle?.regCurrent,
          make: selectedVehicle?.make,
          model: selectedVehicle?.model,
          mileage: selectedVehicle?.mileageCurrent,
          colour: selectedVehicle?.colour,
          vehicleId: selectedVehicle?.id,
        }}
        onSuccess={() => {
          toast.success("PDI completed successfully");
          fetchVehicles();
          setShowPdiModal(false);
        }}
      />

      <InlineFormModal
        isOpen={showServiceReceiptModal}
        onClose={() => setShowServiceReceiptModal(false)}
        formType="SERVICE_RECEIPT"
        prefill={{
          vrm: selectedVehicle?.regCurrent,
          make: selectedVehicle?.make,
          model: selectedVehicle?.model,
          mileage: selectedVehicle?.mileageCurrent,
          vehicleId: selectedVehicle?.id,
        }}
        onSuccess={() => {
          toast.success("Service receipt added");
          fetchVehicles();
          setShowServiceReceiptModal(false);
        }}
      />
    </DashboardLayout>
  );
}

// Component to display issue photos with signed URL fetching
function IssuePhoto({ photoKey, idx }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        const res = await fetch(`/api/uploads/signed-get?key=${encodeURIComponent(photoKey)}`);
        if (res.ok) {
          const data = await res.json();
          setSignedUrl(data.signedUrl);
        } else {
          setHasError(true);
        }
      } catch (err) {
        console.error("[IssuePhoto] Error fetching signed URL:", err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSignedUrl();
  }, [photoKey]);

  const handleClick = () => {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="w-16 h-16 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center animate-pulse">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasError || !signedUrl) {
    return (
      <div className="w-16 h-16 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center">
        <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group focus:outline-none"
    >
      <img
        src={signedUrl}
        alt={`Issue photo ${idx + 1}`}
        className="w-16 h-16 object-cover rounded-xl border-2 border-slate-200 group-hover:border-[#0066CC] group-hover:scale-105 transition-all cursor-pointer"
      />
    </button>
  );
}

function AddIssueModal({ issueForm, setIssueForm, onClose, onSubmit, isEditing = false }) {
  const [isLoading, setIsLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  const [isCompressing, setIsCompressing] = useState(false);

  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsCompressing(true);
    try {
      const compressedFiles = await compressImages(files);
      setPhotoFiles(prev => [...prev, ...compressedFiles]);

      // Create previews
      compressedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error("Compression error:", error);
      toast.error("Failed to process images");
    } finally {
      setIsCompressing(false);
    }
  };

  const removePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    const uploadedUrls = [];
    for (const file of photoFiles) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/vehicles/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Photo could not be uploaded");
      }
      const data = await res.json();
      // Store S3 key (permanent) if available, otherwise use URL (for local dev)
      uploadedUrls.push(data.key || data.url);
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Upload photos first if any
      let photoUrls = [];
      if (photoFiles.length > 0) {
        setIsUploadingPhotos(true);
        photoUrls = await uploadPhotos();
        setIsUploadingPhotos(false);
      }
      // Pass photo URLs/keys to onSubmit
      await onSubmit(photoUrls);
    } catch (error) {
      setIsUploadingPhotos(false);
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div
        className="modal-box max-w-2xl flex flex-col h-[100dvh] md:h-auto md:max-h-[90vh] bg-white p-0 rounded-none md:rounded-xl"
      >
        {/* Sticky Header */}
        <div
          className="shrink-0 flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-200 bg-white"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <h3 className="text-xl font-bold text-slate-900">{isEditing ? "Edit Issue" : "Add Issue"}</h3>
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
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category *</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:shadow-sm transition-all duration-200 outline-none appearance-none cursor-pointer"
                value={issueForm.category}
                onChange={(e) => {
                  setIssueForm({ ...issueForm, category: e.target.value, subcategory: "" });
                }}
                required
              >
                <option value="">Select category...</option>
                <option value="mechanical">Mechanical</option>
                <option value="electrical">Electrical</option>
                <option value="bodywork">Bodywork</option>
                <option value="interior">Interior</option>
                <option value="tyres">Tyres</option>
                <option value="mot">MOT</option>
                <option value="service">Service</option>
                <option value="fault_codes">Fault Codes</option>
                <option value="other">Other</option>
              </select>
            </div>

            {issueForm.category && (
              <div className="form-control">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subcategory</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:shadow-sm transition-all duration-200 outline-none appearance-none cursor-pointer"
                  value={issueForm.subcategory}
                  onChange={(e) => setIssueForm({ ...issueForm, subcategory: e.target.value })}
                >
                  <option value="">Select subcategory...</option>
                  {ISSUE_SUBCATEGORIES[issueForm.category]?.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Fault Codes field - only show for fault_codes category */}
            {issueForm.category === "fault_codes" && (
              <div className="form-control col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fault Codes</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-lg text-slate-900 font-mono placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:shadow-sm transition-all duration-200 outline-none"
                  value={issueForm.faultCodes || ""}
                  onChange={(e) => setIssueForm({ ...issueForm, faultCodes: e.target.value })}
                  placeholder="e.g. P0301, P0420, C1234"
                />
                <p className="text-xs text-slate-400 mt-1.5">Enter codes separated by commas</p>
              </div>
            )}

            <div className="form-control col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description *</label>
              <textarea
                className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:shadow-sm transition-all duration-200 outline-none resize-none"
                value={issueForm.description}
                onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                placeholder={issueForm.category === "fault_codes" ? "Describe what the fault codes indicate..." : "Describe the issue..."}
                required
                rows="3"
              ></textarea>
            </div>

            <div className="form-control col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Action Needed</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:shadow-sm transition-all duration-200 outline-none"
                value={issueForm.actionNeeded}
                onChange={(e) => setIssueForm({ ...issueForm, actionNeeded: e.target.value })}
                placeholder="What needs to be done?"
              />
            </div>

            <div className="form-control">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:shadow-sm transition-all duration-200 outline-none appearance-none cursor-pointer"
                value={issueForm.priority || "medium"}
                onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-control">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:shadow-sm transition-all duration-200 outline-none"
                value={issueForm.location || ""}
                onChange={(e) => setIssueForm({ ...issueForm, location: e.target.value })}
                placeholder="e.g., Front Left, Rear Bumper"
              />
            </div>

            <div className="form-control">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:shadow-sm transition-all duration-200 outline-none appearance-none cursor-pointer"
                value={issueForm.status}
                onChange={(e) => setIssueForm({ ...issueForm, status: e.target.value })}
              >
                <option value="outstanding">Outstanding</option>
                <option value="ordered">Ordered</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Parts Required Section */}
            <div className="form-control flex items-center">
              <label className="flex items-center gap-3 cursor-pointer mt-6">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={issueForm.partsRequired || false}
                    onChange={(e) => setIssueForm({ ...issueForm, partsRequired: e.target.checked })}
                  />
                  <div className="w-5 h-5 rounded border-2 border-slate-300 peer-checked:border-[#0066CC] peer-checked:bg-[#0066CC] transition-all duration-200 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-700">Parts Required</span>
              </label>
            </div>

            {issueForm.partsRequired && (
              <div className="form-control col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Parts Details</label>
                <textarea
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:shadow-sm transition-all duration-200 outline-none resize-none"
                  value={issueForm.partsDetails || ""}
                  onChange={(e) => setIssueForm({ ...issueForm, partsDetails: e.target.value })}
                  placeholder="Supplier, part numbers, who ordered, ETA..."
                  rows="2"
                ></textarea>
              </div>
            )}

            <div className="form-control col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
              <textarea
                className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066CC] focus:shadow-sm transition-all duration-200 outline-none resize-none"
                value={issueForm.notes}
                onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                placeholder="Additional notes..."
                rows="2"
              ></textarea>
            </div>

            {/* Assign To Team Members */}
            <div className="form-control col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assign To</label>
              <TeamMemberPicker
                value={issueForm.assignedToUserIds || []}
                onChange={(userIds) => setIssueForm({ ...issueForm, assignedToUserIds: userIds })}
                placeholder="Select team members to notify..."
              />
              <p className="text-xs text-slate-400 mt-1">Selected team members will receive a notification about this issue</p>
            </div>

            {/* Photo Upload */}
            <div className="form-control col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Photos</label>
              {/* Existing photos (when editing) */}
              {issueForm.photos?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-2">Existing photos:</p>
                  <div className="flex flex-wrap gap-2">
                    {issueForm.photos.map((photo, idx) => (
                      <div key={idx} className="relative">
                        <IssuePhoto photoKey={photo} idx={idx} />
                        <button
                          type="button"
                          onClick={() => setIssueForm({
                            ...issueForm,
                            photos: issueForm.photos.filter((_, i) => i !== idx)
                          })}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {isCompressing && (
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Compressing images...</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {/* Take Photo - opens camera on mobile */}
                <label className="flex items-center gap-2 px-4 py-2.5 bg-[#0066CC] hover:bg-[#0055BB] text-white font-medium rounded-lg cursor-pointer transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Take Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {/* Upload Photos - opens gallery with multi-select */}
                <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg cursor-pointer transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Upload Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
              {photoPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {photoPreviews.map((preview, idx) => (
                    <div key={idx} className="relative">
                      <img src={preview} alt={`Preview ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>{/* End scrollable content */}

          {/* Sticky Footer */}
          <div
            className="shrink-0 flex items-center justify-end gap-3 px-4 md:px-6 py-4 border-t border-slate-200 bg-white"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 font-medium rounded-lg transition-all duration-200"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0066CC] hover:bg-[#0055BB] text-white font-medium rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isLoading || isUploadingPhotos}
            >
              {isLoading || isUploadingPhotos ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>{isUploadingPhotos ? "Uploading photos..." : "Saving..."}</span>
                </>
              ) : isEditing ? "Save Changes" : "Add Issue"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

function AddLocationModal({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Location name is required");

    setIsLoading(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type: "offsite" }),
      });
      if (!res.ok) throw new Error("Failed to create location");
      const newLocation = await res.json();
      toast.success("Location added");
      onSuccess(newLocation);
    } catch (error) {
      toast.error("Failed to add location");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Add New Location</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Location Name *</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., ABC Body Shop, Paint Centre"
              required
              autoFocus
            />
          </div>
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <span className="loading loading-spinner"></span> : "Add Location"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
