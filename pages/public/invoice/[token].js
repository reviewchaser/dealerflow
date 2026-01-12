import { useEffect, useState } from "react";
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
                {snap.dealer?.vatNumber && (
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
                  {isMargin ? "Margin Scheme" : snap.vatScheme === "VAT_QUALIFYING" ? "Standard VAT" : "Zero-rated"}
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
                      {!isMargin && <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600 w-28">Net</th>}
                      {!isMargin && <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600 w-24">VAT</th>}
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
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">1</td>
                      {!isMargin && <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(snap.vehiclePriceNet)}</td>}
                      {!isMargin && <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(snap.vehicleVatAmount)}</td>}
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
                          {!isMargin && <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(addon.unitPriceNet * addon.qty)}</td>}
                          {!isMargin && <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(addonVat)}</td>}
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(addonGross)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <tbody className="divide-y divide-slate-100">
                      {!isMargin && (
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
                        <td className="px-4 py-3 font-semibold">Total</td>
                        <td className="px-4 py-3 text-right text-xl font-bold">{formatCurrency(snap.grandTotal)}</td>
                      </tr>
                      {snap.partExchangeNet > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-emerald-600">Part Exchange</td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-600">-{formatCurrency(snap.partExchangeNet)}</td>
                        </tr>
                      )}
                      {snap.totalPaid > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-emerald-600">Payments Received</td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-600">-{formatCurrency(snap.totalPaid)}</td>
                        </tr>
                      )}
                      <tr className="bg-blue-50">
                        <td className="px-4 py-3 font-bold text-blue-900">Balance Due</td>
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

            {/* Signature Section - only for retail sales (not trade/export) */}
            {(!snap.saleType || snap.saleType === "RETAIL") && (
              <div className="print:break-inside-avoid border-t border-slate-200 pt-6">
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-4">Acknowledgement</p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">I confirm receipt of the above vehicle and agree to the terms and conditions stated.</p>
                    <div className="border-b-2 border-slate-300 pt-8 mt-2">
                      <p className="text-xs text-slate-400 -mb-1">Buyer Signature</p>
                    </div>
                    <div className="border-b border-slate-200 pt-4">
                      <p className="text-xs text-slate-400 -mb-1">Print Name</p>
                    </div>
                    <div className="border-b border-slate-200 pt-4">
                      <p className="text-xs text-slate-400 -mb-1">Date</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">Authorised on behalf of {snap.dealer?.companyName || snap.dealer?.name}</p>
                    <div className="border-b-2 border-slate-300 pt-8 mt-2">
                      <p className="text-xs text-slate-400 -mb-1">Dealer Signature</p>
                    </div>
                    <div className="border-b border-slate-200 pt-4">
                      <p className="text-xs text-slate-400 -mb-1">Print Name</p>
                    </div>
                    <div className="border-b border-slate-200 pt-4">
                      <p className="text-xs text-slate-400 -mb-1">Date</p>
                    </div>
                  </div>
                </div>
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
            margin: 15mm 10mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
          .print\\:break-before-page {
            break-before: page;
          }
        }
      `}</style>
    </>
  );
}
