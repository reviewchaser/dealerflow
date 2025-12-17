import { useState } from "react";
import Head from "next/head";
import { toast, Toaster } from "react-hot-toast";

export default function WarrantyClaimForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    vehicleReg: "",
    regAtPurchase: "",
    vin: "",
    purchaseDate: "",
    issueDescription: "",
    urgency: "normal",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone || !formData.vehicleReg || !formData.issueDescription) {
      return toast.error("Please fill in all required fields");
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/aftercare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          vehicleReg: formData.vehicleReg,
          regAtPurchase: formData.regAtPurchase || formData.vehicleReg,
          summary: formData.issueDescription,
          source: "warranty_claim_form",
          priority: formData.urgency === "urgent" ? "high" : "normal",
          details: {
            vin: formData.vin,
            purchaseDate: formData.purchaseDate,
            urgency: formData.urgency,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setIsSubmitted(true);
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <Head><title>Warranty Claim Submitted</title></Head>
        <Toaster position="top-center" />
        <div className="card bg-base-100 max-w-md w-full shadow-xl">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold">Claim Submitted</h1>
            <p className="text-base-content/60 mt-2">
              Thank you for submitting your warranty claim. We'll review it and get back to you as soon as possible.
            </p>
            <p className="text-sm mt-4">
              If your issue is urgent, please call us directly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8 px-4">
      <Head><title>Warranty Claim Form</title></Head>
      <Toaster position="top-center" />

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Warranty Claim Form</h1>
          <p className="text-base-content/60 mt-2">
            Please provide details about your warranty issue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {/* Customer Information */}
            <h2 className="text-lg font-semibold border-b border-base-300 pb-2 mb-4">Your Details</h2>
            
            <div className="form-control">
              <label className="label"><span className="label-text">Full Name *</span></label>
              <input type="text" name="customerName" value={formData.customerName} onChange={handleChange}
                className="input input-bordered" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Phone *</span></label>
                <input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleChange}
                  className="input input-bordered" required />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Email</span></label>
                <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleChange}
                  className="input input-bordered" />
              </div>
            </div>

            {/* Vehicle Information */}
            <h2 className="text-lg font-semibold border-b border-base-300 pb-2 mb-4 mt-6">Vehicle Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Current Registration *</span></label>
                <input type="text" name="vehicleReg" value={formData.vehicleReg} onChange={handleChange}
                  className="input input-bordered uppercase font-mono" required />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Registration at Purchase</span>
                  <span className="label-text-alt">(if different)</span>
                </label>
                <input type="text" name="regAtPurchase" value={formData.regAtPurchase} onChange={handleChange}
                  className="input input-bordered uppercase font-mono" placeholder="Leave blank if same" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">VIN (if known)</span></label>
                <input type="text" name="vin" value={formData.vin} onChange={handleChange}
                  className="input input-bordered font-mono" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Purchase Date (approx)</span></label>
                <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange}
                  className="input input-bordered" />
              </div>
            </div>

            {/* Issue Description */}
            <h2 className="text-lg font-semibold border-b border-base-300 pb-2 mb-4 mt-6">Warranty Issue</h2>

            <div className="form-control">
              <label className="label"><span className="label-text">Urgency</span></label>
              <select name="urgency" value={formData.urgency} onChange={handleChange}
                className="select select-bordered">
                <option value="normal">Normal – Can wait a few days</option>
                <option value="urgent">Urgent – Vehicle undriveable or safety concern</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Describe the Issue *</span></label>
              <textarea name="issueDescription" value={formData.issueDescription} onChange={handleChange}
                className="textarea textarea-bordered h-32" required
                placeholder="Please describe the problem you're experiencing, when it started, and any warning lights or noises..." />
            </div>

            <div className="form-control mt-6">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><span className="loading loading-spinner"></span> Submitting...</>
                ) : (
                  "Submit Warranty Claim"
                )}
              </button>
            </div>

            <p className="text-xs text-base-content/50 mt-4 text-center">
              By submitting this form, you agree to be contacted regarding your warranty claim.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
