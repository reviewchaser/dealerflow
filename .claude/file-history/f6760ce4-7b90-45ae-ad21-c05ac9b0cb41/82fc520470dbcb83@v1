import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import { MobileModal } from "@/components/ui/MobileModal";
import { toast } from "react-hot-toast";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABELS = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

const STATUS_COLORS = {
  DRAFT: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

const STATUS_LABELS = {
  DRAFT: "Draft",
  SUBMITTED: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

// Get Monday of the current week
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Format date as "Mon 6 Jan"
function formatShortDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Format week range
function formatWeekRange(weekStart) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function OvertimePage() {
  const { data: session } = useSession();
  const [submissions, setSubmissions] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]); // For admin view
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(getWeekStart());
  const [viewMode, setViewMode] = useState("my"); // "my" or "all" (admin only)
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  const isAdmin = userRole === "OWNER" || userRole === "ADMIN";

  // Fetch user role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch("/api/dealer");
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.currentUserRole);
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };
    fetchRole();
  }, []);

  // Fetch own submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/overtime?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load overtime submissions");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  // Fetch all submissions (admin)
  const fetchAllSubmissions = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/admin/overtime?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAllSubmissions(data.submissions || []);
      setPendingCount(data.stats?.pendingReview || 0);
    } catch (error) {
      console.error("Error fetching all submissions:", error);
    }
  }, [isAdmin, statusFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllSubmissions();
    }
  }, [isAdmin, fetchAllSubmissions]);

  // Create new submission
  const handleCreate = async (weekStart) => {
    try {
      const res = await fetch("/api/overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate: weekStart.toISOString() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.existingId) {
          // Already exists - open for editing
          const existing = submissions.find((s) => s._id === data.existingId);
          if (existing) {
            setEditingSubmission(existing);
            setShowAddModal(true);
          } else {
            toast.error("A submission for this week already exists");
          }
          return;
        }
        throw new Error(data.error || "Failed to create");
      }

      toast.success("Draft created");
      setEditingSubmission(data.submission);
      setShowAddModal(true);
      fetchSubmissions();
    } catch (error) {
      console.error("Error creating submission:", error);
      toast.error(error.message || "Failed to create submission");
    }
  };

  // Update submission
  const handleUpdate = async (id, updates) => {
    try {
      const res = await fetch(`/api/overtime/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      const data = await res.json();
      setEditingSubmission(data.submission);
      fetchSubmissions();
      return data.submission;
    } catch (error) {
      console.error("Error updating submission:", error);
      toast.error(error.message || "Failed to update");
      throw error;
    }
  };

  // Submit for review
  const handleSubmit = async (id) => {
    try {
      const res = await fetch(`/api/overtime/${id}/submit`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.reason || "Failed to submit");
      }

      toast.success("Submitted for review");
      setShowAddModal(false);
      setEditingSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error(error.message || "Failed to submit");
    }
  };

  // Delete draft
  const handleDelete = async (id) => {
    if (!confirm("Delete this draft?")) return;

    try {
      const res = await fetch(`/api/overtime/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success("Draft deleted");
      setShowAddModal(false);
      setEditingSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(error.message || "Failed to delete");
    }
  };

  // Admin: Approve
  const handleApprove = async (id) => {
    try {
      const res = await fetch(`/api/admin/overtime/${id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve");
      }

      toast.success("Overtime approved");
      fetchSubmissions();
      fetchAllSubmissions();
    } catch (error) {
      console.error("Error approving:", error);
      toast.error(error.message || "Failed to approve");
    }
  };

  // Admin: Reject
  const handleReject = async (id, reason) => {
    try {
      const res = await fetch(`/api/admin/overtime/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject");
      }

      toast.success("Overtime rejected");
      fetchSubmissions();
      fetchAllSubmissions();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error(error.message || "Failed to reject");
    }
  };

  const displaySubmissions = viewMode === "all" ? allSubmissions : submissions;

  return (
    <DashboardLayout>
      <Head>
        <title>Overtime | DealerFlow</title>
      </Head>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Overtime</h1>
            <p className="text-slate-500 text-sm mt-1">
              Track and submit your weekly overtime hours
            </p>
          </div>
          <button
            onClick={() => handleCreate(selectedWeek)}
            className="btn btn-primary gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Overtime
          </button>
        </div>

        {/* Admin: View Toggle */}
        {isAdmin && (
          <div className="flex items-center gap-4 mb-6">
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode("my")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === "my"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                My Overtime
              </button>
              <button
                onClick={() => setViewMode("all")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  viewMode === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                All Team
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select select-bordered select-sm"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        )}

        {/* Week Selector */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              const prev = new Date(selectedWeek);
              prev.setDate(prev.getDate() - 7);
              setSelectedWeek(prev);
            }}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center min-w-48">
            <div className="font-semibold text-slate-900">
              Week of {formatWeekRange(selectedWeek)}
            </div>
          </div>
          <button
            onClick={() => {
              const next = new Date(selectedWeek);
              next.setDate(next.getDate() + 7);
              setSelectedWeek(next);
            }}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedWeek(getWeekStart())}
            className="btn btn-ghost btn-sm"
          >
            Today
          </button>
        </div>

        {/* Submissions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : displaySubmissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No overtime submissions</h3>
            <p className="text-slate-500 mb-6">
              {viewMode === "all"
                ? "No team overtime submissions yet."
                : "You haven't submitted any overtime yet."}
            </p>
            {viewMode === "my" && (
              <button
                onClick={() => handleCreate(selectedWeek)}
                className="btn btn-primary"
              >
                Add Your First Entry
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displaySubmissions.map((submission) => (
              <SubmissionCard
                key={submission._id}
                submission={submission}
                isAdmin={isAdmin && viewMode === "all"}
                onEdit={() => {
                  setEditingSubmission(submission);
                  setShowAddModal(true);
                }}
                onApprove={() => handleApprove(submission._id)}
                onReject={(reason) => handleReject(submission._id, reason)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <MobileModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingSubmission(null);
        }}
        title={editingSubmission ? "Edit Overtime" : "Add Overtime"}
        maxWidth="max-w-2xl"
      >
        {editingSubmission && (
          <OvertimeForm
            submission={editingSubmission}
            onUpdate={handleUpdate}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            onClose={() => {
              setShowAddModal(false);
              setEditingSubmission(null);
            }}
          />
        )}
        <MobileModal.Footer>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowAddModal(false);
                setEditingSubmission(null);
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </MobileModal.Footer>
      </MobileModal>
    </DashboardLayout>
  );
}

// Submission Card Component
function SubmissionCard({ submission, isAdmin, onEdit, onApprove, onReject }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const canEdit = submission.status === "DRAFT";
  const canReview = isAdmin && submission.status === "SUBMITTED";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 hover:border-slate-300 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {isAdmin && (
              <span className="font-medium text-slate-900">
                {submission.userDisplayNameSnapshot}
              </span>
            )}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[submission.status]}`}>
              {STATUS_LABELS[submission.status]}
            </span>
          </div>
          <div className="text-sm text-slate-600">
            Week of {formatWeekRange(submission.weekStartDate)}
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="font-semibold text-slate-900">
              {submission.totalOvertimeHours || 0} hours
            </span>
            {submission.entries?.length > 0 && (
              <span className="text-slate-400">
                {submission.entries.length} day{submission.entries.length !== 1 ? "s" : ""} logged
              </span>
            )}
          </div>
          {submission.status === "REJECTED" && submission.rejectedReason && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              Rejected: {submission.rejectedReason}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={onEdit} className="btn btn-sm btn-ghost">
              Edit
            </button>
          )}
          {canReview && (
            <>
              <button
                onClick={onApprove}
                className="btn btn-sm btn-success"
              >
                Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="btn btn-sm btn-error btn-outline"
              >
                Reject
              </button>
            </>
          )}
          {!canEdit && !canReview && (
            <button onClick={onEdit} className="btn btn-sm btn-ghost">
              View
            </button>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reject Overtime</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="textarea textarea-bordered w-full mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onReject(rejectReason);
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="btn btn-error"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Overtime Form Component
function OvertimeForm({ submission, onUpdate, onSubmit, onDelete, onClose }) {
  const [entries, setEntries] = useState(() => {
    // Initialize with existing entries or empty days
    const existing = {};
    (submission.entries || []).forEach((e) => {
      existing[e.day] = e;
    });
    return DAYS.map((day) => existing[day] || { day, overtimeHours: 0 });
  });
  const [notes, setNotes] = useState(submission.notes || "");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isReadOnly = submission.status !== "DRAFT";
  const totalHours = entries.reduce((sum, e) => sum + (parseFloat(e.overtimeHours) || 0), 0);

  const handleEntryChange = (day, field, value) => {
    setEntries((prev) =>
      prev.map((e) => (e.day === day ? { ...e, [field]: value } : e))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const validEntries = entries.filter((e) => e.overtimeHours > 0 || e.startTime || e.location);
      await onUpdate(submission._id, { entries: validEntries, notes });
      toast.success("Saved");
    } catch (error) {
      // Error handled in parent
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    try {
      // Save first
      const validEntries = entries.filter((e) => e.overtimeHours > 0 || e.startTime || e.location);
      await onUpdate(submission._id, { entries: validEntries, notes });
      // Then submit
      await onSubmit(submission._id);
    } catch (error) {
      // Error handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <div className="bg-slate-50 rounded-xl p-4">
        <div className="text-sm text-slate-500">Week of</div>
        <div className="text-lg font-semibold text-slate-900">
          {formatWeekRange(submission.weekStartDate)}
        </div>
        <div className="mt-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[submission.status]}`}>
            {STATUS_LABELS[submission.status]}
          </span>
        </div>
      </div>

      {/* Day Entries */}
      <div className="space-y-3">
        <h3 className="font-medium text-slate-900">Daily Hours</h3>
        {entries.map((entry) => {
          const weekStart = new Date(submission.weekStartDate);
          const dayIndex = DAYS.indexOf(entry.day);
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + dayIndex);

          return (
            <div
              key={entry.day}
              className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-xl"
            >
              <div className="w-24 flex-shrink-0">
                <div className="font-medium text-slate-900">{DAY_LABELS[entry.day]}</div>
                <div className="text-xs text-slate-400">
                  {dayDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Start</label>
                  <input
                    type="time"
                    value={entry.startTime || ""}
                    onChange={(e) => handleEntryChange(entry.day, "startTime", e.target.value)}
                    disabled={isReadOnly}
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">End</label>
                  <input
                    type="time"
                    value={entry.endTime || ""}
                    onChange={(e) => handleEntryChange(entry.day, "endTime", e.target.value)}
                    disabled={isReadOnly}
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">OT Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={entry.overtimeHours || ""}
                    onChange={(e) => handleEntryChange(entry.day, "overtimeHours", parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
                    className="input input-bordered input-sm w-full"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Location</label>
                  <input
                    type="text"
                    value={entry.location || ""}
                    onChange={(e) => handleEntryChange(entry.day, "location", e.target.value)}
                    disabled={isReadOnly}
                    className="input input-bordered input-sm w-full"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl">
        <span className="font-medium">Total Overtime</span>
        <span className="text-2xl font-bold">{totalHours} hours</span>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isReadOnly}
          className="textarea textarea-bordered w-full"
          rows={2}
          placeholder="Any additional notes..."
        />
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t">
          <button
            onClick={() => onDelete(submission._id)}
            className="btn btn-ghost btn-error btn-sm"
          >
            Delete Draft
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-ghost"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={handleSubmitForReview}
              disabled={submitting || totalHours === 0}
              className="btn btn-primary"
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </div>
      )}

      {/* Rejection reason */}
      {submission.status === "REJECTED" && submission.rejectedReason && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="font-medium text-red-700 mb-1">Rejection Reason</div>
          <div className="text-sm text-red-600">{submission.rejectedReason}</div>
        </div>
      )}
    </div>
  );
}
