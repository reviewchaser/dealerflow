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

export default function PaymentReceiptPage() {
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
        const res = await fetch(`/api/public/payment-receipt/${token}`);
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
  const pr = snap.paymentReceipt;

  return (
    <>
      <Head>
        <title>Payment Receipt {document.documentNumber} | DealerHQ</title>
      </Head>

      {/* Print controls - hidden when printing */}
      <div className="print:hidden bg-slate-100 p-4 sticky top-0 z-10 border-b border-slate-200">
        <div className="max-w-[800px] mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">Payment Receipt</h1>
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
                <h1 className="text-2xl font-bold text-emerald-600">PAYMENT RECEIPT</h1>
                <p className="text-slate-600 font-semibold mt-1">{document.documentNumber}</p>
                <p className="text-slate-500 text-sm mt-1">{formatDate(document.issuedAt)}</p>
                {snap.dealer?.vatNumber && (
                  <p className="text-slate-400 text-xs mt-2">VAT No: {snap.dealer.vatNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* PAID IN FULL Banner (if applicable) */}
          {pr?.isFullPayment && (
            <div className="bg-emerald-500 text-white text-center py-3 px-6">
              <p className="text-lg font-bold">PAID IN FULL</p>
            </div>
          )}

          {/* Details */}
          <div className="p-8 print:p-6 space-y-8 print:space-y-6">
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

            {/* Vehicle Reference */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 text-slate-500 bg-slate-50 w-1/3">Vehicle</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <span className="font-mono mr-2">{snap.vehicle?.regCurrent}</span>
                      {snap.vehicle?.make} {snap.vehicle?.model}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-500 bg-slate-50">Invoice Reference</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{pr?.invoiceNumber || "N/A"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Details */}
            <div className="bg-emerald-50 rounded-xl p-6 print:bg-emerald-50">
              <p className="text-sm text-emerald-600 uppercase tracking-wide font-medium mb-4">Payment Received</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-emerald-600">Amount</p>
                  <p className="text-3xl font-bold text-emerald-700">{formatCurrency(pr?.paymentAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-emerald-600">Payment Method</p>
                  <p className="text-lg font-semibold text-emerald-700">{pr?.paymentMethod}</p>
                  {pr?.paymentReference && (
                    <p className="text-sm text-emerald-600">Ref: {pr.paymentReference}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Balance Summary */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 text-slate-600">Total Order Value</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(snap.grandTotal)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-600">Balance Before Payment</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(pr?.invoiceBalanceBefore)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-600">Payment Received</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">-{formatCurrency(pr?.paymentAmount)}</td>
                  </tr>
                  <tr className={pr?.isFullPayment ? "bg-emerald-50" : "bg-slate-50"}>
                    <td className="px-4 py-3 font-semibold text-slate-900">Balance Remaining</td>
                    <td className="px-4 py-3 text-right text-xl font-bold text-slate-900">
                      {pr?.isFullPayment ? (
                        <span className="text-emerald-600">£0.00</span>
                      ) : (
                        formatCurrency(pr?.invoiceBalanceAfter)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Confirmation Message */}
            <div className="text-center py-4">
              <p className="text-slate-600">
                {pr?.isFullPayment ? (
                  <>Thank you for your payment. Your account is now settled in full.</>
                ) : (
                  <>Thank you for your payment. Please settle the remaining balance at your earliest convenience.</>
                )}
              </p>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-slate-400 pt-4 border-t border-slate-200">
              <p>This receipt was generated automatically by DealerHQ</p>
              <p className="mt-1">{formatDate(document.issuedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </>
  );
}
