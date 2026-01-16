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
  const { token } = router.query;
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;

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
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invoice Not Found</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const snap = document.snapshotData;
  const isMargin = snap.vatScheme === "MARGIN";
  const isVatRegistered = snap.isVatRegistered !== false;
  const showVatColumns = !isMargin && isVatRegistered;
  const invoiceTo = snap.invoiceTo?.name ? snap.invoiceTo : snap.customer;

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
          </div>

          {/* Details */}
          <div className="p-8 print:p-6 space-y-8 print:space-y-6">
            {/* Invoice Info Row */}
            <div className="grid grid-cols-3 gap-6">
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
            <div className="grid grid-cols-2 gap-6">
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

              {/* Deliver To (shown if customer is different or delivery address provided) */}
              {snap.deliverTo && (
                <div className="bg-emerald-50 rounded-xl p-5 print:bg-emerald-50">
                  <p className="text-sm text-emerald-600 uppercase tracking-wide font-medium mb-2">Deliver To</p>
                  <p className="text-lg font-bold text-slate-900">{snap.deliverTo.name}</p>
                  {snap.deliverTo.companyName && (
                    <p className="text-slate-600">{snap.deliverTo.companyName}</p>
                  )}
                  {snap.deliverTo.address && (
                    <p className="text-slate-500 text-sm mt-1 whitespace-pre-line">
                      {[snap.deliverTo.address.line1, snap.deliverTo.address.line2, snap.deliverTo.address.town, snap.deliverTo.address.county, snap.deliverTo.address.postcode].filter(Boolean).join("\n")}
                    </p>
                  )}
                  {snap.deliverTo.phone && <p className="text-slate-500 text-sm mt-2">{snap.deliverTo.phone}</p>}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-3">Items</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
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
                        <p className="font-semibold text-slate-900">{snap.vehicle?.year} {snap.vehicle?.make} {snap.vehicle?.model}</p>
                        <p className="text-sm text-slate-500">
                          {snap.vehicle?.regCurrent} | VIN: {snap.vehicle?.vin || <span className="italic text-slate-400">Not recorded</span>}
                        </p>
                        <p className="text-sm text-slate-500">
                          {snap.vehicle?.colour && `${snap.vehicle.colour} | `}
                          Mileage: {snap.vehicle?.mileage ? `${snap.vehicle.mileage.toLocaleString()} miles` : <span className="italic text-slate-400">Not recorded</span>}
                          {snap.vehicle?.firstRegisteredDate && ` | First Reg: ${new Date(snap.vehicle.firstRegisteredDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">1</td>
                      {showVatColumns && <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(snap.vehiclePriceNet)}</td>}
                      {showVatColumns && <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(snap.vehicleVatAmount)}</td>}
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
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-80">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full">
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
                        snap.partExchanges.map((px, idx) => (
                          <React.Fragment key={`px-${idx}`}>
                            <tr className="bg-purple-50">
                              <td colSpan="2" className="px-4 py-2">
                                <div className="text-sm font-medium text-purple-700">
                                  Part Exchange {snap.partExchanges.length > 1 ? `#${idx + 1}` : ""} {px.vrm ? `(${px.vrm})` : ""}
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
                            <tr>
                              <td className="px-4 py-2 text-slate-600 pl-8">Allowance</td>
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
                        ))
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
                          <td className="px-4 py-2 text-slate-600">Deposit Paid</td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-600">-{formatCurrency(snap.depositPaid)}</td>
                        </tr>
                      )}

                      {/* Other Payments (balance payments after deposit) */}
                      {snap.otherPayments > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-slate-600">Payments Received</td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-600">-{formatCurrency(snap.otherPayments)}</td>
                        </tr>
                      )}

                      {/* Fallback: show totalPaid if individual breakdown not available */}
                      {!snap.depositPaid && !snap.otherPayments && snap.totalPaid > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-slate-600">Payments Received</td>
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

            {/* Part Exchange Details */}
            {snap.partExchange && (
              <div className="bg-slate-50 rounded-xl p-5">
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

            {/* Bank Details */}
            {snap.bankDetails?.accountNumber && (
              <div className="bg-blue-50 rounded-xl p-5 print:bg-blue-50">
                <p className="text-sm text-blue-600 uppercase tracking-wide font-medium mb-3">Payment Details</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
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

            {/* Payments Received - Individual breakdown */}
            {snap.payments?.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-sm font-medium text-emerald-800">Payments Received</p>
                </div>
                <table className="w-full">
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
            )}

            {/* Signature Block - only for retail sales (not trade/export) */}
            {(!snap.saleType || snap.saleType === "RETAIL") && (
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

            {/* Footer - keep with signatures */}
            <div className="print:break-inside-avoid border-t border-slate-200 pt-4 text-center">
              {snap.dealer?.companyNumber && (
                <p className="text-xs text-slate-500">Registered Company: {snap.dealer.companyNumber}</p>
              )}
              <p className="text-xs text-slate-400 mt-2">Thank you for your business.</p>
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
            margin: 6mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            font-size: 9px !important;
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
          /* Aggressive spacing compression */
          .print\\:p-6, .print\\:p-4 {
            padding: 0.35rem !important;
          }
          .p-6, .p-8 {
            padding: 0.35rem !important;
          }
          .print\\:space-y-6 > * + *, .space-y-6 > * + * {
            margin-top: 0.35rem !important;
          }
          .mb-3, .mb-4, .mb-6 {
            margin-bottom: 0.2rem !important;
          }
          .mt-3, .mt-4 {
            margin-top: 0.2rem !important;
          }
          .pt-4, .pt-6 {
            padding-top: 0.25rem !important;
          }
          .pb-4, .pb-6 {
            padding-bottom: 0.25rem !important;
          }
          .gap-4, .gap-6, .gap-8 {
            gap: 0.25rem !important;
          }
          /* Compact table cells */
          td, th {
            padding: 0.2rem 0.35rem !important;
            font-size: 9px !important;
          }
          /* Compact rounded boxes */
          .rounded-xl {
            padding: 0.3rem !important;
            border-radius: 4px !important;
          }
          .rounded-lg {
            padding: 0.25rem !important;
            border-radius: 3px !important;
          }
          /* Signature images - ensure they print */
          .signature-image {
            max-height: 30px !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            display: block !important;
            visibility: visible !important;
          }
          img {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          /* Compact headers */
          h1, .text-2xl {
            font-size: 14px !important;
          }
          h2, .text-xl {
            font-size: 12px !important;
          }
          .text-lg {
            font-size: 11px !important;
          }
          .text-sm {
            font-size: 9px !important;
          }
          .text-xs {
            font-size: 8px !important;
          }
          /* Ensure tables stay together */
          table {
            break-inside: avoid;
          }
          /* Hide non-essential decorative elements in print */
          .bg-slate-50 {
            padding: 0.25rem !important;
          }
        }
      `}</style>
    </>
  );
}
