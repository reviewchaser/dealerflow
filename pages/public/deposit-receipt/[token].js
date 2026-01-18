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
  const { token } = router.query;
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;

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
  }, [token]);

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
          <div className="bg-white p-6 print:p-4 border-b border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {snap.dealer?.logoUrl && (
                  <div className="bg-white p-2 rounded border border-slate-100 shrink-0">
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
            {/* Bank Details in Header */}
            {snap.bankDetails?.accountNumber && (
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs">
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
          <div className="p-8 print:p-4 space-y-6 print:space-y-4">
            {/* Date and Receipt Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
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
            <div className="bg-slate-50 rounded-xl p-5 print:bg-slate-50">
              <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-2">Received From</p>
              <p className="text-lg font-bold text-slate-900">{snap.customer?.name}</p>
              {snap.customer?.companyName && (
                <p className="text-slate-600">{snap.customer.companyName}</p>
              )}
              {snap.customer?.email && <p className="text-slate-500 text-sm">{snap.customer.email}</p>}
              {snap.customer?.phone && <p className="text-slate-500 text-sm">{snap.customer.phone}</p>}
            </div>

            {/* Vehicle Details */}
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-3">Vehicle</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
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

            {/* Add-ons (if any) */}
            {snap.addOns?.length > 0 && (
              <div>
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

            {/* Sale Options Summary - Compact Grid */}
            <div className={`grid gap-2 print:gap-1 ${snap.financeSelection?.isFinanced ? 'grid-cols-3' : 'grid-cols-2'}`}>
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
              <div className="bg-purple-50 rounded-lg p-3 print:p-2 print:bg-purple-50 border border-purple-200">
                <p className="text-xs text-purple-700 uppercase tracking-wide font-medium mb-2 print:text-[9px]">
                  Part Exchange{snap.partExchanges.length > 1 ? "s" : ""}
                </p>
                <div className="space-y-3 print:space-y-2">
                  {snap.partExchanges.map((px, idx) => (
                    <div key={idx} className="border-b border-purple-200 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-sm print:text-xs">
                        <span className="font-semibold text-slate-900">
                          {px.vrm || `PX ${idx + 1}`}
                        </span>
                        <span className="font-semibold text-purple-700">{formatCurrency(px.allowance - (px.settlement || 0))}</span>
                      </div>
                      {(px.make || px.model || px.year || px.colour || px.mileage) && (
                        <div className="text-xs text-slate-600 mt-1 print:text-[9px]">
                          {px.make && px.model && <span>{px.make} {px.model}</span>}
                          {px.year && <span> • {px.year}</span>}
                          {px.colour && <span> • {px.colour}</span>}
                          {px.mileage && <span> • {px.mileage.toLocaleString()} miles</span>}
                          {px.fuelType && <span> • {px.fuelType}</span>}
                        </div>
                      )}
                      {px.settlement > 0 && (
                        <div className="text-xs text-purple-600 mt-1 print:text-[9px]">
                          Allowance: {formatCurrency(px.allowance)} | Settlement: {formatCurrency(px.settlement)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Details - Compact */}
            <div className="bg-emerald-50 rounded-lg p-3 print:p-2 print:bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium print:text-[9px]">Deposit</p>
                  <p className="text-xl font-bold text-emerald-700 print:text-lg">{formatCurrency(deposit?.amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-emerald-600 print:text-xs">{deposit?.method}</p>
                  {deposit?.reference && (
                    <p className="text-xs text-emerald-500 print:text-[9px]">Ref: {deposit.reference}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[300px]">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 text-slate-600">Vehicle Price</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(snap.vehiclePriceGross)}</td>
                  </tr>
                  {snap.addOnsNetTotal > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Add-ons</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(snap.addOnsNetTotal + (snap.isVatRegistered !== false ? (snap.addOnsVatTotal || 0) : 0))}
                      </td>
                    </tr>
                  )}
                  {(snap.delivery?.amountGross > 0 || snap.delivery?.amount > 0 || snap.delivery?.isFree) && (
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Delivery Charge</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {snap.delivery?.isFree ? (
                          <span className="text-emerald-600">FREE</span>
                        ) : (
                          formatCurrency(snap.delivery?.amountGross || snap.delivery?.amount)
                        )}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-slate-800 text-white">
                    <td className="px-4 py-3 font-semibold">Cash Price</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(snap.grandTotal)}</td>
                  </tr>
                  {/* Part Exchange deductions - show allowance and settlement separately */}
                  {snap.partExchanges?.map((px, idx) => (
                    <React.Fragment key={`px-sum-${idx}`}>
                      <tr>
                        <td className="px-4 py-2 text-slate-600">
                          Part Exchange {snap.partExchanges.length > 1 ? `#${idx + 1}` : ""} Allowance
                          {px.vrm && ` (${px.vrm})`}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                          -{formatCurrency(px.allowance || 0)}
                        </td>
                      </tr>
                      {px.settlement > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-slate-600 pl-8">
                            Less: Settlement
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-amber-600">
                            +{formatCurrency(px.settlement)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  <tr>
                    <td className="px-4 py-3 text-slate-600">Deposit Paid</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">-{formatCurrency(snap.totalPaid)}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="px-4 py-3 font-semibold text-blue-900">Balance Due</td>
                    <td className="px-4 py-3 text-right text-xl font-bold text-blue-900">{formatCurrency(snap.balanceDue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Agreed Work Items - Compact */}
            {snap.requests?.length > 0 && (
              <div className="print:break-inside-avoid bg-orange-50 rounded-lg p-3 print:p-2 print:bg-orange-50 border border-orange-200">
                <p className="text-xs text-orange-700 uppercase tracking-wide font-medium mb-1 print:mb-0.5 print:text-[9px]">Agreed Work</p>
                <ul className="space-y-0.5 print:space-y-0">
                  {snap.requests.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-1 text-sm print:text-xs">
                      <span className="text-orange-600 shrink-0">•</span>
                      <span className="text-slate-900">{req.title}{req.details && ` - ${req.details}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Taken By - Compact */}
            {snap.takenBy && (
              <div className="flex items-center justify-between p-2 print:p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs text-slate-400 print:text-[9px]">Taken by: </span>
                  <span className="text-sm text-slate-900 font-medium print:text-xs">{snap.takenBy.name}</span>
                </div>
                <span className="text-xs text-slate-500 print:text-[9px]">
                  {formatDate(document.issuedAt)}
                </span>
              </div>
            )}

            {/* Signature Block - for non-distance sales */}
            {snap.saleChannel === "DISTANCE" ? (
              <div className="print:break-inside-avoid border-t border-slate-200 pt-4 print:pt-2">
                <p className="text-sm text-slate-400 text-center print:text-xs">Deposit receipt — no signature required for distance sales</p>
              </div>
            ) : (
              <div className="print:break-inside-avoid print-keep-together border-t border-slate-200 pt-4 print:pt-2">
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-3 print:mb-2 print:text-xs">Signatures</p>

                {/* Signature Images */}
                {(snap.signature?.customerSignatureImageUrl || snap.signature?.dealerSignatureImageUrl) && (
                  <div className="grid grid-cols-2 gap-4 print:gap-2 mb-3 print:mb-2">
                    {/* Customer Signature Image */}
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Customer</p>
                      {snap.signature?.customerSignatureImageUrl ? (
                        <div className="border border-slate-200 rounded bg-white p-2 print:p-1">
                          <img
                            src={snap.signature.customerSignatureImageUrl}
                            alt="Customer signature"
                            className="max-h-12 print:max-h-8 mx-auto signature-image"
                          />
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-300 rounded p-2 print:p-1 text-xs text-slate-400">
                          Pending
                        </div>
                      )}
                      {snap.signature?.customerSignerName && (
                        <p className="text-xs text-slate-600 mt-1">{snap.signature.customerSignerName}</p>
                      )}
                    </div>

                    {/* Dealer Signature Image */}
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Dealer</p>
                      {snap.signature?.dealerSignatureImageUrl ? (
                        <div className="border border-slate-200 rounded bg-white p-2 print:p-1">
                          <img
                            src={snap.signature.dealerSignatureImageUrl}
                            alt="Dealer signature"
                            className="max-h-12 print:max-h-8 mx-auto signature-image"
                          />
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-300 rounded p-2 print:p-1 text-xs text-slate-400">
                          Pending
                        </div>
                      )}
                      {snap.signature?.dealerSignerName && (
                        <p className="text-xs text-slate-600 mt-1">{snap.signature.dealerSignerName}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Fallback status display if no images */}
                {!snap.signature?.customerSignatureImageUrl && !snap.signature?.dealerSignatureImageUrl && (
                  <div className="bg-slate-50 rounded-lg p-3 print:p-2">
                    <div className="grid grid-cols-2 gap-4 print:gap-2">
                      {/* Customer Status */}
                      <div className="flex items-center gap-2">
                        {snap.signature?.customerSignedAt ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-900">Customer signed</p>
                              <p className="text-xs text-slate-500">
                                {snap.signature.customerSignerName} - {new Date(snap.signature.customerSignedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-900">Customer</p>
                              <p className="text-xs text-amber-600">Pending</p>
                            </div>
                          </>
                        )}
                      </div>
                      {/* Dealer Status */}
                      <div className="flex items-center gap-2">
                        {snap.signature?.dealerSignedAt ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-900">Dealer signed</p>
                              <p className="text-xs text-slate-500">
                                {snap.signature.dealerSignerName} - {new Date(snap.signature.dealerSignedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-900">Dealer</p>
                              <p className="text-xs text-amber-600">Pending</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Signed electronically note */}
                {(snap.signature?.customerSignedAt || snap.signature?.dealerSignedAt) && (
                  <p className="text-xs text-slate-400 mt-2 print:mt-1 text-center print:text-[8px]">Signed electronically via DealerHQ</p>
                )}
              </div>
            )}

            {/* Footer - keep together */}
            <div className="print:break-inside-avoid border-t border-slate-200 pt-4 text-center">
              {snap.dealer?.companyNumber && (
                <p className="text-xs text-slate-500">Company Reg: {snap.dealer.companyNumber}</p>
              )}
              <p className="text-xs text-slate-400 mt-2">Thank you for your deposit. This receipt is your proof of payment.</p>
            </div>
          </div>

          {/* Terms & Conditions - separate page if present */}
          {snap.termsText && (
            <div className="p-8 print:p-6 print:break-before-page border-t border-slate-200">
              <p className="text-sm text-slate-600 uppercase tracking-wide font-medium mb-4">Terms & Conditions</p>
              <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{snap.termsText}</div>
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
          /* Ensure tables and sections stay together */
          table {
            break-inside: avoid;
          }
          /* Signature images - ensure they print */
          .signature-image {
            max-height: 40px !important;
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
