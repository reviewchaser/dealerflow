import { useState, useEffect } from "react";
import Head from "next/head";
import { toast, Toaster } from "react-hot-toast";

export default function WarrantyClaimForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [vehicleMake, setVehicleMake] = useState("");
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    vehicleReg: "",
    regAtPurchase: "",
    vin: "",
    purchaseDate: "",
    category: "",
    issueDescription: "",
    urgency: "normal",
  });

  // Look up vehicle make when regAtPurchase is entered (or vehicleReg if no regAtPurchase)
  useEffect(() => {
    const lookupReg = formData.regAtPurchase || formData.vehicleReg;
    if (!lookupReg || lookupReg.length < 4) {
      setVehicleMake("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLookingUp(true);
        const cleanReg = lookupReg.replace(/\s/g, "").toUpperCase();
        const res = await fetch("/api/dvla/vehicle-enquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationNumber: cleanReg }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.make) {
            setVehicleMake(data.make);
          }
        }
      } catch (error) {
        console.error("Vehicle lookup failed:", error);
      } finally {
        setIsLookingUp(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.regAtPurchase, formData.vehicleReg]);

  const problemCategories = [
    { value: "", label: "Select a category..." },
    { value: "mechanical", label: "Mechanical / Engine" },
    { value: "electrical", label: "Electrical / Electronics" },
    { value: "bodywork", label: "Bodywork / Paint" },
    { value: "interior", label: "Interior / Trim" },
    { value: "brakes", label: "Brakes / Suspension" },
    { value: "lights", label: "Lights / Indicators" },
    { value: "tyres", label: "Tyres / Wheels" },
    { value: "other", label: "Other" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone || !formData.vehicleReg || !formData.category || !formData.issueDescription) {
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
          vehicleMake: vehicleMake,
          summary: formData.issueDescription,
          source: "problem_report_form",
          category: formData.category,
          priority: formData.urgency === "urgent" ? "high" : "normal",
          details: {
            vin: formData.vin,
            purchaseDate: formData.purchaseDate,
            urgency: formData.urgency,
            category: formData.category,
            vehicleMake: vehicleMake,
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
        <Head><title>Issue Reported</title></Head>
        <Toaster position="top-center" />
        <div className="card bg-base-100 max-w-md w-full shadow-xl">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold">Issue Reported</h1>
            <p className="text-base-content/60 mt-2">
              Thank you for letting us know. We'll review your report and get back to you within 48 hours.
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
      <Head><title>Report Aftersales Issue</title></Head>
      <Toaster position="top-center" />

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Report Aftersales Issue</h1>
          <p className="text-base-content/60 mt-2 max-w-lg mx-auto">
            Please fill out the form below in as much detail as possible. For more information about what is and isn't covered under your warranty please refer to your documentation.
          </p>
        </div>

        {/* Explainer card */}
        <div className="alert bg-blue-50 border-blue-200 mb-6">
          <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <strong>What happens next?</strong> Once submitted, our team will review your report
            and contact you to discuss the issue. If you have photos or videos of the problem,
            please have them ready when we call.
          </div>
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

            {/* Vehicle Make - auto-populated from DVLA lookup */}
            {(vehicleMake || isLookingUp) && (
              <div className="form-control">
                <label className="label"><span className="label-text">Vehicle Make</span></label>
                <div className="input input-bordered bg-base-200 flex items-center text-base-content/70">
                  {isLookingUp ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    vehicleMake
                  )}
                </div>
              </div>
            )}

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
            <h2 className="text-lg font-semibold border-b border-base-300 pb-2 mb-4 mt-6">Problem Details</h2>

            <div className="form-control">
              <label className="label"><span className="label-text">Problem Category *</span></label>
              <select name="category" value={formData.category} onChange={handleChange}
                className="select select-bordered" required>
                {problemCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Urgency</span></label>
              <select name="urgency" value={formData.urgency} onChange={handleChange}
                className="select select-bordered">
                <option value="normal">Normal – Can wait a few days</option>
                <option value="urgent">Urgent – Vehicle undriveable or safety concern</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Describe the Problem *</span></label>
              <textarea name="issueDescription" value={formData.issueDescription} onChange={handleChange}
                className="textarea textarea-bordered h-32" required
                placeholder="Please describe what's happening, when it started, and any warning lights or noises..." />
            </div>

            <div className="form-control mt-6">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><span className="loading loading-spinner"></span> Submitting...</>
                ) : (
                  "Submit Report"
                )}
              </button>
            </div>

            <p className="text-xs text-base-content/50 mt-4 text-center">
              By submitting this form, you agree to be contacted regarding your report.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
