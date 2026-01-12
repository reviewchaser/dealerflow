import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import DealDrawer from "@/components/DealDrawer";
import { toast } from "react-hot-toast";
import useDealerRedirect from "@/hooks/useDealerRedirect";

// Status configuration
const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "DEPOSIT_TAKEN", label: "Deposit Taken" },
  { key: "INVOICED", label: "Invoiced" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  DEPOSIT_TAKEN: { label: "Deposit Taken", color: "bg-amber-100 text-amber-700" },
  INVOICED: { label: "Invoiced", color: "bg-blue-100 text-blue-700" },
  DELIVERED: { label: "Delivered", color: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

// Format date helper
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function Sales() {
  const router = useRouter();
  const { isRedirecting } = useDealerRedirect();
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [kpiPeriod, setKpiPeriod] = useState("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Initialize custom date range from URL
  useEffect(() => {
    if (router.isReady) {
      const { from, to } = router.query;
      if (from && to) {
        setKpiPeriod("custom");
        setCustomFrom(from);
        setCustomTo(to);
      }
    }
  }, [router.isReady, router.query]);

  // Drawer state is purely URL-driven - no local state needed
  // This ensures drawer stays open even across re-renders/refetches
  // Wait for router.isReady to ensure query params are available
  const selectedDealId = router.isReady ? (router.query.id || null) : null;
  const isDrawerOpen = !!selectedDealId;

  // Create sale modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState(null);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [creatingDealForVehicle, setCreatingDealForVehicle] = useState(null); // Track which vehicle is being processed

  // Load deals
  const fetchDeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = activeStatus !== "all" ? `?status=${activeStatus}` : "";
      const response = await fetch(`/api/deals${statusParam}`);
      if (!response.ok) throw new Error("Failed to fetch deals");
      const data = await response.json();
      setDeals(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load deals");
    } finally {
      setIsLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    if (!isRedirecting) {
      fetchDeals();
    }
  }, [isRedirecting, fetchDeals]);

  // Handle create=1 query param to open create modal
  useEffect(() => {
    if (router.query.create === "1") {
      setShowCreateModal(true);
      // Remove ONLY the create param, preserve id if present
      const { create, ...restQuery } = router.query;
      const queryString = Object.keys(restQuery).length > 0
        ? "?" + new URLSearchParams(restQuery).toString()
        : "";
      router.replace(`/sales${queryString}`, undefined, { shallow: true });
    }
  }, [router.query.create]);

  // Load available vehicles when modal opens
  const fetchAvailableVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    setVehiclesError(null);
    try {
      // Fetch vehicles that can be sold (not sold status, eligible for sale)
      const res = await fetch("/api/vehicles?forSale=true");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch vehicles (${res.status})`);
      }
      const data = await res.json();
      setAvailableVehicles(data.vehicles || data);
    } catch (error) {
      console.error("[Sales] Vehicle fetch error:", error);
      setVehiclesError(error.message || "Failed to load vehicles");
      setAvailableVehicles([]);
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showCreateModal) {
      fetchAvailableVehicles();
    }
  }, [showCreateModal, fetchAvailableVehicles]);

  // Create a deal for a vehicle, or open existing deal
  const handleSelectVehicle = async (vehicle) => {
    const vehicleId = vehicle.id || vehicle._id;
    setCreatingDealForVehicle(vehicleId);

    try {
      // If vehicle already has an active deal, open it directly via URL
      if (vehicle.activeDeal) {
        const targetId = vehicle.activeDeal.id;
        toast.success("Opening existing deal");
        setShowCreateModal(false);
        setVehicleSearch("");
        await router.push(`/sales?id=${targetId}`, undefined, { shallow: true });
        return;
      }

      // Create new deal
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check if the error is because vehicle already has a deal
        if (data.existingDealId) {
          toast.success("Opening existing deal");
          setShowCreateModal(false);
          setVehicleSearch("");
          await router.push(`/sales?id=${data.existingDealId}`, undefined, { shallow: true });
          fetchDeals();
          return;
        }
        throw new Error(data.error || "Failed to create deal");
      }

      const newDealId = data.id || data._id;
      toast.success("Deal created");
      setShowCreateModal(false);
      setVehicleSearch("");
      await router.push(`/sales?id=${newDealId}`, undefined, { shallow: true });
      fetchDeals();
    } catch (error) {
      console.error("[Sales] Create deal error:", error);
      toast.error(error.message || "Could not create sale");
    } finally {
      setCreatingDealForVehicle(null);
    }
  };

  // Delete a cancelled deal
  const handleDeleteDeal = async (dealId, e) => {
    e?.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this cancelled deal?")) {
      return;
    }

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hardDelete: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete deal");
      }

      toast.success("Deal deleted");
      fetchDeals();
    } catch (error) {
      toast.error(error.message || "Failed to delete deal");
    }
  };

  // Filter vehicles by search
  const filteredVehicles = availableVehicles.filter((vehicle) => {
    if (!vehicleSearch) return true;
    const query = vehicleSearch.toLowerCase();
    return (
      vehicle.regCurrent?.toLowerCase().includes(query) ||
      vehicle.make?.toLowerCase().includes(query) ||
      vehicle.model?.toLowerCase().includes(query) ||
      vehicle.stockNumber?.toLowerCase().includes(query)
    );
  });

  // Filter deals by search
  const filteredDeals = deals.filter((deal) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      deal.vehicle?.regCurrent?.toLowerCase().includes(query) ||
      deal.vehicle?.make?.toLowerCase().includes(query) ||
      deal.vehicle?.model?.toLowerCase().includes(query) ||
      deal.customer?.displayName?.toLowerCase().includes(query) ||
      deal.customer?.companyName?.toLowerCase().includes(query) ||
      deal.dealNumber?.toString().includes(query)
    );
  });

  // Count by status
  const statusCounts = deals.reduce((acc, deal) => {
    acc[deal.status] = (acc[deal.status] || 0) + 1;
    return acc;
  }, {});

  // Calculate KPIs based on period
  const calculateKPIs = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const thisQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Custom date range
    const customStart = customFrom ? new Date(customFrom) : null;
    const customEnd = customTo ? new Date(customTo + "T23:59:59") : null;

    // Helper function to check if date is in period
    const isInPeriod = (date, useCreatedAt = false) => {
      if (!date) return false;
      const checkDate = new Date(date);
      if (kpiPeriod === "all") return true;
      if (kpiPeriod === "custom" && customStart && customEnd) {
        return checkDate >= customStart && checkDate <= customEnd;
      }
      if (kpiPeriod === "last_7_days") return checkDate >= last7Days;
      if (kpiPeriod === "last_30_days") return checkDate >= last30Days;
      if (kpiPeriod === "this_month") return checkDate >= thisMonth;
      if (kpiPeriod === "last_month") return checkDate >= lastMonth && checkDate < thisMonth;
      if (kpiPeriod === "quarter") return checkDate >= thisQuarter;
      if (kpiPeriod === "ytd") return checkDate >= startOfYear;
      return true;
    };

    // Filter deals by period - use createdAt for counting deals
    const periodDeals = deals.filter((deal) => isInPeriod(deal.createdAt));

    // For revenue/profit KPIs: use invoicedAt date and exclude drafts/cancelled
    const revenueDeals = deals.filter((deal) => {
      // Must be invoiced or beyond (not draft/deposit only)
      if (!["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) return false;
      // Use invoicedAt for date filtering
      if (!deal.invoicedAt) return false;
      return isInPeriod(deal.invoicedAt);
    });

    let totalGross = 0;
    let totalVat = 0;
    let totalProfit = 0;
    let dealsWithProfit = 0;
    let dealsWithMissingSIV = 0;
    let dealsWithMissingSalePrice = 0;

    revenueDeals.forEach((deal) => {
      const vehiclePrice = deal.vehiclePriceGross || 0;
      const vehicleVat = deal.vehicleVatAmount || 0;

      if (vehiclePrice > 0) {
        totalGross += vehiclePrice;
        totalVat += vehicleVat;

        // Calculate profit if we have purchase info (SIV)
        const siv = deal.vehicle?.purchase?.purchasePriceNet || 0;
        if (siv > 0) {
          // For margin scheme: profit = sale gross - SIV
          // For VAT qualifying: profit = sale net - (SIV - purchase VAT)
          if (deal.vatScheme === "VAT_QUALIFYING") {
            const saleNet = deal.vehiclePriceNet || (vehiclePrice - vehicleVat);
            const purchaseVat = deal.vehicle?.purchase?.purchaseVat || 0;
            const purchaseNet = siv - purchaseVat;
            totalProfit += saleNet - purchaseNet;
          } else {
            totalProfit += vehiclePrice - siv;
          }
          dealsWithProfit++;
        } else {
          dealsWithMissingSIV++;
        }
      } else {
        dealsWithMissingSalePrice++;
      }
    });

    const totalRevenueDeals = revenueDeals.length;
    const completeDeals = dealsWithProfit;
    const coverage = totalRevenueDeals > 0
      ? Math.round((completeDeals / totalRevenueDeals) * 100)
      : 100;

    return {
      totalDeals: periodDeals.length,
      activeDeals: periodDeals.filter((d) => !["COMPLETED", "CANCELLED"].includes(d.status)).length,
      completedDeals: periodDeals.filter((d) => d.status === "COMPLETED").length,
      invoicedDeals: revenueDeals.length,
      totalGross,
      totalVat,
      totalProfit,
      dealsWithMissingSIV,
      dealsWithMissingSalePrice,
      coverage,
      completeDeals,
      totalRevenueDeals,
    };
  }, [deals, kpiPeriod, customFrom, customTo]);

  const kpis = calculateKPIs();

  // Open drawer by updating URL - drawer state is derived from URL
  const handleDealClick = (dealId) => {
    router.push(`/sales?id=${dealId}`, undefined, { shallow: true });
  };

  // Close drawer by removing id from URL
  const handleDrawerClose = () => {
    router.push("/sales", undefined, { shallow: true });
  };

  if (isRedirecting) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Sales | DealerHQ</title>
      </Head>

      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">Sales</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {deals.length} deal{deals.length !== 1 ? "s" : ""} total
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 md:w-72">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by VRM, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input input-bordered w-full pl-10 h-10"
                />
                </div>

                {/* Create Sale Button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="hidden sm:inline">Create Sale</span>
                </button>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="mt-4 -mb-px flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {STATUS_TABS.map((tab) => {
                const count = tab.key === "all" ? deals.length : statusCounts[tab.key] || 0;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveStatus(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      activeStatus === tab.key
                        ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span
                        className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                          activeStatus === tab.key
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="px-4 md:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Period Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500">Period:</span>
              <select
                value={kpiPeriod}
                onChange={(e) => {
                  const val = e.target.value;
                  setKpiPeriod(val);
                  // Clear custom dates from URL when switching away from custom
                  if (val !== "custom") {
                    const { from, to, ...restQuery } = router.query;
                    const queryString = Object.keys(restQuery).length > 0
                      ? "?" + new URLSearchParams(restQuery).toString()
                      : "";
                    router.replace(`/sales${queryString}`, undefined, { shallow: true });
                    setCustomFrom("");
                    setCustomTo("");
                  }
                }}
                className="select select-sm select-bordered bg-white"
              >
                <option value="last_7_days">Last 7 days</option>
                <option value="last_30_days">Last 30 days</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="quarter">Quarter to Date</option>
                <option value="ytd">Year to Date</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
              {/* Custom Date Range Inputs */}
              {kpiPeriod === "custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => {
                      setCustomFrom(e.target.value);
                      // Update URL when both dates are set
                      if (e.target.value && customTo) {
                        const newQuery = { ...router.query, from: e.target.value, to: customTo };
                        router.replace({ pathname: "/sales", query: newQuery }, undefined, { shallow: true });
                      }
                    }}
                    className="input input-sm input-bordered bg-white w-36"
                    placeholder="From"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => {
                      setCustomTo(e.target.value);
                      // Update URL when both dates are set
                      if (customFrom && e.target.value) {
                        const newQuery = { ...router.query, from: customFrom, to: e.target.value };
                        router.replace({ pathname: "/sales", query: newQuery }, undefined, { shallow: true });
                      }
                    }}
                    className="input input-sm input-bordered bg-white w-36"
                    placeholder="To"
                  />
                </div>
              )}
            </div>

            {/* KPI Cards */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Total Deals */}
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500 font-medium">Deals</p>
                <p className="text-lg font-bold text-slate-900">{kpis.totalDeals}</p>
                <p className="text-[10px] text-slate-400">{kpis.activeDeals} active</p>
              </div>

              {/* Gross Revenue */}
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500 font-medium">Gross Revenue</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(kpis.totalGross)}</p>
                <p className="text-[10px] text-slate-400">total sales value</p>
              </div>

              {/* VAT Due */}
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500 font-medium">VAT Due</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(kpis.totalVat)}</p>
                <p className="text-[10px] text-slate-400">output VAT</p>
              </div>

              {/* Profit */}
              <div className="bg-white rounded-xl border border-emerald-200 px-4 py-3">
                <p className="text-xs text-emerald-600 font-medium">Profit</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(kpis.totalProfit)}</p>
                <p className="text-[10px] text-slate-400">gross margin</p>
              </div>

              {/* Data Quality */}
              <div className={`bg-white rounded-xl border px-4 py-3 ${
                kpis.coverage === 100 ? "border-emerald-200" : "border-amber-200"
              }`}>
                <p className="text-xs text-slate-500 font-medium">Data Coverage</p>
                {kpis.totalRevenueDeals > 0 ? (
                  <>
                    <p className={`text-lg font-bold ${kpis.coverage === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                      {kpis.coverage}%
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {kpis.completeDeals}/{kpis.totalRevenueDeals} with SIV
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-slate-400">—</p>
                    <p className="text-[10px] text-slate-400">no invoiced deals</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="loading loading-spinner loading-lg text-[#0066CC]"></span>
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No deals found</h3>
              <p className="text-slate-500 mb-4">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : activeStatus !== "all"
                  ? `No deals with status "${STATUS_CONFIG[activeStatus]?.label}"`
                  : "Create a sale to get started"}
              </p>
              {!searchQuery && activeStatus === "all" && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Sale
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeals.map((deal) => {
                const statusConfig = STATUS_CONFIG[deal.status] || STATUS_CONFIG.DRAFT;

                return (
                  <div
                    key={deal.id}
                    onClick={() => handleDealClick(deal.id)}
                    className="bg-white rounded-xl border border-slate-200 hover:border-[#0066CC]/30 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="p-4 md:p-5">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Vehicle Image & Basic Info */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {deal.vehicle?.primaryImageUrl ? (
                            <img
                              src={deal.vehicle.primaryImageUrl}
                              alt={`${deal.vehicle.make} ${deal.vehicle.model}`}
                              className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                              <svg
                                className="w-8 h-8 text-slate-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                {deal.vehicle?.regCurrent || "—"}
                              </span>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.color}`}
                              >
                                {statusConfig.label}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-800 mt-1 truncate">
                              {deal.vehicle?.year} {deal.vehicle?.make} {deal.vehicle?.model}
                            </p>
                            {deal.customer && (
                              <p className="text-sm text-slate-500 truncate mt-0.5">
                                {deal.customer.displayName}
                                {deal.customer.companyName && ` • ${deal.customer.companyName}`}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Price & Date */}
                        <div className="flex items-center justify-between md:flex-col md:items-end gap-2 md:gap-1 border-t border-slate-100 pt-3 md:border-0 md:pt-0">
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">
                              {formatCurrency(deal.vehiclePriceGross)}
                            </p>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">
                              {deal.vatScheme === "VAT_QUALIFYING" ? "inc VAT" : "Margin"}
                            </p>
                          </div>
                          <p className="text-xs text-slate-400">
                            {formatDate(deal.createdAt)}
                          </p>
                        </div>

                        {/* Quick Actions for cancelled deals */}
                        {deal.status === "CANCELLED" && (
                          <button
                            onClick={(e) => handleDeleteDeal(deal.id, e)}
                            className="shrink-0 ml-2 p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete cancelled deal"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress indicators */}
                    {deal.status !== "CANCELLED" && deal.status !== "COMPLETED" && (
                      <div className="px-4 pb-3 md:px-5 md:pb-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-1">
                            {["DRAFT", "DEPOSIT_TAKEN", "INVOICED", "DELIVERED", "COMPLETED"].map(
                              (step, idx) => {
                                const statusOrder = [
                                  "DRAFT",
                                  "DEPOSIT_TAKEN",
                                  "INVOICED",
                                  "DELIVERED",
                                  "COMPLETED",
                                ];
                                const currentIdx = statusOrder.indexOf(deal.status);
                                const stepIdx = idx;

                                return (
                                  <div
                                    key={step}
                                    className={`h-1.5 flex-1 rounded-full ${
                                      stepIdx <= currentIdx
                                        ? "bg-[#0066CC]"
                                        : "bg-slate-200"
                                    }`}
                                  />
                                );
                              }
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deal Drawer - state is URL-driven, stays open across re-renders */}
      <DealDrawer
        dealId={selectedDealId}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onUpdate={fetchDeals}
      />

      {/* Create Sale Modal - Vehicle Picker */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Sale</h3>
                <p className="text-sm text-slate-500">Select a vehicle from stock</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-sm btn-ghost btn-circle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-slate-100">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by VRM, make, model..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="input input-bordered w-full pl-10"
                  autoFocus
                />
              </div>
            </div>

            {/* Vehicle List */}
            <div className="flex-1 overflow-y-auto">
              {vehiclesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-[#0066CC]"></span>
                </div>
              ) : vehiclesError ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600">Couldn't load vehicles</p>
                  <p className="text-xs text-slate-400 mt-1">{vehiclesError}</p>
                  <button
                    onClick={fetchAvailableVehicles}
                    className="btn btn-sm btn-ghost text-[#0066CC] mt-3"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry
                  </button>
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    {vehicleSearch ? "No matching vehicles found" : "No eligible vehicles found"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Vehicles must be in stock (not sold, delivered, or archived)
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredVehicles.map((vehicle) => {
                    const vehicleId = vehicle.id || vehicle._id;
                    const isProcessing = creatingDealForVehicle === vehicleId;
                    const hasActiveDeal = !!vehicle.activeDeal;

                    return (
                      <button
                        key={vehicleId}
                        onClick={() => handleSelectVehicle(vehicle)}
                        disabled={!!creatingDealForVehicle}
                        className={`w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left ${
                          creatingDealForVehicle && !isProcessing ? "opacity-50" : ""
                        }`}
                      >
                        {vehicle.primaryImageUrl ? (
                          <img
                            src={vehicle.primaryImageUrl}
                            alt={`${vehicle.make} ${vehicle.model}`}
                            className="w-16 h-16 object-cover rounded-xl shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              {vehicle.regCurrent}
                            </span>
                            {vehicle.stockNumber && (
                              <span className="text-xs text-slate-400">
                                #{vehicle.stockNumber}
                              </span>
                            )}
                            {/* Vehicle status badge */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              vehicle.status === "in_stock" ? "bg-orange-100 text-orange-700" :
                              vehicle.status === "in_prep" ? "bg-blue-100 text-blue-700" :
                              vehicle.status === "live" ? "bg-cyan-100 text-cyan-700" :
                              vehicle.status === "reserved" ? "bg-emerald-100 text-emerald-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {vehicle.status === "in_stock" ? "Not Advertised" :
                               vehicle.status === "in_prep" ? "Advertised" :
                               vehicle.status === "live" ? "Sold In Progress" :
                               vehicle.status === "reserved" ? "Completed" :
                               vehicle.status}
                            </span>
                            {/* Active deal badge */}
                            {hasActiveDeal && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                                Has active sale
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-800 mt-1 truncate">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                        </div>
                        {isProcessing ? (
                          <span className="loading loading-spinner loading-sm text-[#0066CC]"></span>
                        ) : (
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
