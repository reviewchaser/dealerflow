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

export default function InvoicePage() {
  const router = useRouter();
  const { token, render } = router.query;
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect to PDF unless rendering for PDF generation
  useEffect(() => {
    if (token && render !== "html") {
      window.location.href = `/api/public/invoice/${token}/pdf`;
    }
  }, [token, render]);

  useEffect(() => {
    if (!token || render !== "html") return;

    const fetchDocument = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/public/invoice/${token}`);
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

  // Show loading while redirecting to PDF
  if (!render || render !== "html") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="loading loading-spinner loading-lg text-blue-600"></div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invoice Not Found</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const snap = document.snapshotData;
  const isMargin = snap.vatScheme === "MARGIN";
  const isVatRegistered = snap.isVatRegistered !== false;
  // Show VAT columns if VAT registered (regardless of vehicle scheme)
  // This ensures delivery & add-on VAT is visible even for Margin Scheme vehicle sales
  const showVatColumns = isVatRegistered;

  // Determine invoice recipient - finance company if financed, otherwise customer
  const hasFinanceInvoice = snap.financeAdvance > 0 && snap.financeCompanyName;
  const invoiceTo = hasFinanceInvoice && snap.invoiceTo?.name
    ? snap.invoiceTo
    : (snap.invoiceTo?.name ? snap.invoiceTo : snap.customer);

  // For finance deals, deliverTo should always be the customer
  const deliverTo = hasFinanceInvoice
    ? (snap.deliverTo || snap.customer)
    : snap.deliverTo;

  return (
    <>
      <Head>
        <title>Invoice {document.documentNumber} | DealerHQ</title>
      </Head>

      {/* Print controls - hidden when printing */}
      <div className="print:hidden bg-slate-100 p-4 sticky top-0 z-10 border-b border-slate-200">
        <div className="max-w-[800px] mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">Invoice</h1>
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
          {/* Header with Logo */}
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
                <h1 className="text-2xl font-bold text-slate-900">INVOICE</h1>
                <p className="text-slate-600 mt-1 text-base font-semibold">{document.documentNumber}</p>
                <p className="text-slate-500 text-sm mt-1">{formatDate(document.issuedAt)}</p>
                {isVatRegistered && snap.dealer?.vatNumber && (
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
          <div className="p-8 print:p-3 space-y-8 print:space-y-2">
            {/* Invoice Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">Invoice Date</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">{formatDate(document.issuedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">Invoice Number</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">{document.documentNumber}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">VAT Treatment</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">
                  {!isVatRegistered ? "Not VAT Registered" : isMargin ? "Margin Scheme" : snap.vatScheme === "VAT_QUALIFYING" ? "Standard VAT" : "Zero-rated"}
                </p>
              </div>
            </div>

            {/* Invoice To / Deliver To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-slate-50 rounded-xl p-5 print:bg-slate-50">
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-2">Invoice To</p>
                <p className="text-lg font-bold text-slate-900">{invoiceTo?.name}</p>
                {invoiceTo?.companyName && (
                  <p className="text-slate-600">{invoiceTo.companyName}</p>
                )}
                {invoiceTo?.address && (
                  <p className="text-slate-500 text-sm mt-1 whitespace-pre-line">
                    {[invoiceTo.address.line1, invoiceTo.address.line2, invoiceTo.address.town, invoiceTo.address.county, invoiceTo.address.postcode].filter(Boolean).join("\n")}
                  </p>
                )}
                {invoiceTo?.email && <p className="text-slate-500 text-sm mt-2">{invoiceTo.email}</p>}
              </div>

              {/* Deliver To (shown for finance deals or when delivery address is different) */}
              {deliverTo && (
                <div className="bg-emerald-50 rounded-xl p-5 print:bg-emerald-50">
                  <p className="text-sm text-emerald-600 uppercase tracking-wide font-medium mb-2">Deliver To</p>
                  <p className="text-lg font-bold text-slate-900">{deliverTo.name}</p>
                  {deliverTo.companyName && (
                    <p className="text-slate-600">{deliverTo.companyName}</p>
                  )}
                  {deliverTo.address && (
                    <p className="text-slate-500 text-sm mt-1 whitespace-pre-line">
                      {[deliverTo.address.line1, deliverTo.address.line2, deliverTo.address.town, deliverTo.address.county, deliverTo.address.postcode].filter(Boolean).join("\n")}
                    </p>
                  )}
                  {deliverTo.phone && <p className="text-slate-500 text-sm mt-2">{deliverTo.phone}</p>}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-3">Items</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Description</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600 w-24">Qty</th>
                      {showVatColumns && <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600 w-28">Net</th>}
                      {showVatColumns && <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600 w-24">VAT</th>}
                      <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600 w-28">{isMargin ? "Price" : "Gross"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Vehicle */}
                    <tr>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{snap.vehicle?.year} {snap.vehicle?.make} {snap.vehicle?.model}{isMargin ? " (Margin)" : ""}</p>
                        <p className="text-sm text-slate-500">
                          {snap.vehicle?.regCurrent}{snap.vehicle?.vin && ` | VIN: ${snap.vehicle.vin}`}
                        </p>
                        <p className="text-sm text-slate-500">
                          {snap.vehicle?.colour && `${snap.vehicle.colour} | `}
                          Mileage: {snap.vehicle?.mileage ? `${snap.vehicle.mileage.toLocaleString()} miles` : <span className="italic text-slate-400">Not recorded</span>}
                          {" | "}Date of Reg: {snap.vehicle?.firstRegisteredDate
                            ? new Date(snap.vehicle.firstRegisteredDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                            : <span className="italic text-slate-400">Not recorded</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">1</td>
                      {showVatColumns && <td className="px-4 py-3 text-right text-slate-900">{isMargin ? "—" : formatCurrency(snap.vehiclePriceNet)}</td>}
                      {showVatColumns && <td className="px-4 py-3 text-right text-slate-600">{isMargin ? "—" : formatCurrency(snap.vehicleVatAmount)}</td>}
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(snap.vehiclePriceGross)}</td>
                    </tr>

                    {/* Add-ons */}
                    {snap.addOns?.map((addon, idx) => {
                      const addonVat = addon.vatTreatment === "STANDARD" ? addon.unitPriceNet * addon.qty * (addon.vatRate || 0.2) : 0;
                      const addonGross = addon.unitPriceNet * addon.qty + addonVat;
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-slate-900">{addon.name}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{addon.qty}</td>
                          {showVatColumns && <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(addon.unitPriceNet * addon.qty)}</td>}
                          {showVatColumns && <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(addonVat)}</td>}
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(addonGross)}</td>
                        </tr>
                      );
                    })}

                    {/* Delivery Charge - always show if delivery is set */}
                    {(snap.delivery?.amountGross > 0 || snap.delivery?.amount > 0 || snap.delivery?.isFree) && (
                      <tr>
                        <td className="px-4 py-3 text-slate-900">Delivery Charge</td>
                        <td className="px-4 py-3 text-right text-slate-600">1</td>
                        {showVatColumns && (
                          <td className="px-4 py-3 text-right text-slate-900">
                            {snap.delivery?.isFree ? "FREE" : formatCurrency(snap.delivery?.amountNet || snap.delivery?.amount)}
                          </td>
                        )}
                        {showVatColumns && (
                          <td className="px-4 py-3 text-right text-slate-600">
                            {snap.delivery?.isFree ? "—" : formatCurrency(snap.delivery?.vatAmount || 0)}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {snap.delivery?.isFree ? "FREE" : formatCurrency(snap.delivery?.amountGross || snap.delivery?.amount)}
                        </td>
                      </tr>
                    )}

                    {/* Warranty - show if included with cost breakdown */}
                    {snap.warranty?.included && snap.warranty?.priceGross > 0 && (
                      <tr>
                        <td className="px-4 py-3 text-slate-900">
                          {snap.warranty.name || "Warranty"} ({snap.warranty.durationMonths || 3} months)
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">1</td>
                        {showVatColumns && (
                          <td className="px-4 py-3 text-right text-slate-900">
                            {formatCurrency(snap.warranty.priceNet || snap.warranty.priceGross)}
                          </td>
                        )}
                        {showVatColumns && (
                          <td className="px-4 py-3 text-right text-slate-600">
                            {snap.warranty.vatApplicable ? formatCurrency(snap.warranty.vatAmount || 0) : "Exempt"}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(snap.warranty.priceGross)}
                        </td>
                      </tr>
                    )}

                    {/* Delivery Credit - if delivery was charged on deposit but removed */}
                    {snap.deliveryCredit > 0 && (
                      <tr className="bg-red-50">
                        <td className="px-4 py-3 text-red-700">Less: Delivery Credit</td>
                        <td className="px-4 py-3 text-right text-red-600">1</td>
                        {showVatColumns && (
                          <td className="px-4 py-3 text-right text-red-600">-{formatCurrency(snap.deliveryCredit)}</td>
                        )}
                        {showVatColumns && (
                          <td className="px-4 py-3 text-right text-red-600">—</td>
                        )}
                        <td className="px-4 py-3 text-right font-semibold text-red-700">-{formatCurrency(snap.deliveryCredit)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full sm:w-80">
                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[280px]">
                    <tbody className="divide-y divide-slate-100">
                      {showVatColumns && (
                        <>
                          <tr>
                            <td className="px-4 py-2 text-slate-600">Subtotal</td>
                            <td className="px-4 py-2 text-right font-semibold text-slate-900">{formatCurrency(snap.subtotal)}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-slate-600">VAT @ 20%</td>
                            <td className="px-4 py-2 text-right font-semibold text-slate-900">{formatCurrency(snap.totalVat)}</td>
                          </tr>
                        </>
                      )}
                      <tr className="bg-slate-800 text-white">
                        <td className="px-4 py-3 font-semibold">Cash Price</td>
                        <td className="px-4 py-3 text-right text-xl font-bold">{formatCurrency(snap.grandTotal)}</td>
                      </tr>

                      {/* Part Exchange(s) - full breakdown */}
                      {snap.partExchanges?.length > 0 ? (
                        // Multiple PX format with full breakdown
                        snap.partExchanges.map((px, idx) => {
                          // Calculate VAT breakdown if VAT Qualifying
                          const pxNet = px.vatQualifying ? (px.allowance / 1.2) : null;
                          const pxVat = px.vatQualifying ? (px.allowance - pxNet) : null;

                          return (
                            <React.Fragment key={`px-${idx}`}>
                              <tr className="bg-purple-50">
                                <td colSpan="2" className="px-4 py-2">
                                  <div className="text-sm font-medium text-purple-700 flex items-center gap-2">
                                    <span>Part Exchange {snap.partExchanges.length > 1 ? `#${idx + 1}` : ""} {px.vrm ? `(${px.vrm})` : ""}</span>
                                    {px.vatQualifying ? (
                                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">VAT Q</span>
                                    ) : (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">Margin</span>
                                    )}
                                    {px.make && px.model && <span className="font-normal text-purple-600"> - {px.make} {px.model}</span>}
                                  </div>
                                  {(px.year || px.colour || px.mileage || px.fuelType) && (
                                    <div className="text-xs text-purple-600 mt-0.5">
                                      {px.year && <span>{px.year}</span>}
                                      {px.colour && <span> • {px.colour}</span>}
                                      {px.mileage && <span> • {px.mileage.toLocaleString()} miles</span>}
                                      {px.fuelType && <span> • {px.fuelType}</span>}
                                    </div>
                                  )}
                                </td>
                              </tr>
                              {/* VAT breakdown for VAT Qualifying PX */}
                              {px.vatQualifying && (
                                <>
                                  <tr>
                                    <td className="px-4 py-1 text-slate-500 pl-8 text-sm">Net Allowance</td>
                                    <td className="px-4 py-1 text-right text-slate-600 text-sm">-{formatCurrency(pxNet)}</td>
                                  </tr>
                                  <tr>
                                    <td className="px-4 py-1 text-slate-500 pl-8 text-sm">VAT (20%)</td>
                                    <td className="px-4 py-1 text-right text-slate-600 text-sm">-{formatCurrency(pxVat)}</td>
                                  </tr>
                                </>
                              )}
                              <tr>
                                <td className="px-4 py-2 text-slate-600 pl-8">Allowance (Gross)</td>
                                <td className="px-4 py-2 text-right font-semibold text-emerald-600">-{formatCurrency(px.allowance || 0)}</td>
                              </tr>
                              {px.settlement > 0 && (
                                <tr>
                                  <td className="px-4 py-2 text-slate-600 pl-8">Less: Settlement</td>
                                  <td className="px-4 py-2 text-right font-semibold text-amber-600">+{formatCurrency(px.settlement)}</td>
                                </tr>
                              )}
                              <tr>
                                <td className="px-4 py-2 text-slate-600 pl-8 font-medium">Net Part Exchange</td>
                                <td className="px-4 py-2 text-right font-bold text-emerald-600">-{formatCurrency((px.allowance || 0) - (px.settlement || 0))}</td>
                              </tr>
                            </React.Fragment>
                          );
                        })
                      ) : snap.partExchange?.allowance > 0 ? (
                        // Legacy single PX format with full breakdown
                        <>
                          <tr className="bg-purple-50">
                            <td colSpan="2" className="px-4 py-2 text-sm font-medium text-purple-700">
                              Part Exchange {snap.partExchange.vrm ? `(${snap.partExchange.vrm})` : ""}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-slate-600 pl-8">Allowance</td>
                            <td className="px-4 py-2 text-right font-semibold text-emerald-600">-{formatCurrency(snap.partExchange.allowance)}</td>
                          </tr>
                          {snap.partExchange?.settlement > 0 && (
                            <tr>
                              <td className="px-4 py-2 text-slate-600 pl-8">Less: Settlement</td>
                              <td className="px-4 py-2 text-right font-semibold text-amber-600">+{formatCurrency(snap.partExchange.settlement)}</td>
                            </tr>
                          )}
                          <tr>
                            <td className="px-4 py-2 text-slate-600 pl-8 font-medium">Net Part Exchange</td>
                            <td className="px-4 py-2 text-right font-bold text-emerald-600">-{formatCurrency((snap.partExchange.allowance || 0) - (snap.partExchange.settlement || 0))}</td>
                          </tr>
                        </>
                      ) : null}

                      {/* Finance Advance - money paid directly by finance company */}
                      {snap.financeAdvance > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-slate-600">
                            Less: Amount on finance
                            {snap.financeCompanyName && <span className="text-slate-500"> from {snap.financeCompanyName}</span>}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-600">-{formatCurrency(snap.financeAdvance)}</td>
                        </tr>
                      )}

                      {/* Deposit Paid */}
                      {snap.depositPaid > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-slate-600">Less: Deposit Paid</td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-600">-{formatCurrency(snap.depositPaid)}</td>
                        </tr>
                      )}

                      {/* Other Payments (balance payments after deposit, excluding finance) */}
                      {snap.otherPayments > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-slate-600">Less: Payments Received</td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-600">-{formatCurrency(snap.otherPayments)}</td>
                        </tr>
                      )}

                      {/* Fallback: show totalPaid if individual breakdown not available */}
                      {!snap.depositPaid && !snap.otherPayments && !snap.financeAdvance && snap.totalPaid > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-slate-600">Less: Payments Received</td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-600">-{formatCurrency(snap.totalPaid)}</td>
                        </tr>
                      )}

                      <tr className="bg-blue-50">
                        <td className="px-4 py-3 font-bold text-blue-900">
                          {snap.financeAdvance > 0 && snap.customer?.name
                            ? `Amount Due from ${snap.customer.name}`
                            : "Balance Due"}
                        </td>
                        <td className="px-4 py-3 text-right text-xl font-bold text-blue-900">{formatCurrency(snap.balanceDue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Margin Scheme Notice */}
            {isMargin && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-amber-800 font-medium">Sold under the VAT margin scheme. No VAT is recoverable.</p>
              </div>
            )}

            {/* Warranty - show if included */}
            {snap.warranty?.included && (
              <div className="bg-emerald-50 rounded-xl p-5 print:p-3 border border-emerald-200">
                <p className="text-sm text-emerald-700 uppercase tracking-wide font-medium mb-2 print:mb-1">Warranty Included</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-emerald-900 print:text-sm">{snap.warranty.name || "Warranty"}</p>
                    <div className="text-sm text-emerald-700 mt-1 print:text-xs">
                      {snap.warranty.durationMonths && (
                        <span className="mr-4">{snap.warranty.durationMonths} months</span>
                      )}
                      {snap.warranty.claimLimit ? (
                        <span>Claim limit: {formatCurrency(snap.warranty.claimLimit)}</span>
                      ) : (
                        <span>Unlimited claims</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {snap.warranty.priceGross > 0 ? (
                      <p className="text-lg font-bold text-emerald-700 print:text-base">{formatCurrency(snap.warranty.priceGross)}</p>
                    ) : (
                      <span className="text-emerald-600 font-medium">FREE</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Part Exchange Details - hidden for print (already shown in totals) */}
            {snap.partExchange && (
              <div className="bg-slate-50 rounded-xl p-5 print:hidden">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">Part Exchange</p>
                  {snap.partExchange.vatQualifying && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">VAT Qualifying</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{snap.partExchange.vrm} - {snap.partExchange.make} {snap.partExchange.model}</p>
                    {snap.partExchange.settlement > 0 && (
                      <p className="text-sm text-slate-500">Settlement: {formatCurrency(snap.partExchange.settlement)}</p>
                    )}
                    {snap.partExchange.hasFinance && snap.partExchange.financeCompanyName && (
                      <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Finance: {snap.partExchange.financeCompanyName}
                        {snap.partExchange.financeSettled && <span className="text-emerald-600 ml-1">(Settled)</span>}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Allowance</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(snap.partExchange.allowance)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bank Details - hidden for print (already in header) */}
            {snap.bankDetails?.accountNumber && (
              <div className="bg-blue-50 rounded-xl p-5 print:hidden">
                <p className="text-sm text-blue-600 uppercase tracking-wide font-medium mb-3">Payment Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                  <div>
                    <p className="text-blue-500">Account Name</p>
                    <p className="font-semibold text-blue-900">{snap.bankDetails.accountName}</p>
                  </div>
                  <div>
                    <p className="text-blue-500">Sort Code</p>
                    <p className="font-semibold text-blue-900">{snap.bankDetails.sortCode}</p>
                  </div>
                  <div>
                    <p className="text-blue-500">Account Number</p>
                    <p className="font-semibold text-blue-900">{snap.bankDetails.accountNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Signature Block + Footer - combined to stay together */}
            <div className="signature-footer-block border-t border-slate-200 pt-3 print:pt-2">
              {/* Signature Block - only for retail sales (not trade/export) */}
              {(!snap.saleType || snap.saleType === "RETAIL") && (
                <div className="mb-3 print:mb-2">
                  <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-2 print:mb-1 print:text-[10px]">Signatures</p>

                  {/* Signature Images */}
                  {(snap.signature?.customerSignatureImageUrl || snap.signature?.dealerSignatureImageUrl) ? (
                    <div className="grid grid-cols-2 gap-4 print:gap-2">
                      {/* Customer Signature Image */}
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1 print:text-[9px] print:mb-0.5">Customer</p>
                        {snap.signature?.customerSignatureImageUrl ? (
                          <div className="border border-slate-200 rounded bg-white p-1">
                            <img
                              src={snap.signature.customerSignatureImageUrl}
                              alt="Customer signature"
                              className="max-h-12 print:max-h-10 mx-auto signature-image"
                            />
                          </div>
                        ) : (
                          <div className="border border-dashed border-slate-300 rounded p-1 text-xs text-slate-400 print:text-[9px]">
                            Pending
                          </div>
                        )}
                        {snap.signature?.customerSignerName && (
                          <p className="text-xs text-slate-600 mt-0.5 print:text-[8px]">{snap.signature.customerSignerName}</p>
                        )}
                      </div>

                      {/* Dealer Signature Image */}
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1 print:text-[9px] print:mb-0.5">Dealer</p>
                        {snap.signature?.dealerSignatureImageUrl ? (
                          <div className="border border-slate-200 rounded bg-white p-1">
                            <img
                              src={snap.signature.dealerSignatureImageUrl}
                              alt="Dealer signature"
                              className="max-h-12 print:max-h-10 mx-auto signature-image"
                            />
                          </div>
                        ) : (
                          <div className="border border-dashed border-slate-300 rounded p-1 text-xs text-slate-400 print:text-[9px]">
                            Pending
                          </div>
                        )}
                        {snap.signature?.dealerSignerName && (
                          <p className="text-xs text-slate-600 mt-0.5 print:text-[8px]">{snap.signature.dealerSignerName}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Fallback: simple inline signature status */
                    <div className="flex justify-center gap-8 print:gap-4 text-xs print:text-[9px]">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Customer:</span>
                        {snap.signature?.customerSignedAt ? (
                          <span className="text-emerald-600 font-medium">Signed</span>
                        ) : (
                          <span className="text-amber-600">Pending</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
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
                    <p className="text-xs text-slate-400 mt-1 text-center print:text-[7px] print:mt-0.5">Signed electronically via DealerHQ</p>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-2 print:pt-1 border-t border-slate-100">
                {snap.dealer?.companyNumber && (
                  <p className="text-xs text-slate-500 print:text-[8px]">Registered Company: {snap.dealer.companyNumber}</p>
                )}
                <p className="text-xs text-slate-400 mt-1 print:text-[8px] print:mt-0.5">Thank you for your business.</p>
              </div>
            </div>
          </div>

          {/* Page 2: Payments Received + Terms & Conditions */}
          {(snap.payments?.length > 0 || snap.termsText) && (
            <div className="print:break-before-page">
              {/* Payments Received - Individual breakdown */}
              {snap.payments?.length > 0 && (
                <div className="p-8 print:p-6">
                  <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                    <div className="bg-emerald-50 px-4 py-2 border-b border-slate-200">
                      <p className="text-sm font-medium text-emerald-800">Payments Received</p>
                    </div>
                    <table className="w-full min-w-[400px]">
                      <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Type</th>
                          <th className="px-4 py-2 text-left font-medium">Method</th>
                          <th className="px-4 py-2 text-left font-medium">Date</th>
                          <th className="px-4 py-2 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {snap.payments.map((payment, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-slate-900 capitalize">
                              {(payment.type || "Payment").replace(/_/g, " ").toLowerCase()}
                            </td>
                            <td className="px-4 py-2 text-slate-600">
                              {payment.method?.replace(/_/g, " ") || "—"}
                            </td>
                            <td className="px-4 py-2 text-slate-600 text-sm">
                              {payment.paidAt ? new Date(payment.paidAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </td>
                            <td className="px-4 py-2 text-right font-semibold text-emerald-600">{formatCurrency(payment.amount)}</td>
                          </tr>
                        ))}
                        <tr className="bg-emerald-50">
                          <td colSpan="3" className="px-4 py-2 font-medium text-emerald-800">Total Paid</td>
                          <td className="px-4 py-2 text-right font-bold text-emerald-700">
                            {formatCurrency(snap.payments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Terms & Conditions */}
              {snap.termsText && (
                <div className="p-8 print:p-6 border-t border-slate-200">
                  <p className="text-sm text-slate-600 uppercase tracking-wide font-medium mb-4">Terms & Conditions</p>
                  <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{snap.termsText}</div>
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
          /* Signature images - ensure they print at readable size */
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
          /* Ensure tables stay together */
          table {
            break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}
