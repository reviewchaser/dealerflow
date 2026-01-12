import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

/**
 * MOT History Modal
 *
 * Displays full MOT history for a vehicle with test results,
 * mileage, and advisories/defects.
 */
export default function MOTHistoryModal({ isOpen, onClose, vehicleId, regCurrent }) {
  const [isLoading, setIsLoading] = useState(false);
  const [motHistory, setMotHistory] = useState([]);
  const [expandedTest, setExpandedTest] = useState(null);

  useEffect(() => {
    if (isOpen && regCurrent) {
      fetchMotHistory();
    }
  }, [isOpen, regCurrent]);

  const fetchMotHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/mot?vrm=${encodeURIComponent(regCurrent)}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Vehicle not found in MOT database");
          setMotHistory([]);
          return;
        }
        throw new Error("Failed to fetch MOT history");
      }
      const data = await res.json();
      setMotHistory(data.motHistory || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load MOT history");
      setMotHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatMileage = (value, unit) => {
    if (!value) return "—";
    const formatted = value.toLocaleString();
    return `${formatted} ${unit === "mi" ? "mi" : "km"}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900">MOT History</h3>
            <p className="text-sm text-slate-500 font-mono">{regCurrent}</p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg text-[#0066CC]"></span>
            </div>
          ) : motHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">No MOT history found</p>
              <p className="text-xs text-slate-400 mt-1">This vehicle may not have had an MOT test yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {motHistory.map((test, index) => {
                const isPassed = test.testResult === "PASSED";
                const hasDefects = test.defects && test.defects.length > 0;
                const isExpanded = expandedTest === index;

                return (
                  <div
                    key={test.motTestNumber || index}
                    className={`border rounded-xl overflow-hidden ${
                      isPassed ? "border-emerald-200" : "border-red-200"
                    }`}
                  >
                    {/* Test Header */}
                    <div
                      className={`p-4 cursor-pointer ${
                        isPassed ? "bg-emerald-50" : "bg-red-50"
                      }`}
                      onClick={() => setExpandedTest(isExpanded ? null : index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isPassed ? "bg-emerald-100" : "bg-red-100"
                            }`}
                          >
                            {isPassed ? (
                              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {formatDate(test.completedDate)}
                            </p>
                            <p className={`text-sm font-medium ${isPassed ? "text-emerald-600" : "text-red-600"}`}>
                              {test.testResult || "Unknown"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">
                            {formatMileage(test.odometerValue, test.odometerUnit)}
                          </p>
                          {test.expiryDate && isPassed && (
                            <p className="text-xs text-slate-400">
                              Expires: {formatDate(test.expiryDate)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Defects Summary */}
                      {hasDefects && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {test.defects.length} {test.defects.length === 1 ? "item" : "items"}
                          </span>
                          <svg
                            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Defects List (Expanded) */}
                    {isExpanded && hasDefects && (
                      <div className="border-t border-slate-100 p-4 bg-white">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          Defects & Advisories
                        </p>
                        <ul className="space-y-2">
                          {test.defects.map((defect, dIdx) => {
                            const typeColors = {
                              ADVISORY: "bg-amber-100 text-amber-700",
                              MINOR: "bg-yellow-100 text-yellow-700",
                              MAJOR: "bg-red-100 text-red-700",
                              DANGEROUS: "bg-red-200 text-red-800",
                            };
                            const colorClass = typeColors[defect.type] || "bg-slate-100 text-slate-600";

                            return (
                              <li key={dIdx} className="flex items-start gap-2">
                                <span
                                  className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${colorClass}`}
                                >
                                  {defect.type || "INFO"}
                                </span>
                                <span className="text-sm text-slate-700">{defect.text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-3">
          <button onClick={onClose} className="btn btn-ghost w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
