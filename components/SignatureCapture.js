import { useState, useRef, useEffect } from "react";
import SignaturePad from "signature_pad";

/**
 * SignatureCapture - Modal for capturing customer and dealer signatures
 *
 * Props:
 * - isOpen: Whether the modal is open
 * - onClose: Function to close the modal
 * - onComplete: Function called when signatures are captured (receives { customerSignature, dealerSignature, customerName, dealerName })
 * - deal: The deal object (for context)
 * - existingSignatures: Any existing signature data
 */
export default function SignatureCapture({
  isOpen,
  onClose,
  onComplete,
  deal,
  existingSignatures = {},
}) {
  const [step, setStep] = useState("customer"); // customer, dealer, complete
  const [customerName, setCustomerName] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [customerSignature, setCustomerSignature] = useState(null);
  const [dealerSignature, setDealerSignature] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerCanvasRef = useRef(null);
  const dealerCanvasRef = useRef(null);
  const customerPadRef = useRef(null);
  const dealerPadRef = useRef(null);

  // Initialize signature pads when modal opens (NOT when step changes)
  // Both canvases are always in the DOM but one is hidden via CSS
  useEffect(() => {
    if (!isOpen) return;

    const initPad = (canvasRef, padRef) => {
      if (canvasRef.current && !padRef.current) {
        const canvas = canvasRef.current;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        // Use fixed dimensions since canvas might be hidden initially
        const width = canvas.offsetWidth || 400;
        const height = canvas.offsetHeight || 160;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.getContext("2d").scale(ratio, ratio);

        padRef.current = new SignaturePad(canvas, {
          backgroundColor: "rgb(255, 255, 255)",
          penColor: "rgb(0, 0, 0)",
        });
        return true;
      }
      return false;
    };

    // Small delay to ensure canvases are rendered, then init BOTH at once
    const timer = setTimeout(() => {
      initPad(customerCanvasRef, customerPadRef);
      initPad(dealerCanvasRef, dealerPadRef);
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen]); // Only depend on isOpen, NOT step

  // Track if modal was just opened to prevent re-initializing on prop changes
  const wasOpenRef = useRef(false);

  // Reset state ONLY when modal opens (not when other props change)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // Modal just opened - initialize state
      wasOpenRef.current = true;
      setStep(existingSignatures?.customerSignedAt ? "dealer" : "customer");
      setCustomerName(existingSignatures?.customerSignerName || deal?.customer?.displayName || deal?.customer?.name || deal?.soldToContactId?.displayName || deal?.soldToContactId?.name || "");
      setDealerName(existingSignatures?.dealerSignerName || "");
      setCustomerSignature(null);
      setDealerSignature(null);
      customerPadRef.current = null;
      dealerPadRef.current = null;
    } else if (!isOpen && wasOpenRef.current) {
      // Modal just closed - reset the flag
      wasOpenRef.current = false;
    }
  }, [isOpen, existingSignatures, deal]);

  const clearCustomerPad = () => {
    if (customerPadRef.current) {
      customerPadRef.current.clear();
    }
  };

  const clearDealerPad = () => {
    if (dealerPadRef.current) {
      dealerPadRef.current.clear();
    }
  };

  const handleCustomerNext = () => {
    if (!customerName.trim()) {
      alert("Please enter the customer's name");
      return;
    }
    if (customerPadRef.current?.isEmpty()) {
      alert("Please sign above");
      return;
    }

    // Save customer signature as data URL
    const dataUrl = customerPadRef.current.toDataURL("image/png");
    setCustomerSignature(dataUrl);
    setStep("dealer");
  };

  const handleDealerSign = async () => {
    if (!dealerName.trim()) {
      alert("Please enter your name");
      return;
    }
    if (dealerPadRef.current?.isEmpty()) {
      alert("Please sign above");
      return;
    }

    setIsSubmitting(true);
    try {
      const dealerDataUrl = dealerPadRef.current.toDataURL("image/png");
      setDealerSignature(dealerDataUrl);

      // If customer already signed before this session, only send dealer
      const signatureData = {
        dealerSignature: dealerDataUrl,
        dealerName: dealerName.trim(),
      };

      // Only include customer if captured in this session
      if (customerSignature) {
        signatureData.customerSignature = customerSignature;
        signatureData.customerName = customerName.trim();
      }

      await onComplete(signatureData);
      setStep("complete");
    } catch (error) {
      alert(error.message || "Failed to save signatures");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipCustomer = () => {
    // Allow skipping customer signature (dealer can sign alone if customer already signed remotely)
    setStep("dealer");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {step === "customer" && "Customer Signature"}
            {step === "dealer" && "Dealer Signature"}
            {step === "complete" && "Signatures Captured"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Customer signature step - always in DOM but hidden when not active */}
          <div className={step === "customer" ? "" : "hidden"}>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Customer: Please sign below to confirm your agreement to the terms of this sale.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Enter customer's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Signature
                </label>
                <div className="border-2 border-slate-200 rounded-xl bg-white relative">
                  <canvas
                    ref={customerCanvasRef}
                    className="w-full h-40 cursor-crosshair"
                    style={{ touchAction: "none" }}
                  />
                  <button
                    type="button"
                    onClick={clearCustomerPad}
                    className="absolute top-2 right-2 text-xs text-slate-500 hover:text-slate-700 bg-white/80 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {existingSignatures?.customerSignedAt && (
                  <button
                    type="button"
                    onClick={handleSkipCustomer}
                    className="btn btn-ghost flex-1"
                  >
                    Skip (Already Signed)
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCustomerNext}
                  className="btn bg-blue-500 hover:bg-blue-600 text-white border-none flex-1"
                >
                  Continue to Dealer Signature
                </button>
              </div>
            </div>
          </div>

          {/* Dealer signature step - always in DOM but hidden when not active */}
          <div className={step === "dealer" ? "" : "hidden"}>
            <div className="space-y-4">
              {customerSignature && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-emerald-700">
                    Customer signed: {customerName}
                  </span>
                </div>
              )}

              <p className="text-sm text-slate-600">
                Dealer: Please countersign below to complete the transaction.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={dealerName}
                  onChange={(e) => setDealerName(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Signature
                </label>
                <div className="border-2 border-slate-200 rounded-xl bg-white relative">
                  <canvas
                    ref={dealerCanvasRef}
                    className="w-full h-40 cursor-crosshair"
                    style={{ touchAction: "none" }}
                  />
                  <button
                    type="button"
                    onClick={clearDealerPad}
                    className="absolute top-2 right-2 text-xs text-slate-500 hover:text-slate-700 bg-white/80 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {!existingSignatures?.customerSignedAt && (
                  <button
                    type="button"
                    onClick={() => setStep("customer")}
                    className="btn btn-ghost flex-1"
                    disabled={isSubmitting}
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDealerSign}
                  disabled={isSubmitting}
                  className="btn bg-emerald-500 hover:bg-emerald-600 text-white border-none flex-1"
                >
                  {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Complete Signing"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Completion step */}
          {step === "complete" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Signatures Captured
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Both signatures have been recorded and saved to the invoice.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn bg-slate-900 hover:bg-slate-800 text-white border-none"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
