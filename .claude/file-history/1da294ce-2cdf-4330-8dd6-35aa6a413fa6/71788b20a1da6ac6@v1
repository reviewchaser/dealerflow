import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

const TASK_STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Complete",
  not_required: "Not Required",
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  DONE: "Complete",
  NOT_REQUIRED: "Not Required",
};

const TASK_STATUS_COLORS = {
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
  not_required: "bg-slate-100 text-slate-500",
  PENDING: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-emerald-100 text-emerald-700",
  NOT_REQUIRED: "bg-slate-100 text-slate-500",
};

const ISSUE_STATUS_COLORS = {
  outstanding: "bg-red-100 text-red-700",
  ordered: "bg-amber-100 text-amber-700",
  Outstanding: "bg-red-100 text-red-700",
  Ordered: "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
};

const SUPPLIER_LABELS = {
  EURO_CAR_PARTS: "Euro Car Parts",
  TPS: "TPS",
  MAIN_DEALER: "Main Dealer",
  LOCAL_FACTOR: "Local Factor",
  ONLINE: "Online",
  OTHER: "Other",
};

export default function PublicPrepSummary() {
  const router = useRouter();
  const { token } = router.query;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      fetchPrepSummary();
    }
  }, [token]);

  const fetchPrepSummary = async () => {
    try {
      const res = await fetch(`/api/public/prep-summary/${token}`);
      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || "Invalid or expired link");
        return;
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError("Failed to load prep summary");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getSupplierDisplay = (order) => {
    if (order.supplierType === "OTHER" && order.supplierName) {
      return order.supplierName;
    }
    return SUPPLIER_LABELS[order.supplierType] || order.supplierType;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Head><title>Invalid Link</title></Head>
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const { prepSummary, dealer } = data;
  const { vehicle, tasks, issues } = prepSummary;

  // Count task stats
  const completedTasks = tasks.filter(t => t.status === "done" || t.status === "DONE").length;
  const totalTasks = tasks.filter(t => t.status !== "not_required" && t.status !== "NOT_REQUIRED").length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 print:bg-white print:p-0">
      <Head>
        <title>Prep Summary - {vehicle?.vrm || "Vehicle"}</title>
      </Head>

      <div className="max-w-3xl mx-auto">
        {/* Print Button - Hidden on print */}
        <div className="flex justify-end mb-4 print:hidden">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6 print:shadow-none print:border print:rounded-none">
          <div className="flex items-start justify-between">
            <div>
              {dealer?.logo ? (
                <img src={dealer.logo} alt={dealer.name} className="h-12 mb-3" />
              ) : dealer?.name ? (
                <p className="text-xl font-bold text-slate-900 mb-3">{dealer.name}</p>
              ) : null}
              <h1 className="text-2xl font-bold text-slate-900">Vehicle Prep Summary</h1>
              <p className="text-sm text-slate-500 mt-1">
                Generated {new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl bg-amber-100 text-amber-800 px-3 py-1 rounded-lg font-bold">
                {vehicle?.vrm || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border print:rounded-none">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Vehicle Details</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-500">Make</p>
              <p className="font-medium text-slate-900">{vehicle?.make || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Model</p>
              <p className="font-medium text-slate-900">{vehicle?.model || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Year</p>
              <p className="font-medium text-slate-900">{vehicle?.year || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Colour</p>
              <p className="font-medium text-slate-900">{vehicle?.colour || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Fuel Type</p>
              <p className="font-medium text-slate-900">{vehicle?.fuelType || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Mileage</p>
              <p className="font-medium text-slate-900">
                {vehicle?.mileage ? `${vehicle.mileage.toLocaleString()} mi` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-6 print:bg-blue-50">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Prep Progress</p>
              <p className="text-2xl font-bold text-blue-900">{completedTasks}/{totalTasks} Tasks Complete</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white border-4 border-blue-200 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-800">
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Prep Checklist */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border print:rounded-none">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Prep Checklist</h2>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="border-l-4 border-slate-200 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    task.status === "done" || task.status === "DONE"
                      ? "bg-emerald-100 text-emerald-700"
                      : task.status === "in_progress" || task.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                  }`}>
                    {task.status === "done" || task.status === "DONE" ? "✓" : task.status === "in_progress" || task.status === "IN_PROGRESS" ? "→" : "○"}
                  </span>
                  <span className={`font-medium ${task.status === "done" || task.status === "DONE" ? "text-slate-500 line-through" : "text-slate-900"}`}>
                    {task.name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_STATUS_COLORS[task.status] || "bg-slate-100 text-slate-600"}`}>
                    {TASK_STATUS_LABELS[task.status] || task.status}
                  </span>
                </div>
                {task.completedAt && (
                  <p className="text-xs text-slate-500 ml-7">Completed {formatDate(task.completedAt)}</p>
                )}
                {/* Parts orders */}
                {task.partsOrders && task.partsOrders.length > 0 && (
                  <div className="ml-7 mt-2 space-y-1">
                    {task.partsOrders.map((order, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-amber-50 rounded border border-amber-200">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium ${
                          order.status === "RECEIVED"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {order.status === "RECEIVED" ? "✓ Received" : "⏳ Ordered"}
                        </span>
                        <span className="font-medium text-amber-800">{getSupplierDisplay(order)}</span>
                        {order.orderRef && (
                          <span className="text-amber-600">Ref: {order.orderRef}</span>
                        )}
                        {order.expectedAt && order.status !== "RECEIVED" && (
                          <span className="text-amber-600">ETA: {formatDate(order.expectedAt)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Outstanding Issues - Only shown if there are any */}
        {issues && issues.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border print:rounded-none">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Outstanding Issues ({issues.length})
            </h2>
            <div className="space-y-4">
              {issues.map((issue) => (
                <div key={issue.id} className="border-l-4 border-red-300 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-700">
                      {issue.category} - {issue.subcategory}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ISSUE_STATUS_COLORS[issue.status] || "bg-slate-100 text-slate-600"}`}>
                      {issue.status}
                    </span>
                  </div>
                  <p className="text-slate-700">{issue.description}</p>
                  {issue.actionNeeded && (
                    <p className="text-sm text-slate-500 mt-1">
                      <span className="font-medium">Action:</span> {issue.actionNeeded}
                    </p>
                  )}
                  {issue.partsRequired && (
                    <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                      <p className="text-xs font-medium text-amber-800">Parts Required</p>
                      {issue.partsDetails && (
                        <p className="text-xs text-amber-700 mt-0.5">{issue.partsDetails}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Issues Clear Notice */}
        {(!issues || issues.length === 0) && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 mb-6 print:bg-emerald-50">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-emerald-800">No outstanding issues</span>
            </div>
          </div>
        )}

        {/* Dealer Contact */}
        {dealer && (
          <div className="bg-slate-100 rounded-xl p-6 print:bg-slate-100 print:rounded-none">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Contact</h2>
            <div className="space-y-1 text-sm text-slate-700">
              {dealer.name && <p className="font-medium">{dealer.name}</p>}
              {dealer.phone && <p>Phone: {dealer.phone}</p>}
              {dealer.email && <p>Email: {dealer.email}</p>}
              {dealer.address && <p>{dealer.address}</p>}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500 print:mt-4">
          <p>This is a read-only prep summary. Contact the dealership for updates.</p>
        </div>
      </div>
    </div>
  );
}
