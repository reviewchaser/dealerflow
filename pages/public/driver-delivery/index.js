import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import SignaturePad from "signature_pad";

/**
 * Driver Delivery Form
 * Public page for third-party drivers to complete vehicle deliveries.
 *
 * Flow:
 * 1. VRM Search - Driver enters VRM to find matching deliveries
 * 2. PIN Verification - If deal has PIN set, verify it
 * 3. Invoice Display - Show invoice summary
 * 4. Customer Signature - Capture customer's signature
 * 5. Delivery Confirmation - Mileage, notes, submit
 *
 * URL: /public/driver-delivery?dealer=<slug>
 */
export default function DriverDeliveryPage() {
  const router = useRouter();
  const { dealer: dealerSlug } = router.query;

  // Step tracking
  const [step, setStep] = useState(1); // 1: Search, 2: PIN, 3: Invoice, 4: Sign, 5: Confirm, 6: Complete
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search state
  const [vrmSearch, setVrmSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // PIN state
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(null);

  // Signature state
  const signatureCanvasRef = useRef(null);
  const signaturePadRef = useRef(null);
  const [customerName, setCustomerName] = useState("");

  // Delivery state
  const [deliveryMileage, setDeliveryMileage] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Initialize signature pad
  useEffect(() => {
    if (step === 4 && signatureCanvasRef.current && !signaturePadRef.current) {
      const canvas = signatureCanvasRef.current;
      // Set canvas size
      canvas.width = canvas.offsetWidth;
      canvas.height = 200;
      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
      });
    }
    return () => {
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
        signaturePadRef.current = null;
      }
    };
  }, [step]);

  // Search for deals by VRM
  const handleSearch = async () => {
    if (!vrmSearch || vrmSearch.length < 2) {
      setError("Please enter at least 2 characters");
      return;
    }

    if (!dealerSlug) {
      setError("Dealer not specified. Please check the link you received.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      const res = await fetch(
        `/api/public/driver-delivery/search?vrm=${encodeURIComponent(vrmSearch)}&dealerSlug=${encodeURIComponent(dealerSlug)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      setSearchResults(data.deals || []);
      if (data.deals.length === 0) {
        setError("No deliveries found for this VRM. Make sure the dealer has generated a driver link.");
      }
    } catch (err) {
      setError(err.message || "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Select a deal
  const handleSelectDeal = (deal) => {
    setSelectedDeal(deal);
    if (deal.hasPinRequired) {
      setStep(2); // Go to PIN entry
    } else {
      setStep(3); // Skip to invoice display
    }
  };

  // Verify PIN
  const handleVerifyPin = async () => {
    if (!pin || pin.length !== 4) {
      setPinError("Please enter a 4-digit PIN");
      return;
    }

    setPinError(null);
    setStep(3); // Move to invoice display
    // PIN will be verified on final submission
  };

  // Go to signature step
  const handleProceedToSign = () => {
    setStep(4);
  };

  // Go to confirm step
  const handleProceedToConfirm = () => {
    if (!customerName.trim()) {
      setError("Please enter the customer's name");
      return;
    }

    if (signaturePadRef.current?.isEmpty()) {
      setError("Please capture the customer's signature");
      return;
    }

    setError(null);
    setStep(5);
  };

  // Submit delivery
  const handleSubmitDelivery = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const signatureData = signaturePadRef.current?.toDataURL("image/png");

      const res = await fetch("/api/public/driver-delivery/sign-and-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: selectedDeal.dealId,
          pin: selectedDeal.hasPinRequired ? pin : undefined,
          customerName: customerName.trim(),
          customerSignature: signatureData,
          deliveryMileage: deliveryMileage || undefined,
          deliveryNotes: deliveryNotes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "Incorrect PIN") {
          setStep(2);
          setPinError("Incorrect PIN. Please try again.");
          setPin("");
          return;
        }
        throw new Error(data.error || "Failed to complete delivery");
      }

      setStep(6); // Complete
    } catch (err) {
      setError(err.message || "Failed to complete delivery");
    } finally {
      setIsLoading(false);
    }
  };

  // Clear signature
  const handleClearSignature = () => {
    signaturePadRef.current?.clear();
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  // Render based on step
  const renderContent = () => {
    switch (step) {
      case 1:
        // VRM Search
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Vehicle Delivery</h1>
              <p className="text-slate-600 mt-1">Enter the vehicle registration to find the delivery</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vehicle Registration (VRM)
                </label>
                <input
                  type="text"
                  value={vrmSearch}
                  onChange={(e) => setVrmSearch(e.target.value.toUpperCase())}
                  placeholder="e.g., AB12 CDE"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-lg uppercase tracking-wider text-center font-mono"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Searching..." : "Search"}
              </button>

              {error && (
                <p className="text-red-600 text-center">{error}</p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 font-medium">
                    Found {searchResults.length} delivery{searchResults.length > 1 ? "ies" : ""}:
                  </p>
                  {searchResults.map((deal) => (
                    <button
                      key={deal.dealId}
                      onClick={() => handleSelectDeal(deal)}
                      className="w-full p-4 border border-slate-200 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900">{deal.vrm}</p>
                          <p className="text-slate-600">{deal.vehicle} {deal.colour && `- ${deal.colour}`}</p>
                          <p className="text-sm text-slate-500">Customer: {deal.customer}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          deal.status === "INVOICED" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                        }`}>
                          {deal.status === "INVOICED" ? "Ready" : "In Progress"}
                        </span>
                      </div>
                      {deal.hasPinRequired && (
                        <p className="text-xs text-blue-600 mt-2">PIN required</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        // PIN Entry
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Enter PIN</h1>
              <p className="text-slate-600 mt-1">
                A PIN is required to access this delivery
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="font-medium text-slate-900">{selectedDeal?.vrm}</p>
              <p className="text-slate-600">{selectedDeal?.vehicle}</p>
              <p className="text-sm text-slate-500">Customer: {selectedDeal?.customer}</p>
            </div>

            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 4-digit PIN"
                className="w-full px-4 py-4 border border-slate-300 rounded-lg text-2xl text-center tracking-[1em] font-mono"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleVerifyPin()}
              />
              {pinError && (
                <p className="text-red-600 text-center mt-2">{pinError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(1); setPin(""); setPinError(null); }}
                className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleVerifyPin}
                disabled={pin.length !== 4}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 3:
        // Invoice Summary
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Delivery Details</h1>
              <p className="text-slate-600 mt-1">Review the delivery before proceeding</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Vehicle</span>
                <span className="font-medium">{selectedDeal?.vrm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Description</span>
                <span className="font-medium">{selectedDeal?.vehicle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Customer</span>
                <span className="font-medium">{selectedDeal?.customer}</span>
              </div>
              {selectedDeal?.invoiceNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Invoice</span>
                  <span className="font-medium">{selectedDeal.invoiceNumber}</span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Capture customer signature</li>
                <li>Record delivery mileage (optional)</li>
                <li>Confirm delivery</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(selectedDeal?.hasPinRequired ? 2 : 1)}
                className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleProceedToSign}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Capture Signature
              </button>
            </div>
          </div>
        );

      case 4:
        // Signature Capture
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Customer Signature</h1>
              <p className="text-slate-600 mt-1">Customer signs to confirm receipt of vehicle</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer's full name"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                autoFocus
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-slate-700">Signature</label>
                <button
                  onClick={handleClearSignature}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="border-2 border-slate-300 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={signatureCanvasRef}
                  className="w-full touch-none"
                  style={{ height: "200px" }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Sign above with finger or stylus</p>
            </div>

            {error && (
              <p className="text-red-600 text-center">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(3); setError(null); }}
                className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleProceedToConfirm}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 5:
        // Delivery Confirmation
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Confirm Delivery</h1>
              <p className="text-slate-600 mt-1">Add optional details and confirm</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Delivery Mileage (Optional)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={deliveryMileage}
                  onChange={(e) => setDeliveryMileage(e.target.value)}
                  placeholder="e.g., 45678"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Any notes about the delivery..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-slate-600">
                <span className="font-medium">Vehicle:</span> {selectedDeal?.vrm} - {selectedDeal?.vehicle}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Customer:</span> {customerName}
              </p>
            </div>

            {error && (
              <p className="text-red-600 text-center">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(4); setError(null); }}
                className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmitDelivery}
                disabled={isLoading}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? "Submitting..." : "Complete Delivery"}
              </button>
            </div>
          </div>
        );

      case 6:
        // Complete
        return (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">Delivery Complete</h1>
              <p className="text-slate-600 mt-1">
                The vehicle has been successfully delivered
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-medium text-green-800">{selectedDeal?.vrm}</p>
              <p className="text-green-700">{selectedDeal?.vehicle}</p>
              <p className="text-sm text-green-600 mt-2">Delivered to: {customerName}</p>
            </div>

            <button
              onClick={() => {
                setStep(1);
                setVrmSearch("");
                setSearchResults([]);
                setSelectedDeal(null);
                setPin("");
                setCustomerName("");
                setDeliveryMileage("");
                setDeliveryNotes("");
                setError(null);
              }}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              New Delivery
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // No dealer specified
  if (router.isReady && !dealerSlug) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Invalid Link</h1>
          <p className="text-slate-600 mt-2">
            This delivery link is missing required information.
            Please contact the dealer for a valid link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Vehicle Delivery</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
          {renderContent()}
        </div>
      </div>
    </>
  );
}
