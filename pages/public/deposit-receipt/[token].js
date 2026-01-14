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
          </div>

          {/* Details */}
          <div className="p-8 print:p-6 space-y-8 print:space-y-6">
            {/* Date and Receipt Info */}
            <div className="grid grid-cols-2 gap-8">
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
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
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
                    <tr>
                      <td className="px-4 py-3 text-slate-500 bg-slate-50">VIN</td>
                      <td className="px-4 py-3 text-slate-900 font-mono text-sm">
                        {snap.vehicle?.vin || <span className="text-slate-400 italic font-sans">Not recorded</span>}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add-ons (if any) */}
            {snap.addOns?.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-3">Add-ons Included</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <tbody className="divide-y divide-slate-100">
                      {snap.addOns.map((addon, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-slate-900">
                            {addon.name}
                            {addon.qty > 1 && <span className="text-slate-500 text-sm ml-1">x{addon.qty}</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {formatCurrency(addon.unitPriceNet * (addon.qty || 1))}
                            {snap.isVatRegistered !== false && addon.vatTreatment === "STANDARD" && (
                              <span className="text-slate-400 text-xs ml-1">+ VAT</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Finance Selection (if applicable) */}
            {snap.financeSelection?.isFinanced && (
              <div className="bg-blue-50 rounded-xl p-5 print:bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700 uppercase tracking-wide font-medium mb-2">Finance</p>
                <p className="text-lg font-semibold text-blue-800">
                  {snap.financeSelection.toBeConfirmed
                    ? "To Be Confirmed"
                    : snap.financeSelection.financeCompanyName || "Finance Company"}
                </p>
                <p className="text-sm text-blue-600 mt-1">Customer has indicated they wish to use finance for this purchase</p>
              </div>
            )}

            {/* Payment Details */}
            <div className="bg-emerald-50 rounded-xl p-6 print:bg-emerald-50">
              <p className="text-sm text-emerald-600 uppercase tracking-wide font-medium mb-4">Deposit Payment</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-emerald-600">Amount</p>
                  <p className="text-3xl font-bold text-emerald-700">{formatCurrency(deposit?.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-emerald-600">Payment Method</p>
                  <p className="text-lg font-semibold text-emerald-700">{deposit?.method}</p>
                  {deposit?.reference && (
                    <p className="text-sm text-emerald-600">Ref: {deposit.reference}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
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
                  {(snap.delivery?.amount > 0 || snap.delivery?.isFree) && (
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Delivery</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {snap.delivery?.isFree ? (
                          <span className="text-emerald-600">FREE</span>
                        ) : (
                          formatCurrency(snap.delivery.amount)
                        )}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="px-4 py-3 text-slate-600">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(snap.grandTotal)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-600">Deposit Paid</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">-{formatCurrency(snap.totalPaid)}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">Balance Due</td>
                    <td className="px-4 py-3 text-right text-xl font-bold text-slate-900">{formatCurrency(snap.balanceDue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Agreed Work Items */}
            {snap.requests?.length > 0 && (
              <div className="print:break-inside-avoid bg-orange-50 rounded-xl p-5 print:bg-orange-50 border border-orange-200">
                <p className="text-sm text-orange-700 uppercase tracking-wide font-medium mb-3">Agreed Work - Dealer Commitments</p>
                <ul className="space-y-2">
                  {snap.requests.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span className="text-slate-900 font-medium">{req.title}</span>
                        {req.details && <span className="text-slate-500"> - {req.details}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-orange-600 mt-3 italic">
                  The above items have been agreed between the dealer and customer as part of this sale.
                </p>
              </div>
            )}

            {/* Taken By */}
            {snap.takenBy && (
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Deposit Taken By</p>
                  <p className="text-slate-900 font-medium mt-1">{snap.takenBy.name}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  {formatDate(document.issuedAt)}
                </div>
              </div>
            )}

            {/* Signature Section - for non-distance sales */}
            {snap.saleChannel !== "DISTANCE" && (
              <div className="print:break-inside-avoid border-t border-slate-200 pt-6">
                <p className="text-sm text-slate-500 uppercase tracking-wide font-medium mb-4">Acknowledgement</p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">I confirm receipt of this deposit receipt and agreement to the terms stated.</p>
                    <div className="border-b-2 border-slate-300 pt-8 mt-2">
                      <p className="text-xs text-slate-400 -mb-1">Customer Signature</p>
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
