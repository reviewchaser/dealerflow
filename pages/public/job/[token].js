import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

const STATUS_LABELS = {
  Outstanding: "Outstanding",
  Ordered: "Ordered",
  "In Progress": "In Progress",
  Complete: "Complete",
};

const STATUS_COLORS = {
  Outstanding: "bg-red-100 text-red-700",
  Ordered: "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Complete: "bg-emerald-100 text-emerald-700",
};

const LOCATION_LABELS = {
  WITH_CUSTOMER: "With Customer",
  ON_SITE: "On-Site",
  THIRD_PARTY: "Third-Party",
};

export default function PublicJobSheet() {
  const router = useRouter();
  const { token } = router.query;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      fetchJobSheet();
    }
  }, [token]);

  const fetchJobSheet = async () => {
    try {
      const res = await fetch(`/api/public/job/${token}`);
      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || "Invalid or expired link");
        return;
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError("Failed to load job sheet");
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
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const { jobSheet, dealer } = data;
  const isWarranty = jobSheet?.type === "WARRANTY";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 print:bg-white print:p-0">
      <Head>
        <title>Job Sheet - {jobSheet?.vehicle?.vrm || "Vehicle"}</title>
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
              {/* Show logo ONLY if uploaded, otherwise show company name */}
              {dealer?.logo ? (
                <img src={dealer.logo} alt={dealer.name} className="h-12 mb-3" />
              ) : dealer?.name ? (
                <p className="text-xl font-bold text-slate-900 mb-3">{dealer.name}</p>
              ) : null}
              <h1 className="text-2xl font-bold text-slate-900">
                {isWarranty ? "Warranty Job Sheet" : "Vehicle Job Sheet"}
              </h1>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl bg-amber-100 text-amber-800 px-3 py-1 rounded-lg font-bold">
                {jobSheet?.vehicle?.vrm || "N/A"}
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
              <p className="font-medium text-slate-900">{jobSheet?.vehicle?.make || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Model</p>
              <p className="font-medium text-slate-900">{jobSheet?.vehicle?.model || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Year</p>
              <p className="font-medium text-slate-900">{jobSheet?.vehicle?.year || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Colour</p>
              <p className="font-medium text-slate-900">{jobSheet?.vehicle?.colour || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Fuel Type</p>
              <p className="font-medium text-slate-900">{jobSheet?.vehicle?.fuelType || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Mileage</p>
              <p className="font-medium text-slate-900">
                {jobSheet?.vehicle?.mileage ? `${jobSheet.vehicle.mileage.toLocaleString()} mi` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Warranty-specific info */}
        {isWarranty && (
          <>
            {/* Customer Info */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border print:rounded-none">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Customer Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="font-medium text-slate-900">{jobSheet?.customerName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-medium text-slate-900">{jobSheet?.customerPhone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">{jobSheet?.customerEmail || "—"}</p>
                </div>
              </div>
            </div>

            {/* Warranty Details */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border print:rounded-none">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Warranty Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Warranty Type</p>
                  <p className="font-medium text-slate-900">{jobSheet?.warrantyType || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Priority</p>
                  <p className="font-medium text-slate-900 capitalize">{jobSheet?.priority || "Normal"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Repair Location</p>
                  <p className="font-medium text-slate-900">
                    {LOCATION_LABELS[jobSheet?.repairLocationType] || jobSheet?.repairLocationType || "—"}
                    {jobSheet?.repairLocationName && ` (${jobSheet.repairLocationName})`}
                  </p>
                </div>
                {jobSheet?.repairLocationNotes && (
                  <div>
                    <p className="text-sm text-slate-500">Location Notes</p>
                    <p className="font-medium text-slate-900">{jobSheet.repairLocationNotes}</p>
                  </div>
                )}
              </div>
              {jobSheet?.summary && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500">Issue Summary</p>
                  <p className="font-medium text-slate-900">{jobSheet.summary}</p>
                </div>
              )}
              {jobSheet?.description && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="font-medium text-slate-900 whitespace-pre-wrap">{jobSheet.description}</p>
                </div>
              )}
              {jobSheet?.faultCodes && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-800">Fault Codes</p>
                  <p className="text-sm text-red-700 mt-1 font-mono">{jobSheet.faultCodes}</p>
                </div>
              )}
              {jobSheet?.partsRequired && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-amber-800">Parts Required</p>
                  {jobSheet?.partsNotes && (
                    <p className="text-sm text-amber-700 mt-1">{jobSheet.partsNotes}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Booking Date */}
        {jobSheet?.bookingDate && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-6 print:bg-blue-50">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-blue-800">
                Booked: {formatDate(jobSheet.bookingDate)}
              </span>
            </div>
          </div>
        )}

        {/* Issues List (Stock board only) */}
        {!isWarranty && jobSheet?.issues && jobSheet.issues.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border print:rounded-none">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Issues ({jobSheet.issues.length})
            </h2>
            <div className="space-y-4">
              {jobSheet.issues.map((issue, idx) => (
                <div key={idx} className="border-l-4 border-slate-300 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-700">
                      {issue.category} - {issue.subcategory}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[issue.status] || "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABELS[issue.status] || issue.status}
                    </span>
                  </div>
                  <p className="text-slate-700">{issue.description}</p>
                  {issue.actionNeeded && (
                    <p className="text-sm text-slate-500 mt-1">
                      <span className="font-medium">Action:</span> {issue.actionNeeded}
                    </p>
                  )}
                  {issue.notes && (
                    <p className="text-sm text-slate-500 mt-1">
                      <span className="font-medium">Notes:</span> {issue.notes}
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
          <p>This is a read-only job sheet. Contact the dealership for updates.</p>
        </div>
      </div>
    </div>
  );
}
