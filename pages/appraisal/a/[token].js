/**
 * Agent Appraisal Form - Token-based access for third-party agents/contractors
 * Full appraisal form with photos, issues, and documents
 */

import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast, Toaster } from "react-hot-toast";
import { compressImages } from "@/libs/imageCompression";

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

export default function AgentAppraisalForm() {
  const router = useRouter();
  const { token } = router.query;

  const [dealerInfo, setDealerInfo] = useState(null);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [dvlaData, setDvlaData] = useState(null);
  const [aiHints, setAiHints] = useState(null);
  const [isLoadingHints, setIsLoadingHints] = useState(false);

  const [formData, setFormData] = useState({
    agentName: "",
    agentEmail: "",
    agentPhone: "",
    agentCompany: "",
    vehicleReg: "",
    vin: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    mileage: "",
    colour: "",
    fuelType: "",
    transmission: "",
    dateOfRegistration: "",
    conditionNotes: "",
    proposedPurchasePrice: "",
    prepTemplateId: "default",
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
  const [issuePhotos, setIssuePhotos] = useState([]);
  const [issuePhotoPreviews, setIssuePhotoPreviews] = useState([]);

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

      // Check if this is an agent link
      if (data.linkType !== "agent_appraisal") {
        // Redirect to the customer PX form
        router.replace(`/px/a/${token}`);
        return;
      }

      setDealerInfo(data);
    } catch (error) {
      setValidationError("Failed to validate link");
    } finally {
      setIsValidating(false);
    }
  };

  const handleVrmLookup = async () => {
    const vrm = formData.vehicleReg.replace(/\s/g, "").toUpperCase();
    if (!vrm) return toast.error("Enter registration first");

    setIsLookingUp(true);
    setAiHints(null);
    setDvlaData(null);

    try {
      const [dvlaRes, motRes] = await Promise.all([
        fetch("/api/dvla-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicleReg: vrm }),
        }),
        fetch(`/api/public/mot-lookup?vrm=${vrm}`),
      ]);

      const dvlaOk = dvlaRes.ok;
      const motOk = motRes.ok;

      const dvlaDataResponse = dvlaOk ? await dvlaRes.json() : null;
      const motData = motOk ? await motRes.json() : null;

      if (!dvlaOk && !motOk) {
        toast.error("VRM not found - please check the registration");
        return;
      }

      const mergedData = {
        make: dvlaDataResponse?.make || motData?.make,
        model: motData?.model || dvlaDataResponse?.model,
        yearOfManufacture: dvlaDataResponse?.yearOfManufacture || motData?.yearOfManufacture,
        colour: dvlaDataResponse?.colour || motData?.colour,
        fuelType: dvlaDataResponse?.fuelType || motData?.fuelType,
        firstUsedDate: motData?.firstUsedDate || null,
        isDummy: dvlaDataResponse?.isDummy,
      };

      setDvlaData(mergedData);
      setFormData((prev) => ({
        ...prev,
        vehicleReg: vrm,
        vehicleMake: mergedData.make || prev.vehicleMake,
        vehicleModel: mergedData.model || prev.vehicleModel,
        vehicleYear: mergedData.yearOfManufacture || prev.vehicleYear,
        colour: mergedData.colour || prev.colour,
        fuelType: mergedData.fuelType || prev.fuelType,
        dateOfRegistration: mergedData.firstUsedDate || prev.dateOfRegistration,
      }));

      // Fetch AI hints
      fetchAiHints(mergedData.make, mergedData.model, mergedData.yearOfManufacture);

      toast.success(mergedData.isDummy ? "Demo data loaded" : "Vehicle details found");
    } catch (error) {
      toast.error("Lookup failed - please enter details manually");
    } finally {
      setIsLookingUp(false);
    }
  };

  const fetchAiHints = async (make, model, year) => {
    setIsLoadingHints(true);
    try {
      const res = await fetch("/api/ai-hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ make, model, year, mileage: formData.mileage }),
      });
      const data = await res.json();
      setAiHints(data);
    } catch (error) {
      console.error("AI hints error:", error);
    } finally {
      setIsLoadingHints(false);
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

  // Issue photo handlers
  const handleIssuePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      const compressedFiles = await compressImages(files);
      setIssuePhotos((prev) => [...prev, ...compressedFiles]);

      compressedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setIssuePhotoPreviews((prev) => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      toast.error("Failed to process images");
    }
  };

  const removeIssuePhoto = (index) => {
    setIssuePhotos((prev) => prev.filter((_, i) => i !== index));
    setIssuePhotoPreviews((prev) => prev.filter((_, i) => i !== index));
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
  const handleAddIssue = async () => {
    if (!issueForm.category || !issueForm.description) {
      toast.error("Category and description are required");
      return;
    }

    // Upload issue photos
    const uploadedPhotos = [];
    for (const file of issuePhotos) {
      const url = await uploadFile(file);
      uploadedPhotos.push(url);
    }

    setIssues([...issues, { ...issueForm, photos: uploadedPhotos }]);
    setIssueForm({
      category: "",
      subcategory: "",
      description: "",
      actionNeeded: "",
      notes: "",
      faultCodes: "",
      estimatedCost: "",
    });
    setIssuePhotos([]);
    setIssuePhotoPreviews([]);
    setShowAddIssueModal(false);
    toast.success("Issue added");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vehicleReg) {
      toast.error("Vehicle registration is required");
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
      const res = await fetch("/api/appraisals/share-links/submit-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
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
          <p className="text-slate-600">{validationError}</p>
          <p className="text-sm text-slate-500 mt-4">Please contact the dealership for a new link.</p>
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
            The vehicle appraisal has been submitted to {dealerInfo?.dealerName}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <Head>
        <title>Vehicle Appraisal{dealerInfo?.dealerName ? ` | ${dealerInfo.dealerName}` : ""}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>
      <Toaster position="top-center" />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            {dealerInfo?.dealerLogo && (
              <img src={dealerInfo.dealerLogo} alt={dealerInfo.dealerName} className="h-12" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Vehicle Appraisal</h1>
              <p className="text-slate-500">{dealerInfo?.dealerName}</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Agent Appraisal Form</strong> - This link allows you to submit a full vehicle appraisal on behalf of the dealer.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - Left Side */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Agent Details */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Details (Agent)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.agentName}
                      onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.agentCompany}
                      onChange={(e) => setFormData({ ...formData, agentCompany: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.agentEmail}
                      onChange={(e) => setFormData({ ...formData, agentEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.agentPhone}
                      onChange={(e) => setFormData({ ...formData, agentPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Registration Lookup */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Vehicle Registration</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={formData.vehicleReg}
                    onChange={(e) => setFormData({ ...formData, vehicleReg: e.target.value.toUpperCase() })}
                    className="flex-1 h-12 px-4 uppercase text-xl font-bold tracking-wider text-center rounded border-2 border-black bg-[#F7D117] text-black placeholder:text-black/40"
                    placeholder="AB12 CDE"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleVrmLookup}
                    disabled={isLookingUp}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 transition-colors flex items-center gap-2"
                  >
                    {isLookingUp ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                    Lookup
                  </button>
                </div>
                {dvlaData && (
                  <div className={`mt-4 p-3 rounded-lg ${dvlaData.isDummy ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                    {dvlaData.isDummy && "Demo: "}
                    {dvlaData.yearOfManufacture} {dvlaData.make} {dvlaData.model} - {dvlaData.colour}
                  </div>
                )}
              </div>

              {/* Vehicle Details */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Vehicle Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={formData.vehicleMake}
                      onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={formData.vehicleModel}
                      onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={formData.vehicleYear}
                      onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mileage</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={formData.mileage}
                      onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Colour</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={formData.colour}
                      onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Type</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={formData.fuelType}
                      onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Electric">Electric</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Transmission</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={formData.transmission}
                      onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="Manual">Manual</option>
                      <option value="Automatic">Automatic</option>
                      <option value="Semi-Automatic">Semi-Automatic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Registered</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={formData.dateOfRegistration}
                      onChange={(e) => setFormData({ ...formData, dateOfRegistration: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proposed Purchase Price (£)</label>
                  <input
                    type="number"
                    className="w-full md:w-1/3 px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.proposedPurchasePrice}
                    onChange={(e) => setFormData({ ...formData, proposedPurchasePrice: e.target.value })}
                    placeholder="5000"
                  />
                </div>
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

              {/* Photos */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Photos</h2>
                <p className="text-sm text-slate-500 mb-4">Add photos of the vehicle for reference</p>

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
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    + Add Issue
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-4">Add any damage, mechanical issues, or fault codes found during appraisal</p>

                {issues.length > 0 ? (
                  <div className="space-y-3">
                    {issues.map((issue, index) => (
                      <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                            <p className="font-medium text-slate-800">{issue.description}</p>
                            {issue.faultCodes && (
                              <p className="text-sm font-mono text-red-600 mt-1">Codes: {issue.faultCodes}</p>
                            )}
                            {issue.actionNeeded && (
                              <p className="text-sm text-slate-500 mt-1">Action: {issue.actionNeeded}</p>
                            )}
                            {issue.photos?.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {issue.photos.map((photo, pIdx) => (
                                  <img key={pIdx} src={photo} alt={`Issue ${pIdx + 1}`} className="w-16 h-16 object-cover rounded" />
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setIssues(issues.filter((_, i) => i !== index))}
                            className="text-slate-400 hover:text-red-500 ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-4">No issues added yet. Click "+ Add Issue" to record problems.</p>
                )}
              </div>

              {/* Condition Notes */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Condition Notes</h2>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  value={formData.conditionNotes}
                  onChange={(e) => setFormData({ ...formData, conditionNotes: e.target.value })}
                  placeholder="General condition, service history notes, anything else to note..."
                />
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
          </div>

          {/* AI Hints Sidebar - Right Side */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Suggestions
              </h3>
              <p className="text-xs text-slate-500 mb-4">Things to check for this vehicle</p>

              {isLoadingHints ? (
                <div className="flex justify-center py-8">
                  <span className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></span>
                </div>
              ) : aiHints ? (
                <div className="space-y-4">
                  {aiHints.isDummy && (
                    <div className="p-2 bg-amber-50 text-amber-700 rounded text-xs">
                      Demo mode - AI not configured
                    </div>
                  )}

                  <ul className="list-disc list-inside text-sm space-y-2">
                    {Array.isArray(aiHints.hints) && aiHints.hints.map((hint, i) => (
                      <li key={i} className="text-slate-600">{hint}</li>
                    ))}
                  </ul>

                  {aiHints.marketInsight && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs font-semibold mb-1">Market Insight</p>
                      <p className="text-sm text-slate-600">{aiHints.marketInsight}</p>
                    </div>
                  )}

                  <p className="text-xs text-slate-400">
                    Common issues for this type of vehicle. Not guaranteed faults.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Enter registration and click "Lookup" to see AI-powered suggestions.
                </p>
              )}
            </div>
          </div>
        </div>

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
              <div className="grid grid-cols-2 gap-4">
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
              </div>

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

              {/* Issue Photos */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Photos</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <label className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm cursor-pointer hover:bg-blue-700">
                    Take Photo
                    <input type="file" accept="image/*" capture="environment" onChange={handleIssuePhotoChange} className="hidden" />
                  </label>
                  <label className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-sm cursor-pointer hover:bg-slate-200">
                    Upload
                    <input type="file" accept="image/*" multiple onChange={handleIssuePhotoChange} className="hidden" />
                  </label>
                </div>
                {issuePhotoPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {issuePhotoPreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <img src={preview} alt={`Preview ${idx + 1}`} className="w-16 h-16 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => removeIssuePhoto(idx)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddIssueModal(false);
                  setIssuePhotos([]);
                  setIssuePhotoPreviews([]);
                }}
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
