import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import SignaturePad from "signature_pad";

/**
 * Public delivery signing page - accessed by drivers to capture customer signature
 * Mobile-friendly interface for delivery confirmation
 */
export default function DeliverySigningPage({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealInfo, setDealInfo] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [deliveryMileage, setDeliveryMileage] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pin, setPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");

  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  // Fetch deal info
  useEffect(() => {
    const fetchDealInfo = async () => {
      try {
        const res = await fetch(`/api/delivery-signing/${token}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load delivery details");
        }
        const data = await res.json();
        setDealInfo(data);
        setCustomerName(data.customer?.name || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDealInfo();
    }
  }, [token]);

  // Initialize signature pad (only when PIN verified or not required)
  useEffect(() => {
    const shouldInit = !loading && !error && dealInfo && canvasRef.current && !signaturePadRef.current;
    const pinOk = !dealInfo?.requiresPin || pinVerified;
    if (shouldInit && pinOk) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);

      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
      });
    }
  }, [loading, error, dealInfo, pinVerified]);

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("Please enter the customer's name");
      return;
    }

    if (signaturePadRef.current?.isEmpty()) {
      alert("Please sign above to confirm delivery");
      return;
    }

    setIsSubmitting(true);
    try {
      const signatureDataUrl = signaturePadRef.current.toDataURL("image/png");

      const res = await fetch(`/api/delivery-signing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerSignature: signatureDataUrl,
          customerName: customerName.trim(),
          deliveryMileage: deliveryMileage || undefined,
          deliveryNotes: deliveryNotes || undefined,
          pin: dealInfo?.requiresPin ? pin : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }

      setSuccess(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "—";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-slate-400"></span>
          <p className="mt-4 text-slate-600">Loading delivery details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Unable to Load</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Head>
          <title>Delivery Confirmed</title>
        </Head>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Delivery Confirmed</h1>
          <p className="text-slate-600 mb-4">
            Thank you! The signature has been recorded and the delivery has been confirmed.
          </p>
          <p className="text-sm text-slate-500">
            You can close this page now.
          </p>
        </div>
      </div>
    );
  }

  if (dealInfo?.alreadySigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Head>
          <title>Already Signed</title>
        </Head>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Already Signed</h1>
          <p className="text-slate-600">
            This delivery has already been confirmed and signed.
          </p>
        </div>
      </div>
    );
  }

  // PIN entry screen (if required and not yet verified)
  if (dealInfo?.requiresPin && !pinVerified) {
    const handlePinSubmit = (e) => {
      e.preventDefault();
      if (pin.length === 4) {
        setPinVerified(true);
        setPinError("");
      } else {
        setPinError("Please enter a 4-digit PIN");
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Head>
          <title>Enter PIN - Delivery</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </Head>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Enter PIN</h1>
            <p className="text-slate-600 text-sm">
              This delivery requires a PIN to proceed
            </p>
          </div>

          <form onSubmit={handlePinSubmit}>
            <div className="mb-4">
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPin(value);
                  setPinError("");
                }}
                className="input input-bordered w-full text-center text-2xl tracking-widest font-mono"
                placeholder="----"
                autoFocus
              />
              {pinError && (
                <p className="text-red-500 text-sm mt-2 text-center">{pinError}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={pin.length !== 4}
              className="btn w-full bg-blue-500 hover:bg-blue-600 text-white border-none"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Confirm Delivery - {dealInfo?.vehicle?.vrm}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="max-w-lg mx-auto p-4 pb-8">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <h1 className="text-xl font-bold text-slate-900">Delivery Confirmation</h1>
          <p className="text-sm text-slate-500 mt-1">Please review and sign below</p>
        </div>

        {/* Vehicle Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900">{dealInfo?.vehicle?.vrm}</p>
              <p className="text-sm text-slate-600 truncate">
                {dealInfo?.vehicle?.make} {dealInfo?.vehicle?.model}
                {dealInfo?.vehicle?.colour && ` - ${dealInfo.vehicle.colour}`}
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Delivery Address */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Customer</p>
              <p className="font-medium text-slate-900">{dealInfo?.customer?.name}</p>
              {dealInfo?.customer?.phone && (
                <a href={`tel:${dealInfo.customer.phone}`} className="text-sm text-blue-600">
                  {dealInfo.customer.phone}
                </a>
              )}
            </div>
            {dealInfo?.deliveryAddress && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Delivery Address</p>
                <p className="text-sm text-slate-700">
                  {dealInfo.deliveryAddress.line1}
                  {dealInfo.deliveryAddress.line2 && <>, {dealInfo.deliveryAddress.line2}</>}
                  <br />
                  {dealInfo.deliveryAddress.town}
                  {dealInfo.deliveryAddress.county && `, ${dealInfo.deliveryAddress.county}`}
                  <br />
                  {dealInfo.deliveryAddress.postcode}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        {dealInfo?.balanceDue > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-amber-800">Balance Due</span>
              <span className="text-lg font-bold text-amber-900">{formatCurrency(dealInfo.balanceDue)}</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Please collect this amount before releasing the vehicle
            </p>
          </div>
        )}

        {/* Signature Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
            <h2 className="font-bold text-slate-900 mb-4">Customer Signature</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Customer's full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Signature
                </label>
                <div className="border-2 border-slate-200 rounded-xl bg-white relative">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-48 cursor-crosshair"
                    style={{ touchAction: "none" }}
                  />
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="absolute top-2 right-2 text-xs text-slate-500 hover:text-slate-700 bg-white/80 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  I confirm receipt of the vehicle in satisfactory condition
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Details (Optional) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
            <h2 className="font-bold text-slate-900 mb-4">Delivery Details (Optional)</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mileage at Delivery
                </label>
                <input
                  type="number"
                  value={deliveryMileage}
                  onChange={(e) => setDeliveryMileage(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="e.g., 45000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  placeholder="Any notes about the delivery..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn w-full bg-emerald-500 hover:bg-emerald-600 text-white border-none h-14 text-base"
          >
            {isSubmitting ? (
              <span className="loading loading-spinner"></span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm Delivery
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  return {
    props: {
      token: params.token || null,
    },
  };
}
