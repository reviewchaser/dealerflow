import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

// Format date
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function DepositReceiptPage() {
  const router = useRouter();
  const { token, render } = router.query;
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-redirect to PDF endpoint (unless ?render=html is set for Puppeteer)
  useEffect(() => {
    if (token && render !== "html") {
      window.location.href = `/api/public/deposit-receipt/${token}/pdf`;
    }
  }, [token, render]);

  // Fetch document data (for HTML render mode)
  useEffect(() => {
    if (!token || render !== "html") return;

    const fetchDocument = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/public/deposit-receipt/${token}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Document not found");
        }
        const data = await res.json();
        setDocument(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [token, render]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="loading loading-spinner loading-lg text-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Document Not Found</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  // Check for missing snapshot data
  if (!document?.snapshotData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Document Error</h1>
          <p className="text-slate-500">The document data could not be loaded. Please contact support.</p>
        </div>
      </div>
    );
  }

  const snap = document.snapshotData;
  const deposit = snap.payments?.[0];

  return (
    <>
      <Head>
        <title>Deposit Receipt {document.documentNumber} | DealerHQ</title>
      </Head>

      {/* Print controls - hidden when printing */}
      <div className="print:hidden bg-slate-100 p-4 sticky top-0 z-10 border-b border-slate-200">
        <div className="max-w-[800px] mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">Deposit Receipt</h1>
          <button
            onClick={handlePrint}
            className="btn bg-blue-600 hover:bg-blue-700 text-white border-none"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Download PDF
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="min-h-screen bg-slate-100 print:bg-white p-4 print:p-0">
        <div className="max-w-[800px] mx-auto bg-white shadow-xl print:shadow-none rounded-2xl print:rounded-none overflow-hidden">
          {/* Header */}
          <div className="bg-white p-6 print:p-3 print:pb-2 border-b border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {snap.dealer?.logoUrl && (
                  <div className="shrink-0">
                    <img
                      src={snap.dealer.logoUrl}
                      alt={snap.dealer.companyName || snap.dealer.name}
                      className="h-12 max-w-[150px] object-contain"
                    />
                  </div>
                )}
                <div>
                  <p className="font-bold text-lg text-slate-900">{snap.dealer?.companyName || snap.dealer?.name}</p>
                  {snap.dealer?.address && (
                    <p className="text-slate-500 text-xs mt-1 whitespace-pre-line">{snap.dealer.address}</p>
                  )}
                  {snap.dealer?.phone && <p className="text-slate-500 text-xs">{snap.dealer.phone}</p>}
                  {snap.dealer?.email && <p className="text-slate-500 text-xs">{snap.dealer.email}</p>}
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-bold text-blue-600">DEPOSIT RECEIPT</h1>
                <p className="text-slate-600 font-semibold mt-1">{document.documentNumber}</p>
                <p className="text-slate-500 text-sm mt-1">{formatDate(document.issuedAt)}</p>
                {snap.dealer?.vatNumber && (
                  <p className="text-slate-400 text-xs mt-2">VAT No: {snap.dealer.vatNumber}</p>
                )}
              </div>
            </div>
            {/* Bank Details in Header - hide for print */}
            {snap.bankDetails?.accountNumber && (
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs print:hidden">
                <div>
                  <p className="text-slate-400">Account Name</p>
                  <p className="font-medium text-slate-700">{snap.bankDetails.accountName}</p>
                </div>
                <div>
                  <p className="text-slate-400">Sort Code</p>
                  <p className="font-medium text-slate-700">{snap.bankDetails.sortCode}</p>
                </div>
                <div>
                  <p className="text-slate-400">Account Number</p>
                  <p className="font-medium text-slate-700">{snap.bankDetails.accountNumber}</p>
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-8 print:p-3 space-y-6 print:space-y-2">
            {/* Date and Receipt Info - hide for print (already in header) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 print:hidden">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">Date</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">{formatDate(document.issuedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">Receipt Number</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">{document.documentNumber}</p>
              </div>
            </div>

            {/* Received From */}
            <div className="bg-slate-50 rounded-xl p-5 print:p-3 print:rounded-lg print:bg-slate-50">
              <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-2 print:mb-1 print:text-xs">Received From</p>
              <p className="text-lg font-bold text-slate-900 print:text-base">{snap.customer?.name}</p>
              {snap.customer?.companyName && (
                <p className="text-slate-600 print:text-sm">{snap.customer.companyName}</p>
              )}
              {snap.customer?.address && (
                <p className="text-slate-500 text-sm mt-1 print:text-xs print:leading-snug">
                  {[snap.customer.address.line1, snap.customer.address.line2, snap.customer.address.town, snap.customer.address.county, snap.customer.address.postcode].filter(Boolean).join(", ")}
                </p>
              )}
              <p className="text-slate-500 text-sm print:text-xs">
                {[snap.customer?.email, snap.customer?.phone].filter(Boolean).join(" | ")}
              </p>
            </div>

            {/* Vehicle Details */}
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-3 print:mb-2 print:text-xs">Vehicle</p>
              {/* Compact vehicle info for print */}
              <div className="hidden print:block border border-slate-200 rounded-lg p-3">
                <p className="font-bold text-slate-900 text-base">
                  <span className="font-mono bg-[#F7D117] px-2 py-0.5 rounded border border-black/20 mr-2">{snap.vehicle?.regCurrent}</span>
                  {snap.vehicle?.make} {snap.vehicle?.model}
                  {snap.vehicle?.derivative && ` ${snap.vehicle.derivative}`}
                </p>
                <p className="text-slate-600 text-sm mt-2">
                  {[
                    snap.vehicle?.year,
                    snap.vehicle?.colour,
                    snap.vehicle?.mileage ? `${snap.vehicle.mileage.toLocaleString()} miles` : null,
                    snap.vehicle?.firstRegisteredDate ? `Reg: ${new Date(snap.vehicle.firstRegisteredDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : null,
                    snap.vehicle?.vin ? `VIN: ${snap.vehicle.vin}` : null,
                  ].filter(Boolean).join(" | ")}
                </p>
              </div>
              {/* Full vehicle table for screen */}
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto print:hidden">
                <table className="w-full min-w-[300px]">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3 text-slate-500 bg-slate-50 w-1/3">Registration</td>
                      <td className="px-4 py-3 font-bold text-slate-900 font-mono tracking-wider">{snap.vehicle?.regCurrent}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-slate-500 bg-slate-50">Make / Model</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{snap.vehicle?.make} {snap.vehicle?.model}</td>
                    </tr>
                    {snap.vehicle?.derivative && (
                      <tr>
                        <td className="px-4 py-3 text-slate-500 bg-slate-50">Variant</td>
                        <td className="px-4 py-3 text-slate-900">{snap.vehicle.derivative}</td>
                      </tr>
                    )}
                    {snap.vehicle?.year && (
                      <tr>
                        <td className="px-4 py-3 text-slate-500 bg-slate-50">Year</td>
                        <td className="px-4 py-3 text-slate-900">{snap.vehicle.year}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-4 py-3 text-slate-500 bg-slate-50">Date of Registration</td>
                      <td className="px-4 py-3 text-slate-900">
                        {snap.vehicle?.firstRegisteredDate
                          ? new Date(snap.vehicle.firstRegisteredDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : <span className="text-slate-400 italic">Not recorded</span>}
                      </td>
                    </tr>
                    {snap.vehicle?.colour && (
                      <tr>
                        <td className="px-4 py-3 text-slate-500 bg-slate-50">Colour</td>
                        <td className="px-4 py-3 text-slate-900">{snap.vehicle.colour}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-4 py-3 text-slate-500 bg-slate-50">Mileage</td>
                      <td className="px-4 py-3 text-slate-900">
                        {snap.vehicle?.mileage ? `${snap.vehicle.mileage.toLocaleString()} miles` : <span className="text-slate-400 italic">Not recorded</span>}
                      </td>
                    </tr>
                    {snap.vehicle?.vin && (
                      <tr>
                        <td className="px-4 py-3 text-slate-500 bg-slate-50">VIN</td>
                        <td className="px-4 py-3 text-slate-900 font-mono text-sm">{snap.vehicle.vin}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warranty - show if included or has warranty data (for older deals) */}
            {(snap.warranty?.included || (snap.warranty?.name && snap.warranty?.type !== "TRADE")) ? (
              <div className="bg-emerald-50 rounded-lg p-3 print:p-1.5 print:rounded border border-emerald-200">
                <div className="print:flex print:items-center print:justify-between">
                  <div className="flex items-center gap-2 mb-1 print:mb-0">
                    <p className="text-xs text-emerald-700 uppercase tracking-wide font-medium print:text-[10px]">Warranty Included</p>
                    {snap.warranty?.type && (
                      <span className={`text-[10px] print:text-[8px] px-1.5 py-0.5 rounded-full font-medium ${
                        snap.warranty?.type === "DEFAULT" ? "bg-emerald-100 text-emerald-700" :
                        snap.warranty?.type === "THIRD_PARTY" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {snap.warranty?.type === "DEFAULT" ? "Default" :
                         snap.warranty?.type === "THIRD_PARTY" ? "Third Party" : snap.warranty?.type}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-emerald-900 print:text-xs">{snap.warranty?.name || "Warranty"}</p>
                </div>
                {snap.warranty?.description && (
                  <p className="text-xs text-emerald-600 mt-0.5 print:hidden">{snap.warranty?.description}</p>
                )}
                <div className="text-sm text-emerald-700 mt-1 print:mt-0 print:text-[10px] flex flex-wrap gap-x-4 gap-y-0.5 print:gap-x-2">
                  {snap.warranty?.durationMonths && (
                    <span>{snap.warranty?.durationMonths} months</span>
                  )}
                  {snap.warranty?.claimLimit ? (
                    <span>Claim limit: {formatCurrency(snap.warranty?.claimLimit)}</span>
                  ) : (
                    <span>Unlimited claims</span>
                  )}
                  {snap.warranty?.priceGross > 0 && (
                    <span className="font-medium">{formatCurrency(snap.warranty?.priceGross)}</span>
                  )}
                  {snap.warranty?.priceGross === 0 && (
                    <span className="text-emerald-600">FREE</span>
                  )}
                </div>
              </div>
            ) : snap.warranty?.type === "TRADE" ? (
              <div className="bg-amber-50 rounded-lg p-3 print:p-1.5 print:rounded border border-amber-200">
                <div className="flex items-center gap-2 mb-1 print:mb-0">
                  <p className="text-xs text-amber-700 uppercase tracking-wide font-medium print:text-[10px]">Trade Sale</p>
                  <span className="text-[10px] print:text-[8px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">No Warranty</span>
                </div>
                <p className="text-amber-800 font-medium print:text-xs">{snap.warranty?.tradeTermsText || snap.noWarrantyMessage || "Trade Terms - No warranty given or implied"}</p>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-lg p-3 print:p-1.5 print:rounded border border-amber-200">
                <p className="text-xs text-amber-700 uppercase tracking-wide font-medium mb-1 print:mb-0 print:text-[10px]">Warranty</p>
                <p className="text-amber-800 font-medium print:text-xs">{snap.noWarrantyMessage || "Trade Terms - No warranty given or implied"}</p>
              </div>
            )}

            {/* Add-ons (if any) - hide for print, total shown in summary */}
            {snap.addOns?.length > 0 && (
              <div className="print:hidden">
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-3">Add-ons Included</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[400px]">
                    {snap.isVatRegistered !== false && (
                      <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Item</th>
                          <th className="px-4 py-2 text-right font-medium">Net</th>
                          <th className="px-4 py-2 text-right font-medium">VAT</th>
                          <th className="px-4 py-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                    )}
                    <tbody className="divide-y divide-slate-100">
                      {snap.addOns.map((addon, idx) => {
                        const netAmount = addon.unitPriceNet * (addon.qty || 1);
                        const vatAmount = addon.vatTreatment === "STANDARD" ? netAmount * (addon.vatRate || 0.2) : 0;
                        const totalAmount = netAmount + vatAmount;
                        return snap.isVatRegistered !== false ? (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-slate-900">
                              {addon.name}
                              {addon.qty > 1 && <span className="text-slate-500 text-sm ml-1">x{addon.qty}</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(netAmount)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(vatAmount)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(totalAmount)}</td>
                          </tr>
                        ) : (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-slate-900">
                              {addon.name}
                              {addon.qty > 1 && <span className="text-slate-500 text-sm ml-1">x{addon.qty}</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(netAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Warranty (if included) - hide for print, total shown in summary */}
            {snap.warranty?.included && (
              <div className="print:hidden">
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-3">Warranty Included</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    {snap.isVatRegistered !== false && (
                      <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Item</th>
                          <th className="px-4 py-2 text-right font-medium">Net</th>
                          <th className="px-4 py-2 text-right font-medium">VAT</th>
                          <th className="px-4 py-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {snap.isVatRegistered !== false ? (
                        <tr>
                          <td className="px-4 py-3 text-slate-900">
                            <div>
                              {snap.warranty?.name || "Warranty"} ({snap.warranty?.durationMonths || 3} months)
                              {snap.warranty?.description && (
                                <span className="text-slate-500 text-xs ml-2">- {snap.warranty?.description}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatCurrency(snap.warranty?.priceNet || snap.warranty?.priceGross)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {snap.warranty?.vatTreatment === "STANDARD" ? formatCurrency(snap.warranty?.vatAmount || 0) : "Exempt"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {snap.warranty?.priceGross > 0 ? formatCurrency(snap.warranty?.priceGross) : "FREE"}
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td className="px-4 py-3 text-slate-900">
                            <div>
                              {snap.warranty?.name || "Warranty"} ({snap.warranty?.durationMonths || 3} months)
                              {snap.warranty?.description && (
                                <span className="text-slate-500 text-xs ml-2">- {snap.warranty?.description}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {snap.warranty?.priceGross > 0 ? formatCurrency(snap.warranty?.priceGross) : "FREE"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sale Options Summary - hide for print */}
            <div className={`grid gap-2 print:hidden ${snap.financeSelection?.isFinanced ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {/* Delivery Required */}
              <div className="bg-slate-50 rounded-lg p-2 print:p-1.5 border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium print:text-[9px]">Delivery</p>
                <p className="text-sm font-semibold text-slate-900 print:text-xs">
                  {snap.delivery?.isFree || snap.delivery?.amountGross > 0 || snap.delivery?.amount > 0 ? "Yes" : "Collection"}
                </p>
              </div>
              {/* Finance Required */}
              <div className="bg-slate-50 rounded-lg p-2 print:p-1.5 border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium print:text-[9px]">Finance</p>
                <p className="text-sm font-semibold text-slate-900 print:text-xs">
                  {snap.financeSelection?.isFinanced
                    ? (snap.financeSelection.toBeConfirmed ? "Yes (TBC)" : "Yes")
                    : "No"}
                </p>
              </div>
              {/* Finance Company - inline if financed */}
              {snap.financeSelection?.isFinanced && (
                <div className="bg-blue-50 rounded-lg p-2 print:p-1.5 border border-blue-200">
                  <p className="text-xs text-blue-600 uppercase tracking-wide font-medium print:text-[9px]">Finance Co.</p>
                  <p className="text-sm font-semibold text-blue-800 print:text-xs truncate">
                    {snap.financeSelection.toBeConfirmed
                      ? "TBC"
                      : snap.financeSelection.financeCompanyName || "TBC"}
                  </p>
                </div>
              )}
            </div>

            {/* Part Exchange(s) */}
            {snap.partExchanges?.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-3 print:p-1.5 print:rounded print:bg-purple-50 border border-purple-200">
                <p className="text-xs text-purple-700 uppercase tracking-wide font-medium mb-2 print:mb-0.5 print:text-[10px]">
                  Part Exchange{snap.partExchanges.length > 1 ? "s" : ""}
                </p>
                <div className="space-y-3 print:space-y-0">
                  {snap.partExchanges.map((px, idx) => {
                    // Calculate VAT breakdown if VAT Qualifying
                    const pxNet = px.vatQualifying ? (px.allowance / 1.2) : null;
                    const pxVat = px.vatQualifying ? (px.allowance - pxNet) : null;
                    const netValue = px.allowance - (px.settlement || 0);

                    return (
                      <div key={idx} className="border-b border-purple-200 pb-2 last:border-0 last:pb-0 print:border-0 print:pb-0">
                        <div className="flex items-center justify-between text-sm print:text-xs">
                          <span className="font-semibold text-slate-900">
                            {px.vrm || `PX ${idx + 1}`}
                            <span className="font-normal text-slate-600 ml-2">{px.make} {px.model}</span>
                            {px.vatQualifying && (
                              <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">VAT Q</span>
                            )}
                            {!px.vatQualifying && (
                              <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">Margin</span>
                            )}
                          </span>
                          <span className="font-semibold text-purple-700">{formatCurrency(netValue)}</span>
                        </div>
                        {/* VAT breakdown for VAT Qualifying PX */}
                        {px.vatQualifying && (
                          <div className="text-xs text-purple-600 mt-1 print:text-[10px] flex gap-3">
                            <span>Net: {formatCurrency(pxNet)}</span>
                            <span>VAT: {formatCurrency(pxVat)}</span>
                            <span>Gross: {formatCurrency(px.allowance)}</span>
                          </div>
                        )}
                        {/* PX details - visible in print */}
                        <div className="text-xs text-slate-600 mt-1 print:text-[10px]">
                          {px.year && <span>{px.year}</span>}
                          {px.colour && <span> • {px.colour}</span>}
                          {px.mileage && <span> • {px.mileage.toLocaleString()} miles</span>}
                        </div>
                        {px.settlement > 0 && (
                          <div className="text-xs text-purple-600 mt-1 print:text-[10px] print:mt-0">
                            Settlement: {formatCurrency(px.settlement)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment Details - hide for print, shown in summary */}
            <div className="bg-emerald-50 rounded-lg p-3 print:hidden border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium">Deposit</p>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(deposit?.amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-emerald-600">{deposit?.method}</p>
                  {deposit?.reference && (
                    <p className="text-xs text-emerald-500">Ref: {deposit.reference}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            {(() => {
              // Show VAT columns if VAT registered (regardless of vehicle scheme)
              // This ensures delivery & add-on VAT is visible even for Margin Scheme vehicle sales
              const showVatColumns = snap.isVatRegistered !== false;
              const isMargin = snap.vatScheme === "MARGIN";

              return (
                <div className="border border-slate-200 rounded-xl print:rounded overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[300px] print:text-xs">
                    {showVatColumns && (
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-2 print:px-2 print:py-1 text-sm print:text-xs font-semibold text-slate-600">Item</th>
                          <th className="text-right px-4 py-2 print:px-2 print:py-1 text-sm print:text-xs font-semibold text-slate-600 w-24">Net</th>
                          <th className="text-right px-4 py-2 print:px-2 print:py-1 text-sm print:text-xs font-semibold text-slate-600 w-24">VAT</th>
                          <th className="text-right px-4 py-2 print:px-2 print:py-1 text-sm print:text-xs font-semibold text-slate-600 w-28">Gross</th>
                        </tr>
                      </thead>
                    )}
                    <tbody className="divide-y divide-slate-100">
                      {/* Vehicle */}
                      <tr>
                        <td className="px-4 py-3 print:px-2 print:py-1 text-slate-600">Vehicle Price{isMargin ? " (Margin)" : ""}</td>
                        {showVatColumns && (
                          <>
                            <td className="px-4 py-3 print:px-2 print:py-1 text-right text-slate-900">
                              {isMargin ? "—" : formatCurrency(snap.vehiclePriceNet)}
                            </td>
                            <td className="px-4 py-3 print:px-2 print:py-1 text-right text-slate-600">
                              {isMargin ? "—" : formatCurrency(snap.vehicleVatAmount)}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 print:px-2 print:py-1 text-right font-semibold text-slate-900">{formatCurrency(snap.vehiclePriceGross)}</td>
                      </tr>
                      {/* Add-ons */}
                      {snap.addOnsNetTotal > 0 && (
                        <tr>
                          <td className="px-4 py-3 print:px-2 print:py-1 text-slate-600">Add-ons</td>
                          {showVatColumns && (
                            <>
                              <td className="px-4 py-3 print:px-2 print:py-1 text-right text-slate-900">{formatCurrency(snap.addOnsNetTotal)}</td>
                              <td className="px-4 py-3 print:px-2 print:py-1 text-right text-slate-600">{formatCurrency(snap.addOnsVatTotal || 0)}</td>
                            </>
                          )}
                          <td className="px-4 py-3 print:px-2 print:py-1 text-right font-semibold text-slate-900">
                            {formatCurrency(snap.addOnsNetTotal + (snap.isVatRegistered !== false ? (snap.addOnsVatTotal || 0) : 0))}
                          </td>
                        </tr>
                      )}
                      {/* Warranty - show if included or has warranty data (for older deals) */}
                      {(snap.warranty?.included || (snap.warranty?.name && snap.warranty?.type !== "TRADE")) && (
                        <tr>
                          <td className="px-4 py-3 print:px-2 print:py-1 text-slate-600">
                            {snap.warranty?.name || "Warranty"}
                            {snap.warranty?.durationMonths && ` (${snap.warranty?.durationMonths} months)`}
                          </td>
                          {showVatColumns && (
                            <>
                              <td className="px-4 py-3 print:px-2 print:py-1 text-right text-slate-900">
                                {snap.warranty?.priceGross > 0 ? formatCurrency(snap.warranty?.priceNet || snap.warranty?.priceGross) : "—"}
                              </td>
                              <td className="px-4 py-3 print:px-2 print:py-1 text-right text-slate-600">
                                {snap.warranty?.priceGross > 0 && snap.warranty?.vatTreatment === "STANDARD"
                                  ? formatCurrency(snap.warranty?.vatAmount || 0)
                                  : "—"}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-3 print:px-2 print:py-1 text-right font-semibold text-slate-900">
                            {snap.warranty?.priceGross > 0 ? formatCurrency(snap.warranty?.priceGross) : (
                              <span className="text-emerald-600">Included</span>
                            )}
                          </td>
                        </tr>
                      )}
                      {/* Delivery */}
                      {(snap.delivery?.amountGross > 0 || snap.delivery?.amount > 0 || snap.delivery?.isFree) && (
                        <tr>
                          <td className="px-4 py-3 print:px-2 print:py-1 text-slate-600">Delivery</td>
                          {showVatColumns && (
                            <>
                              <td className="px-4 py-3 print:px-2 print:py-1 text-right text-slate-900">
                                {snap.delivery?.isFree ? "FREE" : formatCurrency(snap.delivery?.amountNet || snap.delivery?.amount)}
                              </td>
                              <td className="px-4 py-3 print:px-2 print:py-1 text-right text-slate-600">
                                {snap.delivery?.isFree ? "—" : formatCurrency(snap.delivery?.vatAmount || 0)}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-3 print:px-2 print:py-1 text-right font-semibold text-slate-900">
                            {snap.delivery?.isFree ? (
                              <span className="text-emerald-600">FREE</span>
                            ) : (
                              formatCurrency(snap.delivery?.amountGross || snap.delivery?.amount)
                            )}
                          </td>
                        </tr>
                      )}
                      {/* Total row */}
                      <tr className="bg-slate-800 text-white">
                        <td className={`px-4 py-3 print:px-2 print:py-1 font-semibold ${showVatColumns ? '' : ''}`} colSpan={showVatColumns ? 3 : 1}>Cash Price</td>
                        <td className="px-4 py-3 print:px-2 print:py-1 text-right font-bold">{formatCurrency(snap.grandTotal)}</td>
                      </tr>
                      {/* Part Exchange deductions */}
                      {snap.partExchanges?.map((px, idx) => (
                        <React.Fragment key={`px-sum-${idx}`}>
                          <tr>
                            <td className="px-4 py-2 print:px-2 print:py-0.5 text-slate-600" colSpan={showVatColumns ? 3 : 1}>
                              PX{snap.partExchanges.length > 1 ? ` #${idx + 1}` : ""}{px.vrm && ` (${px.vrm})`}
                            </td>
                            <td className="px-4 py-2 print:px-2 print:py-0.5 text-right font-semibold text-emerald-600">
                              -{formatCurrency(px.allowance || 0)}
                            </td>
                          </tr>
                          {px.settlement > 0 && (
                            <tr>
                              <td className="px-4 py-2 print:px-2 print:py-0.5 text-slate-600 pl-8 print:pl-6" colSpan={showVatColumns ? 3 : 1}>Settlement</td>
                              <td className="px-4 py-2 print:px-2 print:py-0.5 text-right font-semibold text-amber-600">+{formatCurrency(px.settlement)}</td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      <tr>
                        <td className="px-4 py-3 print:px-2 print:py-1 text-slate-600" colSpan={showVatColumns ? 3 : 1}>Deposit Paid</td>
                        <td className="px-4 py-3 print:px-2 print:py-1 text-right font-semibold text-emerald-600">-{formatCurrency(snap.totalPaid)}</td>
                      </tr>
                      <tr className="bg-blue-50">
                        <td className="px-4 py-3 print:px-2 print:py-1.5 font-semibold text-blue-900" colSpan={showVatColumns ? 3 : 1}>Balance Due</td>
                        <td className="px-4 py-3 print:px-2 print:py-1.5 text-right text-xl print:text-lg font-bold text-blue-900">{formatCurrency(snap.balanceDue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Taken By - hide for print */}
            {snap.takenBy && (
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 print:hidden">
                <div>
                  <span className="text-xs text-slate-400">Taken by: </span>
                  <span className="text-sm text-slate-900 font-medium">{snap.takenBy.name}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {formatDate(document.issuedAt)}
                </span>
              </div>
            )}

            {/* Signature Block + Footer - combined to stay together */}
            <div className="signature-footer-block border-t border-slate-200 pt-4 print:pt-2 print:mt-1">
              {/* Signature Block - for non-distance sales */}
              {snap.saleChannel === "DISTANCE" ? (
                <div className="mb-3 print:mb-1">
                  <p className="text-sm text-slate-400 text-center print:text-[10px]">No signature required for distance sales</p>
                </div>
              ) : (
                <div className="mb-4 print:mb-2">
                  <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-3 print:mb-1 print:text-[10px]">Signatures</p>

                  {/* Signature Images */}
                  {(snap.signature?.customerSignatureImageUrl || snap.signature?.dealerSignatureImageUrl) ? (
                    <div className="grid grid-cols-2 gap-6 print:gap-3">
                      {/* Customer Signature Image */}
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1 print:text-[10px] print:mb-0.5">Customer</p>
                        {snap.signature?.customerSignatureImageUrl ? (
                          <div className="border border-slate-200 rounded bg-white p-2 print:p-1">
                            <img
                              src={snap.signature.customerSignatureImageUrl}
                              alt="Customer signature"
                              className="max-h-16 print:max-h-8 mx-auto signature-image"
                            />
                          </div>
                        ) : (
                          <div className="border border-dashed border-slate-300 rounded p-3 print:p-1 text-sm text-slate-400 print:text-[10px]">
                            Pending
                          </div>
                        )}
                        {snap.signature?.customerSignerName && (
                          <p className="text-xs text-slate-600 mt-1 print:text-[10px] print:mt-0.5">{snap.signature.customerSignerName}</p>
                        )}
                      </div>

                      {/* Dealer Signature Image */}
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1 print:text-[10px] print:mb-0.5">Dealer</p>
                        {snap.signature?.dealerSignatureImageUrl ? (
                          <div className="border border-slate-200 rounded bg-white p-2 print:p-1">
                            <img
                              src={snap.signature.dealerSignatureImageUrl}
                              alt="Dealer signature"
                              className="max-h-16 print:max-h-8 mx-auto signature-image"
                            />
                          </div>
                        ) : (
                          <div className="border border-dashed border-slate-300 rounded p-3 print:p-1 text-sm text-slate-400 print:text-[10px]">
                            Pending
                          </div>
                        )}
                        {snap.signature?.dealerSignerName && (
                          <p className="text-xs text-slate-600 mt-1 print:text-[10px] print:mt-0.5">{snap.signature.dealerSignerName}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Fallback: simple inline signature status */
                    <div className="flex justify-center gap-12 print:gap-6 text-sm print:text-xs">
                      <div className="flex items-center gap-2 print:gap-1">
                        <span className="text-slate-500">Customer:</span>
                        {snap.signature?.customerSignedAt ? (
                          <span className="text-emerald-600 font-medium">Signed</span>
                        ) : (
                          <span className="text-amber-600">Pending</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 print:gap-1">
                        <span className="text-slate-500">Dealer:</span>
                        {snap.signature?.dealerSignedAt ? (
                          <span className="text-emerald-600 font-medium">Signed</span>
                        ) : (
                          <span className="text-amber-600">Pending</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Signed electronically note */}
                  {(snap.signature?.customerSignedAt || snap.signature?.dealerSignedAt) && (
                    <p className="text-xs text-slate-400 mt-2 text-center print:text-[10px] print:mt-0.5">Signed electronically via DealerHQ</p>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-3 print:pt-1 border-t border-slate-100">
                <p className="text-xs text-slate-400 print:text-[10px]">
                  {snap.dealer?.companyNumber && <span>Company Reg: {snap.dealer.companyNumber} | </span>}
                  Thank you for your deposit. This receipt is your proof of payment.
                </p>
              </div>
            </div>
          </div>

          {/* Page 2: Agreed Work + Add-ons + Terms & Conditions */}
          {(snap.requests?.length > 0 || snap.addOns?.length > 0 || snap.termsText) && (
            <div className="print:break-before-page">
              {/* Agreed Work Items */}
              {snap.requests?.length > 0 && (
                <div className="p-8 print:p-6 border-t border-slate-200">
                  <p className="text-sm text-orange-700 uppercase tracking-wide font-medium mb-4 print:text-xs">Agreed Work</p>
                  <div className="bg-orange-50 rounded-lg p-4 print:p-3 border border-orange-200">
                    <ul className="space-y-2 print:space-y-1">
                      {snap.requests.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm print:text-xs">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span className="text-slate-800">{req.title}{req.details && `: ${req.details}`}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Add-ons Included */}
              {snap.addOns?.length > 0 && (
                <div className="p-8 print:p-6 border-t border-slate-200">
                  <p className="text-sm text-indigo-700 uppercase tracking-wide font-medium mb-4 print:text-xs">Add-ons Included</p>
                  <div className="space-y-3 print:space-y-2">
                    {snap.addOns.map((addon, idx) => (
                      <div key={idx} className="flex justify-between items-start border-b border-slate-100 pb-2 print:pb-1">
                        <div>
                          <p className="font-medium text-slate-800 text-sm print:text-xs">{addon.name}</p>
                          {addon.description && <p className="text-xs text-slate-600 print:text-[10px]">{addon.description}</p>}
                        </div>
                        <p className="font-semibold text-slate-900 text-sm print:text-xs">{formatCurrency(addon.unitPriceNet * (addon.qty || 1))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Terms & Conditions */}
              {snap.termsText && (
                <div className="p-8 print:p-6 border-t border-slate-200">
                  <p className="text-sm text-slate-600 uppercase tracking-wide font-medium mb-4">Terms & Conditions</p>
                  <div className="text-[10px] text-slate-600 whitespace-pre-line leading-relaxed">{snap.termsText}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print\\:break-before-page {
            break-before: page;
          }
          .print-keep-together {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          /* Signature + Footer block - must stay together */
          .signature-footer-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          /* Ensure tables and sections stay together */
          table {
            break-inside: avoid;
          }
          /* Signature images - ensure they print at readable size */
          .signature-image {
            max-height: 32px !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            display: block !important;
            visibility: visible !important;
          }
          img {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
