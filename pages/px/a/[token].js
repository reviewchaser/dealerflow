import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast, Toaster } from "react-hot-toast";

export default function ShareLinkAppraisalForm() {
  const router = useRouter();
  const { token } = router.query;

  const [dealerInfo, setDealerInfo] = useState(null);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [dvlaData, setDvlaData] = useState(null);

  const [formData, setFormData] = useState({
    submitterName: "",
    submitterEmail: "",
    submitterPhone: "",
    vehicleReg: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    mileage: "",
    colour: "",
    fuelType: "",
    conditionNotes: "",
  });

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch("/api/appraisals/share-links/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json();
        setValidationError(data.error || "Invalid link");
        return;
      }

      const data = await res.json();
      setDealerInfo(data);
    } catch (error) {
      setValidationError("Failed to validate link");
    } finally {
      setIsValidating(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDvlaLookup = async () => {
    if (!formData.vehicleReg) return toast.error("Enter registration first");
    setIsLookingUp(true);
    try {
      const res = await fetch("/api/dvla-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleReg: formData.vehicleReg }),
      });
      const data = await res.json();
      setDvlaData(data);
      setFormData((prev) => ({
        ...prev,
        vehicleMake: data.make || prev.vehicleMake,
        vehicleModel: data.model || prev.vehicleModel,
        vehicleYear: data.yearOfManufacture || prev.vehicleYear,
        colour: data.colour || prev.colour,
        fuelType: data.fuelType || prev.fuelType,
      }));
      toast.success("Vehicle details found!");
    } catch (error) {
      toast.error("Lookup failed - please enter details manually");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vehicleReg || !formData.mileage) {
      return toast.error("Please fill in all required fields");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/appraisals/share-links/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...formData,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit");
      }

      setIsSubmitted(true);
    } catch (error) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Error state
  if (validationError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Head><title>Invalid Link</title></Head>
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-slate-600">
            {validationError}
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Please contact the dealership for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Head><title>Appraisal Submitted</title></Head>
        <Toaster position="top-center" />
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Appraisal Submitted</h1>
          <p className="text-slate-600 mb-6">
            Thank you for your vehicle appraisal submission. We will review your details and get back to you.
          </p>
          {dealerInfo?.dealerName && (
            <p className="text-sm text-slate-500">
              - {dealerInfo.dealerName}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <Head>
        <title>Vehicle Appraisal{dealerInfo?.dealerName ? ` | ${dealerInfo.dealerName}` : ""}</title>
      </Head>
      <Toaster position="top-center" />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {dealerInfo?.dealerLogo && (
            <img src={dealerInfo.dealerLogo} alt={dealerInfo.dealerName} className="h-12 mx-auto mb-4" />
          )}
          <h1 className="text-3xl font-bold text-slate-900">Vehicle Appraisal</h1>
          <p className="text-slate-600 mt-2">
            Submit your vehicle details for appraisal
          </p>
          {dealerInfo?.dealerName && (
            <p className="text-sm text-slate-500 mt-1">
              Powered by {dealerInfo.dealerName}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Details (Optional)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  name="submitterName"
                  value={formData.submitterName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="submitterEmail"
                    value={formData.submitterEmail}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="submitterPhone"
                    value={formData.submitterPhone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Registration */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Vehicle Registration *</h2>
            <div className="flex gap-3">
              <input
                type="text"
                name="vehicleReg"
                value={formData.vehicleReg}
                onChange={handleChange}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-xl font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="AB12 CDE"
                required
              />
              <button
                type="button"
                onClick={handleDvlaLookup}
                disabled={isLookingUp}
                className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {isLookingUp ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                ) : (
                  "Lookup"
                )}
              </button>
            </div>
            {dvlaData && (
              <div className={`mt-4 p-3 rounded-lg ${dvlaData.isDummy ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                {dvlaData.isDummy && <span className="font-medium">Demo: </span>}
                {dvlaData.yearOfManufacture} {dvlaData.make} {dvlaData.model} - {dvlaData.colour}
              </div>
            )}
          </div>

          {/* Vehicle Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Vehicle Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                <input
                  type="text"
                  name="vehicleMake"
                  value={formData.vehicleMake}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ford"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                <input
                  type="text"
                  name="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Focus"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                <input
                  type="number"
                  name="vehicleYear"
                  value={formData.vehicleYear}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="2019"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mileage *</label>
                <input
                  type="number"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="50000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Colour</label>
                <input
                  type="text"
                  name="colour"
                  value={formData.colour}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Type</label>
                <select
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Electric">Electric</option>
                </select>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Condition Notes</h2>
            <textarea
              name="conditionNotes"
              value={formData.conditionNotes}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Describe the vehicle condition, any known issues, service history, etc..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Submitting...
              </span>
            ) : (
              "Submit Appraisal"
            )}
          </button>

          <p className="text-xs text-slate-500 text-center">
            By submitting this form, you agree to be contacted regarding this vehicle appraisal.
          </p>
        </form>
      </div>
    </div>
  );
}
