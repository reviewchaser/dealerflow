import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";

export default function HolidaySettings() {
  const router = useRouter();
  const { data: session } = useSession();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, approved, rejected
  const [searchQuery, setSearchQuery] = useState(""); // Employee name search
  const [userRole, setUserRole] = useState(null);

  // Read filter from URL on load
  useEffect(() => {
    if (router.query.filter) {
      setFilter(router.query.filter);
    }
  }, [router.query.filter]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [newRequest, setNewRequest] = useState({
    startDate: "",
    endDate: "",
    startSession: "AM",
    endSession: "PM",
    type: "Holiday",
    notes: "",
    requestForUserId: "",
  });
  const [adminNote, setAdminNote] = useState("");
  const [actionModal, setActionModal] = useState({ open: false, request: null, action: null });
  const [isProcessing, setIsProcessing] = useState(false);

  const isAdmin = userRole === "OWNER" || userRole === "ADMIN";

  // Fetch user's role from dealer context
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch("/api/dealer");
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.currentUserRole);
          console.log("Holiday page - fetched role:", data.currentUserRole);
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };
    fetchRole();
  }, []);

  useEffect(() => {
    fetchRequests();
    if (isAdmin) {
      fetchTeamMembers();
    }
  }, [isAdmin]);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/holiday-requests");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      toast.error("Failed to load holiday requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch("/api/team");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTeamMembers(data);
    } catch (error) {
      console.error("Failed to load team members");
    }
  };

  const handleApprove = async (request) => {
    // Defensive check for missing ID
    const requestId = request?.id || request?._id;
    if (!requestId) {
      toast.error("Missing request ID - cannot approve");
      console.error("handleApprove called with missing ID:", request);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/holiday-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: adminNote || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to approve");
      }
      toast.success("Holiday approved");
      setActionModal({ open: false, request: null, action: null });
      setAdminNote("");
      fetchRequests();
    } catch (error) {
      toast.error(error.message || "Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (request) => {
    // Defensive check for missing ID
    const requestId = request?.id || request?._id;
    if (!requestId) {
      toast.error("Missing request ID - cannot reject");
      console.error("handleReject called with missing ID:", request);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/holiday-requests/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: adminNote || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reject");
      }
      toast.success("Holiday rejected");
      setActionModal({ open: false, request: null, action: null });
      setAdminNote("");
      fetchRequests();
    } catch (error) {
      toast.error(error.message || "Failed to reject request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (requestId) => {
    if (!requestId) {
      toast.error("Missing request ID - cannot delete");
      return;
    }
    if (!confirm("Delete this holiday request?")) return;
    try {
      const res = await fetch(`/api/holiday-requests/${requestId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Delete failed (${res.status})`);
      }
      toast.success("Holiday request deleted");
      fetchRequests();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete request");
    }
  };

  // Compute total days based on AM/PM sessions (mirrors server logic)
  const computeTotalDays = (startDate, endDate, startSession, endSession) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.round((end - start) / msPerDay);

    if (daysDiff < 0) return null;

    // Same day
    if (daysDiff === 0) {
      if (startSession === "PM" && endSession === "AM") return null;
      if (startSession === "AM" && endSession === "PM") return 1.0;
      return 0.5;
    }

    // Multi-day
    const startDayValue = startSession === "PM" ? 0.5 : 1.0;
    const endDayValue = endSession === "AM" ? 0.5 : 1.0;
    const middleDays = daysDiff - 1;

    return startDayValue + middleDays + endDayValue;
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!newRequest.startDate) {
      toast.error("Please select a start date");
      return;
    }

    // Client-side validation
    const start = new Date(newRequest.startDate);
    // End date defaults to start date if not provided
    const end = newRequest.endDate ? new Date(newRequest.endDate) : new Date(newRequest.startDate);

    if (end < start) {
      toast.error("End date must be on or after start date");
      return;
    }

    // Compute total days with AM/PM
    const totalDays = computeTotalDays(start, end, newRequest.startSession, newRequest.endSession);

    if (totalDays === null) {
      toast.error("Invalid session combination: PM to AM on the same day is not allowed");
      return;
    }

    if (totalDays > 60) {
      toast.error("Holiday request cannot exceed 60 days");
      return;
    }

    // Check date range - start not more than 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (start < oneYearAgo) {
      toast.error("Start date cannot be more than 1 year in the past");
      return;
    }

    // End date not more than 2 years in future
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    if (end > twoYearsFromNow) {
      toast.error("End date cannot be more than 2 years in the future");
      return;
    }

    try {
      const res = await fetch("/api/holiday-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: newRequest.startDate,
          endDate: newRequest.endDate || newRequest.startDate, // Default to start date
          startSession: newRequest.startSession,
          endSession: newRequest.endSession,
          type: newRequest.type,
          notes: newRequest.notes,
          requestForUserId: newRequest.requestForUserId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      toast.success("Holiday request created");
      setShowCreateModal(false);
      setNewRequest({ startDate: "", endDate: "", startSession: "AM", endSession: "PM", type: "Holiday", notes: "", requestForUserId: "" });
      fetchRequests();
    } catch (error) {
      toast.error(error.message || "Failed to create request");
    }
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
      case "APPROVED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</span>;
      case "REJECTED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Holiday":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case "Sick":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case "Unpaid":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const filteredRequests = requests.filter((req) => {
    // Status filter
    if (filter !== "all" && req.status !== filter.toUpperCase()) {
      return false;
    }
    // Employee name search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const nameMatch = (req.userName || "").toLowerCase().includes(query);
      const emailMatch = (req.userEmail || "").toLowerCase().includes(query);
      if (!nameMatch && !emailMatch) return false;
    }
    return true;
  });

  // Calculate total approved days for the current year
  const currentYear = new Date().getFullYear();
  const approvedThisYear = requests.filter(
    (r) => r.status === "APPROVED" && new Date(r.startDate).getFullYear() === currentYear
  );
  const totalApprovedDays = approvedThisYear.reduce(
    (sum, r) => sum + calculateDays(r.startDate, r.endDate),
    0
  );
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const pendingDays = requests
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + calculateDays(r.startDate, r.endDate), 0);

  return (
    <DashboardLayout>
      <Head><title>Holidays | DealerFlow</title></Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold">Holiday Requests</h1>
            <p className="text-base-content/60 mt-1">
              {isAdmin ? "Manage team holiday requests" : "View and request time off"}
            </p>
          </div>
          <button
            className="btn btn-primary w-full sm:w-auto"
            onClick={() => setShowCreateModal(true)}
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Request Holiday
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <p className="text-3xl font-bold text-success">{totalApprovedDays}</p>
            <p className="text-sm text-base-content/60">Days approved ({currentYear})</p>
          </div>
        </div>
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <p className="text-3xl font-bold text-warning">{pendingCount}</p>
            <p className="text-sm text-base-content/60">Pending requests</p>
          </div>
        </div>
        <div className="card bg-base-200 col-span-2 md:col-span-1">
          <div className="card-body p-4">
            <p className="text-3xl font-bold">{pendingDays}</p>
            <p className="text-sm text-base-content/60">Pending days</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Employee Search */}
        {isAdmin && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm input-bordered w-full sm:w-64 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Status Filters */}
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`btn btn-sm ${filter === "pending" ? "btn-warning" : "btn-ghost"}`}
            onClick={() => setFilter("pending")}
          >
            Pending
            {requests.filter((r) => r.status === "PENDING").length > 0 && (
              <span className="badge badge-xs ml-1">
                {requests.filter((r) => r.status === "PENDING").length}
              </span>
            )}
          </button>
          <button
            className={`btn btn-sm ${filter === "approved" ? "btn-success" : "btn-ghost"}`}
            onClick={() => setFilter("approved")}
          >
            Approved
          </button>
          <button
            className={`btn btn-sm ${filter === "rejected" ? "btn-error" : "btn-ghost"}`}
            onClick={() => setFilter("rejected")}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card bg-base-200">
          <div className="card-body text-center py-12">
            <p className="text-base-content/60">No holiday requests found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <div
              key={request.id || request._id}
              className="card bg-base-200 hover:bg-base-300/50 transition-colors"
            >
              <div className="card-body p-4">
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div className="p-2 bg-base-100 rounded-lg text-base-content/60">
                    {getTypeIcon(request.type)}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{request.userName}</span>
                      {getStatusBadge(request.status)}
                      <span className="text-sm text-base-content/50">{request.type}</span>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="font-medium">
                        {formatDate(request.startDate)}
                        {request.startSession && <span className="text-xs text-base-content/50 ml-1">({request.startSession})</span>}
                        {" - "}
                        {formatDate(request.endDate)}
                        {request.endSession && <span className="text-xs text-base-content/50 ml-1">({request.endSession})</span>}
                      </span>
                      <span className="text-base-content/50 ml-2">
                        {(() => {
                          // Use server-computed days if available, otherwise calculate
                          const days = request.totalDaysComputed || request.totalDays || calculateDays(request.startDate, request.endDate);
                          if (days > 60) {
                            return <span className="text-error font-semibold">⚠️ {days} days (invalid)</span>;
                          }
                          return `(${days} day${days !== 1 ? "s" : ""})`;
                        })()}
                      </span>
                    </div>
                    {request.notes && (
                      <p className="text-sm text-base-content/60 mt-1 truncate">
                        {request.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-base-content/50">
                      <span>Created {timeAgo(request.createdAt)}</span>
                      {request.reviewedByName && (
                        <span>
                          {request.status === "APPROVED" ? "Approved" : "Rejected"} by {request.reviewedByName}
                        </span>
                      )}
                    </div>
                    {request.adminNote && (
                      <div className="mt-2 p-2 bg-base-100 rounded text-sm">
                        <span className="text-base-content/50">Note: </span>
                        {request.adminNote}
                      </div>
                    )}
                  </div>

                  {/* Actions - Prominent buttons for Admin/Owner */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {request.status === "PENDING" && isAdmin && (
                      <>
                        <button
                          className="btn btn-success btn-sm gap-1 shadow-sm hover:shadow-md transition-all"
                          onClick={() => setActionModal({ open: true, request, action: "approve" })}
                          disabled={isProcessing}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </button>
                        <button
                          className="btn btn-error btn-outline btn-sm gap-1"
                          onClick={() => setActionModal({ open: true, request, action: "reject" })}
                          disabled={isProcessing}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      </>
                    )}
                    {(isAdmin || request.status === "PENDING") && (
                      <button
                        className="btn btn-sm btn-ghost text-error"
                        onClick={() => handleDelete(request.id || request._id)}
                        disabled={isProcessing}
                        title="Delete request"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Request Time Off</h3>
            <form onSubmit={handleCreateRequest} className="mt-4 space-y-4">
              {isAdmin && teamMembers.length > 0 && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Request For</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={newRequest.requestForUserId}
                    onChange={(e) => setNewRequest({ ...newRequest, requestForUserId: e.target.value })}
                  >
                    <option value="">Myself</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name || member.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Type</span>
                </label>
                <select
                  className="select select-bordered"
                  value={newRequest.type}
                  onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                >
                  <option value="Holiday">Holiday</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {/* Start Date and Session */}
              <div className="grid grid-cols-3 gap-2">
                <div className="form-control col-span-2">
                  <label className="label">
                    <span className="label-text">Start Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={newRequest.startDate}
                    onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Session</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={newRequest.startSession}
                    onChange={(e) => setNewRequest({ ...newRequest, startSession: e.target.value })}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* End Date and Session */}
              <div className="grid grid-cols-3 gap-2">
                <div className="form-control col-span-2">
                  <label className="label">
                    <span className="label-text">End Date</span>
                    <span className="label-text-alt text-base-content/50">Optional</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={newRequest.endDate}
                    onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                    placeholder="Same as start"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Session</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={newRequest.endSession}
                    onChange={(e) => setNewRequest({ ...newRequest, endSession: e.target.value })}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* Computed Total Days Chip */}
              {newRequest.startDate && (() => {
                const start = new Date(newRequest.startDate);
                const end = newRequest.endDate ? new Date(newRequest.endDate) : new Date(newRequest.startDate);
                const totalDays = computeTotalDays(start, end, newRequest.startSession, newRequest.endSession);
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                const isTooOld = start < oneYearAgo;
                const isInvalid = totalDays === null || totalDays > 60 || end < start;

                return (
                  <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${isInvalid || isTooOld ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                    {end < start ? (
                      <span>End date must be on or after start date</span>
                    ) : totalDays === null ? (
                      <span>Invalid: PM to AM on same day not allowed</span>
                    ) : totalDays > 60 ? (
                      <span>Maximum 60 days per request ({totalDays} days selected)</span>
                    ) : isTooOld ? (
                      <span>Start date is too far in the past</span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-semibold">
                          Total requested: {totalDays} day{totalDays !== 1 ? 's' : ''}
                        </span>
                        {totalDays === 0.5 && <span className="text-xs opacity-75">(half day)</span>}
                      </>
                    )}
                  </div>
                );
              })()}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Notes (optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  placeholder="Any additional details..."
                  rows={2}
                  value={newRequest.notes}
                  onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                />
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}></div>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {actionModal.open && actionModal.request && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">
              {actionModal.action === "approve" ? "Approve" : "Reject"} Holiday Request
            </h3>
            <div className="mt-4">
              <div className="bg-base-200 p-3 rounded-lg">
                <p className="font-semibold">{actionModal.request.userName}</p>
                <p className="text-sm">
                  {formatDate(actionModal.request.startDate)}
                  {actionModal.request.startSession && <span className="text-xs text-base-content/50 ml-1">({actionModal.request.startSession})</span>}
                  {" - "}
                  {formatDate(actionModal.request.endDate)}
                  {actionModal.request.endSession && <span className="text-xs text-base-content/50 ml-1">({actionModal.request.endSession})</span>}
                  <span className="text-base-content/50 ml-2">
                    ({actionModal.request.totalDaysComputed || actionModal.request.totalDays || calculateDays(actionModal.request.startDate, actionModal.request.endDate)} days)
                  </span>
                </p>
                <p className="text-sm text-base-content/60">{actionModal.request.type}</p>
              </div>
              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text">Admin Note (optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  placeholder={actionModal.action === "reject" ? "Reason for rejection..." : "Any notes..."}
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setActionModal({ open: false, request: null, action: null });
                  setAdminNote("");
                }}
                disabled={isProcessing}
              >
                Cancel
              </button>
              {actionModal.action === "approve" ? (
                <button
                  className="btn btn-success gap-2"
                  onClick={() => handleApprove(actionModal.request)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isProcessing ? "Approving..." : "Approve"}
                </button>
              ) : (
                <button
                  className="btn btn-error gap-2"
                  onClick={() => handleReject(actionModal.request)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {isProcessing ? "Rejecting..." : "Confirm Reject"}
                </button>
              )}
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              setActionModal({ open: false, request: null, action: null });
              setAdminNote("");
            }}
          ></div>
        </div>
      )}
    </DashboardLayout>
  );
}
