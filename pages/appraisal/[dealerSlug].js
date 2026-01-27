import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast, Toaster } from "react-hot-toast";
import { compressImages } from "@/libs/imageCompression";

const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent", description: "Trade ready, minor prep only" },
  { value: "good", label: "Good", description: "Light reconditioning needed" },
  { value: "fair", label: "Fair", description: "Moderate work required" },
  { value: "poor", label: "Poor", description: "Significant work/parts needed" },
];

const ISSUE_SUBCATEGORIES = {
  mechanical: ["Engine", "Transmission", "Suspension", "Brakes", "Exhaust", "Other"],
  electrical: ["Battery", "Lights", "Starter Motor", "Alternator", "Sensors", "Other"],
  bodywork: ["Panel Damage", "Scratches", "Dents", "Bumper", "Windscreen", "Other"],
  interior: ["Seats", "Dashboard", "Trim", "Carpet", "Controls", "Other"],
  tyres: ["Tread Depth", "Puncture", "Alloys", "Alignment", "Other"],
  mot: ["Advisory", "Failed Item", "Due Soon", "Other"],
  service: ["Oil Change", "Filters", "Fluids", "Timing Belt", "Other"],
  fault_codes: ["Engine", "Transmission", "ABS", "Airbag", "Emissions", "Other"],
  other: ["General", "Misc"],
};

const CATEGORY_LABELS = {
  mechanical: "Mechanical",
  electrical: "Electrical",
  bodywork: "Bodywork",
  interior: "Interior",
  tyres: "Tyres",
  mot: "MOT",
  service: "Service",
  fault_codes: "Fault Codes",
  other: "Other",
};

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
    vin: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    mileage: "",
    colour: "",
    fuelType: "",
    transmission: "",
    conditionRating: "",
    conditionNotes: "",
    proposedPurchasePrice: "",
    hasV5: "",
    hasServiceHistory: "",
  });

  // Documents
  const [v5File, setV5File] = useState(null);
  const [serviceHistoryFile, setServiceHistoryFile] = useState(null);
  const [otherDocuments, setOtherDocuments] = useState([]);

  // Photos
  const [genericPhotoFiles, setGenericPhotoFiles] = useState([]);
  const [genericPhotoPreviews, setGenericPhotoPreviews] = useState([]);
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);

  // Issues
  const [issues, setIssues] = useState([]);
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    category: "",
    subcategory: "",
    description: "",
    actionNeeded: "",
    notes: "",
    faultCodes: "",
    estimatedCost: "",
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
      const [dvlaRes, motRes] = await Promise.all([
        fetch(`/api/dvla-lookup?vrm=${vrm}`),
        fetch(`/api/public/mot-lookup?vrm=${vrm}`),
      ]);

      const dvlaOk = dvlaRes.ok;
      const motOk = motRes.ok;

      const dvlaDataResponse = dvlaOk ? await dvlaRes.json() : null;
      const motData = motOk ? await motRes.json() : null;

      if (!dvlaOk && !motOk) {
        toast.error("Vehicle not found - please enter details manually");
        return;
      }

      const mergedData = {
        make: dvlaDataResponse?.make || motData?.make,
        model: motData?.model || dvlaDataResponse?.model,
        yearOfManufacture: dvlaDataResponse?.yearOfManufacture || motData?.yearOfManufacture,
        colour: dvlaDataResponse?.colour || motData?.colour,
        fuelType: dvlaDataResponse?.fuelType || motData?.fuelType,
        vin: motData?.vin || null,
      };

      setDvlaData(mergedData);
      setFormData((prev) => ({
        ...prev,
        vehicleReg: vrm,
        vin: mergedData.vin || prev.vin,
        vehicleMake: mergedData.make || prev.vehicleMake,
        vehicleModel: mergedData.model || prev.vehicleModel,
        vehicleYear: mergedData.yearOfManufacture || prev.vehicleYear,
        colour: mergedData.colour || prev.colour,
        fuelType: mergedData.fuelType || prev.fuelType,
      }));

      toast.success("Vehicle details found");
    } catch (error) {
      toast.error("Lookup failed - please enter details manually");
    } finally {
      setIsLookingUp(false);
    }
  };

  // Photo handlers
  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsCompressingPhotos(true);
    try {
      const compressedFiles = await compressImages(files);
      setGenericPhotoFiles((prev) => [...prev, ...compressedFiles]);

      compressedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setGenericPhotoPreviews((prev) => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      toast.error("Failed to process images");
    } finally {
      setIsCompressingPhotos(false);
    }
  };

  const removePhoto = (index) => {
    setGenericPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setGenericPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload file helper
  const uploadFile = async (file) => {
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    const res = await fetch("/api/public/upload", {
      method: "POST",
      body: formDataUpload,
    });

    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.key || data.url;
  };

  // Add issue
  const handleAddIssue = () => {
    if (!issueForm.category || !issueForm.description) {
      toast.error("Category and description are required");
      return;
    }

    setIssues([...issues, { ...issueForm, photos: [] }]);
    setIssueForm({
      category: "",
      subcategory: "",
      description: "",
      actionNeeded: "",
      notes: "",
      faultCodes: "",
      estimatedCost: "",
    });
    setShowAddIssueModal(false);
    toast.success("Issue added");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.submitterName || !formData.submitterEmail || !formData.vehicleReg) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload documents
      let v5Url = null;
      let serviceHistoryUrl = null;
      const uploadedOtherDocs = [];

      if (v5File) {
        v5Url = await uploadFile(v5File);
      }
      if (serviceHistoryFile) {
        serviceHistoryUrl = await uploadFile(serviceHistoryFile);
      }
      for (const doc of otherDocuments) {
        if (doc.file) {
          const url = await uploadFile(doc.file);
          uploadedOtherDocs.push({ name: doc.name, url });
        }
      }

      // Upload photos
      const uploadedPhotos = [];
      for (const file of genericPhotoFiles) {
        const url = await uploadFile(file);
        uploadedPhotos.push(url);
      }

      // Submit appraisal
      const res = await fetch(`/api/public/appraisal-submit/${dealerSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          v5Url,
          serviceHistoryUrl,
          otherDocuments: uploadedOtherDocs,
          genericPhotos: uploadedPhotos,
          issues,
        }),
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

            {/* VRM Lookup */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Registration *</label>
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="AB12 CDE"
                  className="w-full h-12 px-4 uppercase text-xl font-bold tracking-wider text-center rounded border-2 border-black bg-[#F7D117] text-black placeholder:text-black/40"
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
              {dvlaData && (
                <div className="mt-3 p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm">
                  {dvlaData.yearOfManufacture} {dvlaData.make} {dvlaData.model} - {dvlaData.colour}
                </div>
              )}
            </div>

            {/* VIN */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">VIN</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                placeholder="Auto-populated from lookup or enter manually"
                maxLength={17}
              />
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transmission</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.transmission}
                  onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                  <option value="Semi-Automatic">Semi-Automatic</option>
                </select>
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Photos</h2>
            <p className="text-sm text-slate-500 mb-4">Add photos of the vehicle</p>

            {isCompressingPhotos && (
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                <span>Compressing images...</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium cursor-pointer hover:bg-blue-700 transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
              </label>
              <label className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium cursor-pointer hover:bg-slate-200 transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload Photos
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>

            {genericPhotoPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genericPhotoPreviews.map((preview, idx) => (
                  <div key={idx} className="relative">
                    <img src={preview} alt={`Photo ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Issues */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Issues</h2>
              <button
                type="button"
                onClick={() => setShowAddIssueModal(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                + Add Issue
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Add any damage, mechanical issues, or fault codes</p>

            {issues.length > 0 ? (
              <div className="space-y-3">
                {issues.map((issue, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {CATEGORY_LABELS[issue.category]}
                          </span>
                          {issue.subcategory && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                              {issue.subcategory}
                            </span>
                          )}
                          {issue.estimatedCost && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                              £{issue.estimatedCost}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-800 font-medium">{issue.description}</p>
                        {issue.faultCodes && (
                          <p className="text-sm font-mono text-red-600 mt-1">Codes: {issue.faultCodes}</p>
                        )}
                        {issue.actionNeeded && (
                          <p className="text-sm text-slate-500 mt-1">Action: {issue.actionNeeded}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIssues(issues.filter((_, i) => i !== index))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-4">No issues added yet</p>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Documents</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">V5 Document</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setV5File(e.target.files[0])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                {v5File && <p className="text-sm text-emerald-600 mt-1">✓ {v5File.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service History</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setServiceHistoryFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                {serviceHistoryFile && <p className="text-sm text-emerald-600 mt-1">✓ {serviceHistoryFile.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Other Documents</label>
                <button
                  type="button"
                  onClick={() => setOtherDocuments([...otherDocuments, { name: "", file: null }])}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Document
                </button>
                {otherDocuments.map((doc, idx) => (
                  <div key={idx} className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Document name"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      value={doc.name}
                      onChange={(e) => {
                        const updated = [...otherDocuments];
                        updated[idx].name = e.target.value;
                        setOtherDocuments(updated);
                      }}
                    />
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      onChange={(e) => {
                        const updated = [...otherDocuments];
                        updated[idx].file = e.target.files[0];
                        setOtherDocuments(updated);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setOtherDocuments(otherDocuments.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Condition */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Condition & Notes</h2>

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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Condition Notes</label>
              <textarea
                rows={3}
                placeholder="Any additional notes about the vehicle condition..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.conditionNotes}
                onChange={(e) => setFormData({ ...formData, conditionNotes: e.target.value })}
              />
            </div>
          </div>

          {/* Price */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Asking Price</h2>
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
          <p>Powered by DealerHQ</p>
        </div>
      </div>

      {/* Add Issue Modal */}
      {showAddIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddIssueModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Issue</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  value={issueForm.category}
                  onChange={(e) => setIssueForm({ ...issueForm, category: e.target.value, subcategory: "" })}
                >
                  <option value="">Select category...</option>
                  {Object.keys(CATEGORY_LABELS).map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>

              {issueForm.category && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subcategory</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={issueForm.subcategory}
                    onChange={(e) => setIssueForm({ ...issueForm, subcategory: e.target.value })}
                  >
                    <option value="">Select subcategory...</option>
                    {ISSUE_SUBCATEGORIES[issueForm.category]?.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}

              {issueForm.category === "fault_codes" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fault Codes</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    value={issueForm.faultCodes}
                    onChange={(e) => setIssueForm({ ...issueForm, faultCodes: e.target.value })}
                    placeholder="e.g. P0301, P0420"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  placeholder="Describe the issue..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Action Needed</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={issueForm.actionNeeded}
                    onChange={(e) => setIssueForm({ ...issueForm, actionNeeded: e.target.value })}
                    placeholder="What needs to be done?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Cost (£)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={issueForm.estimatedCost}
                    onChange={(e) => setIssueForm({ ...issueForm, estimatedCost: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddIssueModal(false)}
                className="flex-1 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddIssue}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Add Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
