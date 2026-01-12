import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast, Toaster } from "react-hot-toast";

const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent", description: "Trade ready, minor prep only" },
  { value: "good", label: "Good", description: "Light reconditioning needed" },
  { value: "fair", label: "Fair", description: "Moderate work required" },
  { value: "poor", label: "Poor", description: "Significant work/parts needed" },
];

export default function DealerBuyingForm() {
  const router = useRouter();
  const { dealerSlug } = router.query;

  const [dealerInfo, setDealerInfo] = useState(null);
  const [isLoadingDealer, setIsLoadingDealer] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [dvlaData, setDvlaData] = useState(null);

  const [formData, setFormData] = useState({
    submitterName: "",
    submitterEmail: "",
    submitterPhone: "",
    submitterCompany: "",
    vehicleReg: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    mileage: "",
    colour: "",
    fuelType: "",
    conditionRating: "",
    conditionNotes: "",
    proposedPurchasePrice: "",
    hasV5: "",
    hasServiceHistory: "",
  });

  useEffect(() => {
    if (dealerSlug) {
      fetchDealerInfo();
    }
  }, [dealerSlug]);

  const fetchDealerInfo = async () => {
    try {
      const res = await fetch(`/api/public/dealer/${dealerSlug}`);
      if (res.ok) {
        const data = await res.json();
        setDealerInfo(data);
      } else {
        setDealerInfo(null);
      }
    } catch (error) {
      setDealerInfo(null);
    } finally {
      setIsLoadingDealer(false);
    }
  };

  const handleVrmLookup = async () => {
    const vrm = formData.vehicleReg.replace(/\s/g, "").toUpperCase();
    if (!vrm) return;

    setIsLookingUp(true);
    try {
      const res = await fetch(`/api/dvla-lookup?vrm=${vrm}`);
      if (res.ok) {
        const data = await res.json();
        setDvlaData(data);
        setFormData((prev) => ({
          ...prev,
          vehicleReg: vrm,
          vehicleMake: data.make || prev.vehicleMake,
          vehicleModel: data.model || prev.vehicleModel,
          vehicleYear: data.yearOfManufacture || prev.vehicleYear,
          colour: data.colour || prev.colour,
          fuelType: data.fuelType || prev.fuelType,
        }));
        toast.success("Vehicle details found");
      } else {
        toast.error("Vehicle not found - please enter details manually");
      }
    } catch (error) {
      toast.error("Lookup failed - please enter details manually");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.submitterName || !formData.submitterEmail || !formData.vehicleReg) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/appraisal-submit/${dealerSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsSubmitted(true);
        toast.success("Appraisal submitted successfully!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit appraisal");
      }
    } catch (error) {
      toast.error("Failed to submit appraisal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoadingDealer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Invalid dealer
  if (!dealerInfo) {
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
          <p className="text-slate-600">This appraisal form link is not valid.</p>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Head><title>Appraisal Submitted | {dealerInfo.name}</title></Head>
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h1>
          <p className="text-slate-600">
            Your vehicle appraisal has been submitted to {dealerInfo.name}.
            They will review it and contact you shortly.
          </p>
        </div>
        <Toaster position="top-center" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 overflow-x-hidden">
      <Head>
        <title>Submit Vehicle Appraisal | {dealerInfo.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>
      <Toaster position="top-center" />

      <div className="max-w-2xl mx-auto overflow-x-hidden">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            {dealerInfo.logoUrl && (
              <img src={dealerInfo.logoUrl} alt={dealerInfo.name} className="h-12" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Vehicle Appraisal</h1>
              <p className="text-slate-500">{dealerInfo.name}</p>
            </div>
          </div>
          <p className="text-slate-600 mt-4">
            Submit details of a vehicle you'd like to offer for sale.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Your Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.submitterName}
                  onChange={(e) => setFormData({ ...formData, submitterName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.submitterCompany}
                  onChange={(e) => setFormData({ ...formData, submitterCompany: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.submitterEmail}
                  onChange={(e) => setFormData({ ...formData, submitterEmail: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.submitterPhone}
                  onChange={(e) => setFormData({ ...formData, submitterPhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Vehicle Details</h2>

            {/* VRM Lookup - Mobile responsive: always stacked */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Registration *</label>
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="AB12 CDE"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono text-xl text-center"
                  value={formData.vehicleReg}
                  onChange={(e) => setFormData({ ...formData, vehicleReg: e.target.value.toUpperCase() })}
                />
                <button
                  type="button"
                  onClick={handleVrmLookup}
                  disabled={isLookingUp || !formData.vehicleReg}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isLookingUp ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Looking up...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Lookup Vehicle
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.vehicleMake}
                  onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.vehicleYear}
                  onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mileage</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Colour</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.colour}
                  onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Type</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="PHEV">PHEV</option>
                </select>
              </div>
            </div>
          </div>

          {/* Condition */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Condition & Documents</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Overall Condition</label>
              <div className="grid grid-cols-2 gap-3">
                {CONDITION_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.conditionRating === option.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="conditionRating"
                      value={option.value}
                      checked={formData.conditionRating === option.value}
                      onChange={(e) => setFormData({ ...formData, conditionRating: e.target.value })}
                      className="sr-only"
                    />
                    <span className="font-medium text-slate-900">{option.label}</span>
                    <span className="text-sm text-slate-500">{option.description}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Condition Notes</label>
              <textarea
                rows={3}
                placeholder="Any issues, damage, or important notes..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.conditionNotes}
                onChange={(e) => setFormData({ ...formData, conditionNotes: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">V5 Present?</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.hasV5}
                  onChange={(e) => setFormData({ ...formData, hasV5: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service History?</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.hasServiceHistory}
                  onChange={(e) => setFormData({ ...formData, hasServiceHistory: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="full">Full</option>
                  <option value="partial">Partial</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Asking Price</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Asking Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.proposedPurchasePrice}
                  onChange={(e) => setFormData({ ...formData, proposedPurchasePrice: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Submit Appraisal"}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Powered by DealerFlow</p>
        </div>
      </div>
    </div>
  );
}
