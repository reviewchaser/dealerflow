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

export default function SelfBillPage() {
  const router = useRouter();
  const { token, render } = router.query;
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Show HTML by default (more reliable than auto-redirecting to PDF)
  useEffect(() => {
    if (!token) return;

    const fetchDocument = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/public/self-bill/${token}`);
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
          <h1 className="text-xl font-bold text-slate-900 mb-2">Purchase Invoice Not Found</h1>
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
          <p className="text-slate-500">The purchase invoice data could not be loaded. Please contact support.</p>
        </div>
      </div>
    );
  }

  const snap = document.snapshotData;
  const isVatQualifying = snap.vatScheme === "VAT_QUALIFYING";

  return (
    <>
      <Head>
        <title>Purchase Invoice {document.documentNumber} | DealerHQ</title>
      </Head>

      {/* Print controls - hidden when printing */}
      <div className="print:hidden bg-slate-100 p-4 sticky top-0 z-10 border-b border-slate-200">
        <div className="max-w-[800px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Purchase Invoice</h1>
            <p className="text-sm text-slate-500">Invoice for vehicle acquisition</p>
          </div>
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
                <h1 className="text-2xl font-bold text-slate-900">PURCHASE</h1>
                <h2 className="text-lg font-bold text-slate-700">INVOICE</h2>
                <p className="text-slate-600 mt-1 text-base font-semibold">{document.documentNumber}</p>
                <p className="text-slate-500 text-sm mt-1">{formatDate(document.issuedAt)}</p>
                {snap.dealer?.vatNumber && (
                  <p className="text-slate-400 text-xs mt-2">VAT No: {snap.dealer.vatNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Purchase Invoice Notice */}
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 print:bg-blue-50">
            <p className="text-blue-800 text-sm">
              <strong>Purchase Invoice:</strong> This invoice documents the purchase of the below vehicle by {snap.dealer?.companyName || snap.dealer?.name}.
            </p>
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
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">Purchase Date</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">{formatDate(snap.purchase?.purchaseDate) || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">VAT Treatment</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">
                  {isVatQualifying ? "Standard VAT" : snap.vatScheme === "MARGIN" ? "Margin Scheme" : "Zero-rated"}
                </p>
              </div>
            </div>

            {/* Supplier (Seller) / Buyer (Dealer) */}
            <div className="grid grid-cols-2 gap-6">
              {/* Supplier - who we bought from */}
              <div className="bg-slate-50 rounded-xl p-5 print:bg-slate-50">
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-2">Supplier (Seller)</p>
                <p className="text-lg font-bold text-slate-900">{snap.supplier?.companyName || snap.supplier?.name}</p>
                {snap.supplier?.companyName && snap.supplier?.name && (
                  <p className="text-slate-600">{snap.supplier.name}</p>
                )}
                {snap.supplier?.address && (
                  <p className="text-slate-500 text-sm mt-1 whitespace-pre-line">
                    {[snap.supplier.address.line1, snap.supplier.address.line2, snap.supplier.address.town, snap.supplier.address.county, snap.supplier.address.postcode].filter(Boolean).join("\n")}
                  </p>
                )}
                {snap.supplier?.email && <p className="text-slate-500 text-sm mt-2">{snap.supplier.email}</p>}
                {snap.supplier?.vatNumber && (
                  <p className="text-blue-600 text-sm font-medium mt-2">VAT No: {snap.supplier.vatNumber}</p>
                )}
                {isVatQualifying && !snap.supplier?.vatNumber && (
                  <p className="text-amber-600 text-xs mt-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    VAT number not on record
                  </p>
                )}
              </div>

              {/* Buyer - the dealer */}
              <div className="bg-blue-50 rounded-xl p-5 print:bg-blue-50">
                <p className="text-sm text-blue-600 uppercase tracking-wide font-medium mb-2">Buyer (Issuer)</p>
                <p className="text-lg font-bold text-slate-900">{snap.dealer?.companyName || snap.dealer?.name}</p>
                {snap.dealer?.address && (
                  <p className="text-slate-500 text-sm mt-1 whitespace-pre-line">{snap.dealer.address}</p>
                )}
                {snap.dealer?.email && <p className="text-slate-500 text-sm mt-2">{snap.dealer.email}</p>}
                {snap.dealer?.vatNumber && (
                  <p className="text-blue-600 text-sm font-medium mt-2">VAT No: {snap.dealer.vatNumber}</p>
                )}
              </div>
            </div>

            {/* Vehicle Details */}
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-3">Vehicle Details</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Description</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600 w-24">Qty</th>
                      {isVatQualifying && <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600 w-28">Net</th>}
                      {isVatQualifying && <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600 w-24">VAT</th>}
                      <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600 w-28">{isVatQualifying ? "Gross" : "Amount"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
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
                        {snap.purchase?.purchaseInvoiceRef && (
                          <p className="text-sm text-slate-400 mt-1">Ref: {snap.purchase.purchaseInvoiceRef}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">1</td>
                      {isVatQualifying && <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(snap.purchase?.purchasePriceNet)}</td>}
                      {isVatQualifying && <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(snap.purchase?.purchaseVat)}</td>}
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(snap.purchase?.purchasePriceGross || snap.purchase?.purchasePriceNet)}</td>
                    </tr>
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
                      {isVatQualifying && (
                        <>
                          <tr>
                            <td className="px-4 py-2 text-slate-600">Subtotal (Net)</td>
                            <td className="px-4 py-2 text-right font-semibold text-slate-900">{formatCurrency(snap.subtotal)}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-slate-600">VAT @ 20%</td>
                            <td className="px-4 py-2 text-right font-semibold text-slate-900">{formatCurrency(snap.totalVat)}</td>
                          </tr>
                        </>
                      )}
                      <tr className="bg-slate-800 text-white">
                        <td className="px-4 py-3 font-semibold">Total Payable</td>
                        <td className="px-4 py-3 text-right text-xl font-bold">{formatCurrency(snap.grandTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Margin Scheme Notice */}
            {snap.vatScheme === "MARGIN" && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-slate-600 font-medium">This vehicle was purchased under the margin scheme. No VAT is shown.</p>
              </div>
            )}

            {/* VAT Qualifying Notice */}
            {isVatQualifying && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-blue-800 font-medium">VAT Qualifying Purchase - Input VAT of {formatCurrency(snap.totalVat)} may be reclaimed.</p>
              </div>
            )}

            {/* Transaction Details */}
            <div className="bg-slate-50 rounded-xl p-5 print:break-inside-avoid">
              <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-3">Transaction Details</p>
              <p className="text-sm text-slate-600">
                This purchase invoice documents the acquisition of the above vehicle by {snap.dealer?.companyName || snap.dealer?.name} from {snap.supplier?.companyName || snap.supplier?.name}.
              </p>
            </div>

            {/* Signature Section - Dealer only */}
            <div className="print:break-inside-avoid border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-4">Authorisation</p>
              <div className="max-w-sm">
                <p className="text-xs text-slate-600 mb-2">Authorised on behalf of {snap.dealer?.companyName || snap.dealer?.name}</p>
                <div className="border-b-2 border-slate-300 pt-10">
                  <p className="text-xs text-slate-400 -mb-1">Signature</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="border-b border-slate-200 pt-4">
                    <p className="text-xs text-slate-400 -mb-1">Print Name</p>
                  </div>
                  <div className="border-b border-slate-200 pt-4">
                    <p className="text-xs text-slate-400 -mb-1">Date</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="print:break-inside-avoid border-t border-slate-200 pt-4 text-center">
              {snap.dealer?.companyNumber && (
                <p className="text-xs text-slate-500">Company Registration: {snap.dealer.companyNumber}</p>
              )}
              {snap.dealer?.vatNumber && (
                <p className="text-xs text-slate-500">VAT Registration: {snap.dealer.vatNumber}</p>
              )}
              <p className="text-xs text-slate-400 mt-2">This is a purchase document - not a sales invoice.</p>
            </div>
          </div>
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
